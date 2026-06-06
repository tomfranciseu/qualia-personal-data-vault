export type PersonalDataSensitivity = "normal" | "sensitive" | "special_category";

export type PersonalDataLegalBasis =
    | "contract"
    | "legal_obligation"
    | "vital_interest"
    | "public_task"
    | "legitimate_interest"
    | "explicit_consent";

export type PersonalDataDataType =
    | "text"
    | "date"
    | "boolean"
    | "structured"
    | "file"
    | "json";

export type PersonalDataAction =
    | "view"
    | "create"
    | "update"
    | "delete"
    | "export"
    | "view_audit"
    | "share";

export type RetentionRule = {
    deleteAfterTripEnds?: boolean;
    deleteAfterDays?: number;
    deleteAfterSubjectInactiveDays?: number;
    fixedExpiry?: string;
};

export type FieldVisibility = {
    travellerCanView?: boolean;
    travellerCanEdit?: boolean;
    staffRoles?: string[];
    requiresConsent?: boolean;
    breakGlassOnly?: boolean;
};

export type ConsentRequirement = {
    purposeKey: string;
    legalBasis: PersonalDataLegalBasis;
    article9Condition?: string;
};

export type PersonalDataFieldDefinition = {
    key: string;
    label: string;
    category: string;
    dataType: PersonalDataDataType;
    sensitivity: PersonalDataSensitivity;
    purpose: string;
    legalBasis: PersonalDataLegalBasis;
    article9Condition?: string;
    retention: RetentionRule;
    visibility: FieldVisibility;
    consent?: ConsentRequirement;
    validators?: {
        maxLength?: number;
        allowedMimeTypes?: string[];
        maxFileBytes?: number;
    };
};

export type PersonalDataSubjectRef = {
    type: string;
    id: string;
};

export type PersonalDataAreaRef = {
    type: string;
    id: string;
};

export type VaultActorContext = {
    clerkUserId: string;
    orgId: string;
    actorType: "employee" | "participant" | "system";
    employeeId?: string;
    employeeRole?: string;
    tripsUserId?: string;
    isAdmin: boolean;
};

export type PersonalDataPolicyInput = {
    actor: VaultActorContext;
    subject: PersonalDataSubjectRef;
    area?: PersonalDataAreaRef;
    field: PersonalDataFieldDefinition;
    action: PersonalDataAction;
    hasActiveConsent?: boolean;
    hasBreakGlassGrant?: boolean;
};

export type PolicyDecision = { allow: true } | { allow: false; reasonCode: string };

export interface PersonalDataPolicy {
    can(input: PersonalDataPolicyInput): Promise<PolicyDecision>;
}

export type EncryptValueInput = {
    plaintext: string | Buffer;
    keyVersion?: number;
};

export type DecryptValueInput = {
    ciphertext: Buffer;
    keyVersion: number;
};

export type RotateValueKeyInput = {
    ciphertext: Buffer;
    fromKeyVersion: number;
    toKeyVersion: number;
};

export type EncryptedValue = {
    ciphertext: Buffer;
    keyVersion: number;
    contentHash?: string;
};

export type DecryptedValue = {
    plaintext: Buffer;
};

export interface PersonalDataEncryptionService {
    encryptValue(input: EncryptValueInput): Promise<EncryptedValue>;
    decryptValue(input: DecryptValueInput): Promise<DecryptedValue>;
    rotateValueKey(input: RotateValueKeyInput): Promise<EncryptedValue>;
    currentKeyVersion(): number;
}

export type VaultPutObjectInput = {
    orgId: string;
    objectKey: string;
    buffer: Buffer;
    contentType: string;
};

export type VaultDeleteObjectInput = {
    orgId: string;
    objectKey: string;
};

export type VaultSignedUrlInput = {
    orgId: string;
    objectKey: string;
    expiresInSeconds?: number;
};

export type VaultStoredObjectRef = {
    objectKey: string;
    byteSize: number;
    checksumSha256: string;
};

export interface VaultStorageAdapter {
    putObject(input: VaultPutObjectInput): Promise<VaultStoredObjectRef>;
    deleteObject(input: VaultDeleteObjectInput): Promise<void>;
    getSignedDownloadUrl(input: VaultSignedUrlInput): Promise<string>;
}

export type VaultAuditActionType =
    | "read"
    | "create"
    | "update"
    | "delete"
    | "export"
    | "share"
    | "consent_grant"
    | "consent_withdraw"
    | "erase"
    | "break_glass";

export type VaultAuditEntryInput = {
    orgId: string;
    vaultSubjectId?: string;
    action: VaultAuditActionType;
    fieldKey?: string;
    documentId?: string;
    actorType: string;
    actorId: string;
    policyDecision: "allow" | "deny";
    reasonCode?: string;
    metadata?: Record<string, string | number | boolean | null>;
    ipHash?: string;
};

export interface VaultAuditWriter {
    write(entry: VaultAuditEntryInput): Promise<void>;
}

export type FieldValueDto = {
    fieldKey: string;
    label: string;
    category: string;
    dataType: PersonalDataDataType;
    sensitivity: PersonalDataSensitivity;
    canView: boolean;
    canEdit: boolean;
    hasValue: boolean;
    displayValue?: string;
    structuredValue?: unknown;
};

export type VaultSubjectContext = {
    vaultSubjectId: string;
    orgId: string;
    subjectType: string;
    subjectId: string;
};
