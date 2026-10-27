"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import type { ReactNode } from "react";

/** Registers the service worker in production builds only, scoped to the whole site. */
export function PwaProvider({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV !== "production"}
      options={{ scope: "/" }}
      reloadOnOnline={false}
    >
      {children}
    </SerwistProvider>
  );
}
