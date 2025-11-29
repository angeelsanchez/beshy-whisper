import puppeteer, { type Browser, type Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { escapeHtml } from '@/utils/html-escape';
import { logger } from '@/lib/logger';

let logoCache: string | null = null;
let logoCacheTime = 0;
const LOGO_CACHE_TTL = 1000 * 60 * 60;

export const BRAND_COLORS = {
  day: {
    background: '#E8E0D0',
    container: '#F5F0E1',
    text: '#4A2E1B',
    avatarBg: '#4A2E1B',
    avatarText: '#F5F0E1',
  },
  night: {
    background: '#1A0F0A',
    container: '#2D1E1A',
    text: '#F5F0E1',
    avatarBg: '#F5F0E1',
    avatarText: '#4A2E1B',
  },
} as const;

export async function fetchAvatarAsDataUri(url: string): Promise<string | null> {
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

export async function getCachedLogo(): Promise<string> {
  const now = Date.now();

  if (logoCache && (now - logoCacheTime) < LOGO_CACHE_TTL) {
    return logoCache;
  }

  const logoPath = path.join(process.cwd(), 'public', 'logo-bw.svg');
  try {
    logoCache = fs.readFileSync(logoPath, 'utf8');
    logoCacheTime = now;
    return logoCache;
  } catch (error) {
    logger.warn('Could not read logo file', { detail: error instanceof Error ? error.message : String(error) });
    logoCache = `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <text x="50" y="50" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="16" fill="currentColor">BESHY</text>
    </svg>`;
    logoCacheTime = now;
    return logoCache;
  }
}

export function processLogoSVG(
  svg: string,
  width: number,
  height: number,
  fillColor: string,
  strokeColor: string
): string {
  return svg
    .replace(/width="[^"]*"/g, `width="${width}"`)
    .replace(/height="[^"]*"/g, `height="${height}"`)
    .replace(/fill="#000000"/g, `fill="${fillColor}"`)
    .replace(/stroke="none"/g, `stroke="${strokeColor}"`);
}

export function createAvatarHTML(
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

const PUPPETEER_ARGS = [
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
  '--disable-renderer-backgrounding',
];

export async function launchPuppeteerBrowser(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: PUPPETEER_ARGS,
    timeout: 30000,
  });
}

export async function loadPageWithFonts(page: Page, html: string): Promise<void> {
  await page.setContent(html, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await page.evaluateHandle('document.fonts.ready');
}

export async function loadTwemoji(page: Page): Promise<void> {
  try {
    await page.addScriptTag({
      url: 'https://cdn.jsdelivr.net/npm/@twemoji/api@15.1.0/dist/twemoji.min.js',
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
}
