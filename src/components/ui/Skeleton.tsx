import { cn } from "@/lib/cn";

/** Skeleton (C06). Loading states use these, never spinners on content. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton rounded-s", className)} />;
}

export function SkeletonDepartureCard() {
  return (
    <div className="flex flex-col gap-12 rounded-l bg-surface p-20 shadow-2" aria-hidden="true">
      <div className="flex justify-between">
        <Skeleton className="h-24 w-[calc(var(--space-96)+var(--space-24))]" />
        <Skeleton className="h-24 w-64" />
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-[calc(var(--space-96)*2)]" />
    </div>
  );
}

export function SkeletonWallet() {
  return <Skeleton className="h-[calc(var(--space-96)*2)] w-full rounded-xl" />;
}
