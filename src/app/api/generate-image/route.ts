import { NextRequest, NextResponse } from 'next/server';
import { escapeHtml } from '@/utils/html-escape';
import { logger } from '@/lib/logger';
import {
  fetchAvatarAsDataUri,
  getCachedLogo,
  processLogoSVG,
  createAvatarHTML,
  launchPuppeteerBrowser,
  loadPageWithFonts,
  loadTwemoji,
  BRAND_COLORS,
} from '@/utils/puppeteer-helpers';
import { generateImageSchema } from '@/lib/schemas/generate-image';
import {
  type FormattedObjective,
  MONTSERRAT_IMPORT,
  MONTSERRAT_FONT_STACK,
  CSS_RESET,
  IMAGE_RENDERING_CSS,
  EMOJI_IMG_CSS,
  renderObjectivesHtml,
  renderInlineUserInfoHtml,
  renderLogoFooterHtml,
  formatImageDate,
} from '@/utils/image-templates';

interface TemplateOptions {
  mensaje: string;
  objetivos: FormattedObjective[];
  display_name: string;
  display_id: string;
  fecha: string;
  isDay: boolean;
  logoSVG: string;
  avatarDataUri: string | null;
}

interface ManifestationTemplateOptions {
  content: string;
  daysManifesting: number;
  reaffirmationCount: number;
  display_name: string;
  display_id: string;
  isDay: boolean;
  logoSVG: string;
  avatarDataUri: string | null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let browser: Awaited<ReturnType<typeof launchPuppeteerBrowser>> | null = null;

