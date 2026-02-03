import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';
import { generatePdfSchema, type PdfEntry } from '@/lib/schemas/pdf';
import { logger } from '@/lib/logger';
import { escapeHtml } from '@/utils/html-escape';
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

function formatDateForPdf(dateString: string): string {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateString.trim());
  const date = new Date(isDateOnly ? `${dateString.trim()}T12:00:00` : dateString);
  if (isNaN(date.getTime())) return 'Fecha desconocida';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function renderEntryCard(
  entry: PdfEntry,
  textColor: string,
  containerBg: string
): string {
  const franjaIcon = entry.franja === 'DIA'
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/></svg>';

  const franjaLabel = entry.franja === 'DIA' ? 'Día' : 'Noche';
  const dateFormatted = formatDateForPdf(entry.fecha);

  const privateBadge = entry.is_private
    ? `<span style="font-size: 8pt; padding: 2px 8px; border-radius: 4px; background: ${textColor}15; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Privado</span>`
    : '';

  const moodBadge = entry.mood
    ? `<span style="font-size: 10pt;">${escapeHtml(entry.mood)}</span>`
    : '';

  let objectivesHTML = '';
  if (entry.objectives && entry.objectives.length > 0) {
    const items = entry.objectives.map(obj => {
      const checkedStyle = obj.done
        ? `background: ${textColor}; color: ${containerBg};`
        : '';
      const textStyle = obj.done ? 'text-decoration: line-through; opacity: 0.6;' : '';
      const checkmark = obj.done ? '&#10003;' : '';
      return `<div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; break-inside: avoid;">
        <div style="width: 18px; height: 18px; border: 2px solid ${textColor}; border-radius: 4px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; margin-top: 2px; ${checkedStyle}">${checkmark}</div>
        <span style="font-size: 10pt; line-height: 1.5; ${textStyle}">${escapeHtml(obj.text)}</span>
      </div>`;
    }).join('');

    objectivesHTML = `<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid ${textColor}20;">
      <div style="font-size: 10pt; font-weight: 600; margin-bottom: 12px; opacity: 0.8;">Objetivos del día</div>
      ${items}
    </div>`;
  }

  return `<div style="break-inside: avoid; background: ${containerBg}; border-radius: 12px; padding: 24px 28px; margin-bottom: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 8px; font-size: 10pt; font-weight: 500; opacity: 0.8;">
        ${franjaIcon}
        <span>${dateFormatted}</span>
        <span style="opacity: 0.6;">·</span>
        <span>${franjaLabel}</span>
      </div>
      ${privateBadge}
      ${moodBadge}
    </div>
    <div style="font-size: 12pt; line-height: 1.7; white-space: pre-wrap; word-break: break-word;">${escapeHtml(entry.mensaje)}</div>
    ${objectivesHTML}
  </div>`;
}

function createPdfHTML(
  entries: readonly PdfEntry[],
  userName: string,
  bsyId: string,
  isDay: boolean,
  logoSVG: string,
  avatarDataUri: string | null
): string {
  const colors = isDay ? BRAND_COLORS.day : BRAND_COLORS.night;
  const processedLogo = processLogoSVG(logoSVG, 80, 80, colors.text, colors.text);
  const avatarHTML = createAvatarHTML(avatarDataUri, userName, 80, colors.avatarText, colors.avatarBg);

  const dayEntries = entries.filter(e => e.franja === 'DIA').length;
  const nightEntries = entries.filter(e => e.franja === 'NOCHE').length;
  const generationDate = formatFullDate(new Date());

  const entryCards = entries.map(entry =>
    renderEntryCard(entry, colors.text, colors.container)
  ).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');

    @page { size: A4; margin: 0; }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Montserrat', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif;
      background: ${colors.background};
      color: ${colors.text};
      font-size: 11pt;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .cover {
      height: 297mm;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      page-break-after: always;
      background: ${colors.container};
      padding: 40mm 30mm;
    }

    .cover-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .cover-logo { margin-bottom: 12px; }

    .cover-title {
      font-size: 32pt;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 32px;
    }

    .cover-avatar { margin-bottom: 12px; }

    .cover-username {
      font-size: 18pt;
      font-weight: 600;
    }

    .cover-bsyid {
      font-size: 12pt;
      opacity: 0.6;
      margin-bottom: 40px;
    }

    .cover-stats {
      display: flex;
      justify-content: center;
      gap: 48px;
      margin-bottom: 40px;
    }

    .cover-stat-value {
      font-size: 24pt;
      font-weight: 700;
      display: block;
    }

    .cover-stat-label {
      font-size: 9pt;
      opacity: 0.6;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .cover-date {
      font-size: 10pt;
      opacity: 0.5;
    }

    .entries-container {
      padding: 10mm 20mm;
    }

    .section-title {
      font-size: 14pt;
      font-weight: 700;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${colors.text}20;
    }
  </style>
</head>
<body>
  <div class="cover">
    <div class="cover-content">
      <div class="cover-logo">${processedLogo}</div>
      <div class="cover-title">Mis Whispers</div>
      <div class="cover-avatar">${avatarHTML}</div>
      <div class="cover-username">${escapeHtml(userName)}</div>
      <div class="cover-bsyid">@${escapeHtml(bsyId)}</div>
      <div class="cover-stats">
        <div>
          <span class="cover-stat-value">${entries.length}</span>
          <span class="cover-stat-label">Whispers</span>
        </div>
        <div>
          <span class="cover-stat-value">${dayEntries}</span>
          <span class="cover-stat-label">Días</span>
        </div>
        <div>
          <span class="cover-stat-value">${nightEntries}</span>
          <span class="cover-stat-label">Noches</span>
        </div>
      </div>
      <div class="cover-date">Generado el ${generationDate}</div>
    </div>
  </div>

  <div class="entries-container">
    ${entryCards}
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const parsed = generatePdfSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { entries, userName, userId, isDay, bsyId, profilePhotoUrl } = parsed.data;
  let browser: Awaited<ReturnType<typeof launchPuppeteerBrowser>> | null = null;

  try {
    const [logoSVG, avatarDataUri] = await Promise.all([
      getCachedLogo(),
      profilePhotoUrl ? fetchAvatarAsDataUri(profilePhotoUrl) : Promise.resolve(null),
    ]);

    const html = createPdfHTML(entries, userName, bsyId, isDay, logoSVG, avatarDataUri);

    browser = await launchPuppeteerBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });
    await loadPageWithFonts(page, html);
    await loadTwemoji(page);

    const colors = isDay ? BRAND_COLORS.day : BRAND_COLORS.night;
    const footerColor = `${colors.text}99`;

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        bottom: '20mm',
        left: '0',
        right: '0',
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="width: 100%; text-align: center; font-size: 9px; font-family: 'Montserrat', sans-serif; color: ${footerColor}; padding: 0 20mm;">
        <span>BESHY Whisper</span>
        <span style="margin: 0 8px;">·</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>`,
      timeout: 60000,
    });

    const formattedDate = new Date().toISOString().split('T')[0];
    const fileName = `beshy-whispers-${userId}-${formattedDate}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout');

    logger.error('Error generating PDF', {
      userId: session.user.id,
      detail: errorMessage,
    });

    return NextResponse.json(
      { error: isTimeout ? 'La generación tardó demasiado. Intenta de nuevo.' : 'Error al generar el PDF' },
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
