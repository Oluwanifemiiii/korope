"use client";

import { useActionState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { registerInterest, type LeadState } from "./actions";

export function KoropePlusForm() {
  const [state, action, pending] = useActionState<LeadState, FormData>(registerInterest, { ok: false });

  if (state.ok) {
    return (
      <Banner tone="success" title="Thanks, we've got your details.">
        We&apos;ll be in touch about Korope+ only.
      </Banner>
    );
  }

  return (
    <form action={action} aria-label="Register interest in Korope+" className="flex grow flex-col gap-16" noValidate>
      <h2 className="text-subtitle font-semibold text-fg">Tell us about your team</h2>
      <Field name="organisation" label="Company or school name" placeholder="Registered name" error={state.errors?.organisation} />
      <Field name="riders" label="Staff or students who would ride" placeholder="Approximate number" inputMode="numeric" className="num" error={state.errors?.riders} />
      <Field name="contact" label="Work email or phone" placeholder="So we can reach you" autoComplete="email" error={state.errors?.contact} />
      {state.message ? <Banner tone="warning" title={state.message} /> : null}
      <div className="mt-auto flex flex-col gap-8 pt-16">
        <Button type="submit" block state={pending ? "loading" : "default"}>
          Register interest
        </Button>
        <p className="text-center text-label text-fg-muted">No commitment. We&apos;ll only contact you about Korope+.</p>
      </div>
    </form>
  );
}
