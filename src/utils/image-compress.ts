const AVATAR_SIZE = 200;
const DEFAULT_QUALITY = 0.8;
const MAX_FILE_SIZE = 512 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function cropCenter(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  size: number
): void {
  canvas.width = size;
  canvas.height = size;

  const minDim = Math.min(img.width, img.height);
  const sx = (img.width - minDim) / 2;
  const sy = (img.height - minDim) / 2;

  ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to compress image'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      quality
    );
  });
}

export async function compressAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    cropCenter(canvas, ctx, img, AVATAR_SIZE);

    let blob = await canvasToBlob(canvas, DEFAULT_QUALITY);

    if (blob.size > MAX_FILE_SIZE) {
      blob = await canvasToBlob(canvas, 0.6);
    }

    if (blob.size > MAX_FILE_SIZE) {
      blob = await canvasToBlob(canvas, 0.4);
    }

    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
