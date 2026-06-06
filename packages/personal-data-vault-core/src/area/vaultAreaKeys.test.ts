import { describe, expect, it } from "vitest";
import { isVaultGlobalAreaStorage, vaultAreaStorageKeys, VAULT_GLOBAL_AREA_ID, VAULT_GLOBAL_AREA_TYPE } from "./vaultAreaKeys";

describe("vaultAreaStorageKeys", () => {
    it("uses empty strings for subject-wide records", () => {
        expect(vaultAreaStorageKeys()).toEqual({ areaType: VAULT_GLOBAL_AREA_TYPE, areaId: VAULT_GLOBAL_AREA_ID });
    });
});
