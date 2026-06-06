import {
    DefaultPersonalDataPolicy,
    evaluateFieldRetention,
    getFieldByKey,
    type PersonalDataAreaRef,
    type PersonalDataEncryptionService,
    type PersonalDataFieldDefinition,
    type PersonalDataPolicy,
    type PersonalDataSubjectRef,
    type FieldValueDto,
    type VaultActorContext,
    type VaultAuditEntryInput,
    type VaultStorageAdapter,
} from "@qualia/personal-data-vault-core";
import type { VaultRepository } from "@qualia/personal-data-vault-prisma";

export type VaultServiceDeps = {
    repository: VaultRepository;
    encryption: PersonalDataEncryptionService;
    storage?: VaultStorageAdapter;
    policy?: PersonalDataPolicy;
    fieldCatalog: PersonalDataFieldDefinition[];
    resolveRetentionContext?: (input: {
        orgId: string;
        subject: PersonalDataSubjectRef;
        area?: PersonalDataAreaRef;
    }) => Promise<{ tripEndDate?: Date | null; subjectLastActiveAt?: Date | null }>;
};

export type VaultMode = "self-service" | "staff" | "admin" | "readonly";

function bufferToPlainString(buf: Buffer): string {
    return buf.toString("utf8");
}

function maskSensitiveValue(value: string, sensitivity: string): string {
    if (sensitivity === "normal") return value;
    if (value.length <= 4) return "••••";
    return `••••${value.slice(-4)}`;
}

