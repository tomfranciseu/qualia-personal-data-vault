"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState, useTransition } from "react";
import type {
    PersonalDataAreaRef,
    PersonalDataFieldDefinition,
    PersonalDataSubjectRef,
    FieldValueDto,
} from "@qualia/personal-data-vault-core";
import type { VaultMode } from "@qualia/personal-data-vault-next";
import {
    PersonalDataFieldGroup,
    type VaultFieldEditorRenderProps,
} from "./PersonalDataFieldGroup";
import { PersonalDataConsentNotice } from "./PersonalDataConsentNotice";
import { PersonalDataExportButton } from "./PersonalDataExportButton";
import { PersonalDataDeleteRequestButton } from "./PersonalDataDeleteRequestButton";
import { PersonalDataAuditTimeline } from "./PersonalDataAuditTimeline";
import { PersonalDataAccessWarning } from "./PersonalDataAccessWarning";

export type { VaultFieldEditorRenderProps };

export type PersonalDataAreaActions = {
    listFieldMetadata: (
        orgSlug: string,
        subject: PersonalDataSubjectRef,
        mode: VaultMode,
        area?: PersonalDataAreaRef,
    ) => Promise<{ success: boolean; data?: FieldValueDto[]; error?: string }>;
    upsertFieldValue: (
        orgSlug: string,
        subject: PersonalDataSubjectRef,
        fieldKey: string,
        value: string,
        area?: PersonalDataAreaRef,
    ) => Promise<{ success: boolean; error?: string }>;
    uploadDocument?: (
        orgSlug: string,
        subject: PersonalDataSubjectRef,
        fieldKey: string,
        formData: FormData,
    ) => Promise<{ success: boolean; error?: string }>;
    grantConsent?: (
        orgSlug: string,
        subject: PersonalDataSubjectRef,
        purposeKey: string,
        legalBasis: string,
    ) => Promise<{ success: boolean; error?: string }>;
    exportData?: (
        orgSlug: string,
        subject: PersonalDataSubjectRef,
        area?: PersonalDataAreaRef,
    ) => Promise<{ success: boolean; data?: Record<string, string | null>; error?: string }>;
    requestErasure?: (
        orgSlug: string,
        subject: PersonalDataSubjectRef,
    ) => Promise<{ success: boolean; error?: string }>;
    listAuditLogs?: (
        orgSlug: string,
        subject: PersonalDataSubjectRef,
    ) => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
};

export type PersonalDataAreaProps = {
    orgSlug: string;
    subject: PersonalDataSubjectRef;
    area?: PersonalDataAreaRef;
    fields: PersonalDataFieldDefinition[];
    mode: VaultMode;
    actions: PersonalDataAreaActions;
    showAudit?: boolean;
    showGdprTools?: boolean;
    renderFieldEditor?: (props: VaultFieldEditorRenderProps) => ReactNode;
};

export function PersonalDataArea({
    orgSlug,
    subject,
    area,
    fields,
    mode,
    actions,
    showAudit = false,
    showGdprTools = false,
    renderFieldEditor,
}: Readonly<PersonalDataAreaProps>) {
    const [dtos, setDtos] = useState<FieldValueDto[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const load = useCallback(() => {
        startTransition(async () => {
            const result = await actions.listFieldMetadata(orgSlug, subject, mode, area);
            if (result.success && result.data) {
                setDtos(result.data);
                setError(null);
            } else {
                setError(result.error ?? "Failed to load personal data");
            }
        });
    }, [actions, orgSlug, subject, mode, area]);

    useEffect(() => {
        load();
    }, [load]);

    const byCategory = fields.reduce<Record<string, PersonalDataFieldDefinition[]>>((acc, f) => {
        if (!acc[f.category]) acc[f.category] = [];
        acc[f.category]!.push(f);
        return acc;
    }, {});

    const consentFields = fields.filter((f) => f.consent);

    return (
        <div className="space-y-6" data-testid="personal-data-area">
            {error ? <PersonalDataAccessWarning message={error} /> : null}

            {consentFields.length > 0 && mode === "self-service" && actions.grantConsent ? (
                <PersonalDataConsentNotice
                    fields={consentFields}
                    onGrant={async (purposeKey, legalBasis) => {
                        await actions.grantConsent!(orgSlug, subject, purposeKey, legalBasis);
                        load();
                    }}
                />
            ) : null}

            {Object.entries(byCategory).map(([category, categoryFields]) => (
                <PersonalDataFieldGroup
                    key={category}
                    category={category}
                    fields={categoryFields}
                    dtos={dtos}
                    mode={mode}
                    pending={pending}
                    renderFieldEditor={renderFieldEditor}
                    onSave={async (fieldKey, value) => {
                        const result = await actions.upsertFieldValue(
                            orgSlug,
                            subject,
                            fieldKey,
                            value,
                            area,
                        );
                        if (result.success) load();
                        else setError(result.error ?? "Save failed");
                    }}
                    onUpload={
                        actions.uploadDocument
                            ? async (fieldKey, formData) => {
                                  const result = await actions.uploadDocument!(
                                      orgSlug,
                                      subject,
                                      fieldKey,
                                      formData,
                                  );
                                  if (result.success) load();
                                  else setError(result.error ?? "Upload failed");
                              }
                            : undefined
                    }
                />
            ))}

            {showGdprTools && actions.exportData && actions.requestErasure ? (
                <div className="flex flex-wrap gap-3 border-t border-default-200 pt-4">
                    <PersonalDataExportButton
                        onExport={async () => {
                            const result = await actions.exportData!(orgSlug, subject, area);
                            if (result.success && result.data) {
                                const blob = new Blob([JSON.stringify(result.data, null, 2)], {
                                    type: "application/json",
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `personal-data-export-${subject.id}.json`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }
                        }}
                    />
                    <PersonalDataDeleteRequestButton
                        onRequest={async () => {
                            await actions.requestErasure!(orgSlug, subject);
                        }}
                    />
                </div>
            ) : null}

            {showAudit && actions.listAuditLogs ? (
                <PersonalDataAuditTimeline
                    onLoad={async () => {
                        const result = await actions.listAuditLogs!(orgSlug, subject);
                        return result.success ? (result.data ?? []) : [];
                    }}
                />
            ) : null}
        </div>
    );
}