  try {
    const body = await request.json();
    const parsed = generateImageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { mensaje, objetivos, display_name, display_id, fecha, mode, isDay, profile_photo_url, daysManifesting, reaffirmationCount } = parsed.data;

    const [logoSVG, avatarDataUri] = await Promise.all([
      getCachedLogo(),
      profile_photo_url ? fetchAvatarAsDataUri(profile_photo_url) : Promise.resolve(null),
    ]);

    const formattedObjectives = objetivos.map(obj => ({
      ...obj,
      icon: obj.done ? '☑' : '☐',
      isCompleted: obj.done,
    }));

    const templateOpts: TemplateOptions = {
      mensaje,
      objetivos: formattedObjectives,
      display_name,
      display_id,
      fecha,
      isDay,
      logoSVG,
      avatarDataUri,
    };

    let htmlContent: string;
    if (mode === 'manifestation') {
      const manifestationOpts: ManifestationTemplateOptions = {
        content: mensaje,
        daysManifesting: daysManifesting ?? 1,
        reaffirmationCount: reaffirmationCount ?? 0,
        display_name,
        display_id,
        isDay,
        logoSVG,
        avatarDataUri,
      };
      htmlContent = createManifestationHTML(manifestationOpts);
    } else if (mode === 'bubble') {
      htmlContent = createBubbleHTML(templateOpts);
    } else if (mode === 'sticker') {
      htmlContent = createStickerHTML(templateOpts);
    } else {
      htmlContent = createNormalHTML(templateOpts);
    }

    browser = await launchPuppeteerBrowser();
    const page = await browser.newPage();

    if (mode === 'bubble' || mode === 'sticker' || mode === 'manifestation') {
      await page.setViewport({ width: 960, height: 1600, deviceScaleFactor: 1 });
    } else {
      await page.setViewport({ width: 2160, height: 3840, deviceScaleFactor: 1 });
    }

    await loadPageWithFonts(page, htmlContent);
    await loadTwemoji(page);

    const isTransparentMode = mode === 'bubble' || mode === 'sticker' || mode === 'manifestation';
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: isTransparentMode,
      omitBackground: isTransparentMode,
      captureBeyondViewport: false,
      optimizeForSpeed: true,
    });

    return new NextResponse(Buffer.from(screenshot), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="beshy-whisper-${mode}-${Date.now()}.png"`,
        'Cache-Control': 'public, max-age=300',
        'Content-Length': screenshot.length.toString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error generating image', { detail: errorMessage });

    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout');

    return NextResponse.json(
      {
        error: isTimeout ? 'Image generation timeout - please try again' : 'Failed to generate image',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: isTimeout ? 408 : 500 }
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Browser cleanup failure is non-critical
      }
    }
  }
}

function createNormalHTML(opts: TemplateOptions): string {
  const { mensaje, objetivos, display_name, display_id, fecha, isDay, logoSVG, avatarDataUri } = opts;
  const colors = isDay ? BRAND_COLORS.day : BRAND_COLORS.night;
  const processedLogo = processLogoSVG(logoSVG, 160, 160, colors.text, colors.text);
  const avatarHTML = createAvatarHTML(avatarDataUri, display_name, 160, colors.avatarText, colors.avatarBg);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        ${MONTSERRAT_IMPORT}

        ${CSS_RESET}

        body {
          font-family: ${MONTSERRAT_FONT_STACK};
          width: 2160px;
          height: 3840px;
          background-color: ${colors.background};
          color: ${colors.text};
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          ${IMAGE_RENDERING_CSS}
        }

        .content-container {
          width: 1600px;
          max-width: 90%;
          background-color: ${colors.container};
          padding: 120px;
          border-radius: 48px;
          box-shadow: 0 50px 100px -24px rgba(0, 0, 0, 0.25);
          position: relative;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 80px;
        }

        .avatar-container {
          margin-bottom: 32px;
        }

        .display-name { font-size: 72px; font-weight: 700; margin-bottom: 16px; }
        .display-id { font-size: 48px; opacity: 0.7; margin-bottom: 32px; }
        .date { font-size: 40px; opacity: 0.8; }
        .message { font-size: 64px; line-height: 1.6; margin: 80px 0; text-align: center; }
        .objectives-container { margin: 80px 0; }
        .objectives-title { font-size: 56px; font-weight: 600; margin-bottom: 48px; text-align: center; }
        .objective-item { display: flex; align-items: flex-start; margin-bottom: 32px; font-size: 48px; line-height: 1.5; }
        .objective-icon { font-size: 56px; margin-right: 24px; min-width: 80px; color: ${colors.text}; }
        .objective-text { flex: 1; }
        .objective-completed { text-decoration: line-through; opacity: 0.7; }
        .logo-container { display: flex; justify-content: center; margin-top: 80px; }
        .watermark { position: absolute; bottom: 15%; left: 50%; transform: translateX(-50%); font-size: 96px; font-weight: 700; color: ${colors.text}; opacity: 0.6; }
        ${EMOJI_IMG_CSS}
      </style>
    </head>
    <body>
      <div class="content-container">
        <div class="user-info">
          <div class="avatar-container">${avatarHTML}</div>
          <div class="display-name">${escapeHtml(display_name)}</div>
          <div class="display-id">@${escapeHtml(display_id)}</div>
          <div class="date">${formatImageDate(fecha)}</div>
        </div>

        <div class="message">${escapeHtml(mensaje)}</div>

        ${renderObjectivesHtml(objetivos, 'Objetivos de hoy:')}

        <div class="logo-container">${processedLogo}</div>
      </div>

      <div class="watermark">BESHY</div>
    </body>
    </html>
  `;
}

