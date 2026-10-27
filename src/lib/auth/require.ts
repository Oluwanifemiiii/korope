import "server-only";
import { redirect } from "next/navigation";
import { getRoles, getSession } from "./server";
import { signInPathFor, type AppRole } from "./routes";

/**
 * Server-side role gate for layouts and pages. Reads the session (cookie cache) and the
 * roles from user_roles, so a revoked role takes effect on the next request.
 * Call it inside a Suspense boundary: it reads cookies.
 */
export async function requireRole(role: AppRole, next: string) {
  const session = await getSession();
  const signIn = `${signInPathFor(role)}?next=${encodeURIComponent(next)}`;
  if (!session) redirect(signIn);
  const roles = await getRoles(session.user.id);
  if (!roles.includes(role)) redirect(`${signIn}&reason=role`);
  return { session, roles };
}
