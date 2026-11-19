import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export type Role = "OWNER" | "RECEPTION" | "DENTIST" | "PATIENT" | "SUPER_ADMIN" | "user";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();
  const role = (session.user as any).role as Role;
  if (!roles.includes(role)) redirect("/dashboard");
  return session;
}

export function canSeeCommissions(role: string) {
  return role === "OWNER" || role === "SUPER_ADMIN";
}

export function canEditClinical(role: string) {
  return role === "OWNER" || role === "DENTIST" || role === "SUPER_ADMIN";
}
