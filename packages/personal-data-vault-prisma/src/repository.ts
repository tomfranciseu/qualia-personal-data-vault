import type {
    PersonalDataFieldDefinition,
    PersonalDataSubjectRef,
    PersonalDataAreaRef,
    VaultSubjectContext,
} from "@qualia/personal-data-vault-core";
import { vaultAreaStorageKeys } from "@qualia/personal-data-vault-core";

/** Minimal Prisma delegate surface used by the vault repository. */
export type VaultPrismaClient = {
    personalDataSubject: {
        findUnique(args: {
            where: { orgId_subjectType_subjectId: { orgId: string; subjectType: string; subjectId: string } };
        }): Promise<{ id: string; orgId: string; subjectType: string; subjectId: string } | null>;
        create(args: {
            data: { orgId: string; subjectType: string; subjectId: string; displayLabel?: string | null };
        }): Promise<{ id: string; orgId: string; subjectType: string; subjectId: string }>;
    };
    personalDataRecord: {
        findFirst(args: {
            where: {
                orgId: string;
                subjectId: string;
                fieldKey: string;
                status?: string;
                areaType?: string | null;
                areaId?: string | null;
                OR?: Array<{ areaType: string | null; areaId: string | null }>;
            };
        }): Promise<VaultRecordRow | null>;
        findMany(args: {
            where: { orgId: string; subjectId: string; status?: string };
        }): Promise<VaultRecordRow[]>;
        upsert(args: {
            where: {
                subjectId_fieldKey_areaType_areaId: {
                    subjectId: string;
                    fieldKey: string;
                    areaType: string;
                    areaId: string;
                };
            };
            create: VaultRecordCreate;
            update: VaultRecordUpdate;
        }): Promise<VaultRecordRow>;
        updateMany(args: {
            where: { orgId: string; id?: string; subjectId?: string; retentionAt?: { lte: Date }; status?: string };
            data: Partial<VaultRecordUpdate>;
        }): Promise<{ count: number }>;
    };
    personalDataDocument: {
        findFirst(args: {
            where: { orgId: string; subjectId: string; fieldKey: string; status?: string };
        }): Promise<VaultDocumentRow | null>;
        findMany(args: {
            where: { orgId: string; subjectId: string; status?: string };
        }): Promise<VaultDocumentRow[]>;
        create(args: { data: VaultDocumentCreate }): Promise<VaultDocumentRow>;
        updateMany(args: {
            where: { orgId: string; id?: string; retentionAt?: { lte: Date }; status?: string };
            data: Partial<VaultDocumentUpdate>;
        }): Promise<{ count: number }>;
    };
    personalDataConsent: {
        findFirst(args: {
            where: { orgId: string; subjectId: string; purposeKey: string };
            orderBy?: { createdAt: "desc" };
        }): Promise<VaultConsentRow | null>;
        create(args: { data: VaultConsentCreate }): Promise<VaultConsentRow>;
        updateMany(args: {
            where: { orgId: string; subjectId: string; purposeKey: string; withdrawnAt: null };
            data: { withdrawnAt: Date; granted: boolean };
        }): Promise<{ count: number }>;
    };
    personalDataAuditLog: {
        create(args: { data: VaultAuditCreate }): Promise<{ id: string }>;
        findMany(args: {
            where: { orgId: string; subjectId?: string };
            orderBy: { createdAt: "desc" };
            take: number;
            skip?: number;
        }): Promise<VaultAuditRow[]>;
    };
    personalDataAccessGrant: {
        findFirst(args: {
            where: {
                orgId: string;
                subjectId: string;
                granteeActorId: string;
                revokedAt: null;
                expiresAt: { gt: Date };
            };
        }): Promise<{ id: string; scopeFieldKeys: string[] } | null>;
        create(args: { data: VaultAccessGrantCreate }): Promise<{ id: string }>;
    };
    personalDataRetentionJob: {
        create(args: { data: VaultRetentionJobCreate }): Promise<{ id: string }>;
        findMany(args: {
            where: { orgId?: string; status: string; scheduledFor: { lte: Date } };
            take: number;
        }): Promise<{ id: string; orgId: string; subjectId: string | null }[]>;
        update(args: {
            where: { id: string };
            data: { status: string; processedAt?: Date; errorMessage?: string | null };
        }): Promise<unknown>;
    };
};

