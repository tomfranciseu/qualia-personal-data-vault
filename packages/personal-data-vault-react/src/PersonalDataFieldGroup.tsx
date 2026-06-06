"use client";

import type { ReactNode } from "react";
import type { PersonalDataFieldDefinition, FieldValueDto } from "@qualia/personal-data-vault-core";
import type { VaultMode } from "@qualia/personal-data-vault-next";
import { PersonalDataFieldEditor } from "./PersonalDataFieldEditor";
import { PersonalDataFileUpload } from "./PersonalDataFileUpload";
import { PersonalDataRetentionBadge } from "./PersonalDataRetentionBadge";

export type VaultFieldEditorRenderProps = {
    field: PersonalDataFieldDefinition;
    dto?: FieldValueDto;
    disabled: boolean;
    onSave: (value: string) => Promise<void>;
};

type Props = {
    category: string;
    fields: PersonalDataFieldDefinition[];
    dtos: FieldValueDto[];
    mode: VaultMode;
    pending: boolean;
    onSave: (fieldKey: string, value: string) => Promise<void>;
    onUpload?: (fieldKey: string, formData: FormData) => Promise<void>;
    renderFieldEditor?: (props: VaultFieldEditorRenderProps) => ReactNode;
};

function titleCase(s: string): string {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PersonalDataFieldGroup({
    category,
    fields,
    dtos,
    mode,
    pending,
    onSave,
    onUpload,
    renderFieldEditor,
}: Readonly<Props>) {
    const dtoMap = new Map(dtos.map((d) => [d.fieldKey, d]));

    return (
        <section className="rounded-xl border border-default-200 bg-content1 p-4 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-default-500">
                {titleCase(category)}
            </h3>
            <div className="space-y-4">
                {fields.map((field) => {
                    const dto = dtoMap.get(field.key);
                    if (!dto?.canView && mode !== "admin") {
                        return (
                            <p key={field.key} className="text-sm text-default-400">
                                {field.label}: not visible for your role
                            </p>
                        );
                    }

                    const editorProps: VaultFieldEditorRenderProps = {
                        field,
                        dto,
                        disabled: !dto?.canEdit || pending || mode === "readonly",
                        onSave: (value) => onSave(field.key, value),
                    };

                    return (
                        <div key={field.key} className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-foreground">{field.label}</span>
                                <PersonalDataRetentionBadge field={field} />
                            </div>
                            {field.dataType === "file" && onUpload ? (
                                <PersonalDataFileUpload
                                    field={field}
                                    disabled={!dto?.canEdit || pending}
                                    hasFile={Boolean(dto?.hasValue)}
                                    onUpload={(formData) => onUpload(field.key, formData)}
                                />
                            ) : renderFieldEditor ? (
                                renderFieldEditor(editorProps)
                            ) : (
                                <PersonalDataFieldEditor
                                    field={field}
                                    dto={dto}
                                    disabled={editorProps.disabled}
                                    onSave={editorProps.onSave}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
