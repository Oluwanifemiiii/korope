import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  icon?: ReactNode;
};

/** Chip: 40 px tall with a 48 px hit area, Radius/Pill (one of the only two pill shapes). */
export function Chip({ selected, icon, className, children, type = "button", ...rest }: Props) {
  return (
    // eslint-disable-next-line korope/no-pill-buttons -- a chip is a toggle, and chips are the one place Radius/Pill belongs
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "relative inline-flex h-40 items-center gap-8 whitespace-nowrap rounded-pill px-16 text-caption font-medium ring-inset",
        "transition-colors duration-base ease-standard",
        "after:absolute after:inset-x-0 after:-inset-y-4 after:content-['']",
        "disabled:bg-sunken disabled:text-fg-disabled disabled:ring-0",
        selected ? "bg-brand-subtle text-fg-brand ring-2 ring-brand" : "bg-surface text-fg ring-1 ring-line",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
