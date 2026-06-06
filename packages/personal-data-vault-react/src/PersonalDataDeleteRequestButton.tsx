"use client";

import { useState } from "react";

type Props = {
    onRequest: () => Promise<void>;
};

export function PersonalDataDeleteRequestButton({ onRequest }: Readonly<Props>) {
    const [confirming, setConfirming] = useState(false);

    if (!confirming) {
        return (
            <button
                type="button"
                className="rounded-lg border border-danger-300 px-3 py-1.5 text-xs font-medium text-danger-700"
                onClick={() => setConfirming(true)}
            >
                Request data erasure
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-danger-700">Confirm erasure request?</span>
            <button
                type="button"
                className="rounded-lg bg-danger-600 px-2 py-1 text-xs font-semibold text-white"
                onClick={async () => {
                    await onRequest();
                    setConfirming(false);
                }}
            >
                Confirm
            </button>
            <button
                type="button"
                className="text-xs text-default-500"
                onClick={() => setConfirming(false)}
            >
                Cancel
            </button>
        </div>
    );
}
