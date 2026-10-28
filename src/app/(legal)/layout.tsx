import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Legal pages: readable column, no tab bar. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[calc(var(--space-96)*7)] flex-col gap-16 px-24 pb-48 pb-safe pt-16 pt-safe">
      <Link href="/" aria-label="Back to Korope" className="-ml-12 inline-flex size-[var(--size-touch-min)] items-center justify-center rounded-circle text-fg">
        <ArrowLeft aria-hidden="true" />
      </Link>
      <article className="flex flex-col gap-16 text-body text-fg [&_h2]:pt-16 [&_h2]:text-title [&_p]:text-fg-muted [&_li]:text-fg-muted [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-8 [&_ul]:pl-24">
        {children}
      </article>
    </main>
  );
}
