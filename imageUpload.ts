const SPECIES_IMAGES_STORAGE_KEY = 'aquabreeder_species_images_v1';

export interface ImageCompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function isLegacyStockHeroImage(src?: string): boolean {
  if (!src) return false;
  const normalized = src.trim();
  return (
    normalized.includes('south_america_biotope_1794001814309') ||
    normalized.includes('home_fishroom_racks_1794584113641')
  );
}

export async function compressImageFileToDataUrl(
  file: File,
  options: ImageCompressOptions = {}
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Lütfen geçerli bir görsel dosyası seçin (JPG, PNG, WebP vb.).');
  }

  const maxWidth = options.maxWidth ?? 960;
  const maxHeight = options.maxHeight ?? 640;
  const quality = options.quality ?? 0.82;

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Görsel okunamadı.'));
      }
    };
    reader.onerror = () => reject(new Error('Görsel dosyası yüklenirken hata oluştu.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Görsel işlenemedi. Lütfen farklı bir dosya seçin.'));
    image.src = rawDataUrl;
  });

  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  if (targetWidth <= 0 || targetHeight <= 0) {
    return rawDataUrl;
  }

  const widthRatio = maxWidth / targetWidth;
  const heightRatio = maxHeight / targetHeight;
  const scale = Math.min(1, widthRatio, heightRatio);

  targetWidth = Math.max(1, Math.round(targetWidth * scale));
  targetHeight = Math.max(1, Math.round(targetHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return rawDataUrl;
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL('image/jpeg', quality);
}

export function loadSpeciesImages(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SPECIES_IMAGES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const clean: Record<string, string> = {};
    Object.entries(parsed).forEach(([key, val]) => {
      if (typeof val === 'string' && val.trim()) {
        clean[key] = val;
      }
    });
    return clean;
  } catch (err) {
    console.error('Tür görselleri yüklenemedi:', err);
    return {};
  }
}

export function saveSpeciesImagesMap(nextMap: Record<string, string>): void {
  try {
    localStorage.setItem(SPECIES_IMAGES_STORAGE_KEY, JSON.stringify(nextMap));
  } catch (err) {
    console.error('Tür görseli kaydedilemedi:', err);
    throw new Error(
      'Tarayıcı depolama alanı dolu. Daha küçük bir görsel seçin veya mevcut bir görseli kaldırın.'
    );
  }
}
