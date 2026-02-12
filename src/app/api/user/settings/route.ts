import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const userSettingsSchema = z.object({
  defaultPostPrivacy: z.enum(['public', 'private']).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = userSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Solicitud inválida', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { defaultPostPrivacy } = parsed.data;

    if (!defaultPostPrivacy) {
      return NextResponse.json(
        { error: 'Se requiere al menos un parámetro para actualizar' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        default_post_privacy: defaultPostPrivacy,
      })
      .eq('id', session.user.id);

    if (updateError) {
      logger.error('Error updating user settings', { detail: updateError.message });
      return NextResponse.json(
        { error: 'Error al actualizar preferencias' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Preferencias actualizadas correctamente',
    });
  } catch (error) {
    logger.error('Error in user settings API', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('default_post_privacy')
      .eq('id', session.user.id)
      .single();

    if (fetchError || !user) {
      logger.error('Error fetching user settings', { detail: fetchError?.message });
      return NextResponse.json(
        { error: 'Error al cargar preferencias' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      defaultPostPrivacy: user.default_post_privacy || 'public',
    });
  } catch (error) {
    logger.error('Error in user settings GET API', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
