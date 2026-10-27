import type { Metadata } from "next";
import { Suspense } from "react";
import { PhoneSignIn } from "@/components/auth/PhoneSignIn";
import { safeNext } from "@/lib/auth/routes";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <Suspense>
      <SignIn searchParams={searchParams} />
    </Suspense>
  );
}

async function SignIn({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const roleNotice =
    sp.reason === "role" ? "This account doesn't have access to that page. Sign in with a different number." : undefined;
  return <PhoneSignIn surface="passenger" next={next} roleNotice={roleNotice} />;
}
