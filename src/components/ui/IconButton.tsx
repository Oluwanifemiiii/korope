import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Required: icon-only buttons need an accessible name. */
  label: string;
  icon: ReactNode;
  /** Glass only over the map (C01). */
  glass?: boolean;
};

/** 48 x 48 circular icon button. */
export function IconButton({ label, icon, glass, className, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex size-[var(--size-touch-min)] shrink-0 items-center justify-center rounded-circle text-fg shadow-1",
        "transition-transform duration-fast ease-standard active:scale-[0.97]",
        "disabled:cursor-not-allowed disabled:text-fg-disabled",
        glass ? "glass" : "bg-surface",
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
