import { describe, expect, it } from "vitest";
import { DefaultPersonalDataPolicy } from "./defaultPolicy";
import type { PersonalDataFieldDefinition, VaultActorContext } from "../types";

const passportField: PersonalDataFieldDefinition = {
    key: "passport_number",
    label: "Passport",
    category: "travel_documents",
    dataType: "text",
    sensitivity: "sensitive",
    purpose: "Travel",
    legalBasis: "contract",
    retention: {},
    visibility: { staffRoles: ["projectmanager"] },
};

describe("DefaultPersonalDataPolicy", () => {
    const policy = new DefaultPersonalDataPolicy();

    it("allows traveller own data when tripsUserId matches subject", async () => {
        const actor: VaultActorContext = {
            clerkUserId: "u1",
            orgId: "org1",
            actorType: "employee",
            employeeRole: "projectmanager",
            tripsUserId: "t1",
            isAdmin: false,
        };
        const d = await policy.can({
            actor,
            subject: { type: "traveller", id: "t1" },
            field: { ...passportField, visibility: { travellerCanView: true } },
            action: "view",
            hasActiveConsent: true,
        });
        expect(d.allow).toBe(true);
    });
});
