import type { IncomingMessage } from "node:http";

export type MultipartField = string | { filename: string; contentType: string; buffer: Buffer };

function readRequestBody(req: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

export async function parseMultipartForm(req: IncomingMessage): Promise<Record<string, MultipartField>> {
    const contentType = req.headers["content-type"] ?? "";
    const boundaryMatch = /boundary=(?:"([^"]+)"|([^\s;]+))/i.exec(contentType);
    if (!boundaryMatch) throw new Error("Missing multipart boundary");

    const boundary = boundaryMatch[1] ?? boundaryMatch[2];
    const body = await readRequestBody(req);
    const delimiter = Buffer.from(`--${boundary}`);
    let parts = splitBuffer(body, delimiter);
    if (parts[0]?.length === 0) parts = parts.slice(1);
    const last = parts[parts.length - 1];
    if (last && last.toString().trim().replace(/^-+/, "") === "") {
        parts = parts.slice(0, -1);
    }
    const fields: Record<string, MultipartField> = {};

    for (const part of parts) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd < 0) continue;
        const headerText = part.subarray(0, headerEnd).toString("utf8");
        let content = part.subarray(headerEnd + 4);
        if (content.length >= 2 && content.subarray(-2).equals(Buffer.from("\r\n"))) {
            content = content.subarray(0, -2);
        }

        const disposition = /Content-Disposition:[^\r\n]+/i.exec(headerText)?.[0] ?? "";
        const nameMatch = /name="([^"]+)"/i.exec(disposition);
        if (!nameMatch) continue;
        const name = nameMatch[1];

        const filenameMatch = /filename="([^"]*)"/i.exec(disposition);
        if (filenameMatch) {
            const fileContentType =
                /Content-Type:\s*([^\r\n]+)/i.exec(headerText)?.[1]?.trim() ?? "application/octet-stream";
            fields[name] = {
                filename: filenameMatch[1] || "upload",
                contentType: fileContentType,
                buffer: content,
            };
        } else {
            fields[name] = content.toString("utf8");
        }
    }

    return fields;
}

function splitBuffer(buf: Buffer, sep: Buffer): Buffer[] {
    const parts: Buffer[] = [];
    let start = 0;
    let idx = buf.indexOf(sep, start);
    while (idx !== -1) {
        if (idx > start) parts.push(buf.subarray(start, idx));
        start = idx + sep.length;
        idx = buf.indexOf(sep, start);
    }
    if (start < buf.length) parts.push(buf.subarray(start));
    return parts;
}
