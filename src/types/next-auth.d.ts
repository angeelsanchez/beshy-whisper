import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      alias: string;
      bsy_id: string;
      name?: string;
    } & DefaultSession["user"];
  }

  interface User {
    alias?: string;
    bsy_id?: string;
    name?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    alias?: string;
    bsy_id?: string;
    name?: string;
  }
} 