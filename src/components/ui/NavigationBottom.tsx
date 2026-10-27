"use client";

import { House, Sparkles, Ticket, User, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Home", Icon: House },
  { href: "/trips", label: "Trips", Icon: Ticket },
  { href: "/plus", label: "Korope+", Icon: Sparkles },
  { href: "/wallet", label: "Wallet", Icon: Wallet },
  { href: "/profile", label: "Profile", Icon: User },
] as const;

/**
 * Navigation/Bottom (C03): five tabs, never more. Active tab gets Primary text and a
 * tinted Radius/M container; icons stay outline.
 */
export function NavigationBottom() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="glass fixed inset-x-0 bottom-0 z-20 border-t border-line-subtle pb-safe"
    >
      <ul className="mx-auto flex h-[var(--size-nav)] max-w-[calc(var(--space-96)*5)] items-stretch justify-between px-12 py-8">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-touch flex-1 flex-col items-center justify-center gap-4 rounded-m text-label",
                  active ? "font-semibold text-fg-brand" : "font-medium text-fg-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-32 w-[calc(var(--space-48)+var(--space-8))] items-center justify-center rounded-m",
                    active && "bg-brand-subtle",
                  )}
                >
                  <Icon aria-hidden="true" className="size-[var(--size-icon-l)]" />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
