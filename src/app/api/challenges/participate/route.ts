import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '../../auth/[...nextauth]/auth';
import { participateSchema } from '@/lib/schemas/challenges';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 });
  }

  const parsed = participateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos invalidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { challengeId, entryId } = parsed.data;
  const userId = session.user.id;

  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from('challenges')
    .select('id, is_active, start_date, end_date')
    .eq('id', challengeId)
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json({ error: 'Reto no encontrado' }, { status: 404 });
  }

  if (!challenge.is_active) {
    return NextResponse.json({ error: 'Este reto ya no esta activo' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  if (today < challenge.start_date || today > challenge.end_date) {
    return NextResponse.json({ error: 'Este reto no esta en curso' }, { status: 400 });
  }

  const { data: entry, error: entryError } = await supabaseAdmin
    .from('entries')
    .select('id, user_id')
    .eq('id', entryId)
    .single();

  if (entryError || !entry) {
    return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 });
  }

  if (entry.user_id !== userId) {
    return NextResponse.json({ error: 'No autorizado para esta entrada' }, { status: 403 });
  }

  const { error: insertError } = await supabaseAdmin
    .from('challenge_entries')
    .upsert(
      { challenge_id: challengeId, entry_id: entryId, user_id: userId },
      { onConflict: 'challenge_id,entry_id' }
    );

  if (insertError) {
    return NextResponse.json({ error: 'Error al participar en el reto' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
