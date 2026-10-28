import { ChevronRight, FileText, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { signOut } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/server";
import { formatPhone } from "@/lib/contracts/auth";
import { asUser } from "@/lib/db";
import { AppearancePicker } from "./AppearancePicker";

export const metadata: Metadata = { title: "Profile" };

/** 19 Profile: identity card first, then settings that work today, then legal. */
export default function ProfilePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-var(--size-nav))] max-w-[calc(var(--space-96)*5)] flex-col gap-24 px-24 pb-24 pt-24 pt-safe">
      <Suspense fallback={<Skeleton className="h-[calc(var(--space-96)+var(--space-8))] w-full rounded-xl" />}>
        <Identity />
      </Suspense>

      <section className="flex flex-col gap-8">
        <h2 className="eyebrow">Appearance</h2>
        <AppearancePicker />
      </section>

      <section aria-label="Legal" className="flex flex-col rounded-l bg-surface px-16 ring-1 ring-inset ring-line">
        {[
          { href: "/terms", label: "Terms of service", Icon: FileText },
          { href: "/privacy", label: "Privacy policy", Icon: Lock },
        ].map(({ href, label, Icon }, i) => (
          <Link key={href} href={href} className={`flex min-h-[calc(var(--size-touch-min)+var(--space-8))] items-center gap-16 ${i ? "border-t border-line-subtle" : ""}`}>
            <Icon aria-hidden="true" className="size-[var(--size-icon-m)] text-fg-muted" />
            <span className="grow text-body text-fg">{label}</span>
            <ChevronRight aria-hidden="true" className="size-[var(--size-icon-m)] text-fg-muted" />
          </Link>
        ))}
      </section>

      <form action={signOut} className="mt-auto">
        <button type="submit" className="flex min-h-touch w-full items-center justify-center rounded-m text-body font-semibold text-[var(--action-destructive)]">
          Sign out
        </button>
      </form>
    </main>
  );
}

async function Identity() {
  const session = await getSession();
  if (!session) redirect("/sign-in?next=/profile");
  const profile = await asUser(session.user.id, async (c) => {
    const { rows } = await c.query<{ full_name: string | null; phone: string | null; created_at: Date }>(
      "select full_name, phone, created_at from public.profiles where id = $1",
      [session.user.id],
    );
    return rows[0];
  });
  const name = profile?.full_name ?? null;
  const initials = name ? name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() : null;
  const since = profile?.created_at
    ? new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(profile.created_at)
    : null;

  return (
    <section className="flex items-center gap-16 rounded-xl bg-surface p-24 shadow-2">
      <span aria-hidden="true" className="flex size-64 shrink-0 items-center justify-center rounded-circle bg-[var(--primary-100)] text-title font-semibold text-[var(--primary-700)]">
        {initials ?? "K"}
      </span>
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="truncate text-title text-fg">{name ?? "Korope rider"}</h1>
        {profile?.phone ? <p className="text-caption text-fg-muted num">{formatPhone(profile.phone)}</p> : null}
        {since ? <p className="text-caption text-fg-muted">Riding with Korope since {since}</p> : null}
      </div>
    </section>
  );
}
