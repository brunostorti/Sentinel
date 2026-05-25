import { Icon } from "@/components/icon";

export default function SurveyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal header */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <Icon name="shield" size={24} filled className="text-primary" />
          <span className="text-base font-black tracking-tight">Sentinel</span>
        </div>
      </header>

      {/* Centered content */}
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}
