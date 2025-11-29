import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkLockout } from '@/lib/auth-lockout';

const checkLockoutSchema = z.object({
  email: z.string().email().max(255),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body: unknown = await request.json();
  const parsed = checkLockoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const lockout = await checkLockout(ip, parsed.data.email);

  return NextResponse.json({
    locked: lockout.locked,
    remainingSeconds: lockout.remainingSeconds,
  });
}
