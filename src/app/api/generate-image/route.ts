import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { escapeHtml } from '@/utils/html-escape';
import { logger } from '@/lib/logger';

// Logo cache for performance optimization
let logoCache: string | null = null;
const LOGO_CACHE_TTL = 1000 * 60 * 60; // 1 hour cache
let logoCacheTime = 0;

interface Objective {
  id: string;
  text: string;
  done: boolean;
}

interface ImageRequest {
  mensaje: string;
  objetivos?: Objective[];
  display_name: string;
  display_id: string;
  fecha: string;
  mode: 'normal' | 'bubble' | 'sticker';
  isDay: boolean;
  profile_photo_url?: string | null;
}

async function fetchAvatarAsDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/webp';
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

interface FormattedObjective {
  id: string;
  text: string;
  done: boolean;
  icon: string;
  isCompleted: boolean;
}

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

function createAvatarHTML(
  avatarDataUri: string | null,
  displayName: string,
  size: number,
  textColor: string,
  bgColor: string
): string {
  if (avatarDataUri) {
    return `<img src="${avatarDataUri}" style="width: ${size}px; height: ${size}px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" alt="" />`;
  }
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';
  const fontSize = Math.round(size * 0.4);
  return `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: ${bgColor}; color: ${textColor}; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${fontSize}px; flex-shrink: 0;">${escapeHtml(initial)}</div>`;
}

// Cached logo loading function for performance
async function getCachedLogo(): Promise<string> {
  const now = Date.now();
  
  // Return cached logo if still valid
  if (logoCache && (now - logoCacheTime) < LOGO_CACHE_TTL) {
    return logoCache;
  }
  
  // Load logo from file system
  const logoPath = path.join(process.cwd(), 'public', 'logo-bw.svg');
  try {
    logoCache = fs.readFileSync(logoPath, 'utf8');
    logoCacheTime = now;
    return logoCache;
  } catch (error) {
    logger.warn('Could not read logo file', { detail: error instanceof Error ? error.message : String(error) });
    // Fallback to a simple SVG if logo file is not found
    logoCache = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="16" fill="currentColor">BESHY</text>
    </svg>`;
    logoCacheTime = now;
    return logoCache;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ImageRequest = await request.json();
    const { mensaje, objetivos = [], display_name, display_id, fecha, mode, isDay, profile_photo_url } = body;

    // Validate required fields
    if (!mensaje || !display_name || !display_id || !fecha || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Read the BESHY logo from public directory (cache for performance)
    const logoSVG = await getCachedLogo();

    // Fetch avatar as base64 data URI for embedding in HTML
    const avatarDataUri = profile_photo_url
      ? await fetchAvatarAsDataUri(profile_photo_url)
      : null;

    // Format objectives for rendering
    const formattedObjectives = objetivos.map(obj => ({
      ...obj,
      icon: obj.done ? '☑' : '☐', // Use checked box for completed todos
      isCompleted: obj.done
    }));

    // Create HTML template based on mode
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

    let htmlContent;
    if (mode === 'bubble') {
      htmlContent = createBubbleHTML(templateOpts);
    } else if (mode === 'sticker') {
      htmlContent = createStickerHTML(templateOpts);
    } else {
      htmlContent = createNormalHTML(templateOpts);
    }

    // Launch Puppeteer with optimized settings for VPS
    const browser = await puppeteer.launch({
      headless: true, // Use headless mode for better performance
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--disable-plugins',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      timeout: 30000 // 30 second timeout
    });

    const page = await browser.newPage();

    // Set viewport — HTML templates already use doubled CSS dimensions for quality
    if (mode === 'bubble' || mode === 'sticker') {
      await page.setViewport({ width: 960, height: 1600, deviceScaleFactor: 1 });
    } else {
      await page.setViewport({ width: 2160, height: 3840, deviceScaleFactor: 1 });
    }

    // Set content with optimized wait strategy
    await page.setContent(htmlContent, { 
      waitUntil: 'domcontentloaded', // Faster than networkidle0
      timeout: 15000 // 15 second timeout
    });
    
    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');

    // Load Twemoji to render emojis as SVG images (system fonts often lack emoji support)
    try {
      await page.addScriptTag({
        url: 'https://cdn.jsdelivr.net/npm/@twemoji/api@15.1.0/dist/twemoji.min.js'
      });

      await page.evaluate(() => {
        const win = window as unknown as Record<string, { parse?: (el: Element, opts: Record<string, string>) => void }>;
        if (win.twemoji?.parse) {
          win.twemoji.parse(document.body, { folder: 'svg', ext: '.svg' });
        }
      });

      await page.evaluate(() =>
        Promise.all(
          Array.from(document.querySelectorAll('img.emoji')).map(img => {
            const imgEl = img as HTMLImageElement;
            if (imgEl.complete) return Promise.resolve();
            return new Promise<void>(resolve => {
              imgEl.addEventListener('load', () => resolve());
              imgEl.addEventListener('error', () => resolve());
            });
          })
        )
      );
    } catch {
      logger.warn('Twemoji failed to load, falling back to system emoji fonts');
    }

    // Take screenshot with optimized settings
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: mode === 'bubble' || mode === 'sticker',
      omitBackground: mode === 'bubble' || mode === 'sticker', // Transparent background for bubble and sticker
      captureBeyondViewport: false, // Improve performance
      optimizeForSpeed: true // Optimize for speed over compression
    });

    await browser.close();

    // Return image as buffer with optimized headers
    return new NextResponse(Buffer.from(screenshot), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="beshy-whisper-${mode}-${Date.now()}.png"`,
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes for same requests
        'Content-Length': screenshot.length.toString(),
      },
    });

  } catch (error) {
    logger.error('Error generating image', { detail: error instanceof Error ? error.message : String(error) });
    
    // More specific error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
    
    return NextResponse.json(
      { 
        error: isTimeout ? 'Image generation timeout - please try again' : 'Failed to generate image',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: isTimeout ? 408 : 500 }
    );
  }
}

