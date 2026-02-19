import { escapeHtml } from '@/utils/html-escape';

export interface FormattedObjective {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
  readonly icon: string;
  readonly isCompleted: boolean;
}

export const MONTSERRAT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');";

export const MONTSERRAT_FONT_STACK =
  "'Montserrat', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif";

export const CSS_RESET = '* { margin: 0; padding: 0; box-sizing: border-box; }';

export const IMAGE_RENDERING_CSS =
  'image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;';

export const EMOJI_IMG_CSS =
  'img.emoji { height: 1em; width: 1em; margin: 0 0.05em 0 0.1em; vertical-align: -0.1em; display: inline; }';

export function renderObjectivesHtml(
  objetivos: readonly FormattedObjective[],
  title: string
): string {
  if (objetivos.length === 0) return '';

  return `
    <div class="objectives-container">
      <div class="objectives-title">${escapeHtml(title)}</div>
      ${objetivos.map(obj => `
        <div class="objective-item">
          <span class="objective-icon">${obj.icon}</span>
          <span class="objective-text ${obj.isCompleted ? 'objective-completed' : ''}">${escapeHtml(obj.text)}</span>
        </div>
      `).join('')}
    </div>`;
}

interface InlineUserInfoOptions {
  readonly avatarHTML: string;
  readonly displayName: string;
  readonly displayId: string;
  readonly formattedDate: string;
}

export function renderInlineUserInfoHtml(opts: InlineUserInfoOptions): string {
  return `
    <div class="user-info">
      ${opts.avatarHTML}
      <div class="user-text">
        <div class="display-name">${escapeHtml(opts.displayName)}</div>
        <div class="display-id">@${escapeHtml(opts.displayId)}</div>
        <div class="date">${opts.formattedDate}</div>
      </div>
    </div>`;
}

export function renderLogoFooterHtml(processedLogo: string): string {
  return `
    <div class="footer">
      <div class="beshy-text">BESHY</div>
      ${processedLogo}
    </div>`;
}

export function formatImageDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
}
