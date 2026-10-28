import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { KoropePlusForm } from "./KoropePlusForm";

export const metadata: Metadata = { title: "Korope+" };

/** 20 Korope+ coming soon: an interest form, stored as leads. No plans or prices yet. */
export default function KoropePlusPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-var(--size-nav))] max-w-[calc(var(--space-96)*5)] flex-col gap-24 px-24 pb-24 pt-24 pt-safe">
      <section className="flex flex-col gap-12 rounded-xl bg-[var(--primary-700)] p-24 text-neutral-0 shadow-3">
        <span className="self-start">
          <Badge tone="highlight">Coming soon</Badge>
        </span>
        <h1 className="text-h2 text-neutral-0">Korope+ for companies and schools</h1>
        <p className="text-caption text-[var(--primary-100)]">
          Reserved seats on a fixed staff or school run, billed monthly to your organisation. We&apos;re starting with a few teams on the
          Lekki to Island corridor.
        </p>
      </section>
      <KoropePlusForm />
    </main>
  );
}
