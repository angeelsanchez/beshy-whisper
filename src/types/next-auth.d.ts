import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      alias: string;
      bsy_id: string;
      name?: string;
      role?: string;
      profile_photo_url?: string | null;
      bio?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    alias?: string;
    bsy_id?: string;
    name?: string;
    role?: string;
    profile_photo_url?: string | null;
    bio?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    alias?: string;
    bsy_id?: string;
    name?: string;
    role?: string;
    profile_photo_url?: string | null;
    bio?: string | null;
  }
}
