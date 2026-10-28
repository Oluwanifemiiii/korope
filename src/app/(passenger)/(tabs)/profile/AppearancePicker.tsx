"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Chip } from "@/components/ui/Chip";
import { applyTheme, THEME_STORAGE_KEY, type ThemePref } from "@/lib/theme";

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "Match phone", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

function subscribeStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function readPref(): ThemePref {
  try {
    return (localStorage.getItem(THEME_STORAGE_KEY) as ThemePref | null) ?? "system";
  } catch {
    return "system";
  }
}

/** Profile > Appearance. Stored on this device; "Match phone" follows the system setting. */
export function AppearancePicker() {
  const stored = useSyncExternalStore(subscribeStorage, readPref, () => "system" as ThemePref);
  const [picked, setPref] = useState<ThemePref | null>(null);
  const pref = picked ?? stored;

  return (
    <div role="group" aria-label="Appearance" className="flex flex-wrap gap-8">
      {OPTIONS.map(({ value, label, Icon }) => (
        <Chip
          key={value}
          selected={pref === value}
          icon={<Icon aria-hidden="true" className="size-[var(--size-icon-s)]" />}
          onClick={() => {
            setPref(value);
            applyTheme(value);
          }}
        >
          {label}
        </Chip>
      ))}
    </div>
  );
}
