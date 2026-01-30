import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";
import bcrypt from "bcryptjs";

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Check if user exists
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single();

        if (!user || !user.password_hash) {
          return null;
        }

        const isBcryptHash = user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2a$');

        if (isBcryptHash) {
          const isValid = await bcrypt.compare(credentials.password, user.password_hash);
          if (!isValid) return null;
        } else {
          const sha256Hash = crypto
            .createHash('sha256')
            .update(credentials.password)
            .digest('hex');

          if (user.password_hash !== sha256Hash) return null;

          const newHash = await bcrypt.hash(credentials.password, 12);
          await supabaseAdmin
            .from('users')
            .update({ password_hash: newHash })
            .eq('id', user.id);
        }

        return {
          id: user.id,
          email: user.email,
          alias: user.alias,
          name: user.name,
          bsy_id: user.bsy_id
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
          console.error('Error creating user:', error);
          return false;
        }
        
        // Store the Supabase UUID in the NextAuth user object
        user.id = userId;
        user.alias = bsyId;
        user.bsy_id = bsyId;
        user.name = typeof displayName === 'string' ? displayName : `Usuario ${bsyId}`;
      } else {
        user.alias = existingUser.alias;
        user.bsy_id = existingUser.bsy_id || existingUser.alias;
        user.name = existingUser.name || `Usuario ${existingUser.alias}`;
        // Set the user ID to match the Supabase UUID
        user.id = existingUser.id;
        
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
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.alias = user.alias;
        token.bsy_id = user.bsy_id;
        token.name = user.name;
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
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
}; 