function createBubbleHTML(opts: TemplateOptions): string {
  const { mensaje, objetivos, display_name, display_id, fecha, isDay, logoSVG, avatarDataUri } = opts;
  const colors = isDay ? BRAND_COLORS.day : BRAND_COLORS.night;
  const processedLogo = processLogoSVG(logoSVG, 48, 48, colors.text, colors.text);
  const avatarHTML = createAvatarHTML(avatarDataUri, display_name, 64, colors.avatarText, colors.avatarBg);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        ${MONTSERRAT_IMPORT}

        ${CSS_RESET}

        body {
          font-family: ${MONTSERRAT_FONT_STACK};
          background: transparent;
          padding: 80px;
          display: inline-block;
          ${IMAGE_RENDERING_CSS}
        }

        .bubble-container {
          background-color: ${colors.container};
          color: ${colors.text};
          border: 6px solid ${colors.background};
          border-radius: 48px;
          padding: 64px;
          max-width: 800px;
          position: relative;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
        }

        .bubble-container::before {
          content: '';
          position: absolute;
          bottom: -24px;
          left: 80px;
          width: 0; height: 0;
          border-left: 24px solid transparent;
          border-right: 24px solid transparent;
          border-top: 24px solid ${colors.container};
        }

        .bubble-container::after {
          content: '';
          position: absolute;
          bottom: -30px;
          left: 74px;
          width: 0; height: 0;
          border-left: 30px solid transparent;
          border-right: 30px solid transparent;
          border-top: 30px solid ${colors.background};
          z-index: -1;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 40px;
        }

        .user-text { flex: 1; }
        .display-name { font-size: 36px; font-weight: 700; margin-bottom: 8px; }
        .display-id { font-size: 28px; opacity: 0.7; margin-bottom: 8px; }
        .date { font-size: 24px; opacity: 0.8; }
        .message { font-size: 32px; line-height: 1.5; margin: 40px 0; }
        .objectives-container { margin: 40px 0; }
        .objectives-title { font-size: 28px; font-weight: 600; margin-bottom: 24px; opacity: 0.9; }
        .objective-item { display: flex; align-items: flex-start; margin-bottom: 16px; font-size: 26px; line-height: 1.4; }
        .objective-icon { font-size: 28px; margin-right: 16px; min-width: 40px; color: ${colors.text}; }
        .objective-text { flex: 1; }
        .objective-completed { text-decoration: line-through; opacity: 0.7; }
        .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 48px; padding-top: 32px; border-top: 2px solid ${colors.background}; }
        .beshy-text { font-size: 24px; font-weight: 600; opacity: 0.7; }
        ${EMOJI_IMG_CSS}
      </style>
    </head>
    <body>
      <div class="bubble-container">
        ${renderInlineUserInfoHtml({
          avatarHTML,
          displayName: display_name,
          displayId: display_id,
          formattedDate: formatImageDate(fecha),
        })}

        <div class="message">${escapeHtml(mensaje)}</div>

        ${renderObjectivesHtml(objetivos, 'Objetivos:')}

        ${renderLogoFooterHtml(processedLogo)}
      </div>
    </body>
    </html>
  `;
}

function createStickerHTML(opts: TemplateOptions): string {
  const { mensaje, objetivos, display_name, display_id, fecha, logoSVG, avatarDataUri } = opts;
  const textColor = '#1A0F0A';
  const textShadow = '1px 1px 2px rgba(255, 255, 255, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.3)';
  const processedLogo = processLogoSVG(logoSVG, 48, 48, textColor, textColor);
  const avatarHTML = createAvatarHTML(avatarDataUri, display_name, 64, '#F5F0E1', '#1A0F0A');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        ${MONTSERRAT_IMPORT}

        ${CSS_RESET}

        body {
          font-family: ${MONTSERRAT_FONT_STACK};
          background: transparent;
          padding: 80px;
          display: inline-block;
          ${IMAGE_RENDERING_CSS}
        }

        .sticker-container {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 48px;
          box-shadow: 0 25px 45px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -1px 0 rgba(0, 0, 0, 0.1);
          color: ${textColor};
          padding: 64px;
          max-width: 800px;
          position: relative;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 40px;
        }

        .user-text { flex: 1; }
        .display-name { font-size: 36px; font-weight: 700; margin-bottom: 8px; text-shadow: ${textShadow}; }
        .display-id { font-size: 28px; opacity: 0.7; margin-bottom: 8px; }
        .date { font-size: 24px; opacity: 0.8; }
        .message { font-size: 32px; line-height: 1.5; margin: 40px 0; }
        .objectives-container { margin: 40px 0; }
        .objectives-title { font-size: 28px; font-weight: 600; margin-bottom: 24px; opacity: 0.9; }
        .objective-item { display: flex; align-items: flex-start; margin-bottom: 16px; font-size: 26px; line-height: 1.4; }
        .objective-icon { font-size: 28px; margin-right: 16px; min-width: 40px; color: ${textColor}; }
        .objective-text { flex: 1; }
        .objective-completed { text-decoration: line-through; opacity: 0.7; }
        .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 48px; padding-top: 32px; }
        .beshy-text { font-size: 24px; font-weight: 600; opacity: 1; text-shadow: ${textShadow}; }
        ${EMOJI_IMG_CSS}
      </style>
    </head>
    <body>
      <div class="sticker-container">
        ${renderInlineUserInfoHtml({
          avatarHTML,
          displayName: display_name,
          displayId: display_id,
          formattedDate: formatImageDate(fecha),
        })}

        <div class="message">${escapeHtml(mensaje)}</div>

        ${renderObjectivesHtml(objetivos, 'Objetivos:')}

        ${renderLogoFooterHtml(processedLogo)}
      </div>
    </body>
    </html>
  `;
}

