import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";
import { checkLockout, recordLoginAttempt } from "@/lib/auth-lockout";
import { safeCompare } from "@/utils/crypto-helpers";

// Function to generate sequential BSYXXX alias
async function generateBeshyId() {
  // Get the highest existing BSY ID
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('bsy_id')
    .ilike('bsy_id', 'BSY%')
    .order('bsy_id', { ascending: false })
    .limit(1);
  
  let nextNumber = 1;
  if (users && users.length > 0) {
    const lastBsyId = users[0].bsy_id;
    const lastNumber = parseInt(lastBsyId.replace('BSY', ''), 10);
    nextNumber = lastNumber + 1;
  }
  
  // Format with leading zeros (BSY001, BSY002, etc.)
  return `BSY${nextNumber.toString().padStart(3, '0')}`;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: "Email/Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const ip = (req?.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim()
          || (req?.headers?.['x-real-ip'] as string)
          || 'unknown';

        const lockout = await checkLockout(ip, credentials.email);
        if (lockout.locked) {
          logger.warn('Login blocked by lockout', {
            ip,
            failedAttempts: lockout.failedAttempts,
            remainingSeconds: lockout.remainingSeconds,
          });
          return null;
        }

        const { data: user } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single();

        if (!user || !user.password_hash) {
          await recordLoginAttempt(ip, credentials.email, false);
          return null;
        }

        const isBcryptHash = user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2a$');

        if (isBcryptHash) {
          const isValid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!isValid) {
            await recordLoginAttempt(ip, credentials.email, false);
            return null;
          }
        } else {
          const sha256Hash = crypto
            .createHash('sha256')
            .update(credentials.password)
            .digest('hex');

          if (!safeCompare(user.password_hash, sha256Hash)) {
            await recordLoginAttempt(ip, credentials.email, false);
            return null;
          }

          const newHash = await bcrypt.hash(credentials.password, 12);
          await supabaseAdmin
            .from('users')
            .update({ password_hash: newHash })
            .eq('id', user.id);
        }

        await recordLoginAttempt(ip, credentials.email, true);

        return {
          id: user.id,
          email: user.email,
          alias: user.alias,
          name: user.name,
          bsy_id: user.bsy_id,
          role: user.role || 'user',
          profile_photo_url: user.profile_photo_url ?? null,
          bio: user.bio ?? null,
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      
      // Store the provider information
      const provider = account?.provider || 'credentials';
      const providerId = account?.providerAccountId || null;
      
      // Check if user already exists by email
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();

      if (!existingUser) {
        // Create new user with BSYXXX ID
        const bsyId = await generateBeshyId();
        
        // Generate a proper UUID for the user rather than using Google's ID
        const userId = crypto.randomUUID();
        
        // Get name from Google profile if available
        let displayName = null;
        if (profile && 'name' in profile && profile.name) {
          displayName = profile.name;
        } else if (profile && 'given_name' in profile && profile.given_name) {
          displayName = profile.given_name;
        }
        
        const { error } = await supabaseAdmin.from('users').insert({
          id: userId,
          email: user.email,
          alias: bsyId,
          bsy_id: bsyId,
          name: displayName || `Usuario ${bsyId}`,
          provider: provider,
          provider_id: providerId,
          google_id: provider === 'google' ? providerId : null,
          last_name_update: new Date().toISOString(),
          needs_name_input: true // Flag for name input even if we have a name from Google
        });

        if (error) {
          logger.error('Error creating user', { detail: error?.message || String(error) });
          return false;
        }
        
        // Store the Supabase UUID in the NextAuth user object
        user.id = userId;
        user.alias = bsyId;
        user.bsy_id = bsyId;
        user.name = typeof displayName === 'string' ? displayName : `Usuario ${bsyId}`;
        user.role = 'user';
      } else {
        user.alias = existingUser.alias;
        user.bsy_id = existingUser.bsy_id || existingUser.alias;
        user.name = existingUser.name || `Usuario ${existingUser.alias}`;
        user.id = existingUser.id;
        user.role = existingUser.role || 'user';
        user.profile_photo_url = existingUser.profile_photo_url ?? null;
        user.bio = existingUser.bio ?? null;
        
        // Update provider information if not already set
        if (provider === 'google' && !existingUser.google_id) {
          await supabaseAdmin
            .from('users')
            .update({
              google_id: providerId,
              provider: provider,
              provider_id: providerId
            })
            .eq('id', existingUser.id);
        }
      }
      
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.alias = token.alias as string;
        session.user.bsy_id = token.bsy_id as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.profile_photo_url = (token.profile_photo_url as string | null) ?? null;
        session.user.bio = (token.bio as string | null) ?? null;
      }
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.alias = user.alias;
        token.bsy_id = user.bsy_id;
        token.name = user.name;
        token.role = user.role;
        token.profile_photo_url = user.profile_photo_url ?? null;
        token.bio = user.bio ?? null;
      }
      if (trigger === 'update' && session) {
        const update = session as Record<string, unknown>;
        if ('profile_photo_url' in update) {
          token.profile_photo_url = update.profile_photo_url as string | null;
        }
        if ('bio' in update) {
          token.bio = update.bio as string | null;
        }
        if ('name' in update) {
          token.name = update.name as string;
        }
      }
      return token;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: false,
  secret: process.env.NEXTAUTH_SECRET,
}; 