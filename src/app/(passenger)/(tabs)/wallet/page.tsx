import { CreditCard, Hash, Landmark } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { formatNaira } from "@/lib/money";

export const metadata: Metadata = { title: "Wallet" };

/**
 * 17 Wallet. The ledger and Paystack top-ups arrive in M2. Until then every balance is
 * genuinely ₦0, so this is the empty wallet (17b) with top-ups not yet open.
 */
export default function WalletPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-var(--size-nav))] max-w-[calc(var(--space-96)*5)] flex-col gap-24 px-24 pb-24 pt-24 pt-safe">
      <h1 className="text-h2 text-fg">Wallet</h1>

      <section
        aria-label="Wallet balance"
        className="relative flex flex-col gap-16 overflow-hidden rounded-xl bg-[linear-gradient(140deg,var(--primary-600),var(--primary-800))] p-24 text-neutral-0 shadow-3 dark:bg-[linear-gradient(140deg,var(--primary-800),var(--slate-850))]"
      >
        <p className="text-caption text-[var(--primary-100)]">Available balance</p>
        <p className="text-display num">{formatNaira(0)}</p>
        <p className="text-caption text-[var(--primary-100)]">Add money to reserve your first seat</p>
        <Button variant="highlight" size="m" disabled className="self-start">
          Add money
        </Button>
      </section>

      <p className="text-caption text-fg-muted">Top-ups open when seat booking launches. Nothing can be charged until then.</p>

      <section className="flex flex-col gap-12">
        <h2 className="text-title text-fg">Your wallet is empty</h2>
        <ul className="flex flex-col gap-8 text-body text-fg-muted">
          <li>Top up once, ride all week.</li>
          <li>Reserve a seat in one tap, no card details each time.</li>
          <li>Refunds for cancelled trips come straight back here.</li>
          <li>Every top-up and fare has a receipt.</li>
        </ul>
      </section>

      <section className="mt-auto flex flex-col gap-8">
        <div className="flex flex-wrap gap-8">
          {[
            { label: "Card", Icon: CreditCard },
            { label: "Bank transfer", Icon: Landmark },
            { label: "USSD", Icon: Hash },
          ].map(({ label, Icon }) => (
            <span key={label} className="inline-flex h-32 items-center gap-8 rounded-pill bg-sunken px-12 text-label font-semibold text-fg-muted">
              <Icon aria-hidden="true" className="size-[var(--size-icon-s)]" />
              {label}
            </span>
          ))}
        </div>
        <p className="text-label text-fg-muted">Payments are processed by Paystack.</p>
      </section>
    </main>
  );
}
