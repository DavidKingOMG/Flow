import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { authorizeCredentials } from "@/lib/auth-authorize";
import { isAppRole, type AppRole } from "@/lib/permissions";

function resolveAuthSecret(): string | undefined {
  if (process.env.AUTH_SECRET) {
    return process.env.AUTH_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET is required in production.");
  }

  // Local fallback keeps preview/dev routes working without full env wiring.
  return "flow-dev-auth-secret";
}
type AuthUserContext = {
  businessId: string;
  activeBusinessId: string;
  role: AppRole;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: resolveAuthSecret(),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      credentials: {
        identifier: {
          label: "Email or username",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const authUser = user as typeof user & Partial<AuthUserContext>;

        token.businessId = authUser.businessId;
        token.activeBusinessId = authUser.activeBusinessId ?? authUser.businessId;
        token.role = authUser.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.businessId =
          typeof token.businessId === "string" ? token.businessId : "";
        session.user.activeBusinessId =
          typeof token.activeBusinessId === "string" ? token.activeBusinessId : "";
        session.user.role = isAppRole(token.role) ? token.role : "STAFF";
      }

      return session;
    },
  },
});
