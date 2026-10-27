import { EmptyState } from "@/components/ui/EmptyState";

/** Service worker fallback for pages that aren't cached yet. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[calc(var(--space-96)*5)] items-center pt-safe pb-safe">
      <EmptyState
        variant="broken"
        illustrationLabel="A route line with a gap in it"
        title="You're offline."
        body="This page needs data. Your boarding pass and trip details saved on this phone still work."
      />
    </main>
  );
}
