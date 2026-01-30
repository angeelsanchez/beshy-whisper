import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  token: z.string().min(1),
  name: z.string().max(50).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password, token, name } = parsed.data;

    const recaptchaVerification = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
      { method: 'POST' }
    );

    const recaptchaResult = await recaptchaVerification.json();

    if (!recaptchaResult.success || (recaptchaResult.score !== undefined && recaptchaResult.score < 0.5)) {
      return NextResponse.json(
        { message: 'reCAPTCHA verification failed' },
        { status: 400 }
      );
    }

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    const displayName = name?.trim() || null;

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('alias, bsy_id')
      .order('bsy_id', { ascending: false })
      .limit(1);

    let nextNumber = 1;
    if (users && users.length > 0) {
      const lastBsyId = users[0].bsy_id || users[0].alias;
      const lastNumber = Number.parseInt(lastBsyId.replace('BSY', ''), 10);
      nextNumber = lastNumber + 1;
    }

    const bsyId = `BSY${nextNumber.toString().padStart(3, '0')}`;

    const passwordHash = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setMinutes(tokenExpiry.getMinutes() + 30);

    const { error } = await supabaseAdmin.from('users').insert({
      email,
      password_hash: passwordHash,
      alias: bsyId,
      bsy_id: bsyId,
      name: displayName || `Usuario ${bsyId}`,
      reset_token: verificationToken,
      reset_token_expires: tokenExpiry.toISOString(),
      last_name_update: new Date().toISOString(),
      needs_name_input: !displayName
    });

    if (error) {
      logger.error('Error creating user', { detail: error?.message || String(error) });
      return NextResponse.json(
        { message: 'Failed to create user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'User registered successfully',
      bsy_id: bsyId,
      name: displayName || `Usuario ${bsyId}`
    });
  } catch (error) {
    logger.error('Registration error', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
