type Props = {
    message: string;
};

export function PersonalDataAccessWarning({ message }: Readonly<Props>) {
    return (
        <div
            role="alert"
            className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800"
        >
            {message}
        </div>
    );
}
