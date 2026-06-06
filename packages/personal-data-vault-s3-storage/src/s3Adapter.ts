import { createHash } from "node:crypto";
import {
    CreateBucketCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadBucketCommand,
    PutObjectCommand,
    type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
    VaultDeleteObjectInput,
    VaultPutObjectInput,
    VaultSignedUrlInput,
    VaultStorageAdapter,
    VaultStoredObjectRef,
} from "@qualia/personal-data-vault-core";

export type S3VaultStorageConfig = {
    getClient: () => S3Client;
    sanitizeBucketName: (name: string) => string;
    resolveBucketName: (orgId: string, orgSlug: string) => string;
    folderPrefix?: string;
    encryptBuffer?: (plain: Buffer) => Buffer;
    beforeStore?: (buffer: Buffer, contentType: string) => Promise<"clean" | "rejected">;
};

const DEFAULT_FOLDER = "vault";

async function ensureBucket(client: S3Client, bucketName: string): Promise<void> {
    try {
        await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    } catch (error: unknown) {
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        if (status === 404 || status === 403) {
            await client.send(new CreateBucketCommand({ Bucket: bucketName }));
            return;
        }
        throw error;
    }
}

export function createS3VaultStorageAdapter(config: S3VaultStorageConfig): VaultStorageAdapter {
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

            const client = config.getClient();
            const bucketName = config.sanitizeBucketName(input.orgId);
            await ensureBucket(client, bucketName);

            const objectKey = `${folder}/${input.objectKey}`;
            await client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: objectKey,
                    Body: toStore,
                    ContentType: "application/octet-stream",
                    Metadata: { vaultContentType: input.contentType },
                }),
            );

            return {
                objectKey,
                byteSize: plain.length,
                checksumSha256,
            };
        },

        async deleteObject(input: VaultDeleteObjectInput): Promise<void> {
            const client = config.getClient();
            const bucketName = config.sanitizeBucketName(input.orgId);
            try {
                await client.send(
                    new DeleteObjectCommand({
                        Bucket: bucketName,
                        Key: input.objectKey,
                    }),
                );
            } catch {
                // Best-effort delete
            }
        },

        async getSignedDownloadUrl(input: VaultSignedUrlInput): Promise<string> {
            const client = config.getClient();
            const bucketName = config.sanitizeBucketName(input.orgId);
            const expiresIn = input.expiresInSeconds ?? 15 * 60;
            return getSignedUrl(
                client,
                new GetObjectCommand({
                    Bucket: bucketName,
                    Key: input.objectKey,
                }),
                { expiresIn },
            );
        },
    };
}
