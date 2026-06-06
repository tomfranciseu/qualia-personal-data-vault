import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import type {
    DecryptValueInput,
    DecryptedValue,
    EncryptValueInput,
    EncryptedValue,
    PersonalDataEncryptionService,
    RotateValueKeyInput,
} from "../types.js";

export type VaultKeyProvider = {
    getKey(version: number): Buffer;
    currentVersion(): number;
};

export function createEnvVaultKeyProvider(envVarPrefix = "VAULT_ENCRYPTION_KEY"): VaultKeyProvider {
    const keys = new Map<number, Buffer>();

    function loadKey(version: number): Buffer {
        const cached = keys.get(version);
        if (cached) return cached;

        const suffix = version === 1 ? "" : `_V${version}`;
        const b64 = process.env[`${envVarPrefix}${suffix}`];
        if (b64) {
            const k = Buffer.from(b64, "base64");
            if (k.length !== 32) {
                throw new Error(`${envVarPrefix}${suffix} must decode to 32 bytes (AES-256).`);
            }
            keys.set(version, k);
            return k;
        }

        if (version === 1 && process.env.NODE_ENV === "development") {
            const dev = scryptSync("dev-only-vault-encryption", "qualia-vault", 32);
            keys.set(1, dev);
            return dev;
        }

        throw new Error(`${envVarPrefix}${suffix} is required for vault encryption key version ${version}.`);
    }

    return {
        getKey: loadKey,
        currentVersion: () => {
            if (process.env.VAULT_ENCRYPTION_KEY_V2) return 2;
            return 1;
        },
    };
}

function encryptBuffer(plain: Buffer, key: Buffer): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]);
}

function decryptBuffer(data: Buffer, key: Buffer): Buffer {
    if (data.length < 12 + 16) throw new Error("Invalid vault ciphertext");
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const enc = data.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]);
}

export function createAesGcmVaultEncryptionService(
    keyProvider: VaultKeyProvider,
): PersonalDataEncryptionService {
    return {
        currentKeyVersion: () => keyProvider.currentVersion(),

        async encryptValue(input: EncryptValueInput): Promise<EncryptedValue> {
            const version = input.keyVersion ?? keyProvider.currentVersion();
            const plain = Buffer.isBuffer(input.plaintext)
                ? input.plaintext
                : Buffer.from(input.plaintext, "utf8");
            const key = keyProvider.getKey(version);
            const ciphertext = encryptBuffer(plain, key);
            const contentHash = createHash("sha256").update(plain).digest("hex");
            return { ciphertext, keyVersion: version, contentHash };
        },

        async decryptValue(input: DecryptValueInput): Promise<DecryptedValue> {
            const key = keyProvider.getKey(input.keyVersion);
            const plaintext = decryptBuffer(input.ciphertext, key);
            return { plaintext };
        },

        async rotateValueKey(input: RotateValueKeyInput): Promise<EncryptedValue> {
            const key = keyProvider.getKey(input.fromKeyVersion);
            const plain = decryptBuffer(input.ciphertext, key);
            const toKey = keyProvider.getKey(input.toKeyVersion);
            const ciphertext = encryptBuffer(plain, toKey);
            const contentHash = createHash("sha256").update(plain).digest("hex");
            return { ciphertext, keyVersion: input.toKeyVersion, contentHash };
        },
    };
}
