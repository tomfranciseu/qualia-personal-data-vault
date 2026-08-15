import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createGcsVaultStorageAdapter, type GcsVaultStorageClient } from "./gcsAdapter";

function mockGcsClient(overrides?: {
    exists?: boolean;
    signedUrl?: string;
}): { client: GcsVaultStorageClient; save: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> } {
    const save = vi.fn().mockResolvedValue(undefined);
    const create = vi.fn().mockResolvedValue(undefined);
    const client: GcsVaultStorageClient = {
        bucket() {
            return {
                exists: async () => [overrides?.exists ?? true] as [boolean],
                create,
                file() {
                    return {
                        save,
                        delete: vi.fn().mockResolvedValue(undefined),
                        getSignedUrl: vi.fn().mockResolvedValue([overrides?.signedUrl ?? "https://signed.example"]),
                    };
                },
            };
        },
    };
    return { client, save, create };
}

describe("createGcsVaultStorageAdapter", () => {
    it("stores objects via a structural GCS client (no Storage class import)", async () => {
        const { client, save, create } = mockGcsClient({ exists: true });
        const adapter = createGcsVaultStorageAdapter({
            getStorage: () => client,
            sanitizeBucketName: (name) => name.toLowerCase(),
            resolveBucketName: (orgId) => orgId,
        });

        const buffer = Buffer.from("hello");
        const ref = await adapter.putObject({
            orgId: "Org_1",
            objectKey: "id.bin",
            buffer,
            contentType: "application/octet-stream",
        });

        expect(create).not.toHaveBeenCalled();
        expect(save).toHaveBeenCalledOnce();
        expect(ref.objectKey).toBe("vault/id.bin");
        expect(ref.byteSize).toBe(5);
        expect(ref.checksumSha256).toBe(createHash("sha256").update(buffer).digest("hex"));
    });

    it("creates the bucket when it does not exist", async () => {
        const { client, create } = mockGcsClient({ exists: false });
        const adapter = createGcsVaultStorageAdapter({
            getStorage: () => client,
            sanitizeBucketName: (name) => name,
            resolveBucketName: (orgId) => orgId,
        });

        await adapter.putObject({
            orgId: "org1",
            objectKey: "a.bin",
            buffer: Buffer.from("x"),
            contentType: "text/plain",
        });

        expect(create).toHaveBeenCalledOnce();
    });

    it("rejects files that fail the security scan", async () => {
        const { client, save } = mockGcsClient();
        const adapter = createGcsVaultStorageAdapter({
            getStorage: () => client,
            sanitizeBucketName: (name) => name,
            resolveBucketName: (orgId) => orgId,
            beforeStore: async () => "rejected",
        });

        await expect(
            adapter.putObject({
                orgId: "org1",
                objectKey: "a.bin",
                buffer: Buffer.from("x"),
                contentType: "text/plain",
            }),
        ).rejects.toThrow(/security scan/);
        expect(save).not.toHaveBeenCalled();
    });
});
