import { describe, expect, it } from "vitest";
import { resolveVaultDatabaseUrl } from "./resolveVaultDatabaseUrl.js";

describe("resolveVaultDatabaseUrl", () => {
    it("prefers VAULT_DATABASE_URL", () => {
        expect(
            resolveVaultDatabaseUrl({
                VAULT_DATABASE_URL: "postgresql://explicit",
                VAULT_POSTGRES_PASSWORD: "ignored",
            }),
        ).toBe("postgresql://explicit");
    });

    it("falls back to POSTGRES_PRISMA_URL", () => {
        expect(resolveVaultDatabaseUrl({ POSTGRES_PRISMA_URL: "postgresql://prisma" })).toBe(
            "postgresql://prisma",
        );
    });

    it("builds from components with URL-encoded credentials", () => {
        expect(
            resolveVaultDatabaseUrl({
                VAULT_POSTGRES_USER: "vault",
                VAULT_POSTGRES_PASSWORD: '7rre!`<r>%Cy`O0<QBEl',
                VAULT_POSTGRES_HOST: "localhost",
                VAULT_POSTGRES_PORT: "5434",
                VAULT_POSTGRES_DB: "vault",
                VAULT_POSTGRES_SCHEMA: "vault",
            }),
        ).toBe("postgresql://vault:7rre!%60%3Cr%3E%25Cy%60O0%3CQBEl@localhost:5434/vault?schema=vault");
    });

    it("supports monday dev DB layout", () => {
        expect(
            resolveVaultDatabaseUrl({
                VAULT_POSTGRES_USER: "user",
                VAULT_POSTGRES_PASSWORD: "pass",
                VAULT_POSTGRES_HOST: "localhost",
                VAULT_POSTGRES_PORT: "5433",
                VAULT_POSTGRES_DB: "monday",
                VAULT_POSTGRES_SCHEMA: "vault",
            }),
        ).toBe("postgresql://user:pass@localhost:5433/monday?schema=vault");
    });

    it("uses defaults when no env is set", () => {
        expect(resolveVaultDatabaseUrl({})).toBe(
            "postgresql://vault:vault@localhost:5434/vault?schema=vault",
        );
    });
});
