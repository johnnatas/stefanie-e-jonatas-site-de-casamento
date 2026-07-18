interface ConfigurationNoticeProps {
  message: string;
}

export function ConfigurationNotice({ message }: ConfigurationNoticeProps) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-paper-soft px-6 py-10 text-center">
      <p className="font-sans text-sm text-ink-soft">{message}</p>
    </div>
  );
}
