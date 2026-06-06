import type { PersonalDataFieldDefinition } from "@qualia/personal-data-vault-core";

type Props = {
    field: PersonalDataFieldDefinition;
};

export function PersonalDataRetentionBadge({ field }: Readonly<Props>) {
    const parts: string[] = [];
    if (field.retention.deleteAfterTripEnds) parts.push("after trip");
    if (field.retention.deleteAfterDays) parts.push(`+${field.retention.deleteAfterDays}d`);
    if (parts.length === 0) return null;

    return (
        <span
            className="rounded-full bg-default-100 px-2 py-0.5 text-[10px] font-medium uppercase text-default-500"
            title={field.purpose}
        >
            Retention: {parts.join(" ")}
        </span>
    );
}
