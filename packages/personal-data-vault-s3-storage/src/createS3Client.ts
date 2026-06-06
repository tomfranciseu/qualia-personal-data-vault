import { S3Client } from "@aws-sdk/client-s3";

export type S3ClientEnv = {
    VAULT_STORAGE_ENDPOINT?: string;
    VAULT_STORAGE_REGION?: string;
    VAULT_STORAGE_ACCESS_KEY?: string;
    VAULT_STORAGE_SECRET_KEY?: string;
    VAULT_STORAGE_FORCE_PATH_STYLE?: string;
};

export function createVaultS3Client(env: S3ClientEnv = process.env): S3Client {
    const endpoint = env.VAULT_STORAGE_ENDPOINT?.trim();
    const region = env.VAULT_STORAGE_REGION?.trim() ?? "us-east-1";
    const accessKeyId = env.VAULT_STORAGE_ACCESS_KEY?.trim();
    const secretAccessKey = env.VAULT_STORAGE_SECRET_KEY?.trim();

    if (!endpoint || !accessKeyId || !secretAccessKey) {
        throw new Error(
            "Missing VAULT_STORAGE_ENDPOINT, VAULT_STORAGE_ACCESS_KEY, or VAULT_STORAGE_SECRET_KEY",
        );
    }

    const forcePathStyle = env.VAULT_STORAGE_FORCE_PATH_STYLE?.trim() !== "false";

    return new S3Client({
        region,
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle,
    });
}
