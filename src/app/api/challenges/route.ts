import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { createChallengeSchema } from '@/lib/schemas/challenges';

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores pueden ver todos los retos' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('challenges')
    .select('id, title, description, theme, start_date, end_date, is_active, created_at')
    .order('start_date', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Error al obtener retos' }, { status: 500 });
  }

  return NextResponse.json({ challenges: data ?? [] });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores pueden crear retos' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 });
  }

  const parsed = createChallengeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { title, description, theme, start_date, end_date } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from('challenges')
    .insert({
      title,
      description,
      theme: theme ?? null,
      start_date,
      end_date,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Error al crear el reto' }, { status: 500 });
  }

  return NextResponse.json({ challenge: data }, { status: 201 });
}
