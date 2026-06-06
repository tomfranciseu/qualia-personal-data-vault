import { defineField, defineFieldCatalog } from "../fields/validate.js";
import type { PersonalDataFieldDefinition } from "../types.js";

const dietaryRestrictions = defineField({
    key: "dietary_restrictions",
    label: "Dietary restrictions",
    category: "dietary",
    dataType: "structured",
    sensitivity: "special_category",
    purpose: "Allow travel organiser to inform hotels/restaurants about meal requirements",
    legalBasis: "explicit_consent",
    article9Condition: "explicit_consent",
    retention: {
        deleteAfterTripEnds: true,
        deleteAfterDays: 30,
    },
    visibility: {
        travellerCanView: true,
        travellerCanEdit: true,
        staffRoles: ["projectmanager", "admin"],
    },
    consent: {
        purposeKey: "dietary_restrictions",
        legalBasis: "explicit_consent",
        article9Condition: "explicit_consent",
    },
});

const dietaryNotes = defineField({
    key: "dietary_notes",
    label: "Dietary notes",
    category: "dietary",
    dataType: "text",
    sensitivity: "special_category",
    purpose: "Additional meal-related information for accommodation and catering",
    legalBasis: "explicit_consent",
    article9Condition: "explicit_consent",
    retention: {
        deleteAfterTripEnds: true,
        deleteAfterDays: 30,
    },
    visibility: {
        travellerCanView: true,
        travellerCanEdit: true,
        staffRoles: ["projectmanager", "admin"],
    },
    consent: {
        purposeKey: "dietary_notes",
        legalBasis: "explicit_consent",
    },
    validators: { maxLength: 2000 },
});

const passportNumber = defineField({
    key: "passport_number",
    label: "Passport number",
    category: "travel_documents",
    dataType: "text",
    sensitivity: "sensitive",
    purpose: "Identity verification for travel and visa processing",
    legalBasis: "contract",
    retention: {
        deleteAfterTripEnds: true,
        deleteAfterDays: 90,
    },
    visibility: {
        travellerCanView: true,
        travellerCanEdit: true,
        staffRoles: ["projectmanager", "admin"],
    },
    validators: { maxLength: 64 },
});

const passportExpiry = defineField({
    key: "passport_expiry",
    label: "Passport expiry",
    category: "travel_documents",
    dataType: "date",
    sensitivity: "sensitive",
    purpose: "Ensure travel documents remain valid for the trip",
    legalBasis: "contract",
    retention: {
        deleteAfterTripEnds: true,
        deleteAfterDays: 90,
    },
    visibility: {
        travellerCanView: true,
        travellerCanEdit: true,
        staffRoles: ["projectmanager", "admin"],
    },
});

const nationality = defineField({
    key: "nationality",
    label: "Nationality",
    category: "travel_documents",
    dataType: "text",
    sensitivity: "sensitive",
    purpose: "Travel and visa eligibility checks",
    legalBasis: "contract",
    retention: {
        deleteAfterTripEnds: true,
        deleteAfterDays: 90,
    },
    visibility: {
        travellerCanView: true,
        travellerCanEdit: true,
        staffRoles: ["projectmanager", "admin"],
    },
    validators: { maxLength: 128 },
});

const emergencyContactName = defineField({
    key: "emergency_contact_name",
    label: "Emergency contact name",
    category: "emergency",
    dataType: "text",
    sensitivity: "sensitive",
    purpose: "Contact person in case of emergency during travel",
    legalBasis: "vital_interest",
    retention: {
        deleteAfterTripEnds: true,
        deleteAfterDays: 30,
    },
    visibility: {
        travellerCanView: true,
        travellerCanEdit: true,
        staffRoles: ["projectmanager", "admin"],
    },
    validators: { maxLength: 256 },
});

const emergencyContactPhone = defineField({
    key: "emergency_contact_phone",
    label: "Emergency contact phone",
    category: "emergency",
    dataType: "text",
    sensitivity: "sensitive",
    purpose: "Reach emergency contact during travel",
    legalBasis: "vital_interest",
    retention: {
        deleteAfterTripEnds: true,
        deleteAfterDays: 30,
    },
    visibility: {
        travellerCanView: true,
        travellerCanEdit: true,
        staffRoles: ["projectmanager", "admin"],
    },
    validators: { maxLength: 64 },
});

