import { z } from "zod";
import type { PersonalDataFieldDefinition } from "../types.js";

const fieldDefinitionSchema = z.object({
    key: z
        .string()
        .min(1)
        .regex(/^[a-z][a-z0-9_]*$/, "Field key must be snake_case"),
    label: z.string().min(1),
    category: z.string().min(1),
    dataType: z.enum(["text", "date", "boolean", "structured", "file", "json"]),
    sensitivity: z.enum(["normal", "sensitive", "special_category"]),
    purpose: z.string().min(1),
    legalBasis: z.enum([
        "contract",
        "legal_obligation",
        "vital_interest",
        "public_task",
        "legitimate_interest",
        "explicit_consent",
    ]),
    article9Condition: z.string().optional(),
    retention: z.object({
        deleteAfterTripEnds: z.boolean().optional(),
        deleteAfterDays: z.number().int().positive().optional(),
        deleteAfterSubjectInactiveDays: z.number().int().positive().optional(),
        fixedExpiry: z.string().optional(),
    }),
    visibility: z.object({
        travellerCanView: z.boolean().optional(),
        travellerCanEdit: z.boolean().optional(),
        staffRoles: z.array(z.string()).optional(),
        requiresConsent: z.boolean().optional(),
        breakGlassOnly: z.boolean().optional(),
    }),
    consent: z
        .object({
            purposeKey: z.string().min(1),
            legalBasis: z.enum([
                "contract",
                "legal_obligation",
                "vital_interest",
                "public_task",
                "legitimate_interest",
                "explicit_consent",
            ]),
            article9Condition: z.string().optional(),
        })
        .optional(),
    validators: z
        .object({
            maxLength: z.number().int().positive().optional(),
            allowedMimeTypes: z.array(z.string()).optional(),
            maxFileBytes: z.number().int().positive().optional(),
        })
        .optional(),
});

export function defineField(definition: PersonalDataFieldDefinition): PersonalDataFieldDefinition {
    return fieldDefinitionSchema.parse(definition) as PersonalDataFieldDefinition;
}

export function defineFieldCatalog(
    definitions: PersonalDataFieldDefinition[],
): PersonalDataFieldDefinition[] {
    const keys = new Set<string>();
    const validated: PersonalDataFieldDefinition[] = [];
    for (const def of definitions) {
        const field = defineField(def);
        if (keys.has(field.key)) {
            throw new Error(`Duplicate field key in catalog: ${field.key}`);
        }
        keys.add(field.key);
        validated.push(field);
    }
    return validated;
}

export function getFieldByKey(
    catalog: PersonalDataFieldDefinition[],
    key: string,
): PersonalDataFieldDefinition | undefined {
    return catalog.find((f) => f.key === key);
}
