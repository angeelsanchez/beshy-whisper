import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { updateNotificationPreferencesSchema } from '@/lib/schemas/notification-preferences';
import { logger } from '@/lib/logger';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('notification_preferences')
      .eq('id', session.user.id)
      .single();

    if (error) {
      logger.error('Error fetching notification preferences', { detail: error.message });
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }

    return NextResponse.json({
      preferences: data.notification_preferences ?? {},
    });
  } catch (error) {
    logger.error('Notification preferences GET error', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const parsed = updateNotificationPreferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('notification_preferences')
      .eq('id', session.user.id)
      .single();

    if (fetchError) {
      logger.error('Error fetching existing preferences', { detail: fetchError.message });
      return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }

    const currentPrefs = (existing.notification_preferences as Record<string, boolean> | null) ?? {};
    const merged = { ...currentPrefs, ...parsed.data.preferences };

    const cleaned: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(merged)) {
      if (value === false) {
        cleaned[key] = false;
      }
    }

    const finalValue = Object.keys(cleaned).length === 0 ? null : cleaned;

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ notification_preferences: finalValue })
      .eq('id', session.user.id);

    if (updateError) {
      logger.error('Error updating notification preferences', { detail: updateError.message });
      return NextResponse.json({ error: 'Error al guardar preferencias' }, { status: 500 });
    }

    return NextResponse.json({ preferences: finalValue ?? {} });
  } catch (error) {
    logger.error('Notification preferences PUT error', {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
