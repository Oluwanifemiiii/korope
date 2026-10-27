import type { Metadata } from "next";
import { Suspense } from "react";
import { PhoneSignIn } from "@/components/auth/PhoneSignIn";
import { safeNext } from "@/lib/auth/routes";
import { checkDriverPhone } from "./actions";

export const metadata: Metadata = { title: "Driver sign-in" };

export default function DriverSignInPage({ searchParams }: PageProps<"/driver/sign-in">) {
  return (
    <Suspense>
      <DriverSignIn searchParams={searchParams} />
    </Suspense>
  );
}

async function DriverSignIn({ searchParams }: { searchParams: PageProps<"/driver/sign-in">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "/driver");
  const roleNotice =
    sp.reason === "role"
      ? "You're signed in, but this number isn't set up as a driver. Use the number ops registered for you."
      : undefined;
  return <PhoneSignIn surface="driver" next={next} checkDriver={checkDriverPhone} roleNotice={roleNotice} />;
}