export type VaultRecordRow = {
    id: string;
    orgId: string;
    subjectId: string;
    fieldKey: string;
    category: string;
    dataType: string;
    sensitivity: string;
    legalBasis: string;
    purpose: string;
    ciphertext: Uint8Array | Buffer;
    keyVersion: number;
    contentHash: string | null;
    areaType: string | null;
    areaId: string | null;
    retentionAt: Date | null;
    status: string;
};

type VaultRecordCreate = {
    orgId: string;
    subjectId: string;
    fieldKey: string;
    category: string;
    dataType: string;
    sensitivity: string;
    legalBasis: string;
    purpose: string;
    ciphertext: Uint8Array | Buffer;
    keyVersion: number;
    contentHash?: string | null;
    areaType?: string | null;
    areaId?: string | null;
    retentionAt?: Date | null;
    createdByActor: string;
    updatedByActor: string;
};

type VaultRecordUpdate = {
    ciphertext?: Uint8Array | Buffer;
    keyVersion?: number;
    contentHash?: string | null;
    retentionAt?: Date | null;
    status?: string;
    softDeletedAt?: Date | null;
    erasedAt?: Date | null;
    updatedByActor?: string;
};

export type VaultDocumentRow = {
    id: string;
    orgId: string;
    subjectId: string;
    fieldKey: string;
    storageObjectKey: string;
    encryptedMetadata: Uint8Array | Buffer;
    keyVersion: number;
    byteSize: number;
    checksumSha256: string;
    retentionAt: Date | null;
    status: string;
};

type VaultDocumentCreate = {
    orgId: string;
    subjectId: string;
    fieldKey: string;
    storageObjectKey: string;
    encryptedMetadata: Uint8Array | Buffer;
    keyVersion: number;
    byteSize: number;
    checksumSha256: string;
    retentionAt?: Date | null;
    uploadedByActor: string;
};

type VaultDocumentUpdate = {
    status?: string;
    softDeletedAt?: Date | null;
    erasedAt?: Date | null;
};

type VaultConsentRow = {
    id: string;
    purposeKey: string;
    granted: boolean;
    grantedAt: Date | null;
    withdrawnAt: Date | null;
};

type VaultConsentCreate = {
    orgId: string;
    subjectId: string;
    purposeKey: string;
    legalBasis: string;
    granted: boolean;
    grantedAt?: Date | null;
    evidenceJson?: Uint8Array | Buffer | null;
    actorId: string;
};

type VaultAuditCreate = {
    orgId: string;
    subjectId?: string | null;
    action: string;
    fieldKey?: string | null;
    documentId?: string | null;
    actorType: string;
    actorId: string;
    policyDecision: string;
    reasonCode?: string | null;
    metadataJson?: Record<string, unknown> | null;
    ipHash?: string | null;
};

export type VaultAuditRow = {
    id: string;
    action: string;
    fieldKey: string | null;
    documentId: string | null;
    actorType: string;
    actorId: string;
    policyDecision: string;
    reasonCode: string | null;
    metadataJson: unknown;
    createdAt: Date;
};

type VaultAccessGrantCreate = {
    orgId: string;
    subjectId: string;
    granteeActorId: string;
    scopeFieldKeys: string[];
    expiresAt: Date;
    reason: string;
    approvedBy?: string | null;
};

type VaultRetentionJobCreate = {
    orgId: string;
    subjectId?: string | null;
    scheduledFor: Date;
    status: string;
};

