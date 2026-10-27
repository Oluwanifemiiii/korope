import { Check, RotateCcw } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive" | "highlight";
export type ButtonState = "default" | "loading" | "success" | "error";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** L is 56 px tall, M is 48 px (C01). */
  size?: "l" | "m";
  block?: boolean;
  icon?: ReactNode;
  state?: ButtonState;
};

const base =
  "inline-flex items-center justify-center gap-8 whitespace-nowrap rounded-m font-semibold select-none " +
  "transition-[transform,background-color] duration-fast ease-standard active:scale-[0.97] " +
  "disabled:cursor-not-allowed disabled:active:scale-100";

const sizes = {
  l: "h-[var(--size-button-l)] min-w-[calc(var(--space-96)+var(--space-24))] px-24 text-body",
  m: "h-[var(--size-button-m)] px-20 text-caption font-semibold",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-[var(--action-primary-text)] active:bg-brand-pressed",
  secondary:
    "bg-transparent text-[var(--action-secondary-text)] ring-2 ring-inset ring-[var(--action-secondary-border)] active:bg-[var(--action-secondary-pressed)]",
  tertiary: "bg-transparent text-[var(--action-tertiary-text)] min-w-0 px-12 active:bg-sunken",
  destructive:
    "bg-[var(--action-destructive)] text-[var(--text-on-brand)] active:bg-[var(--action-destructive-pressed)]",
  highlight: "bg-highlight text-[var(--text-on-highlight)]",
};

const disabledCls =
  "disabled:bg-[var(--action-disabled-bg)] disabled:text-[var(--action-disabled-text)] disabled:ring-0";

const stateCls: Partial<Record<ButtonState, string>> = {
  success: "bg-[var(--success-600)] text-neutral-0 dark:bg-[var(--success-400)] dark:text-neutral-900",
  error:
    "bg-[var(--error-bg)] text-[var(--error-text)] ring-2 ring-inset ring-[var(--error-border)]",
};

/**
 * Button/{Primary,Secondary,Tertiary,Destructive,Highlight}/{state}.
 * The button carries loading, success and error itself (H01: no separate toast on confirm).
 */
export function Button({
  variant = "primary",
  size = "l",
  block,
  icon,
  state = "default",
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: Props) {
  const busy = state === "loading";
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        base,
        sizes[size],
        stateCls[state] ?? variants[variant],
        variant === "tertiary" && disabled ? "disabled:bg-transparent" : disabledCls,
        busy && "disabled:cursor-progress",
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {busy ? (
        <Spinner />
      ) : state === "success" ? (
        <Check aria-hidden="true" className="size-[var(--size-icon-m)]" strokeWidth={2.4} />
      ) : state === "error" ? (
        <RotateCcw aria-hidden="true" className="size-[var(--size-icon-m)]" />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
}
