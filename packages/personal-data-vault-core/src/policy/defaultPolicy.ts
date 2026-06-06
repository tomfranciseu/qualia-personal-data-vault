import type {
    PersonalDataAction,
    PersonalDataPolicy,
    PersonalDataPolicyInput,
    PolicyDecision,
} from "../types.js";

const FINANCE_DENIED_SENSITIVITIES = new Set(["sensitive", "special_category"]);
const FINANCE_DENIED_TYPES = new Set(["file"]);

function isSubjectOwner(input: PersonalDataPolicyInput): boolean {
    return (
        input.subject.type === "traveller" &&
        input.actor.tripsUserId === input.subject.id
    );
}

function hasStaffRole(input: PersonalDataPolicyInput): boolean {
    const role = input.actor.employeeRole;
    if (!role) return false;
    const allowed = input.field.visibility.staffRoles ?? [];
    if (allowed.length === 0) return input.actor.actorType === "employee";
    return allowed.includes(role) || (input.actor.isAdmin && allowed.includes("admin"));
}

function financeBlocked(input: PersonalDataPolicyInput): boolean {
    if (input.actor.employeeRole !== "accounting") return false;
    if (FINANCE_DENIED_SENSITIVITIES.has(input.field.sensitivity)) return true;
    if (FINANCE_DENIED_TYPES.has(input.field.dataType)) return true;
    return false;
}

function requiresConsent(input: PersonalDataPolicyInput): boolean {
    const needs =
        input.field.visibility.requiresConsent ||
        input.field.sensitivity === "special_category" ||
        Boolean(input.field.consent);
    return needs && !input.hasActiveConsent;
}

function actionAllowedForSelfService(action: PersonalDataAction): boolean {
    return action === "view" || action === "create" || action === "update";
}

/**
 * Default policy suitable for travel ERP; host can wrap or replace via adapter.
 */
export class DefaultPersonalDataPolicy implements PersonalDataPolicy {
    async can(input: PersonalDataPolicyInput): Promise<PolicyDecision> {
        const { field, action, actor } = input;

        if (field.visibility.breakGlassOnly && !input.hasBreakGlassGrant) {
            return { allow: false, reasonCode: "break_glass_required" };
        }

        if (input.hasBreakGlassGrant && actor.actorType === "employee") {
            return { allow: true };
        }

        if (financeBlocked(input)) {
            return { allow: false, reasonCode: "finance_role_denied" };
        }

        if (requiresConsent(input) && action !== "view_audit") {
            return { allow: false, reasonCode: "consent_missing" };
        }

        if (isSubjectOwner(input)) {
            if (action === "view" && field.visibility.travellerCanView) return { allow: true };
            if (
                (action === "create" || action === "update") &&
                field.visibility.travellerCanEdit
            ) {
                return { allow: true };
            }
            if (action === "export" && field.visibility.travellerCanView) return { allow: true };
            if (actionAllowedForSelfService(action) === false && action === "delete") {
                return { allow: false, reasonCode: "participant_delete_denied" };
            }
            return { allow: false, reasonCode: "participant_visibility_denied" };
        }

        if (actor.actorType === "employee" || actor.actorType === "system") {
            if (action === "view_audit" && (actor.isAdmin || hasStaffRole(input))) {
                return { allow: true };
            }
            if (action === "export" && (actor.isAdmin || hasStaffRole(input))) {
                return { allow: true };
            }
            if (action === "share" && actor.isAdmin) {
                return { allow: true };
            }
            if (hasStaffRole(input) || actor.isAdmin) {
                if (action === "view" || action === "create" || action === "update" || action === "delete") {
                    return { allow: true };
                }
            }
            return { allow: false, reasonCode: "staff_role_denied" };
        }

        return { allow: false, reasonCode: "unknown_actor" };
    }
}