const accessibilityNeeds = defineField({
    key: "accessibility_needs",
    label: "Accessibility needs",
    category: "accessibility",
    dataType: "text",
    sensitivity: "special_category",
    purpose: "Arrange accessible transport, accommodation, and activities",
    legalBasis: "explicit_consent",
    article9Condition: "explicit_consent",
    retention: {
        deleteAfterTripEnds: true,
        deleteAfterDays: 30,
    },
    visibility: {
        travellerCanView: true,
        travellerCanEdit: true,
        staffRoles: ["projectmanager", "admin"],
    },
    consent: {
        purposeKey: "accessibility_needs",
        legalBasis: "explicit_consent",
    },
    validators: { maxLength: 4000 },
});

const medicalNotes = defineField({
    key: "medical_notes",
    label: "Medical or assistance notes",
    category: "medical",
    dataType: "text",
    sensitivity: "special_category",
    purpose: "Inform coordinators of assistance requirements where applicable",
    legalBasis: "explicit_consent",
    article9Condition: "explicit_consent",
    retention: {
        deleteAfterTripEnds: true,
        deleteAfterDays: 30,
    },
    visibility: {
        travellerCanView: true,
        travellerCanEdit: true,
        staffRoles: ["projectmanager", "admin"],
        breakGlassOnly: false,
    },
    consent: {
        purposeKey: "medical_notes",
        legalBasis: "explicit_consent",
    },
    validators: { maxLength: 4000 },
});

const allergies = defineField({
    key: "allergies",
    label: "Allergies",
    category: "medical",
    dataType: "text",
    sensitivity: "special_category",
    purpose: "Prevent allergic reactions when arranging meals and activities",
    legalBasis: "explicit_consent",
    article9Condition: "explicit_consent",
    retention: {
        deleteAfterTripEnds: true,
        deleteAfterDays: 30,
    },
    visibility: {
        travellerCanView: true,
        travellerCanEdit: true,
        staffRoles: ["projectmanager", "admin"],
    },
    consent: {
        purposeKey: "allergies",
        legalBasis: "explicit_consent",
    },
    validators: { maxLength: 2000 },
});

const idDocument = defineField({
    key: "id_document",
    label: "ID document scan",
    category: "travel_documents",
    dataType: "file",
    sensitivity: "sensitive",
    purpose: "Verify identity for travel documentation",
    legalBasis: "contract",
    retention: {
        deleteAfterTripEnds: true,
        deleteAfterDays: 90,
    },
    visibility: {
        travellerCanView: true,
        travellerCanEdit: true,
        staffRoles: ["projectmanager", "admin"],
    },
    validators: {
        allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
        maxFileBytes: 10 * 1024 * 1024,
    },
});

const tShirtSize = defineField({
    key: "t_shirt_size",
    label: "T-shirt size",
    category: "preferences",
    dataType: "text",
    sensitivity: "normal",
    purpose: "Provide correct merchandise sizing for the trip",
    legalBasis: "contract",
    retention: {
        deleteAfterTripEnds: true,
        deleteAfterDays: 30,
    },
    visibility: {
        travellerCanView: true,
        travellerCanEdit: true,
        staffRoles: ["projectmanager", "admin", "accounting"],
    },
    validators: { maxLength: 16 },
});

export const travelPersonalDataFields: PersonalDataFieldDefinition[] = defineFieldCatalog([
    dietaryRestrictions,
    dietaryNotes,
    passportNumber,
    passportExpiry,
    nationality,
    emergencyContactName,
    emergencyContactPhone,
    accessibilityNeeds,
    medicalNotes,
    allergies,
    idDocument,
    tShirtSize,
]);

export function getTravelFieldsByCategory(): Record<string, PersonalDataFieldDefinition[]> {
    const byCategory: Record<string, PersonalDataFieldDefinition[]> = {};
    for (const field of travelPersonalDataFields) {
        if (!byCategory[field.category]) byCategory[field.category] = [];
        byCategory[field.category]!.push(field);
    }
    return byCategory;
}
