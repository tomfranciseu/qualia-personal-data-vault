import type { PersonalDataAreaRef } from "../types";

/** Stored in DB when a field is not scoped to a trip/dossier area. */
export const VAULT_GLOBAL_AREA_TYPE = "";
export const VAULT_GLOBAL_AREA_ID = "";

export type VaultAreaStorageKeys = {
    areaType: string;
    areaId: string;
};

/** Non-null area keys for Prisma upsert composite unique constraints. */
export function vaultAreaStorageKeys(area?: PersonalDataAreaRef): VaultAreaStorageKeys {
    if (!area) {
        return { areaType: VAULT_GLOBAL_AREA_TYPE, areaId: VAULT_GLOBAL_AREA_ID };
    }
    return { areaType: area.type, areaId: area.id };
}

export function isVaultGlobalAreaStorage(areaType: string | null, areaId: string | null): boolean {
    return (
        (areaType === null || areaType === VAULT_GLOBAL_AREA_TYPE) &&
        (areaId === null || areaId === VAULT_GLOBAL_AREA_ID)
    );
}
