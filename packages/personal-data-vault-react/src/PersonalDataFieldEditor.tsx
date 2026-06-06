"use client";

import { useState } from "react";
import type { PersonalDataFieldDefinition, FieldValueDto } from "@qualia/personal-data-vault-core";

type Props = {
    field: PersonalDataFieldDefinition;
    dto?: FieldValueDto;
    disabled: boolean;
    onSave: (value: string) => Promise<void>;
};

export function PersonalDataFieldEditor({ field, dto, disabled, onSave }: Readonly<Props>) {
    const [value, setValue] = useState(dto?.displayValue ?? "");
    const [saving, setSaving] = useState(false);

    const isMultiline =
        field.dataType === "text" &&
        (field.key.includes("notes") || field.key.includes("medical") || field.key.includes("accessibility"));

    return (
        <div className="space-y-2">
            {isMultiline ? (
                <textarea
                    className="w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm"
                    rows={3}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => setValue(e.target.value)}
                    maxLength={field.validators?.maxLength}
                />
            ) : (
                <input
                    type={field.dataType === "date" ? "date" : "text"}
                    className="w-full rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm"
                    value={value}
                    disabled={disabled}
                    onChange={(e) => setValue(e.target.value)}
                    maxLength={field.validators?.maxLength}
                />
            )}
            {!disabled ? (
                <button
                    type="button"
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                    disabled={saving}
                    onClick={async () => {
                        setSaving(true);
                        try {
                            await onSave(value);
                        } finally {
                            setSaving(false);
                        }
                    }}
                >
                    {saving ? "Saving…" : "Save"}
                </button>
            ) : null}
            {dto?.hasValue && !dto.displayValue ? (
                <p className="text-xs text-default-400">Value on file</p>
            ) : null}
        </div>
    );
}
