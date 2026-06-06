import { describe, expect, it } from "vitest";
import { defineField, defineFieldCatalog } from "./validate";
import { travelPersonalDataFields } from "../catalog/travelPersonalDataFields";

describe("defineFieldCatalog", () => {
    it("accepts travel catalog without duplicate keys", () => {
        const keys = travelPersonalDataFields.map((f) => f.key);
        expect(new Set(keys).size).toBe(keys.length);
    });
});