function createManifestationHTML(opts: ManifestationTemplateOptions): string {
  const { content, daysManifesting, reaffirmationCount, display_name, display_id, isDay, logoSVG, avatarDataUri } = opts;
  const colors = isDay ? BRAND_COLORS.day : BRAND_COLORS.night;
  const processedLogo = processLogoSVG(logoSVG, 80, 80, colors.text, colors.text);
  const avatarHTML = createAvatarHTML(avatarDataUri, display_name, 80, colors.avatarText, colors.avatarBg);
  const accentColor = '#D4A574';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body {
          width: 960px;
          height: auto;
          min-height: 800px;
          background: transparent;
        }

        body {
          font-family: 'Nunito', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px;
        }

        .card {
          background: linear-gradient(145deg, ${colors.background}, ${isDay ? '#EDE8D9' : '#3D2E2A'});
          border-radius: 48px;
          padding: 60px;
          width: 100%;
          max-width: 840px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .card::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, ${accentColor}15 0%, transparent 60%);
          pointer-events: none;
        }

        .sparkle-icon {
          width: 120px;
          height: 120px;
          margin: 0 auto 32px;
          background: linear-gradient(135deg, ${accentColor}30, ${accentColor}10);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .sparkle-icon svg {
          width: 64px;
          height: 64px;
          color: ${accentColor};
        }

        .title {
          font-size: 36px;
          font-weight: 800;
          color: ${accentColor};
          margin-bottom: 16px;
          letter-spacing: -0.5px;
        }

        .subtitle {
          font-size: 20px;
          color: ${colors.text}99;
          margin-bottom: 40px;
        }

        .content {
          font-size: 32px;
          font-weight: 700;
          color: ${colors.text};
          line-height: 1.4;
          margin-bottom: 40px;
          padding: 32px;
          background: ${isDay ? 'rgba(74, 46, 27, 0.05)' : 'rgba(245, 240, 225, 0.05)'};
          border-radius: 24px;
          position: relative;
        }

        .content::before {
          content: '"';
          position: absolute;
          top: 8px;
          left: 20px;
          font-size: 64px;
          color: ${accentColor}40;
          font-family: Georgia, serif;
        }

        .stats {
          display: flex;
          justify-content: center;
          gap: 60px;
          margin-bottom: 40px;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          font-size: 56px;
          font-weight: 800;
          color: ${accentColor};
          line-height: 1;
        }

        .stat-label {
          font-size: 16px;
          color: ${colors.text}80;
          margin-top: 8px;
        }

        .divider {
          width: 2px;
          height: 80px;
          background: ${colors.text}20;
        }

        .user-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid ${accentColor};
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .user-details {
          text-align: left;
        }

        .user-name {
          font-size: 22px;
          font-weight: 700;
          color: ${colors.text};
        }

        .user-id {
          font-size: 16px;
          color: ${colors.text}80;
        }

        .footer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          opacity: 0.6;
        }

        .beshy-text {
          font-size: 24px;
          font-weight: 800;
          color: ${colors.text};
          letter-spacing: 2px;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="sparkle-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            <path d="M5 3v4"/>
            <path d="M19 17v4"/>
            <path d="M3 5h4"/>
            <path d="M17 19h4"/>
          </svg>
        </div>

        <div class="title">¡Manifestación cumplida!</div>
        <div class="subtitle">Lo que visualizaste con fe, ahora es realidad</div>

        <div class="content">
          ${escapeHtml(content)}
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-value">${daysManifesting}</div>
            <div class="stat-label">días manifestando</div>
          </div>
          <div class="divider"></div>
          <div class="stat">
            <div class="stat-value">${reaffirmationCount}</div>
            <div class="stat-label">reafirmaciones</div>
          </div>
        </div>

        <div class="user-info">
          <div class="avatar">
            ${avatarHTML}
          </div>
          <div class="user-details">
            <div class="user-name">${escapeHtml(display_name)}</div>
            <div class="user-id">@${escapeHtml(display_id)}</div>
          </div>
        </div>

        <div class="footer">
          <div class="beshy-text">BESHY</div>
          ${processedLogo}
        </div>
      </div>
    </body>
    </html>
  `;
}
