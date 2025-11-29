import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type = 'test', title, body: notificationBody } = body;
    
    const testTitle = title || '🧪 Test Notification';
    const testBody = notificationBody || 'Esta es una notificación de prueba del sistema';
    
    console.log('[TEST NOTIFICATION] Sending test notification:', {
      userId: session.user.id,
      type,
      title: testTitle,
      body: testBody
    });

    // Return success - the actual notification will be shown by the client
    return NextResponse.json({ 
      success: true,
      message: 'Test notification request received',
      notification: {
        title: testTitle,
        body: testBody,
        type
      }
    });
  } catch (error) {
    console.error('[TEST NOTIFICATION] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 