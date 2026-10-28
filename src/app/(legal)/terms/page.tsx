import type { Metadata } from "next";
import { Banner } from "@/components/ui/Banner";

export const metadata: Metadata = { title: "Terms of service" };

/** Shell only. Final text needs legal review before launch (PLAN launch checklist). */
export default function TermsPage() {
  return (
    <>
      <h1 className="text-h2">Terms of service</h1>
      <Banner tone="warning" title="Draft for review.">
        These terms are an outline and are not yet in force. The final version will be published before Korope opens to the public.
      </Banner>
      <h2>Booking a seat</h2>
      <p>A booking is one seat on one scheduled departure, from your boarding stop to your alighting stop. The fare is fixed when you reserve the seat and shown with a breakdown before you pay.</p>
      <h2>Paying</h2>
      <p>Seats are paid from your Korope wallet. You add money to the wallet through Paystack. Korope never sees or stores your card or bank details.</p>
      <h2>Cancelling and refunds</h2>
      <ul>
        <li>Cancel 30 minutes or more before the bus is due at your stop: full refund to your wallet.</li>
        <li>Cancel less than 30 minutes before: 50% refund to your wallet.</li>
        <li>After the bus has left your stop, or if you don&apos;t board: no refund.</li>
        <li>If Korope cancels the departure, or the bus is more than 20 minutes late at your stop: full refund to your wallet, automatically.</li>
      </ul>
      <h2>Boarding</h2>
      <p>Show your boarding pass QR code to the driver. Your pass works offline once it has been opened on your phone.</p>
      <h2>Contact</h2>
      <p>[Support email and phone to be added before launch.]</p>
    </>
  );
}