export function createVaultService(deps: VaultServiceDeps) {
    const policy = deps.policy ?? new DefaultPersonalDataPolicy();

    async function audit(entry: VaultAuditEntryInput): Promise<void> {
        await deps.repository.writeAudit({
            orgId: entry.orgId,
            subjectId: entry.vaultSubjectId ?? null,
            action: entry.action,
            fieldKey: entry.fieldKey ?? null,
            documentId: entry.documentId ?? null,
            actorType: entry.actorType,
            actorId: entry.actorId,
            policyDecision: entry.policyDecision,
            reasonCode: entry.reasonCode ?? null,
            metadataJson: entry.metadata ?? null,
            ipHash: entry.ipHash ?? null,
        });
    }

    async function checkPolicy(
        actor: VaultActorContext,
        subject: PersonalDataSubjectRef,
        field: PersonalDataFieldDefinition,
        action: import("@qualia/personal-data-vault-core").PersonalDataAction,
        vaultSubjectId: string,
        area?: PersonalDataAreaRef,
    ) {
        const hasActiveConsent = field.consent
            ? await deps.repository.getActiveConsent(actor.orgId, vaultSubjectId, field.consent.purposeKey)
            : true;

        const grant = await deps.repository.getBreakGlassGrant(
            actor.orgId,
            vaultSubjectId,
            actor.clerkUserId,
        );

        const hasBreakGlassGrant = Boolean(
            grant &&
                (grant.scopeFieldKeys.includes("*") || grant.scopeFieldKeys.includes(field.key)),
        );

        return policy.can({
            actor,
            subject,
            area,
            field,
            action,
            hasActiveConsent,
            hasBreakGlassGrant,
        });
    }

    return {
        async listFieldMetadata(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            area?: PersonalDataAreaRef;
            mode: VaultMode;
        }): Promise<FieldValueDto[]> {
            const ctx = await deps.repository.ensureSubject(input.actor.orgId, input.subject);
            const records = await deps.repository.listRecords(input.actor.orgId, ctx.vaultSubjectId);
            const recordByKey = new Map(records.map((r) => [r.fieldKey, r]));

            const dtos: FieldValueDto[] = [];

            for (const field of deps.fieldCatalog) {
                const decision = await checkPolicy(
                    input.actor,
                    input.subject,
                    field,
                    "view",
                    ctx.vaultSubjectId,
                    input.area,
                );
                const canView = decision.allow;
                const editDecision =
                    input.mode === "readonly"
                        ? { allow: false as const, reasonCode: "readonly_mode" }
                        : await checkPolicy(
                              input.actor,
                              input.subject,
                              field,
                              "update",
                              ctx.vaultSubjectId,
                              input.area,
                          );
                const canEdit = editDecision.allow && input.mode !== "readonly";

                await audit({
                    orgId: input.actor.orgId,
                    vaultSubjectId: ctx.vaultSubjectId,
                    action: "read",
                    fieldKey: field.key,
                    actorType: input.actor.actorType,
                    actorId: input.actor.clerkUserId,
                    policyDecision: decision.allow ? "allow" : "deny",
                    reasonCode: decision.allow ? undefined : decision.reasonCode,
                    metadata: { listMetadata: true },
                });

                const rec = recordByKey.get(field.key);
                let displayValue: string | undefined;
                if (canView && rec && field.dataType !== "file") {
                    const decrypted = await deps.encryption.decryptValue({
                        ciphertext: Buffer.from(rec.ciphertext),
                        keyVersion: rec.keyVersion,
                    });
                    const plain = bufferToPlainString(decrypted.plaintext);
                    displayValue =
                        input.mode === "staff" || input.mode === "admin" || input.mode === "self-service"
                            ? maskSensitiveValue(plain, field.sensitivity)
                            : maskSensitiveValue(plain, field.sensitivity);
                    if (
                        (input.mode === "staff" || input.mode === "admin") &&
                        (field.sensitivity === "normal" || input.actor.isAdmin)
                    ) {
                        displayValue = plain;
                    }
                    if (input.mode === "self-service" && field.visibility.travellerCanView) {
                        displayValue = plain;
                    }
                }

                dtos.push({
                    fieldKey: field.key,
                    label: field.label,
                    category: field.category,
                    dataType: field.dataType,
                    sensitivity: field.sensitivity,
                    canView,
                    canEdit,
                    hasValue: Boolean(rec) || Boolean(await deps.repository.getDocument(input.actor.orgId, ctx.vaultSubjectId, field.key)),
                    displayValue,
                });
            }

            return dtos;
        },

        async getFieldValue(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            fieldKey: string;
            area?: PersonalDataAreaRef;
        }): Promise<{ value: string | null }> {
            const field = getFieldByKey(deps.fieldCatalog, input.fieldKey);
            if (!field) throw new Error(`Unknown field: ${input.fieldKey}`);

            const ctx = await deps.repository.ensureSubject(input.actor.orgId, input.subject);
            const decision = await checkPolicy(
                input.actor,
                input.subject,
                field,
                "view",
                ctx.vaultSubjectId,
                input.area,
            );

            await audit({
                orgId: input.actor.orgId,
                vaultSubjectId: ctx.vaultSubjectId,
                action: "read",
                fieldKey: field.key,
                actorType: input.actor.actorType,
                actorId: input.actor.clerkUserId,
                policyDecision: decision.allow ? "allow" : "deny",
                reasonCode: decision.allow ? undefined : decision.reasonCode,
            });

            if (!decision.allow) {
                throw new Error(`Access denied: ${decision.reasonCode}`);
            }

            const rec = await deps.repository.getRecord(
                input.actor.orgId,
                ctx.vaultSubjectId,
                field.key,
                input.area,
            );
            if (!rec) return { value: null };

            const decrypted = await deps.encryption.decryptValue({
                ciphertext: Buffer.from(rec.ciphertext),
                keyVersion: rec.keyVersion,
            });
            return { value: bufferToPlainString(decrypted.plaintext) };
        },

        async upsertFieldValue(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            fieldKey: string;
            value: string;
            area?: PersonalDataAreaRef;
        }): Promise<void> {
            const field = getFieldByKey(deps.fieldCatalog, input.fieldKey);
            if (!field) throw new Error(`Unknown field: ${input.fieldKey}`);
            if (field.dataType === "file") throw new Error("Use uploadDocument for file fields");

            const ctx = await deps.repository.ensureSubject(input.actor.orgId, input.subject);
            const existing = await deps.repository.getRecord(
                input.actor.orgId,
                ctx.vaultSubjectId,
                field.key,
                input.area,
            );
            const action = existing ? "update" : "create";
            const decision = await checkPolicy(
                input.actor,
                input.subject,
                field,
                action,
                ctx.vaultSubjectId,
                input.area,
            );

            await audit({
                orgId: input.actor.orgId,
                vaultSubjectId: ctx.vaultSubjectId,
                action: action === "create" ? "create" : "update",
                fieldKey: field.key,
                actorType: input.actor.actorType,
                actorId: input.actor.clerkUserId,
                policyDecision: decision.allow ? "allow" : "deny",
                reasonCode: decision.allow ? undefined : decision.reasonCode,
            });

            if (!decision.allow) {
                throw new Error(`Access denied: ${decision.reasonCode}`);
            }

            const encrypted = await deps.encryption.encryptValue({ plaintext: input.value });
            const retentionCtx = deps.resolveRetentionContext
                ? await deps.resolveRetentionContext({
                      orgId: input.actor.orgId,
                      subject: input.subject,
                      area: input.area,
                  })
                : {};
            const retentionAt = evaluateFieldRetention(field, retentionCtx);

            await deps.repository.upsertRecord(input.actor.orgId, ctx.vaultSubjectId, field, {
                ciphertext: encrypted.ciphertext,
                keyVersion: encrypted.keyVersion,
                contentHash: encrypted.contentHash,
                retentionAt,
                actorId: input.actor.clerkUserId,
                area: input.area,
            });
        },

        async deleteFieldValue(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            fieldKey: string;
            area?: PersonalDataAreaRef;
        }): Promise<void> {
            const field = getFieldByKey(deps.fieldCatalog, input.fieldKey);
            if (!field) throw new Error(`Unknown field: ${input.fieldKey}`);

            const ctx = await deps.repository.ensureSubject(input.actor.orgId, input.subject);
            const decision = await checkPolicy(
                input.actor,
                input.subject,
                field,
                "delete",
                ctx.vaultSubjectId,
                input.area,
            );

            await audit({
                orgId: input.actor.orgId,
                vaultSubjectId: ctx.vaultSubjectId,
                action: "delete",
                fieldKey: field.key,
                actorType: input.actor.actorType,
                actorId: input.actor.clerkUserId,
                policyDecision: decision.allow ? "allow" : "deny",
                reasonCode: decision.allow ? undefined : decision.reasonCode,
            });

            if (!decision.allow) throw new Error(`Access denied: ${decision.reasonCode}`);

            const rec = await deps.repository.getRecord(
                input.actor.orgId,
                ctx.vaultSubjectId,
                field.key,
                input.area,
            );
            if (rec) {
                await deps.repository.softDeleteRecord(input.actor.orgId, rec.id, input.actor.clerkUserId);
            }
        },

        async uploadDocument(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            fieldKey: string;
            buffer: Buffer;
            contentType: string;
            originalFilename: string;
            orgSlug: string;
        }): Promise<{ documentId: string }> {
            if (!deps.storage) throw new Error("Storage adapter not configured");

            const field = getFieldByKey(deps.fieldCatalog, input.fieldKey);
            if (!field || field.dataType !== "file") throw new Error(`Invalid file field: ${input.fieldKey}`);

            const ctx = await deps.repository.ensureSubject(input.actor.orgId, input.subject);
            const decision = await checkPolicy(
                input.actor,
                input.subject,
                field,
                "create",
                ctx.vaultSubjectId,
            );

            await audit({
                orgId: input.actor.orgId,
                vaultSubjectId: ctx.vaultSubjectId,
                action: "create",
                fieldKey: field.key,
                actorType: input.actor.actorType,
                actorId: input.actor.clerkUserId,
                policyDecision: decision.allow ? "allow" : "deny",
                reasonCode: decision.allow ? undefined : decision.reasonCode,
            });

            if (!decision.allow) throw new Error(`Access denied: ${decision.reasonCode}`);

            if (field.validators?.maxFileBytes && input.buffer.length > field.validators.maxFileBytes) {
                throw new Error("File too large");
            }
            if (
                field.validators?.allowedMimeTypes &&
                !field.validators.allowedMimeTypes.includes(input.contentType)
            ) {
                throw new Error("MIME type not allowed");
            }

            const objectKey = `${input.subject.type}/${input.subject.id}/${field.key}/${Date.now()}`;
            const stored = await deps.storage.putObject({
                orgId: `${input.actor.orgId}_${input.orgSlug}`,
                objectKey,
                buffer: input.buffer,
                contentType: input.contentType,
            });

            const metaPlain = JSON.stringify({
                contentType: input.contentType,
                originalFilename: input.originalFilename,
            });
            const encMeta = await deps.encryption.encryptValue({ plaintext: metaPlain });

            const retentionCtx = deps.resolveRetentionContext
                ? await deps.resolveRetentionContext({
                      orgId: input.actor.orgId,
                      subject: input.subject,
                  })
                : {};
            const retentionAt = evaluateFieldRetention(field, retentionCtx);

            const doc = await deps.repository.createDocument({
                orgId: input.actor.orgId,
                subjectId: ctx.vaultSubjectId,
                fieldKey: field.key,
                storageObjectKey: stored.objectKey,
                encryptedMetadata: encMeta.ciphertext,
                keyVersion: encMeta.keyVersion,
                byteSize: stored.byteSize,
                checksumSha256: stored.checksumSha256,
                retentionAt,
                uploadedByActor: input.actor.clerkUserId,
            });

            return { documentId: doc.id };
        },

        async getDocumentDownloadUrl(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            fieldKey: string;
            orgSlug: string;
        }): Promise<{ url: string }> {
            if (!deps.storage) throw new Error("Storage adapter not configured");

            const field = getFieldByKey(deps.fieldCatalog, input.fieldKey);
            if (!field) throw new Error(`Unknown field: ${input.fieldKey}`);

            const ctx = await deps.repository.ensureSubject(input.actor.orgId, input.subject);
            const decision = await checkPolicy(
                input.actor,
                input.subject,
                field,
                "view",
                ctx.vaultSubjectId,
            );

            const doc = await deps.repository.getDocument(
                input.actor.orgId,
                ctx.vaultSubjectId,
                field.key,
            );

            await audit({
                orgId: input.actor.orgId,
                vaultSubjectId: ctx.vaultSubjectId,
                action: "read",
                fieldKey: field.key,
                documentId: doc?.id,
                actorType: input.actor.actorType,
                actorId: input.actor.clerkUserId,
                policyDecision: decision.allow ? "allow" : "deny",
                reasonCode: decision.allow ? undefined : decision.reasonCode,
            });

            if (!decision.allow || !doc) throw new Error(`Access denied or document missing`);

            const url = await deps.storage.getSignedDownloadUrl({
                orgId: `${input.actor.orgId}_${input.orgSlug}`,
                objectKey: doc.storageObjectKey,
            });

            return { url };
        },

        async exportSubjectData(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            area?: PersonalDataAreaRef;
        }): Promise<Record<string, string | null>> {
            const ctx = await deps.repository.ensureSubject(input.actor.orgId, input.subject);
            const exportData: Record<string, string | null> = {};

            for (const field of deps.fieldCatalog) {
                const decision = await checkPolicy(
                    input.actor,
                    input.subject,
                    field,
                    "export",
                    ctx.vaultSubjectId,
                    input.area,
                );
                if (!decision.allow) continue;

                if (field.dataType === "file") {
                    exportData[field.key] = "[document on file]";
                    continue;
                }

                const rec = await deps.repository.getRecord(
                    input.actor.orgId,
                    ctx.vaultSubjectId,
                    field.key,
                    input.area,
                );
                if (!rec) {
                    exportData[field.key] = null;
                    continue;
                }
                const decrypted = await deps.encryption.decryptValue({
                    ciphertext: Buffer.from(rec.ciphertext),
                    keyVersion: rec.keyVersion,
                });
                exportData[field.key] = bufferToPlainString(decrypted.plaintext);
            }

            await audit({
                orgId: input.actor.orgId,
                vaultSubjectId: ctx.vaultSubjectId,
                action: "export",
                actorType: input.actor.actorType,
                actorId: input.actor.clerkUserId,
                policyDecision: "allow",
                metadata: { fieldCount: Object.keys(exportData).length },
            });

            return exportData;
        },

        async listAuditLogs(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            take?: number;
        }) {
            const ctx = await deps.repository.ensureSubject(input.actor.orgId, input.subject);

            for (const field of deps.fieldCatalog.slice(0, 1)) {
                const decision = await checkPolicy(
                    input.actor,
                    input.subject,
                    field,
                    "view_audit",
                    ctx.vaultSubjectId,
                );
                if (!decision.allow) throw new Error(`Access denied: ${decision.reasonCode}`);
            }

            return deps.repository.listAudit(input.actor.orgId, ctx.vaultSubjectId, input.take ?? 50);
        },

        async grantConsent(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            purposeKey: string;
            legalBasis: string;
        }): Promise<void> {
            const ctx = await deps.repository.ensureSubject(input.actor.orgId, input.subject);
            await deps.repository.grantConsent({
                orgId: input.actor.orgId,
                subjectId: ctx.vaultSubjectId,
                purposeKey: input.purposeKey,
                legalBasis: input.legalBasis,
                granted: true,
                grantedAt: new Date(),
                actorId: input.actor.clerkUserId,
            });
            await audit({
                orgId: input.actor.orgId,
                vaultSubjectId: ctx.vaultSubjectId,
                action: "consent_grant",
                actorType: input.actor.actorType,
                actorId: input.actor.clerkUserId,
                policyDecision: "allow",
                metadata: { purposeKey: input.purposeKey },
            });
        },

        async withdrawConsent(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            purposeKey: string;
        }): Promise<void> {
            const ctx = await deps.repository.ensureSubject(input.actor.orgId, input.subject);
            await deps.repository.withdrawConsent(input.actor.orgId, ctx.vaultSubjectId, input.purposeKey);
            await audit({
                orgId: input.actor.orgId,
                vaultSubjectId: ctx.vaultSubjectId,
                action: "consent_withdraw",
                actorType: input.actor.actorType,
                actorId: input.actor.clerkUserId,
                policyDecision: "allow",
                metadata: { purposeKey: input.purposeKey },
            });
        },

        async requestErasure(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
        }): Promise<void> {
            const ctx = await deps.repository.ensureSubject(input.actor.orgId, input.subject);
            await deps.repository.scheduleRetentionJob({
                orgId: input.actor.orgId,
                subjectId: ctx.vaultSubjectId,
                scheduledFor: new Date(),
                status: "pending",
            });
            await audit({
                orgId: input.actor.orgId,
                vaultSubjectId: ctx.vaultSubjectId,
                action: "erase",
                actorType: input.actor.actorType,
                actorId: input.actor.clerkUserId,
                policyDecision: "allow",
            });
        },

        async runRetentionCleanup(orgId: string): Promise<{ recordsErased: number }> {
            const now = new Date();
            const recordsErased = await deps.repository.eraseRecordsDue(orgId, now);
            return { recordsErased };
        },

        async getCompletionStatus(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            requiredFieldKeys: string[];
        }): Promise<{ completed: number; total: number }> {
            const ctx = await deps.repository.ensureSubject(input.actor.orgId, input.subject);
            const records = await deps.repository.listRecords(input.actor.orgId, ctx.vaultSubjectId);
            const keysWithValues = new Set(records.map((r) => r.fieldKey));
            const completed = input.requiredFieldKeys.filter((k) => keysWithValues.has(k)).length;
            return { completed, total: input.requiredFieldKeys.length };
        },
    };
}

export type VaultService = ReturnType<typeof createVaultService>;
