# qualia-personal-data-vault

GDPR-oriented personal data vault: encrypted field storage, document uploads, consent/audit, and an independently deployable `vault-api` HTTP service.

## Packages

| Package | Role |
|---------|------|
| `@qualia/personal-data-vault-core` | Types, field catalog, encryption, policy, retention |
| `@qualia/personal-data-vault-prisma` | Prisma repository adapter |
| `@qualia/personal-data-vault-next` | `createVaultService` orchestration |
| `@qualia/personal-data-vault-client` | HTTP client for remote vault-api |
| `@qualia/personal-data-vault-react` | Generic vault UI components |
| `@qualia/personal-data-vault-google-storage` | GCS storage adapter |

## Quickstart

```bash
cp .env.example .env
npm install
npm run migrate:deploy
npm run dev:vault-api
```

Health: `GET http://localhost:4010/health`

## Consumption from monday2.0

Install packages from this repo (tagged releases), same pattern as [`@qualia/kbo`](https://github.com/tomfranciseu/qualia-kbo):

```json
"@qualia/personal-data-vault-core": "github:tomfranciseu/qualia-personal-data-vault#v0.1.0"
```

For a monorepo with multiple packages, clone this repo next to monday2.0 and use `file:../qualia-personal-data-vault/packages/...` until subdirectory git installs are configured in CI.

Production: set `VAULT_API_URL` + `VAULT_SERVICE_TOKEN` on monday2.0; run `vault-api` with `VAULT_DATABASE_URL` pointing at a dedicated Postgres instance.

## Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Unit tests (core + vault-api helpers) |
| `npm run generate` | Prisma client generate |
| `npm run migrate:deploy` | Apply vault schema migrations |
| `npm run dev:vault-api` | Start HTTP API on port 4010 |
