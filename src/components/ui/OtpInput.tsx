"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
};

/**
 * OtpInput: six cells (C02, 03b). One real input underneath so SMS autofill
 * (autocomplete="one-time-code") and paste work; the cells are a visual layer.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  error,
  disabled,
  label = "Verification code",
}: Props) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.split("");

  return (
    <div className="flex flex-col gap-8">
      <div className="relative flex gap-8" onClick={() => ref.current?.focus()}>
        <input
          ref={ref}
          id={id}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={length}
          disabled={disabled}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, length);
            onChange(next);
            if (next.length === length) onComplete?.(next);
          }}
          className="absolute inset-0 h-full w-full opacity-0"
        />
        {Array.from({ length }, (_, i) => {
          const filled = i < digits.length;
          const active = focused && i === Math.min(digits.length, length - 1);
          return (
            <div
              key={i}
              aria-hidden="true"
              className={cn(
                "flex h-[var(--size-button-l)] w-[var(--size-touch-min)] items-center justify-center rounded-m bg-surface text-h3 font-semibold num ring-inset",
                error
                  ? "text-[var(--error-text)] ring-2 ring-[var(--error-500)]"
                  : active
                    ? "ring-2 ring-line-focus shadow-[var(--focus-ring)]"
                    : filled
                      ? "ring-2 ring-line-strong"
                      : "ring-2 ring-line",
              )}
            >
              {digits[i] ?? (active ? <span className="h-24 w-2 rounded-xs bg-[var(--border-focus)]" /> : "")}
            </div>
          );
        })}
      </div>
      {error ? (
        <p id={`${id}-err`} className="text-caption text-[var(--error-text)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
