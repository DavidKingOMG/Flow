import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { authorizeCredentials } from "@/lib/auth-authorize";
import { getEnv } from "@/lib/env";
import { isAppRole, type AppRole } from "@/lib/permissions";

const env = getEnv();
type AuthUserContext = {
  businessId: string;
  activeBusinessId: string;
  role: AppRole;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: env.AUTH_SECRET,
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
