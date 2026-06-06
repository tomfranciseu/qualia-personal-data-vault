-- Personal Data Vault schema

CREATE SCHEMA IF NOT EXISTS "vault";


CREATE TYPE "vault"."PersonalDataSensitivity" AS ENUM ('normal', 'sensitive', 'special_category');


CREATE TYPE "vault"."PersonalDataActionType" AS ENUM ('read', 'create', 'update', 'delete', 'export', 'share', 'consent_grant', 'consent_withdraw', 'erase', 'break_glass');


CREATE TYPE "vault"."PersonalDataRecordStatus" AS ENUM ('active', 'soft_deleted', 'erased');


CREATE TYPE "vault"."PersonalDataRetentionJobStatus" AS ENUM ('pending', 'running', 'completed', 'failed');


CREATE TABLE "vault"."PersonalDataSubject" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "displayLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalDataSubject_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "vault"."PersonalDataRecord" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "sensitivity" "vault"."PersonalDataSensitivity" NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "contentHash" TEXT,
    "areaType" TEXT,
    "areaId" TEXT,
    "retentionAt" TIMESTAMP(3),
    "status" "vault"."PersonalDataRecordStatus" NOT NULL DEFAULT 'active',
    "softDeletedAt" TIMESTAMP(3),
    "erasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByActor" TEXT NOT NULL,
    "updatedByActor" TEXT NOT NULL,

    CONSTRAINT "PersonalDataRecord_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "vault"."PersonalDataDocument" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "storageBackend" TEXT NOT NULL DEFAULT 'gcs',
    "storageObjectKey" TEXT NOT NULL,
    "encryptedMetadata" BYTEA NOT NULL,
    "keyVersion" INTEGER NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "retentionAt" TIMESTAMP(3),
    "status" "vault"."PersonalDataRecordStatus" NOT NULL DEFAULT 'active',
    "softDeletedAt" TIMESTAMP(3),
    "erasedAt" TIMESTAMP(3),
    "uploadedByActor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalDataDocument_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "vault"."PersonalDataConsent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "purposeKey" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "evidenceJson" BYTEA,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalDataConsent_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "vault"."PersonalDataAuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subjectId" TEXT,
    "action" "vault"."PersonalDataActionType" NOT NULL,
    "fieldKey" TEXT,
    "documentId" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "policyDecision" TEXT NOT NULL,
    "reasonCode" TEXT,
    "metadataJson" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalDataAuditLog_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "vault"."PersonalDataAccessGrant" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "granteeActorId" TEXT NOT NULL,
    "scopeFieldKeys" TEXT[],
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalDataAccessGrant_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "vault"."PersonalDataRetentionJob" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subjectId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "vault"."PersonalDataRetentionJobStatus" NOT NULL,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonalDataRetentionJob_pkey" PRIMARY KEY ("id")
);


CREATE INDEX "PersonalDataSubject_orgId_subjectType_idx" ON "vault"."PersonalDataSubject"("orgId", "subjectType");


CREATE UNIQUE INDEX "PersonalDataSubject_orgId_subjectType_subjectId_key" ON "vault"."PersonalDataSubject"("orgId", "subjectType", "subjectId");


CREATE INDEX "PersonalDataRecord_orgId_fieldKey_idx" ON "vault"."PersonalDataRecord"("orgId", "fieldKey");


CREATE INDEX "PersonalDataRecord_orgId_retentionAt_idx" ON "vault"."PersonalDataRecord"("orgId", "retentionAt");


CREATE INDEX "PersonalDataRecord_orgId_status_idx" ON "vault"."PersonalDataRecord"("orgId", "status");


CREATE UNIQUE INDEX "PersonalDataRecord_subjectId_fieldKey_areaType_areaId_key" ON "vault"."PersonalDataRecord"("subjectId", "fieldKey", "areaType", "areaId");


CREATE INDEX "PersonalDataDocument_orgId_subjectId_fieldKey_idx" ON "vault"."PersonalDataDocument"("orgId", "subjectId", "fieldKey");


CREATE INDEX "PersonalDataDocument_orgId_retentionAt_idx" ON "vault"."PersonalDataDocument"("orgId", "retentionAt");


CREATE INDEX "PersonalDataConsent_orgId_subjectId_purposeKey_idx" ON "vault"."PersonalDataConsent"("orgId", "subjectId", "purposeKey");


CREATE INDEX "PersonalDataAuditLog_orgId_subjectId_createdAt_idx" ON "vault"."PersonalDataAuditLog"("orgId", "subjectId", "createdAt");


CREATE INDEX "PersonalDataAuditLog_orgId_actorId_createdAt_idx" ON "vault"."PersonalDataAuditLog"("orgId", "actorId", "createdAt");


CREATE INDEX "PersonalDataAuditLog_orgId_action_createdAt_idx" ON "vault"."PersonalDataAuditLog"("orgId", "action", "createdAt");


CREATE INDEX "PersonalDataAccessGrant_orgId_granteeActorId_expiresAt_idx" ON "vault"."PersonalDataAccessGrant"("orgId", "granteeActorId", "expiresAt");


CREATE INDEX "PersonalDataRetentionJob_orgId_status_scheduledFor_idx" ON "vault"."PersonalDataRetentionJob"("orgId", "status", "scheduledFor");


ALTER TABLE "vault"."PersonalDataRecord" ADD CONSTRAINT "PersonalDataRecord_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "vault"."PersonalDataSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "vault"."PersonalDataDocument" ADD CONSTRAINT "PersonalDataDocument_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "vault"."PersonalDataSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "vault"."PersonalDataConsent" ADD CONSTRAINT "PersonalDataConsent_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "vault"."PersonalDataSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "vault"."PersonalDataAuditLog" ADD CONSTRAINT "PersonalDataAuditLog_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "vault"."PersonalDataSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "vault"."PersonalDataAccessGrant" ADD CONSTRAINT "PersonalDataAccessGrant_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "vault"."PersonalDataSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "vault"."PersonalDataRetentionJob" ADD CONSTRAINT "PersonalDataRetentionJob_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "vault"."PersonalDataSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

