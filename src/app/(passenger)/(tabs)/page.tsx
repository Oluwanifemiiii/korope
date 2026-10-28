import { Suspense } from "react";
import { HomeScreen } from "@/components/home/HomeScreen";
import { getSession } from "@/lib/auth/server";
import { asUser } from "@/lib/db";
import { cachedNetwork } from "@/lib/network-cached";

/** Home (05a/05b): the map is the hero, the panel answers "where can I go?". */
export default async function HomePage() {
  const net = await cachedNetwork();
  return (
    <Suspense fallback={<HomeScreen network={net} firstName={null} signedIn={false} />}>
      <HomeWithUser network={net} />
    </Suspense>
  );
}

async function HomeWithUser({ network }: { network: Awaited<ReturnType<typeof cachedNetwork>> }) {
  const session = await getSession();
  let firstName: string | null = null;
  if (session) {
    firstName = await asUser(session.user.id, async (c) => {
      const { rows } = await c.query<{ full_name: string | null }>("select full_name from public.profiles where id = $1", [
        session.user.id,
      ]);
      return rows[0]?.full_name?.split(" ")[0] ?? null;
    });
  }
  return <HomeScreen network={network} firstName={firstName} signedIn={!!session} />;
}
