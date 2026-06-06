"use client";

import { useRef, useState } from "react";
import type { PersonalDataFieldDefinition } from "@qualia/personal-data-vault-core";

type Props = {
    field: PersonalDataFieldDefinition;
    disabled: boolean;
    hasFile: boolean;
    onUpload: (formData: FormData) => Promise<void>;
};

export function PersonalDataFileUpload({ field, disabled, hasFile, onUpload }: Readonly<Props>) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    return (
        <div className="space-y-2">
            {hasFile ? (
                <p className="text-xs text-success-600">Document uploaded (encrypted)</p>
            ) : (
                <p className="text-xs text-default-400">No document on file</p>
            )}
            <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept={field.validators?.allowedMimeTypes?.join(",")}
                disabled={disabled}
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                        const fd = new FormData();
                        fd.set("file", file);
                        await onUpload(fd);
                    } finally {
                        setUploading(false);
                        if (inputRef.current) inputRef.current.value = "";
                    }
                }}
            />
            <button
                type="button"
                className="rounded-lg border border-default-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
            >
                {uploading ? "Uploading…" : hasFile ? "Replace file" : "Upload file"}
            </button>
        </div>
    );
}
