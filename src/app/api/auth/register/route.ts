import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, password, token, name } = await req.json();

    // Verify reCAPTCHA token
    const recaptchaVerification = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
      { method: 'POST' }
    );
    
    const recaptchaResult = await recaptchaVerification.json();
    
    if (!recaptchaResult.success) {
      return NextResponse.json(
        { message: 'reCAPTCHA verification failed' },
        { status: 400 }
      );
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }
    
    // Validate name if provided
    const displayName = name && name.trim() ? name.trim() : null;
    if (displayName && displayName.length > 50) {
      return NextResponse.json(
        { message: 'Name cannot exceed 50 characters' },
        { status: 400 }
      );
    }
    
    // Generate BSYXXX alias and bsy_id
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('alias, bsy_id')
      .order('bsy_id', { ascending: false })
      .limit(1);
    
    let nextNumber = 1;
    if (users && users.length > 0) {
      const lastBsyId = users[0].bsy_id || users[0].alias;
      const lastNumber = parseInt(lastBsyId.replace('BSY', ''), 10);
      nextNumber = lastNumber + 1;
    }
    
    const bsyId = `BSY${nextNumber.toString().padStart(3, '0')}`;
    
    // Generate password hash
    const passwordHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setMinutes(tokenExpiry.getMinutes() + 30); // Token expires in 30 minutes
    
    // Create user
    const { error } = await supabaseAdmin.from('users').insert({
      email,
      password_hash: passwordHash,
      alias: bsyId, // Use the BSY ID as the alias for backward compatibility
      bsy_id: bsyId, // Set the permanent BSY ID
      name: displayName || `Usuario ${bsyId}`, // Use provided name or default
      reset_token: verificationToken,
      reset_token_expires: tokenExpiry.toISOString(),
      last_name_update: new Date().toISOString(),
      needs_name_input: displayName ? false : true // If no name provided, flag for input later
    });
    
    if (error) {
      console.error('Error creating user:', error);
      return NextResponse.json(
        { message: 'Failed to create user' },
        { status: 500 }
      );
    }
    
    // TODO: Send verification email with token
    // This would typically use a service like SendGrid, Mailgun, etc.
    
    return NextResponse.json({ 
      message: 'User registered successfully',
      bsy_id: bsyId,
      name: displayName || `Usuario ${bsyId}`
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 