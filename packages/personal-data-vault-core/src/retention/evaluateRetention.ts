import type { PersonalDataFieldDefinition, RetentionRule } from "../types";

export type RetentionContext = {
    tripEndDate?: Date | null;
    subjectLastActiveAt?: Date | null;
    now?: Date;
};

export function evaluateRetentionDate(
    rule: RetentionRule,
    context: RetentionContext,
): Date | null {
    const now = context.now ?? new Date();
    const candidates: Date[] = [];

    if (rule.fixedExpiry) {
        candidates.push(new Date(rule.fixedExpiry));
    }

    if (rule.deleteAfterTripEnds && context.tripEndDate) {
        const d = new Date(context.tripEndDate);
        if (rule.deleteAfterDays) {
            d.setDate(d.getDate() + rule.deleteAfterDays);
        }
        candidates.push(d);
    } else if (rule.deleteAfterDays && context.tripEndDate) {
        const d = new Date(context.tripEndDate);
        d.setDate(d.getDate() + rule.deleteAfterDays);
        candidates.push(d);
    } else if (rule.deleteAfterDays) {
        const d = new Date(now);
        d.setDate(d.getDate() + rule.deleteAfterDays);
        candidates.push(d);
    }

    if (rule.deleteAfterSubjectInactiveDays && context.subjectLastActiveAt) {
        const d = new Date(context.subjectLastActiveAt);
        d.setDate(d.getDate() + rule.deleteAfterSubjectInactiveDays);
        candidates.push(d);
    }

    if (candidates.length === 0) return null;
    return candidates.reduce((earliest, d) => (d < earliest ? d : earliest));
}

export function evaluateFieldRetention(
    field: PersonalDataFieldDefinition,
    context: RetentionContext,
): Date | null {
    return evaluateRetentionDate(field.retention, context);
}
