import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getVaultStore, type User } from "./vault-store";

export const SESSION_COOKIE = "spl_vault_session";

export async function currentUser(): Promise<User | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  return raw ? getVaultStore().getSession(raw) : null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function loginUser(userId: string): Promise<void> {
  const jar = await cookies();
  const previous = jar.get(SESSION_COOKIE)?.value;
  if (previous) getVaultStore().revokeSession(previous);
  const raw = getVaultStore().createSession(userId);
  jar.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function logoutUser(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) getVaultStore().revokeSession(raw);
  jar.delete(SESSION_COOKIE);
}

export const getCurrentUser = currentUser;
export const signIn = loginUser;
export const signOut = logoutUser;
