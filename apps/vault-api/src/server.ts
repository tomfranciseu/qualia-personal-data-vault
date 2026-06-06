import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../.env") });
import { createServer } from "node:http";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../../src/generated/prisma/client.js";
import {
    createAesGcmVaultEncryptionService,
    createEnvVaultKeyProvider,
    travelPersonalDataFields,
    type VaultActorContext,
} from "@qualia/personal-data-vault-core";
import { createVaultPrismaRepository } from "@qualia/personal-data-vault-prisma";
import { createVaultService } from "@qualia/personal-data-vault-next";
import {
    createS3VaultStorageAdapter,
    createVaultS3Client,
} from "@qualia/personal-data-vault-s3-storage";
import { resolveVaultDatabaseUrl } from "../../../src/env/resolveVaultDatabaseUrl.js";
import { parseMultipartForm } from "./parseMultipart.js";

const PORT = Number(process.env.PORT ?? 4010);
const SERVICE_TOKEN = process.env.VAULT_SERVICE_TOKEN?.trim();

function unauthorized(res: import("node:http").ServerResponse) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
}

function parseActor(req: import("node:http").IncomingMessage): VaultActorContext | null {
    const clerkUserId = req.headers["x-actor-clerk-user-id"];
    const orgId = req.headers["x-org-id"];
    if (typeof clerkUserId !== "string" || typeof orgId !== "string") return null;
    const actorType = req.headers["x-actor-type"];
    const employeeId = req.headers["x-actor-employee-id"];
    const employeeRole = req.headers["x-actor-employee-role"];
    const tripsUserId = req.headers["x-actor-trips-user-id"];
    const isAdmin = req.headers["x-actor-is-admin"] === "true";
    return {
        clerkUserId,
        orgId,
        actorType: actorType === "participant" ? "participant" : actorType === "system" ? "system" : "employee",
        employeeId: typeof employeeId === "string" ? employeeId : undefined,
        employeeRole: typeof employeeRole === "string" ? employeeRole : undefined,
        tripsUserId: typeof tripsUserId === "string" ? tripsUserId : undefined,
        isAdmin,
    };
}

function readBody(req: import("node:http").IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            resolve(raw ? JSON.parse(raw) : {});
        });
        req.on("error", reject);
    });
}

function sanitizeBucketName(name: string): string {
    return name.replace(/^org_/, "").toLowerCase().replace(/[^a-z0-9-_.]/g, "-").slice(0, 63);
}

const s3Client = createVaultS3Client();

const pool = new Pool({ connectionString: resolveVaultDatabaseUrl() });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool as any) });
const vault = createVaultService({
    repository: createVaultPrismaRepository(prisma as never),
    encryption: createAesGcmVaultEncryptionService(createEnvVaultKeyProvider("VAULT_ENCRYPTION_KEY")),
    storage: createS3VaultStorageAdapter({
        getClient: () => s3Client,
        sanitizeBucketName,
        resolveBucketName: (orgId, orgSlug) => sanitizeBucketName(`${orgId}_${orgSlug}`),
    }),
    fieldCatalog: travelPersonalDataFields,
});

createServer(async (req, res) => {
    const path = (req.url ?? "").split("?")[0];

    if (path === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    const auth = req.headers.authorization ?? "";
    if (!SERVICE_TOKEN || auth !== `Bearer ${SERVICE_TOKEN}`) {
        unauthorized(res);
        return;
    }

    const actor = parseActor(req);
    if (!actor) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Missing actor headers" }));
        return;
    }

    try {
        let data: unknown;

        if (path === "/v1/documents/upload" && req.method === "POST") {
            const form = await parseMultipartForm(req);
            const subjectType = form.subjectType;
            const subjectId = form.subjectId;
            const fieldKey = form.fieldKey;
            const orgSlug = form.orgSlug;
            const file = form.file;
            if (
                typeof subjectType !== "string" ||
                typeof subjectId !== "string" ||
                typeof fieldKey !== "string" ||
                typeof orgSlug !== "string" ||
                !file ||
                typeof file === "string"
            ) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: "Invalid upload payload" }));
                return;
            }
            data = await vault.uploadDocument({
                actor,
                subject: { type: subjectType, id: subjectId },
                fieldKey,
                buffer: file.buffer,
                contentType: file.contentType,
                originalFilename: file.filename,
                orgSlug,
            });
        } else {
        const body = await readBody(req);

        if (path === "/v1/fields/metadata" && req.method === "POST") {
            data = await vault.listFieldMetadata({ actor, subject: body.subject, area: body.area, mode: body.mode });
        } else if (path === "/v1/fields/value" && req.method === "POST") {
            data = await vault.getFieldValue({ actor, subject: body.subject, fieldKey: body.fieldKey, area: body.area });
        } else if (path === "/v1/fields/upsert" && req.method === "POST") {
            await vault.upsertFieldValue({ actor, subject: body.subject, fieldKey: body.fieldKey, value: body.value, area: body.area });
            data = null;
        } else if (path === "/v1/fields/delete" && req.method === "POST") {
            await vault.deleteFieldValue({ actor, subject: body.subject, fieldKey: body.fieldKey, area: body.area });
            data = null;
        } else if (path === "/v1/subjects/export" && req.method === "POST") {
            data = await vault.exportSubjectData({ actor, subject: body.subject, area: body.area });
        } else if (path === "/v1/subjects/completion" && req.method === "POST") {
            data = await vault.getCompletionStatus({ actor, subject: body.subject, requiredFieldKeys: body.requiredFieldKeys });
        } else if (path === "/v1/consent/grant" && req.method === "POST") {
            await vault.grantConsent({ actor, subject: body.subject, purposeKey: body.purposeKey, legalBasis: body.legalBasis });
            data = null;
        } else if (path === "/v1/consent/withdraw" && req.method === "POST") {
            await vault.withdrawConsent({ actor, subject: body.subject, purposeKey: body.purposeKey });
            data = null;
        } else if (path === "/v1/subjects/erase" && req.method === "POST") {
            await vault.requestErasure({ actor, subject: body.subject });
            data = null;
        } else if (path === "/v1/audit/list" && req.method === "POST") {
            data = await vault.listAuditLogs({ actor, subject: body.subject });
        } else if (path === "/v1/documents/download-url" && req.method === "POST") {
            data = await vault.getDocumentDownloadUrl({
                actor,
                subject: body.subject,
                fieldKey: body.fieldKey,
                orgSlug: body.orgSlug,
            });
        } else {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "Not found" }));
            return;
        }
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, data }));
    } catch (e) {
        const message = e instanceof Error ? e.message : "Vault error";
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: message }));
    }
}).listen(PORT, () => console.log(`vault-api listening on :${PORT}`));
