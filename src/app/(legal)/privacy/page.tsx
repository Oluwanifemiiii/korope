import type { Metadata } from "next";
import { Banner } from "@/components/ui/Banner";

export const metadata: Metadata = { title: "Privacy policy" };

/** Shell only. Must be completed for Nigeria's NDPA 2023 and reviewed before launch. */
export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-h2">Privacy policy</h1>
      <Banner tone="warning" title="Draft for review.">
        This outline follows the Nigeria Data Protection Act 2023 and is not yet in force. The final version will be published before launch.
      </Banner>
      <h2>What we collect</h2>
      <ul>
        <li>Your phone number, to sign you in and so your driver can reach you.</li>
        <li>Your location while you use Korope, to show nearby stops and walking times. We don&apos;t track you in the background.</li>
        <li>Bookings, wallet top-ups and payments. Card and bank details are handled by Paystack, not stored by Korope.</li>
        <li>Driver location during a shift, to show passengers where their bus is.</li>
      </ul>
      <h2>How long we keep it</h2>
      <ul>
        <li>Bus position history: 30 days.</li>
        <li>Sign-in code and SMS logs: 90 days.</li>
        <li>Bookings, wallet records and receipts: 6 years, as financial records.</li>
        <li>Safety (SOS) records: 2 years.</li>
      </ul>
      <h2>Your rights</h2>
      <p>You can ask for a copy of your data, ask us to correct it, or ask us to delete your account, subject to the records we must keep by law.</p>
      <h2>Contact</h2>
      <p>[Data protection officer contact to be added before launch.]</p>
    </>
  );
}