// HTML template for normal (large) image
function createNormalHTML(opts: TemplateOptions): string {
  const { mensaje, objetivos, display_name, display_id, fecha, isDay, logoSVG, avatarDataUri } = opts;
  const backgroundColor = isDay ? '#E8E0D0' : '#1A0F0A';
  const textColor = isDay ? '#4A2E1B' : '#F5F0E1';
  const containerBg = isDay ? '#F5F0E1' : '#2D1E1A';
  const avatarBg = isDay ? '#4A2E1B' : '#F5F0E1';
  const avatarText = isDay ? '#F5F0E1' : '#4A2E1B';

  const processedLogo = logoSVG
    .replace(/width="[^"]*"/g, 'width="160"')
    .replace(/height="[^"]*"/g, 'height="160"')
    .replace(/fill="#000000"/g, `fill="${textColor}"`)
    .replace(/stroke="none"/g, `stroke="${textColor}"`);

  const avatarHTML = createAvatarHTML(avatarDataUri, display_name, 160, avatarText, avatarBg);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Montserrat', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
          width: 2160px;
          height: 3840px;
          background-color: ${backgroundColor};
          color: ${textColor};
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }

        .content-container {
          width: 1600px;
          max-width: 90%;
          background-color: ${containerBg};
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
        .objective-icon { font-size: 56px; margin-right: 24px; min-width: 80px; color: ${textColor}; }
        .objective-text { flex: 1; }
        .objective-completed { text-decoration: line-through; opacity: 0.7; }
        .logo-container { display: flex; justify-content: center; margin-top: 80px; }
        .watermark { position: absolute; bottom: 15%; left: 50%; transform: translateX(-50%); font-size: 96px; font-weight: 700; color: ${textColor}; opacity: 0.6; }
        img.emoji { height: 1em; width: 1em; margin: 0 0.05em 0 0.1em; vertical-align: -0.1em; display: inline; }
      </style>
    </head>
    <body>
      <div class="content-container">
        <div class="user-info">
          <div class="avatar-container">${avatarHTML}</div>
          <div class="display-name">${escapeHtml(display_name)}</div>
          <div class="display-id">@${escapeHtml(display_id)}</div>
          <div class="date">${formatDate(fecha)}</div>
        </div>

        <div class="message">${escapeHtml(mensaje)}</div>

        ${objetivos.length > 0 ? `
          <div class="objectives-container">
            <div class="objectives-title">Objetivos de hoy:</div>
            ${objetivos.map(obj => `
              <div class="objective-item">
                <span class="objective-icon">${obj.icon}</span>
                <span class="objective-text ${obj.isCompleted ? 'objective-completed' : ''}">${escapeHtml(obj.text)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="logo-container">${processedLogo}</div>
      </div>

      <div class="watermark">BESHY</div>
    </body>
    </html>
  `;
}

// HTML template for bubble (compact) image
function createBubbleHTML(opts: TemplateOptions): string {
  const { mensaje, objetivos, display_name, display_id, fecha, isDay, logoSVG, avatarDataUri } = opts;
  const bubbleBg = isDay ? '#F5F0E1' : '#2D1E1A';
  const textColor = isDay ? '#4A2E1B' : '#F5F0E1';
  const borderColor = isDay ? '#E8E0D0' : '#1A0F0A';
  const avatarBg = isDay ? '#4A2E1B' : '#F5F0E1';
  const avatarText = isDay ? '#F5F0E1' : '#4A2E1B';

  const processedLogo = logoSVG
    .replace(/width="[^"]*"/g, 'width="48"')
    .replace(/height="[^"]*"/g, 'height="48"')
    .replace(/fill="#000000"/g, `fill="${textColor}"`)
    .replace(/stroke="none"/g, `stroke="${textColor}"`);

  const avatarHTML = createAvatarHTML(avatarDataUri, display_name, 64, avatarText, avatarBg);

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Montserrat', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
          background: transparent;
          padding: 80px;
          display: inline-block;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }

        .bubble-container {
          background-color: ${bubbleBg};
          color: ${textColor};
          border: 6px solid ${borderColor};
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
          border-top: 24px solid ${bubbleBg};
        }

        .bubble-container::after {
          content: '';
          position: absolute;
          bottom: -30px;
          left: 74px;
          width: 0; height: 0;
          border-left: 30px solid transparent;
          border-right: 30px solid transparent;
          border-top: 30px solid ${borderColor};
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
        .objective-icon { font-size: 28px; margin-right: 16px; min-width: 40px; color: ${textColor}; }
        .objective-text { flex: 1; }
        .objective-completed { text-decoration: line-through; opacity: 0.7; }
        .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 48px; padding-top: 32px; border-top: 2px solid ${borderColor}; }
        .beshy-text { font-size: 24px; font-weight: 600; opacity: 0.7; }
        img.emoji { height: 1em; width: 1em; margin: 0 0.05em 0 0.1em; vertical-align: -0.1em; display: inline; }
      </style>
    </head>
    <body>
      <div class="bubble-container">
        <div class="user-info">
          ${avatarHTML}
          <div class="user-text">
            <div class="display-name">${escapeHtml(display_name)}</div>
            <div class="display-id">@${escapeHtml(display_id)}</div>
            <div class="date">${formatDate(fecha)}</div>
          </div>
        </div>

        <div class="message">${escapeHtml(mensaje)}</div>

        ${objetivos.length > 0 ? `
          <div class="objectives-container">
            <div class="objectives-title">Objetivos:</div>
            ${objetivos.map(obj => `
              <div class="objective-item">
                <span class="objective-icon">${obj.icon}</span>
                <span class="objective-text ${obj.isCompleted ? 'objective-completed' : ''}">${escapeHtml(obj.text)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="footer">
          <div class="beshy-text">BESHY</div>
          ${processedLogo}
        </div>
      </div>
    </body>
    </html>
  `;
}

// HTML template for sticker (compact with crystal glass effect)
function createStickerHTML(opts: TemplateOptions): string {
  const { mensaje, objetivos, display_name, display_id, fecha, logoSVG, avatarDataUri } = opts;
  const textColor = '#1A0F0A';
  const textShadow = '1px 1px 2px rgba(255, 255, 255, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.3)';

  const processedLogo = logoSVG
    .replace(/width="[^"]*"/g, 'width="48"')
    .replace(/height="[^"]*"/g, 'height="48"')
    .replace(/fill="#000000"/g, `fill="${textColor}"`)
    .replace(/stroke="none"/g, `stroke="${textColor}"`);

  const avatarHTML = createAvatarHTML(avatarDataUri, display_name, 64, '#F5F0E1', '#1A0F0A');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Montserrat', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;
          background: transparent;
          padding: 80px;
          display: inline-block;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
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
        img.emoji { height: 1em; width: 1em; margin: 0 0.05em 0 0.1em; vertical-align: -0.1em; display: inline; }
      </style>
    </head>
    <body>
      <div class="sticker-container">
        <div class="user-info">
          ${avatarHTML}
          <div class="user-text">
            <div class="display-name">${escapeHtml(display_name)}</div>
            <div class="display-id">@${escapeHtml(display_id)}</div>
            <div class="date">${formatDate(fecha)}</div>
          </div>
        </div>

        <div class="message">${escapeHtml(mensaje)}</div>

        ${objetivos.length > 0 ? `
          <div class="objectives-container">
            <div class="objectives-title">Objetivos:</div>
            ${objetivos.map(obj => `
              <div class="objective-item">
                <span class="objective-icon">${obj.icon}</span>
                <span class="objective-text ${obj.isCompleted ? 'objective-completed' : ''}">${escapeHtml(obj.text)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="footer">
          <div class="beshy-text">BESHY</div>
          ${processedLogo}
        </div>
      </div>
    </body>
    </html>
  `;
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  
  return `${day}/${month}/${year}`;
}