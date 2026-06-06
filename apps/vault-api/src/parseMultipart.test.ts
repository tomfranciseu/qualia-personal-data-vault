import { describe, expect, it } from "vitest";
import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import { parseMultipartForm } from "./parseMultipart";

function mockRequest(body: string, boundary: string): IncomingMessage {
    const req = new EventEmitter() as IncomingMessage;
    req.headers = { "content-type": `multipart/form-data; boundary=${boundary}` };
    queueMicrotask(() => {
        req.emit("data", Buffer.from(body));
        req.emit("end");
    });
    return req;
}

describe("parseMultipartForm", () => {
    it("parses text fields and file parts", async () => {
        const boundary = "----boundary123";
        const body = [
            `--${boundary}`,
            'Content-Disposition: form-data; name="subjectType"',
            "",
            "traveller",
            `--${boundary}`,
            'Content-Disposition: form-data; name="file"; filename="id.pdf"',
            "Content-Type: application/pdf",
            "",
            "%PDF-1.4",
            `--${boundary}--`,
            "",
        ].join("\r\n");

        const fields = await parseMultipartForm(mockRequest(body, boundary));
        expect(fields.subjectType).toBe("traveller");
        expect(fields.file).toMatchObject({
            filename: "id.pdf",
            contentType: "application/pdf",
        });
        expect((fields.file as { buffer: Buffer }).buffer.toString()).toBe("%PDF-1.4");
    });
});
