import "dotenv/config";
import { defineConfig } from "prisma/config";
import { resolveVaultDatabaseUrl } from "./src/env/resolveVaultDatabaseUrl.js";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: { path: "prisma/migrations" },
    datasource: {
        url: resolveVaultDatabaseUrl(),
    },
});
