import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { escapeHtml } from '@/utils/html-escape';

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
    console.warn('Could not read logo file:', error);
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
    const { mensaje, objetivos = [], display_name, display_id, fecha, mode, isDay } = body;

    // Validate required fields
    if (!mensaje || !display_name || !display_id || !fecha || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Read the BESHY logo from public directory (cache for performance)
    const logoSVG = await getCachedLogo();

    // Format objectives for rendering
    const formattedObjectives = objetivos.map(obj => ({
      ...obj,
      icon: obj.done ? '☑' : '☐', // Use checked box for completed todos
      isCompleted: obj.done
    }));

    // Create HTML template based on mode
    let htmlContent;
    if (mode === 'bubble') {
      htmlContent = createBubbleHTML(mensaje, formattedObjectives, display_name, display_id, fecha, isDay, logoSVG);
    } else if (mode === 'sticker') {
      htmlContent = createStickerHTML(mensaje, formattedObjectives, display_name, display_id, fecha, logoSVG);
    } else {
      htmlContent = createNormalHTML(mensaje, formattedObjectives, display_name, display_id, fecha, isDay, logoSVG);
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

    // Set viewport based on mode with higher resolution for better quality
    if (mode === 'bubble' || mode === 'sticker') {
      await page.setViewport({ 
        width: 960, // Double resolution for better quality
        height: 1600,
        deviceScaleFactor: 2 // High DPI scaling
      });
    } else {
      await page.setViewport({ 
        width: 2160, // Double resolution for better quality
        height: 3840,
        deviceScaleFactor: 2 // High DPI scaling
      });
    }

    // Set content with optimized wait strategy
    await page.setContent(htmlContent, { 
      waitUntil: 'domcontentloaded', // Faster than networkidle0
      timeout: 15000 // 15 second timeout
    });
    
    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');
    
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
    console.error('Error generating image:', error);
    
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
function createNormalHTML(
  mensaje: string, 
  objetivos: Array<{id: string, text: string, done: boolean, icon: string, isCompleted: boolean}>, 
  display_name: string, 
  display_id: string, 
  fecha: string, 
  isDay: boolean,
  logoSVG: string
): string {
  const backgroundColor = isDay ? '#E8E0D0' : '#1A0F0A';
  const textColor = isDay ? '#4A2E1B' : '#F5F0E1';
  const containerBg = isDay ? '#F5F0E1' : '#2D1E1A';
  
  // Process logo SVG to use correct size and color (double resolution)
  const processedLogo = logoSVG
    .replace(/width="[^"]*"/g, 'width="160"') /* Double resolution */
    .replace(/height="[^"]*"/g, 'height="160"') /* Double resolution */
    .replace(/fill="#000000"/g, `fill="${textColor}"`)
    .replace(/stroke="none"/g, `stroke="${textColor}"`);
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Montserrat', sans-serif;
          width: 2160px; /* Double resolution */
          height: 3840px; /* Double resolution */
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
          width: 1600px; /* Double resolution */
          max-width: 90%;
          background-color: ${containerBg};
          padding: 120px; /* Double resolution */
          border-radius: 48px; /* Double resolution */
          box-shadow: 0 50px 100px -24px rgba(0, 0, 0, 0.25); /* Double resolution */
          position: relative;
        }
        
        .user-info {
          text-align: center;
          margin-bottom: 80px; /* Double resolution */
        }
        
        .display-name {
          font-size: 72px; /* Double resolution */
          font-weight: 700;
          margin-bottom: 16px; /* Double resolution */
        }
        
        .display-id {
          font-size: 48px; /* Double resolution */
          opacity: 0.7;
          margin-bottom: 32px; /* Double resolution */
        }
        
        .date {
          font-size: 40px; /* Double resolution */
          opacity: 0.8;
        }
        
        .message {
          font-size: 64px; /* Double resolution */
          line-height: 1.6;
          margin: 80px 0; /* Double resolution */
          text-align: center;
        }
        
        .objectives-container {
          margin: 80px 0; /* Double resolution */
        }
        
        .objectives-title {
          font-size: 56px; /* Double resolution */
          font-weight: 600;
          margin-bottom: 48px; /* Double resolution */
          text-align: center;
        }
        
        .objective-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 32px; /* Double resolution */
          font-size: 48px; /* Double resolution */
          line-height: 1.5;
        }
        
        .objective-icon {
          font-size: 56px; /* Double resolution */
          margin-right: 24px; /* Double resolution */
          min-width: 80px; /* Double resolution */
          color: ${textColor};
        }
        
        .objective-text {
          flex: 1;
        }
        
        .objective-completed {
          text-decoration: line-through;
          opacity: 0.7;
        }
        
        .logo-container {
          display: flex;
          justify-content: center;
          margin-top: 80px; /* Double resolution */
        }
        
        .watermark {
          position: absolute;
          bottom: 15%;
          left: 50%;
          transform: translateX(-50%);
          font-size: 96px; /* Double resolution */
          font-weight: 700;
          color: ${textColor};
          opacity: 0.6;
        }
      </style>
    </head>
    <body>
      <div class="content-container">
        <!-- User Info -->
        <div class="user-info">
          <div class="display-name">${escapeHtml(display_name)}</div>
          <div class="display-id">@${escapeHtml(display_id)}</div>
          <div class="date">${formatDate(fecha)}</div>
        </div>

        <!-- Message -->
        <div class="message">${escapeHtml(mensaje)}</div>

        <!-- Objectives (only for day entries) -->
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

        <!-- Logo -->
        <div class="logo-container">
          ${processedLogo}
        </div>
      </div>

      <!-- Watermark -->
      <div class="watermark">BESHY</div>
    </body>
    </html>
  `;
}

// HTML template for bubble (compact) image
function createBubbleHTML(
  mensaje: string, 
  objetivos: Array<{id: string, text: string, done: boolean, icon: string, isCompleted: boolean}>, 
  display_name: string, 
  display_id: string, 
  fecha: string, 
  isDay: boolean,
  logoSVG: string
): string {
  const bubbleBg = isDay ? '#F5F0E1' : '#2D1E1A';
  const textColor = isDay ? '#4A2E1B' : '#F5F0E1';
  const borderColor = isDay ? '#E8E0D0' : '#1A0F0A';
  
  // Process logo SVG to use correct size and color (double resolution)
  const processedLogo = logoSVG
    .replace(/width="[^"]*"/g, 'width="48"') /* Double resolution */
    .replace(/height="[^"]*"/g, 'height="48"') /* Double resolution */
    .replace(/fill="#000000"/g, `fill="${textColor}"`)
    .replace(/stroke="none"/g, `stroke="${textColor}"`);
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Montserrat', sans-serif;
          background: transparent; /* Transparent background for PNG */
          padding: 80px; /* Double resolution */
          display: inline-block;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        .bubble-container {
          background-color: ${bubbleBg};
          color: ${textColor};
          border: 6px solid ${borderColor}; /* Double resolution */
          border-radius: 48px; /* Double resolution */
          padding: 64px; /* Double resolution */
          max-width: 800px; /* Double resolution */
          position: relative;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15); /* Double resolution */
        }
        
        .bubble-container::before {
          content: '';
          position: absolute;
          bottom: -24px; /* Double resolution */
          left: 80px; /* Double resolution */
          width: 0;
          height: 0;
          border-left: 24px solid transparent; /* Double resolution */
          border-right: 24px solid transparent; /* Double resolution */
          border-top: 24px solid ${bubbleBg}; /* Double resolution */
        }
        
        .bubble-container::after {
          content: '';
          position: absolute;
          bottom: -30px; /* Double resolution */
          left: 74px; /* Double resolution */
          width: 0;
          height: 0;
          border-left: 30px solid transparent; /* Double resolution */
          border-right: 30px solid transparent; /* Double resolution */
          border-top: 30px solid ${borderColor}; /* Double resolution */
          z-index: -1;
        }
        
        .user-info {
          margin-bottom: 40px; /* Double resolution */
        }
        
        .display-name {
          font-size: 36px; /* Double resolution */
          font-weight: 700;
          margin-bottom: 8px; /* Double resolution */
        }
        
        .display-id {
          font-size: 28px; /* Double resolution */
          opacity: 0.7;
          margin-bottom: 16px; /* Double resolution */
        }
        
        .date {
          font-size: 24px; /* Double resolution */
          opacity: 0.8;
        }
        
        .message {
          font-size: 32px; /* Double resolution */
          line-height: 1.5;
          margin: 40px 0; /* Double resolution */
        }
        
        .objectives-container {
          margin: 40px 0; /* Double resolution */
        }
        
        .objectives-title {
          font-size: 28px; /* Double resolution */
          font-weight: 600;
          margin-bottom: 24px; /* Double resolution */
          opacity: 0.9;
        }
        
        .objective-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 16px; /* Double resolution */
          font-size: 26px; /* Double resolution */
          line-height: 1.4;
        }
        
        .objective-icon {
          font-size: 28px; /* Double resolution */
          margin-right: 16px; /* Double resolution */
          min-width: 40px; /* Double resolution */
          color: ${textColor};
        }
        
        .objective-text {
          flex: 1;
        }
        
        .objective-completed {
          text-decoration: line-through;
          opacity: 0.7;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 48px; /* Double resolution */
          padding-top: 32px; /* Double resolution */
          border-top: 2px solid ${borderColor}; /* Double resolution */
        }
        
        .beshy-text {
          font-size: 24px; /* Double resolution */
          font-weight: 600;
          opacity: 0.7;
        }
      </style>
    </head>
    <body>
      <div class="bubble-container">
        <!-- User Info -->
        <div class="user-info">
          <div class="display-name">${escapeHtml(display_name)}</div>
          <div class="display-id">@${escapeHtml(display_id)}</div>
          <div class="date">${formatDate(fecha)}</div>
        </div>

        <!-- Message -->
        <div class="message">${escapeHtml(mensaje)}</div>

        <!-- Objectives (only for day entries) -->
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

        <!-- Footer -->
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
function createStickerHTML(
  mensaje: string, 
  objetivos: Array<{id: string, text: string, done: boolean, icon: string, isCompleted: boolean}>, 
  display_name: string, 
  display_id: string, 
  fecha: string, 
  logoSVG: string
): string {
  // Fixed colors for sticker mode with crystal effect
  const textColor = '#1A0F0A'; // Very dark text for maximum contrast on glass
  const textShadow = '1px 1px 2px rgba(255, 255, 255, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.3)'; // Enhanced text shadow
  
  // Process logo SVG to use correct size and color (double resolution)
  const processedLogo = logoSVG
    .replace(/width="[^"]*"/g, 'width="48"') /* Double resolution */
    .replace(/height="[^"]*"/g, 'height="48"') /* Double resolution */
    .replace(/fill="#000000"/g, `fill="${textColor}"`)
    .replace(/stroke="none"/g, `stroke="${textColor}"`);
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Montserrat', sans-serif;
          background: transparent; /* Transparent background for PNG */
          padding: 80px; /* Double resolution */
          display: inline-block;
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        .sticker-container {
          background: rgba(255, 255, 255, 0.15); /* Crystal glassmorphism effect */
          backdrop-filter: blur(20px); /* Blur effect */
          -webkit-backdrop-filter: blur(20px); /* Safari support */
          border: 3px solid rgba(255, 255, 255, 0.3); /* Semi-transparent border */
          border-radius: 48px; /* Double resolution */
          box-shadow: 
            0 25px 45px rgba(0, 0, 0, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.4),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1); /* Multi-layer shadows for depth */
          color: ${textColor};
          padding: 64px; /* Double resolution */
          max-width: 800px; /* Double resolution */
          position: relative;
        }
        
        .user-info {
          margin-bottom: 40px; /* Double resolution */
        }
        
        .display-name {
          font-size: 36px; /* Double resolution */
          font-weight: 700;
          margin-bottom: 8px; /* Double resolution */
          text-shadow: ${textShadow};
        }
        
        .display-id {
          font-size: 28px; /* Double resolution */
          opacity: 0.7;
          margin-bottom: 16px; /* Double resolution */
        }
        
        .date {
          font-size: 24px; /* Double resolution */
          opacity: 0.8;
        }
        
        .message {
          font-size: 32px; /* Double resolution */
          line-height: 1.5;
          margin: 40px 0; /* Double resolution */
        }
        
        .objectives-container {
          margin: 40px 0; /* Double resolution */
        }
        
        .objectives-title {
          font-size: 28px; /* Double resolution */
          font-weight: 600;
          margin-bottom: 24px; /* Double resolution */
          opacity: 0.9;
        }
        
        .objective-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 16px; /* Double resolution */
          font-size: 26px; /* Double resolution */
          line-height: 1.4;
        }
        
        .objective-icon {
          font-size: 28px; /* Double resolution */
          margin-right: 16px; /* Double resolution */
          min-width: 40px; /* Double resolution */
          color: ${textColor};
        }
        
        .objective-text {
          flex: 1;
        }
        
        .objective-completed {
          text-decoration: line-through;
          opacity: 0.7;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 48px; /* Double resolution */
          padding-top: 32px; /* Double resolution */
        }
        
        .beshy-text {
          font-size: 24px; /* Double resolution */
          font-weight: 600;
          opacity: 1;
          text-shadow: ${textShadow};
        }
      </style>
    </head>
    <body>
      <div class="sticker-container">
        <!-- User Info -->
        <div class="user-info">
          <div class="display-name">${escapeHtml(display_name)}</div>
          <div class="display-id">@${escapeHtml(display_id)}</div>
          <div class="date">${formatDate(fecha)}</div>
        </div>

        <!-- Message -->
        <div class="message">${escapeHtml(mensaje)}</div>

        <!-- Objectives (only for day entries) -->
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

        <!-- Footer -->
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