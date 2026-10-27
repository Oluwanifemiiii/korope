"use client";

import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { KoropeMark } from "@/components/brand/KoropeMark";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field, NigeriaPrefix } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { OtpInput } from "@/components/ui/OtpInput";
import { authErrorMessage } from "@/lib/auth/errors";
import { formatPhone, nigerianPhone } from "@/lib/contracts/auth";
import { authClient } from "@/lib/auth/client";
import { formatCountdown } from "@/lib/time";

const RESEND_AFTER_S = 60;

type Props = {
  next: string;
  /** Drivers are checked against the pre-registered list before a code is sent. */
  surface: "passenger" | "driver";
  checkDriver?: (phone: string) => Promise<{ ok: boolean; message?: string }>;
  roleNotice?: string;
};

/** 03a phone sign-in and 03b OTP, one flow. */
export function PhoneSignIn({ next, surface, checkDriver, roleNotice }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [raw, setRaw] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function sendCode(target: string) {
    setBusy(true);
    setError(undefined);
    if (checkDriver) {
      const check = await checkDriver(target);
      if (!check.ok) {
        setBusy(false);
        setError(check.message);
        return false;
      }
    }
    const { error: err } = await authClient.phoneNumber.sendOtp({ phoneNumber: target });
    setBusy(false);
    if (err) {
      setError(authErrorMessage(err));
      return false;
    }
    setResendIn(RESEND_AFTER_S);
    return true;
  }

  async function onPhoneSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = nigerianPhone.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (await sendCode(parsed.data)) {
      setPhone(parsed.data);
      setStep("code");
    }
  }

  async function verify(token: string) {
    if (!phone) return;
    setBusy(true);
    setError(undefined);
    const { error: err } = await authClient.phoneNumber.verify({ phoneNumber: phone, code: token });
    if (err) {
      setBusy(false);
      setError(authErrorMessage(err));
      return;
    }
    navigator.vibrate?.(10);
    router.replace(next);
    router.refresh();
  }

  async function google() {
    setBusy(true);
    const { error: err } = await authClient.signIn.social({ provider: "google", callbackURL: next });
    if (err) {
      setBusy(false);
      setError(authErrorMessage(err));
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[calc(var(--space-96)*5)] flex-col px-24 pb-24 pb-safe pt-16 pt-safe">
      <div className="flex h-48 items-center">
        {step === "code" ? (
          <IconButton
            label="Back"
            icon={<ArrowLeft aria-hidden="true" />}
            className="-ml-12 bg-transparent shadow-none"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(undefined);
            }}
          />
        ) : (
          <Link
            href={surface === "driver" ? "/driver" : "/"}
            aria-label="Back"
            className="-ml-12 inline-flex size-[var(--size-touch-min)] items-center justify-center rounded-circle text-fg"
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
        )}
      </div>

      {step === "phone" ? (
        <form onSubmit={onPhoneSubmit} className="flex grow flex-col" noValidate>
          <div className="mt-24 flex flex-col gap-12">
            <KoropeMark size={40} title="Korope" />
            <h1 className="text-h2 text-fg">
              {surface === "driver" ? "Driver sign-in" : "What's your phone number?"}
            </h1>
            <p className="text-body text-fg-muted">
              {surface === "driver"
                ? "Use the phone number Korope operations registered for you. We'll text you a 6-digit code."
                : "We'll text you a 6-digit code. Your driver can also reach you on this number if you're running late."}
            </p>
          </div>
          {roleNotice ? <Banner tone="info" title={roleNotice} className="mt-24" /> : null}
          <Field
            className="mt-32"
            label="Phone number"
            prefix={<NigeriaPrefix />}
            inputMode="tel"
            autoComplete="tel-national"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setError(undefined);
            }}
            helper="Start with 7, 8 or 9. You can leave out the first 0."
            error={error}
            disabled={busy}
          />
          <div className="mt-auto flex flex-col gap-12 pt-32">
            <Button type="submit" block state={busy ? "loading" : "default"}>
              Send code
            </Button>
            {surface === "passenger" ? (
              <>
                <div className="flex items-center gap-12" aria-hidden="true">
                  <span className="h-px grow bg-[var(--border-default)]" />
                  <span className="text-caption text-fg-muted">or</span>
                  <span className="h-px grow bg-[var(--border-default)]" />
                </div>
                <Button
                  variant="secondary"
                  block
                  onClick={google}
                  disabled={busy}
                  className="text-fg ring-[var(--border-strong)]"
                  icon={<GoogleG />}
                >
                  Continue with Google
                </Button>
              </>
            ) : null}
            <p className="mt-4 text-center text-label text-fg-muted">
              By continuing you agree to Korope&apos;s{" "}
              <Link href="/terms" className="font-semibold text-[var(--text-link)] underline-offset-2 hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold text-[var(--text-link)] underline-offset-2 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </form>
      ) : (
        <div className="flex grow flex-col">
          <div className="mt-24 flex flex-col gap-12">
            <h1 className="text-h2 text-fg">Enter the 6-digit code</h1>
            <p className="text-body text-fg-muted">
              Sent by SMS to{" "}
              <span className="font-semibold text-fg num">{phone ? formatPhone(phone) : ""}</span>
            </p>
            <button
              type="button"
              className="flex min-h-touch items-center self-start text-body font-semibold text-[var(--text-link)]"
              onClick={() => {
                setStep("phone");
                setCode("");
                setError(undefined);
              }}
            >
              Change number
            </button>
          </div>
          <div className="mt-32">
            <OtpInput value={code} onChange={setCode} onComplete={verify} error={error} disabled={busy} />
          </div>
          {resendIn > 0 ? (
            <p className="mt-20 flex items-center gap-8 text-caption text-fg-muted" aria-live="polite">
              <Clock aria-hidden="true" className="size-[var(--size-icon-s)]" />
              Resend code in <span className="font-semibold text-fg num">{formatCountdown(resendIn)}</span>
            </p>
          ) : null}
          <Banner
            tone="info"
            className="mt-24"
            title="On most Android phones the code fills in by itself when the SMS arrives."
          />
          <div className="mt-auto flex flex-col gap-8 pt-32">
            <Button
              block
              disabled={code.length < 6}
              state={busy ? "loading" : "default"}
              onClick={() => verify(code)}
            >
              Verify
            </Button>
            <Button
              variant="tertiary"
              block
              disabled={resendIn > 0 || busy}
              onClick={() => phone && sendCode(phone)}
            >
              Resend by SMS
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

/** Google "G" in Google's own colours, as the brand guidelines require for the sign-in button. */
function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[var(--size-icon-m)]">
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.6l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  );
}
