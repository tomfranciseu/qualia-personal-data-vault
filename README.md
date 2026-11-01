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
| `@qualia/personal-data-vault-s3-storage` | S3-compatible storage adapter (Hetzner Object Storage, MinIO) |

## Quickstart

```bash
cp .env.example .env
docker compose up -d
npm install
npm run migrate:deploy
npm run dev:vault-api
```

Postgres runs in Docker on port **5435**. MinIO (local S3) runs on **9000** (console **9001**). Default MinIO credentials match `.env.example`.

Health: `GET http://localhost:4010/health`

## Consumption from monday2.0

Install packages from this repo (tagged releases), same pattern as [`@qualia/kbo`](https://github.com/tomfranciseu/qualia-kbo):

```json
"@qualia/personal-data-vault-core": "github:tomfranciseu/qualia-personal-data-vault#v0.1.0"
```

For a monorepo with multiple packages, clone this repo next to monday2.0 and use `file:../qualia-personal-data-vault/packages/...` until subdirectory git installs are configured in CI.

Production: set `VAULT_API_URL` + `VAULT_SERVICE_TOKEN` on monday2.0; run `vault-api` with Postgres and Hetzner Object Storage configured via env vars.

## Hetzner production deploy

Recommended: dedicated **CX22** VPS in **fsn1** or **nbg1** (same location as monday2.0 if possible).

1. Create **Object Storage** in Hetzner Console → generate S3 access key/secret.
2. Place secrets in `/etc/vault-api.env` (mode `600`):

```env
VAULT_POSTGRES_USER=vault
VAULT_POSTGRES_PASSWORD=<strong-password>
VAULT_POSTGRES_DB=vault
VAULT_POSTGRES_SCHEMA=vault
VAULT_ENCRYPTION_KEY=<base64-32-bytes>
VAULT_SERVICE_TOKEN=<shared-secret>
PORT=4010
VAULT_STORAGE_ENDPOINT=https://fsn1.your-objectstorage.com
VAULT_STORAGE_REGION=fsn1
VAULT_STORAGE_ACCESS_KEY=<hetzner-access-key>
VAULT_STORAGE_SECRET_KEY=<hetzner-secret-key>
```

3. Deploy on the VPS:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec vault_api npm run migrate:deploy
```

4. Restrict port **4010** to the monday2.0 app VM (UFW / private network). Set on monday2.0:

```env
VAULT_API_URL=http://<vault-vps-private-ip>:4010
VAULT_SERVICE_TOKEN=<same-shared-secret>
```

5. Schedule daily `pg_dump` backups (Hetzner has no managed Postgres for this stack).

**Note:** Hetzner Object Storage requires path-style S3 URLs. The adapter sets `forcePathStyle: true` by default.

## Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Unit tests (core + vault-api helpers) |
| `npm run generate` | Prisma client generate |
| `npm run migrate:deploy` | Apply vault schema migrations |
| `npm run dev:vault-api` | Start HTTP API on port 4010 |

## Development runtime and dependency compatibility

Use Node.js 24 (CI), or Node.js >=22.12.0. Tests use Vitest 5 with an explicit
Vite 8 development dependency. Run `npm run generate`, `npm test`, and
`npm run check:types` after installing dependencies.

`@qualia/personal-data-vault-google-storage` accepts `@google-cloud/storage`
`^7.19.0 || ^8.0.0` as a peer: the consuming application supplies its Storage
client rather than installing a second private copy. Vault development tests
use Storage 8.4 and check real SDK type compatibility and adapter call options
with network methods mocked; they do not access a bucket or require credentials.
Storage 8 consumers need Node >=22. The S3-backed vault-api does not require a
GCS runtime client.

To make these upgrades available to monday2.0, publish a new Git tag after
reviewing and committing the change, then update its pinned vault checkout,
vendor manifest snapshots, lockfile and contract tests together. Do not edit
monday2.0's vendored v0.1.2 manifests in isolation.
