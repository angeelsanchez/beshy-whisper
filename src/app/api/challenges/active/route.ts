import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(): Promise<NextResponse> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('challenges')
    .select('id, title, description, theme, start_date, end_date, is_active')
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1);

  if (error) {
    return NextResponse.json({ error: 'Error al obtener el reto activo' }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ challenge: null, participantCount: 0 });
  }

  const challenge = data[0];

  const { data: participantData, error: countError } = await supabaseAdmin
    .from('challenge_entries')
    .select('user_id')
    .eq('challenge_id', challenge.id);

  if (countError) {
    return NextResponse.json({ challenge, participantCount: 0 });
  }

  const uniqueParticipants = new Set(participantData?.map((row) => row.user_id)).size;

  return NextResponse.json({ challenge, participantCount: uniqueParticipants });
}
