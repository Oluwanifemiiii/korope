"use client";

import { CircleAlert } from "lucide-react";
import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  label: string;
  helper?: string;
  error?: string;
  /** Leading content inside the field, e.g. the +234 country prefix. */
  prefix?: ReactNode;
  trailing?: ReactNode;
};

/** Input/{Text,Phone,Amount}/{state}: 56 px, Radius/M (C02). */
export function Field({ label, helper, error, prefix, trailing, className, id, disabled, ...rest }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helpId = `${inputId}-help`;
  const message = error ?? helper;
  return (
    <div className={cn("flex flex-col gap-8", className)}>
      <label htmlFor={inputId} className="text-caption font-medium text-fg">
        {label}
      </label>
      <div
        className={cn(
          "flex h-[var(--size-button-l)] items-center gap-12 rounded-m px-16 text-body text-fg ring-inset",
          disabled ? "bg-sunken text-fg-disabled ring-1 ring-line-subtle" : "bg-surface ring-2 ring-line",
          !disabled && !error && "focus-within:ring-line-focus focus-within:shadow-[var(--focus-ring)]",
          error && "ring-[var(--error-500)]",
        )}
      >
        {prefix}
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? helpId : undefined}
          className="h-full w-full min-w-0 bg-transparent text-body text-inherit outline-none placeholder:text-fg-muted focus-visible:outline-none"
          {...rest}
        />
        {trailing}
      </div>
      {message ? (
        <p
          id={helpId}
          className={cn(
            "flex items-start gap-8 text-caption",
            error ? "text-[var(--error-text)]" : "text-fg-muted",
          )}
        >
          {error ? (
            <CircleAlert aria-hidden="true" className="mt-2 size-[var(--size-icon-s)] shrink-0" />
          ) : null}
          {message}
        </p>
      ) : null}
    </div>
  );
}

/** +234 prefix used on 03a. */
export function NigeriaPrefix() {
  return (
    <span className="flex shrink-0 items-center gap-8 border-r border-line pr-12 text-body font-medium text-fg num">
      <span className="text-label font-semibold text-fg-muted">NG</span>
      +234
    </span>
  );
}
