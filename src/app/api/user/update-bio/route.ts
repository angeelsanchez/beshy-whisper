import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { updateBioSchema } from '@/lib/schemas/user';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const body: unknown = await req.json();
    const parsed = updateBioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { bio } = parsed.data;

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ bio: bio || null })
      .eq('id', userId);

    if (updateError) {
      logger.error('Error updating bio', { detail: updateError.message });
      return NextResponse.json({ error: 'Error al actualizar la bio' }, { status: 500 });
    }

    return NextResponse.json({ bio: bio || null });
  } catch (error) {
    logger.error('Update bio error', { detail: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
