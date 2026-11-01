import { Storage } from "@google-cloud/storage";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { createGcsVaultStorageAdapter, type GcsVaultStorageClient } from "./gcsAdapter";

afterEach(() => vi.restoreAllMocks());

describe("Google Cloud Storage 8 compatibility", () => {
    it("accepts a real Storage client and preserves upload, delete and signed URL options", async () => {
        const storage = new Storage({ projectId: "vault-test" });
        expectTypeOf(storage).toExtend<GcsVaultStorageClient>();
        const bucket = storage.bucket("org-test");
        const file = bucket.file("vault/document.bin");
        vi.spyOn(storage, "bucket").mockReturnValue(bucket);
        vi.spyOn(bucket, "file").mockReturnValue(file);
        vi.spyOn(bucket, "exists").mockImplementation(async () => [true] as [boolean]);
        const save = vi.spyOn(file, "save").mockResolvedValue();
        const remove = vi.spyOn(file, "delete").mockImplementation(async () => [{}]);
        const signedUrl = vi.spyOn(file, "getSignedUrl").mockImplementation(async () => ["https://signed.example/document"] as [string]);
        const adapter = createGcsVaultStorageAdapter({
            getStorage: () => storage,
            sanitizeBucketName: (org) => org.toLowerCase(),
            resolveBucketName: (org) => org.toLowerCase(),
        });
        const buffer = Buffer.from("document");
        const ref = await adapter.putObject({ orgId: "ORG-TEST", objectKey: "document.bin", buffer, contentType: "text/plain" });
        expect(storage.bucket).toHaveBeenCalledWith("org-test");
        expect(bucket.file).toHaveBeenCalledWith("vault/document.bin");
        expect(save).toHaveBeenCalledWith(buffer, {
            contentType: "application/octet-stream",
            metadata: { vaultContentType: "text/plain" },
        });
        await adapter.deleteObject({ orgId: "ORG-TEST", objectKey: ref.objectKey });
        expect(remove).toHaveBeenCalledWith({ ignoreNotFound: true });
        const before = Date.now();
        const url = await adapter.getSignedDownloadUrl({ orgId: "ORG-TEST", objectKey: ref.objectKey, expiresInSeconds: 60 });
        expect(url).toBe("https://signed.example/document");
        expect(signedUrl).toHaveBeenCalledWith({ version: "v4", action: "read", expires: expect.any(Number) });
        const options = signedUrl.mock.calls[0][0];
        expect(Number(options.expires)).toBeGreaterThanOrEqual(before + 60_000);
        expect(Number(options.expires)).toBeLessThanOrEqual(Date.now() + 60_000);
    });
});
