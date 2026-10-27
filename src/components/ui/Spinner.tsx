import { cn } from "@/lib/cn";

/** Ring spinner used inside buttons while loading (C01). */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-[var(--size-icon-m)] shrink-0 rounded-circle border-2 border-current border-r-transparent",
        "animate-spin motion-reduce:animate-none",
        className,
      )}
    />
  );
}
