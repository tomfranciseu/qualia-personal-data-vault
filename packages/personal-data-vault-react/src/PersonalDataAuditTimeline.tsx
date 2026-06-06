"use client";

import { useEffect, useState } from "react";

type AuditRow = {
    id?: string;
    action: string;
    fieldKey?: string | null;
    actorType: string;
    policyDecision: string;
    reasonCode?: string | null;
    createdAt: Date | string;
};

type Props = {
    onLoad: () => Promise<unknown[]>;
};

export function PersonalDataAuditTimeline({ onLoad }: Readonly<Props>) {
    const [rows, setRows] = useState<AuditRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void (async () => {
            setLoading(true);
            try {
                const data = await onLoad();
                setRows(data as AuditRow[]);
            } finally {
                setLoading(false);
            }
        })();
    }, [onLoad]);

    if (loading) return <p className="text-sm text-default-400">Loading audit log…</p>;

    return (
        <section className="rounded-xl border border-default-200 p-4">
            <h3 className="mb-3 text-sm font-semibold">Access audit</h3>
            <ul className="max-h-64 space-y-2 overflow-y-auto text-xs">
                {rows.length === 0 ? (
                    <li className="text-default-400">No audit entries</li>
                ) : (
                    rows.map((row, i) => (
                        <li key={row.id ?? i} className="border-b border-default-100 pb-2">
                            <span className="font-medium">{row.action}</span>
                            {row.fieldKey ? ` · ${row.fieldKey}` : ""} · {row.policyDecision}
                            {row.reasonCode ? ` (${row.reasonCode})` : ""}
                            <br />
                            <span className="text-default-400">
                                {new Date(row.createdAt).toLocaleString()} · {row.actorType}
                            </span>
                        </li>
                    ))
                )}
            </ul>
        </section>
    );
}
