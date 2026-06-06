"use client";

import type { PersonalDataFieldDefinition } from "@qualia/personal-data-vault-core";

type Props = {
    fields: PersonalDataFieldDefinition[];
    onGrant: (purposeKey: string, legalBasis: string) => Promise<void>;
};

export function PersonalDataConsentNotice({ fields, onGrant }: Readonly<Props>) {
    const purposes = [...new Set(fields.map((f) => f.consent?.purposeKey).filter(Boolean))] as string[];

    return (
        <div className="rounded-xl border border-warning-200 bg-warning-50 p-4 text-sm">
            <p className="mb-2 font-semibold text-warning-900">Consent required</p>
            <p className="mb-3 text-warning-800">
                Some fields contain special category data. Please confirm you consent to processing for
                the stated purposes.
            </p>
            <ul className="mb-3 list-inside list-disc text-warning-800">
                {purposes.map((pk) => (
                    <li key={pk}>{pk.replace(/_/g, " ")}</li>
                ))}
            </ul>
            <button
                type="button"
                className="rounded-lg bg-warning-700 px-3 py-1.5 text-xs font-semibold text-white"
                onClick={() => onGrant(purposes[0] ?? "general", "explicit_consent")}
            >
                I consent
            </button>
        </div>
    );
}
