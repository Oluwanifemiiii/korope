"use client";

import type { ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/cn";

/** Snap points from C03 and H01: peek 176 px, half 50%, full leaves 56 px at the top. */
export const SNAP = {
  peek: "176px",
  half: 0.5,
  full: 1,
} as const;
export type Snap = (typeof SNAP)[keyof typeof SNAP];

type Props = {
  title: string;
  /** Visible header content; the title is still announced to screen readers. */
  header?: ReactNode;
  children: ReactNode;
  snap: Snap | null;
  onSnapChange: (snap: Snap) => void;
  snapPoints?: Snap[];
  /** Home sheets never close; detail sheets can be swiped away. */
  dismissible?: boolean;
  onClose?: () => void;
  className?: string;
};

/**
 * BottomSheet (Component 025). Non-modal so the map behind stays interactive.
 * Gets a glass header and a scrim only at the full snap point (C03).
 */
export function BottomSheet({
  title,
  header,
  children,
  snap,
  onSnapChange,
  snapPoints = [SNAP.peek, SNAP.half, SNAP.full],
  dismissible = false,
  onClose,
  className,
}: Props) {
  const full = snap === SNAP.full;
  return (
    <Drawer.Root
      open
      modal={false}
      dismissible={dismissible}
      snapPoints={snapPoints}
      activeSnapPoint={snap}
      setActiveSnapPoint={(s) => s !== null && onSnapChange(s as Snap)}
      onClose={onClose}
    >
      <Drawer.Portal>
        <Drawer.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 mx-auto flex h-[calc(100dvh-var(--size-button-l))] max-w-[calc(var(--space-96)*5)] flex-col",
            "rounded-t-xl bg-surface shadow-3 outline-none",
            className,
          )}
        >
          <div
            className={cn(
              "flex flex-col items-center px-24 pb-12 pt-8",
              full && "glass border-b border-line-subtle",
            )}
          >
            <Drawer.Handle className="!mb-8 !h-4 !w-40 !rounded-pill !bg-[var(--border-strong)] !opacity-100" />
            <Drawer.Title className={header ? "sr-only" : "text-title text-fg self-start"}>{title}</Drawer.Title>
            {header}
          </div>
          <div className={cn("flex flex-col gap-16 px-24 pb-24 pb-safe", full ? "overflow-y-auto" : "overflow-hidden")}>
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
