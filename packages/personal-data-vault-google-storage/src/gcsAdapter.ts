import { createHash } from "node:crypto";
import type { Storage } from "@google-cloud/storage";
import type {
    VaultDeleteObjectInput,
    VaultPutObjectInput,
    VaultSignedUrlInput,
    VaultStorageAdapter,
    VaultStoredObjectRef,
} from "@qualia/personal-data-vault-core";

export type GcsVaultStorageConfig = {
    getStorage: () => Storage;
    sanitizeBucketName: (name: string) => string;
    resolveBucketName: (orgId: string, orgSlug: string) => string;
    folderPrefix?: string;
    encryptBuffer?: (plain: Buffer) => Buffer;
    beforeStore?: (buffer: Buffer, contentType: string) => Promise<"clean" | "rejected">;
};

const DEFAULT_FOLDER = "vault";

export function createGcsVaultStorageAdapter(config: GcsVaultStorageConfig): VaultStorageAdapter {
    const folder = config.folderPrefix ?? DEFAULT_FOLDER;

    return {
        async putObject(input: VaultPutObjectInput): Promise<VaultStoredObjectRef> {
            const scan = config.beforeStore
                ? await config.beforeStore(input.buffer, input.contentType)
                : "clean";
            if (scan === "rejected") {
                throw new Error("File rejected by security scan");
            }

            const plain = input.buffer;
            const checksumSha256 = createHash("sha256").update(plain).digest("hex");
            const toStore = config.encryptBuffer ? config.encryptBuffer(plain) : plain;

            const storage = config.getStorage();
            const bucketName = config.sanitizeBucketName(input.orgId);
            const bucket = storage.bucket(bucketName);
            const [exists] = await bucket.exists();
            if (!exists) {
                await bucket.create();
            }

            const filePath = `${folder}/${input.objectKey}`;
            const file = bucket.file(filePath);
            await file.save(toStore, {
                contentType: "application/octet-stream",
                metadata: { vaultContentType: input.contentType },
            });

            return {
                objectKey: filePath,
                byteSize: plain.length,
                checksumSha256,
            };
        },

        async deleteObject(input: VaultDeleteObjectInput): Promise<void> {
            const storage = config.getStorage();
            const bucket = storage.bucket(config.sanitizeBucketName(input.orgId));
            try {
                await bucket.file(input.objectKey).delete({ ignoreNotFound: true });
            } catch {
                // Best-effort delete
            }
        },

        async getSignedDownloadUrl(input: VaultSignedUrlInput): Promise<string> {
            const storage = config.getStorage();
            const bucket = storage.bucket(config.sanitizeBucketName(input.orgId));
            const expires = Date.now() + (input.expiresInSeconds ?? 15 * 60) * 1000;
            const [url] = await bucket.file(input.objectKey).getSignedUrl({
                version: "v4",
                action: "read",
                expires,
            });
            return url;
        },
    };
}