export function createVaultPrismaRepository(prisma: VaultPrismaClient) {
    return {
        async ensureSubject(
            orgId: string,
            subject: PersonalDataSubjectRef,
        ): Promise<VaultSubjectContext> {
            const existing = await prisma.personalDataSubject.findUnique({
                where: {
                    orgId_subjectType_subjectId: {
                        orgId,
                        subjectType: subject.type,
                        subjectId: subject.id,
                    },
                },
            });
            if (existing) {
                return {
                    vaultSubjectId: existing.id,
                    orgId: existing.orgId,
                    subjectType: existing.subjectType,
                    subjectId: existing.subjectId,
                };
            }
            const created = await prisma.personalDataSubject.create({
                data: {
                    orgId,
                    subjectType: subject.type,
                    subjectId: subject.id,
                },
            });
            return {
                vaultSubjectId: created.id,
                orgId: created.orgId,
                subjectType: created.subjectType,
                subjectId: created.subjectId,
            };
        },

        async getRecord(
            orgId: string,
            vaultSubjectId: string,
            fieldKey: string,
            area?: PersonalDataAreaRef,
        ): Promise<VaultRecordRow | null> {
            const { areaType, areaId } = vaultAreaStorageKeys(area);
            const areaFilter = area
                ? { areaType, areaId }
                : {
                      OR: [
                          { areaType: null, areaId: null },
                          { areaType, areaId },
                      ],
                  };
            return prisma.personalDataRecord.findFirst({
                where: {
                    orgId,
                    subjectId: vaultSubjectId,
                    fieldKey,
                    ...areaFilter,
                    status: "active",
                },
            });
        },

        async listRecords(orgId: string, vaultSubjectId: string): Promise<VaultRecordRow[]> {
            return prisma.personalDataRecord.findMany({
                where: { orgId, subjectId: vaultSubjectId, status: "active" },
            });
        },

        async upsertRecord(
            orgId: string,
            vaultSubjectId: string,
            field: PersonalDataFieldDefinition,
            payload: {
                ciphertext: Buffer;
                keyVersion: number;
                contentHash?: string;
                retentionAt?: Date | null;
                actorId: string;
                area?: PersonalDataAreaRef;
            },
        ): Promise<VaultRecordRow> {
            const { areaType, areaId } = vaultAreaStorageKeys(payload.area);
            return prisma.personalDataRecord.upsert({
                where: {
                    subjectId_fieldKey_areaType_areaId: {
                        subjectId: vaultSubjectId,
                        fieldKey: field.key,
                        areaType,
                        areaId,
                    },
                },
                create: {
                    orgId,
                    subjectId: vaultSubjectId,
                    fieldKey: field.key,
                    category: field.category,
                    dataType: field.dataType,
                    sensitivity: field.sensitivity,
                    legalBasis: field.legalBasis,
                    purpose: field.purpose,
                    ciphertext: payload.ciphertext,
                    keyVersion: payload.keyVersion,
                    contentHash: payload.contentHash ?? null,
                    areaType,
                    areaId,
                    retentionAt: payload.retentionAt ?? null,
                    createdByActor: payload.actorId,
                    updatedByActor: payload.actorId,
                },
                update: {
                    ciphertext: payload.ciphertext,
                    keyVersion: payload.keyVersion,
                    contentHash: payload.contentHash ?? null,
                    retentionAt: payload.retentionAt ?? null,
                    status: "active",
                    softDeletedAt: null,
                    updatedByActor: payload.actorId,
                },
            });
        },

        async softDeleteRecord(
            orgId: string,
            recordId: string,
            actorId: string,
        ): Promise<void> {
            await prisma.personalDataRecord.updateMany({
                where: { orgId, id: recordId },
                data: {
                    status: "soft_deleted",
                    softDeletedAt: new Date(),
                    updatedByActor: actorId,
                },
            });
        },

        async eraseRecordsDue(orgId: string, before: Date): Promise<number> {
            const result = await prisma.personalDataRecord.updateMany({
                where: {
                    orgId,
                    retentionAt: { lte: before },
                    status: "active",
                },
                data: {
                    status: "erased",
                    erasedAt: new Date(),
                    ciphertext: Buffer.alloc(0),
                },
            });
            return result.count;
        },

        async getDocument(
            orgId: string,
            vaultSubjectId: string,
            fieldKey: string,
        ): Promise<VaultDocumentRow | null> {
            return prisma.personalDataDocument.findFirst({
                where: { orgId, subjectId: vaultSubjectId, fieldKey, status: "active" },
            });
        },

        async listDocuments(orgId: string, vaultSubjectId: string): Promise<VaultDocumentRow[]> {
            return prisma.personalDataDocument.findMany({
                where: { orgId, subjectId: vaultSubjectId, status: "active" },
            });
        },

        async createDocument(data: VaultDocumentCreate): Promise<VaultDocumentRow> {
            return prisma.personalDataDocument.create({ data });
        },

        async getActiveConsent(
            orgId: string,
            vaultSubjectId: string,
            purposeKey: string,
        ): Promise<boolean> {
            const row = await prisma.personalDataConsent.findFirst({
                where: { orgId, subjectId: vaultSubjectId, purposeKey },
                orderBy: { createdAt: "desc" },
            });
            if (!row) return false;
            return row.granted && !row.withdrawnAt;
        },

        async grantConsent(data: VaultConsentCreate): Promise<VaultConsentRow> {
            return prisma.personalDataConsent.create({ data });
        },

        async withdrawConsent(
            orgId: string,
            vaultSubjectId: string,
            purposeKey: string,
        ): Promise<void> {
            await prisma.personalDataConsent.updateMany({
                where: { orgId, subjectId: vaultSubjectId, purposeKey, withdrawnAt: null },
                data: { withdrawnAt: new Date(), granted: false },
            });
        },

        async writeAudit(data: VaultAuditCreate): Promise<void> {
            await prisma.personalDataAuditLog.create({ data });
        },

        async listAudit(
            orgId: string,
            vaultSubjectId: string,
            take = 50,
            skip = 0,
        ): Promise<VaultAuditRow[]> {
            return prisma.personalDataAuditLog.findMany({
                where: { orgId, subjectId: vaultSubjectId },
                orderBy: { createdAt: "desc" },
                take,
                skip,
            });
        },

        async getBreakGlassGrant(
            orgId: string,
            vaultSubjectId: string,
            granteeActorId: string,
        ): Promise<{ scopeFieldKeys: string[] } | null> {
            return prisma.personalDataAccessGrant.findFirst({
                where: {
                    orgId,
                    subjectId: vaultSubjectId,
                    granteeActorId,
                    revokedAt: null,
                    expiresAt: { gt: new Date() },
                },
            });
        },

        async createAccessGrant(data: VaultAccessGrantCreate): Promise<{ id: string }> {
            return prisma.personalDataAccessGrant.create({ data });
        },

        async scheduleRetentionJob(data: VaultRetentionJobCreate): Promise<{ id: string }> {
            return prisma.personalDataRetentionJob.create({ data });
        },

        async listPendingRetentionJobs(take = 100): Promise<{ id: string; orgId: string; subjectId: string | null }[]> {
            return prisma.personalDataRetentionJob.findMany({
                where: { status: "pending", scheduledFor: { lte: new Date() } },
                take,
            });
        },

        async completeRetentionJob(
            id: string,
            status: "completed" | "failed",
            errorMessage?: string,
        ): Promise<void> {
            await prisma.personalDataRetentionJob.update({
                where: { id },
                data: {
                    status,
                    processedAt: new Date(),
                    errorMessage: errorMessage ?? null,
                },
            });
        },
    };
}

export type VaultRepository = ReturnType<typeof createVaultPrismaRepository>;
