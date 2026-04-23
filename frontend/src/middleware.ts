import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Use only the edge-compatible authConfig here — no Prisma, no bcryptjs.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
