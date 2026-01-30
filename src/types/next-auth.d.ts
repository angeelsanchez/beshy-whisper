import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      alias: string;
      bsy_id: string;
      name?: string;
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    alias?: string;
    bsy_id?: string;
    name?: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    alias?: string;
    bsy_id?: string;
    name?: string;
    role?: string;
  }
}
