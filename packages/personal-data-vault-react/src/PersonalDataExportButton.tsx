"use client";

type Props = {
    onExport: () => Promise<void>;
};

export function PersonalDataExportButton({ onExport }: Readonly<Props>) {
    return (
        <button
            type="button"
            className="rounded-lg border border-default-300 px-3 py-1.5 text-xs font-medium"
            onClick={() => void onExport()}
        >
            Export my data
        </button>
    );
}
