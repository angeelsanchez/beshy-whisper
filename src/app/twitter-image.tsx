import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'BESHY Whisper - Tu espacio de journaling diario anónimo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2D1E1A 0%, #4A2E1B 50%, #2D1E1A 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '30px',
              background: 'linear-gradient(135deg, #fbbf24, #f97316)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 60px rgba(251, 191, 36, 0.3)',
            }}
          >
            <div
              style={{
                fontSize: '64px',
                fontWeight: 800,
                color: 'white',
                lineHeight: 1,
              }}
            >
              W
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                fontSize: '56px',
                fontWeight: 800,
                color: '#F5F0E1',
                letterSpacing: '-1px',
              }}
            >
              BESHY Whisper
            </div>

            <div
              style={{
                fontSize: '24px',
                color: '#F5F0E1',
                opacity: 0.8,
                maxWidth: '600px',
                textAlign: 'center',
              }}
            >
              Tu espacio de journaling diario anónimo
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '32px',
              marginTop: '16px',
            }}
          >
            {['Journaling', 'Habitos', 'Comunidad', 'Bienestar'].map((tag) => (
              <div
                key={tag}
                style={{
                  padding: '8px 20px',
                  borderRadius: '20px',
                  background: 'rgba(251, 191, 36, 0.2)',
                  border: '1px solid rgba(251, 191, 36, 0.4)',
                  color: '#fbbf24',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            fontSize: '16px',
            color: '#F5F0E1',
            opacity: 0.5,
          }}
        >
          whisper.beshy.es
        </div>
      </div>
    ),
    { ...size }
  );
}
