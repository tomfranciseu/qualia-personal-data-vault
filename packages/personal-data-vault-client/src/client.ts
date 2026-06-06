import type {
    FieldValueDto,
    PersonalDataAreaRef,
    PersonalDataSubjectRef,
    VaultActorContext,
} from "@qualia/personal-data-vault-core";
import type { VaultMode } from "@qualia/personal-data-vault-next";

export type VaultClientConfig = {
    baseUrl: string;
    token: string;
};

function buildHeaders(config: VaultClientConfig, actor: VaultActorContext, orgSlug?: string) {
    return {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "X-Actor-Clerk-User-Id": actor.clerkUserId,
        "X-Org-Id": actor.orgId,
        "X-Actor-Type": actor.actorType,
        ...(actor.employeeId ? { "X-Actor-Employee-Id": actor.employeeId } : {}),
        ...(actor.employeeRole ? { "X-Actor-Employee-Role": actor.employeeRole } : {}),
        ...(actor.tripsUserId ? { "X-Actor-Trips-User-Id": actor.tripsUserId } : {}),
        "X-Actor-Is-Admin": actor.isAdmin ? "true" : "false",
        ...(orgSlug ? { "X-Org-Slug": orgSlug } : {}),
    };
}

async function vaultFetch<T>(config: VaultClientConfig, path: string, init: RequestInit & { actor: VaultActorContext; orgSlug?: string }): Promise<T> {
    const { actor, orgSlug, ...rest } = init;
    const res = await fetch(`${config.baseUrl.replace(/\/$/, "")}${path}`, {
        ...rest,
        headers: { ...buildHeaders(config, actor, orgSlug), ...(rest.headers as Record<string, string> | undefined) },
    });
    const body = (await res.json()) as { ok?: boolean; data?: T; error?: string };
    if (!res.ok || body.ok === false) {
        throw new Error(body.error ?? `Vault API error ${res.status}`);
    }
    return body.data as T;
}

export type VaultClient = ReturnType<typeof createVaultClient>;

export function createVaultClient(config: VaultClientConfig) {
    return {
        listFieldMetadata(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            area?: PersonalDataAreaRef;
            mode: VaultMode;
            orgSlug?: string;
        }) {
            return vaultFetch<FieldValueDto[]>(config, "/v1/fields/metadata", {
                method: "POST",
                actor: input.actor,
                orgSlug: input.orgSlug,
                body: JSON.stringify({ subject: input.subject, area: input.area, mode: input.mode }),
            });
        },
        getFieldValue(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            fieldKey: string;
            area?: PersonalDataAreaRef;
            orgSlug?: string;
        }) {
            return vaultFetch<{ value: string | null }>(config, "/v1/fields/value", {
                method: "POST",
                actor: input.actor,
                orgSlug: input.orgSlug,
                body: JSON.stringify({ subject: input.subject, fieldKey: input.fieldKey, area: input.area }),
            });
        },
        upsertFieldValue(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            fieldKey: string;
            value: string;
            area?: PersonalDataAreaRef;
            orgSlug?: string;
        }) {
            return vaultFetch<void>(config, "/v1/fields/upsert", {
                method: "POST",
                actor: input.actor,
                orgSlug: input.orgSlug,
                body: JSON.stringify({ subject: input.subject, fieldKey: input.fieldKey, value: input.value, area: input.area }),
            });
        },
        deleteFieldValue(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            fieldKey: string;
            area?: PersonalDataAreaRef;
            orgSlug?: string;
        }) {
            return vaultFetch<void>(config, "/v1/fields/delete", {
                method: "POST",
                actor: input.actor,
                orgSlug: input.orgSlug,
                body: JSON.stringify({ subject: input.subject, fieldKey: input.fieldKey, area: input.area }),
            });
        },
        async uploadDocument(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            fieldKey: string;
            buffer: Buffer;
            contentType: string;
            originalFilename: string;
            orgSlug: string;
        }) {
            const form = new FormData();
            form.set("subjectType", input.subject.type);
            form.set("subjectId", input.subject.id);
            form.set("fieldKey", input.fieldKey);
            form.set("orgSlug", input.orgSlug);
            form.set("file", new Blob([new Uint8Array(input.buffer)], { type: input.contentType }), input.originalFilename);
            const res = await fetch(`${config.baseUrl.replace(/\/$/, "")}/v1/documents/upload`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${config.token}`,
                    "X-Actor-Clerk-User-Id": input.actor.clerkUserId,
                    "X-Org-Id": input.actor.orgId,
                    "X-Actor-Type": input.actor.actorType,
                    "X-Actor-Is-Admin": input.actor.isAdmin ? "true" : "false",
                },
                body: form,
            });
            const body = (await res.json()) as { ok?: boolean; data?: { documentId: string }; error?: string };
            if (!res.ok || body.ok === false) throw new Error(body.error ?? "Upload failed");
            return body.data!;
        },
        getDocumentDownloadUrl(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            fieldKey: string;
            orgSlug: string;
        }) {
            return vaultFetch<{ url: string }>(config, "/v1/documents/download-url", {
                method: "POST",
                actor: input.actor,
                orgSlug: input.orgSlug,
                body: JSON.stringify({ subject: input.subject, fieldKey: input.fieldKey, orgSlug: input.orgSlug }),
            });
        },
        exportSubjectData(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            area?: PersonalDataAreaRef;
            orgSlug?: string;
        }) {
            return vaultFetch<Record<string, string | null>>(config, "/v1/subjects/export", {
                method: "POST",
                actor: input.actor,
                orgSlug: input.orgSlug,
                body: JSON.stringify({ subject: input.subject, area: input.area }),
            });
        },
        listAuditLogs(input: { actor: VaultActorContext; subject: PersonalDataSubjectRef; orgSlug?: string }) {
            return vaultFetch<unknown[]>(config, "/v1/audit/list", {
                method: "POST",
                actor: input.actor,
                orgSlug: input.orgSlug,
                body: JSON.stringify({ subject: input.subject }),
            });
        },
        grantConsent(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            purposeKey: string;
            legalBasis: string;
            orgSlug?: string;
        }) {
            return vaultFetch<void>(config, "/v1/consent/grant", {
                method: "POST",
                actor: input.actor,
                orgSlug: input.orgSlug,
                body: JSON.stringify({ subject: input.subject, purposeKey: input.purposeKey, legalBasis: input.legalBasis }),
            });
        },
        withdrawConsent(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            purposeKey: string;
            orgSlug?: string;
        }) {
            return vaultFetch<void>(config, "/v1/consent/withdraw", {
                method: "POST",
                actor: input.actor,
                orgSlug: input.orgSlug,
                body: JSON.stringify({ subject: input.subject, purposeKey: input.purposeKey }),
            });
        },
        requestErasure(input: { actor: VaultActorContext; subject: PersonalDataSubjectRef; orgSlug?: string }) {
            return vaultFetch<void>(config, "/v1/subjects/erase", {
                method: "POST",
                actor: input.actor,
                orgSlug: input.orgSlug,
                body: JSON.stringify({ subject: input.subject }),
            });
        },
        getCompletionStatus(input: {
            actor: VaultActorContext;
            subject: PersonalDataSubjectRef;
            requiredFieldKeys: string[];
            orgSlug?: string;
        }) {
            return vaultFetch<{ completed: number; total: number }>(config, "/v1/subjects/completion", {
                method: "POST",
                actor: input.actor,
                orgSlug: input.orgSlug,
                body: JSON.stringify({ subject: input.subject, requiredFieldKeys: input.requiredFieldKeys }),
            });
        },
    };
}
