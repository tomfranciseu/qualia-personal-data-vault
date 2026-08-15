export type VaultDatabaseUrlEnv = {
    VAULT_DATABASE_URL?: string;
    POSTGRES_PRISMA_URL?: string;
    VAULT_POSTGRES_USER?: string;
    VAULT_POSTGRES_PASSWORD?: string;
    VAULT_POSTGRES_HOST?: string;
    VAULT_POSTGRES_PORT?: string;
    VAULT_POSTGRES_DB?: string;
    VAULT_POSTGRES_SCHEMA?: string;
};

function trimOrUndefined(value: string | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}

export function resolveVaultDatabaseUrl(env: VaultDatabaseUrlEnv = process.env): string {
    const explicit = trimOrUndefined(env.VAULT_DATABASE_URL);
    if (explicit) return explicit;

    const prismaUrl = trimOrUndefined(env.POSTGRES_PRISMA_URL);
    if (prismaUrl) return prismaUrl;

    const user = trimOrUndefined(env.VAULT_POSTGRES_USER) ?? "vault";
    const password = trimOrUndefined(env.VAULT_POSTGRES_PASSWORD) ?? "vault";
    const host = trimOrUndefined(env.VAULT_POSTGRES_HOST) ?? "localhost";
    const port = trimOrUndefined(env.VAULT_POSTGRES_PORT) ?? "5435";
    const database = trimOrUndefined(env.VAULT_POSTGRES_DB) ?? "vault";
    const schema = trimOrUndefined(env.VAULT_POSTGRES_SCHEMA) ?? "vault";

    const credentials = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
    const location = `${host}:${port}/${encodeURIComponent(database)}`;
    const query = `schema=${encodeURIComponent(schema)}`;

    return `postgresql://${credentials}@${location}?${query}`;
}
