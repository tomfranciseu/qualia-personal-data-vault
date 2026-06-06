export type PersonalDataAreaMessages = {
    loadFailed: string;
    saveFailed: string;
    uploadFailed: string;
    openDocumentFailed: string;
    noTripFieldsRequired: string;
    unlockFieldsHint: string;
    notVisibleForRole: (label: string) => string;
    requiredForTrip: string;
    categoryTitle: (category: string) => string;
    retentionPrefix: string;
    retentionAfterTrip: string;
    exportData: string;
    requestErasure: string;
    confirmErasure: string;
    confirm: string;
    cancel: string;
    documentUploaded: string;
    noDocument: string;
    viewDownload: string;
    uploading: string;
    replaceFile: string;
    uploadFile: string;
};

export const DEFAULT_PERSONAL_DATA_AREA_MESSAGES: PersonalDataAreaMessages = {
    loadFailed: "Failed to load personal data",
    saveFailed: "Save failed",
    uploadFailed: "Upload failed",
    openDocumentFailed: "Could not open document",
    noTripFieldsRequired: "This trip does not require additional traveller details.",
    unlockFieldsHint: "Choose your travel pattern above to unlock the fields for this trip.",
    notVisibleForRole: (label) => `${label}: not visible for your role`,
    requiredForTrip: "Required for this trip",
    categoryTitle: (category) =>
        category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    retentionPrefix: "Retention: ",
    retentionAfterTrip: "after trip",
    exportData: "Export my data",
    requestErasure: "Request data erasure",
    confirmErasure: "Confirm erasure request?",
    confirm: "Confirm",
    cancel: "Cancel",
    documentUploaded: "Document uploaded (encrypted)",
    noDocument: "No document on file",
    viewDownload: "View / download",
    uploading: "Uploading…",
    replaceFile: "Replace file",
    uploadFile: "Upload file",
};
