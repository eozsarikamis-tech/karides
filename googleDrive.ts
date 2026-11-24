import { getAccessToken } from './googleAuth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

export interface DriveAboutInfo {
  user?: {
    displayName?: string;
    emailAddress?: string;
    photoLink?: string;
  };
  storageQuota?: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
    usageInDriveTrash?: string;
  };
}

export interface DriveOptimizationSettings {
  autoBackupEnabled: boolean;
  compactJsonEnabled: boolean;
  maxRetainedBackups: 3 | 5 | 10;
  lastBackupHash?: string;
  lastBackupAt?: string;
}

export interface DriveOptimizationAnalysis {
  totalFiles: number;
  totalBytes: number;
  keptFiles: DriveFileItem[];
  excessFiles: DriveFileItem[];
  recoverableBytes: number;
  duplicateCount: number;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';
const BACKUP_FOLDER_NAME = 'AquaBreeder Pro Bulut Yedekleri';
const DRIVE_OPT_SETTINGS_KEY = 'aquabreeder_drive_opt_v1';

const DEFAULT_OPT_SETTINGS: DriveOptimizationSettings = {
  autoBackupEnabled: true,
  compactJsonEnabled: true,
  maxRetainedBackups: 5,
};

export function loadDriveOptSettings(): DriveOptimizationSettings {
  try {
    const raw = localStorage.getItem(DRIVE_OPT_SETTINGS_KEY);
    if (!raw) return DEFAULT_OPT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<DriveOptimizationSettings>;
    const maxRetained =
      parsed.maxRetainedBackups === 3 ||
      parsed.maxRetainedBackups === 5 ||
      parsed.maxRetainedBackups === 10
        ? parsed.maxRetainedBackups
        : 5;
    return {
      autoBackupEnabled:
        typeof parsed.autoBackupEnabled === 'boolean' ? parsed.autoBackupEnabled : true,
      compactJsonEnabled:
        typeof parsed.compactJsonEnabled === 'boolean' ? parsed.compactJsonEnabled : true,
      maxRetainedBackups: maxRetained,
      lastBackupHash: typeof parsed.lastBackupHash === 'string' ? parsed.lastBackupHash : undefined,
      lastBackupAt: typeof parsed.lastBackupAt === 'string' ? parsed.lastBackupAt : undefined,
    };
  } catch {
    return DEFAULT_OPT_SETTINGS;
  }
}

export function saveDriveOptSettings(settings: DriveOptimizationSettings): void {
  try {
    localStorage.setItem(DRIVE_OPT_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Drive optimization settings save error:', err);
  }
}

/**
 * Compute deterministic lightweight hash of hatchery state to skip redundant backups
 */
export function computeStateHash(state: unknown): string {
  const str = JSON.stringify(state) || '';
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 16777619);
    h2 = Math.imul(h2 ^ ch, 2654435761);
  }
  return `${(h1 >>> 0).toString(16)}_${(h2 >>> 0).toString(16)}_${str.length}`;
}

/**
 * Format byte count into readable string
 */
export function formatByteSize(bytesInput?: string | number): string {
  if (bytesInput === undefined || bytesInput === null || bytesInput === '') return '—';
  const bytes = typeof bytesInput === 'number' ? bytesInput : parseInt(bytesInput, 10);
  if (isNaN(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Analyze Drive backups to detect excess old files and redundant same-size consecutive backups
 */
export function analyzeDriveOptimization(
  files: DriveFileItem[],
  maxRetained: number
): DriveOptimizationAnalysis {
  const sorted = [...files].sort((a, b) => {
    const ta = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
    const tb = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
    return tb - ta;
  });

  const totalBytes = sorted.reduce((acc, f) => acc + (parseInt(f.size || '0', 10) || 0), 0);
  const excessIds = new Set<string>();
  let duplicateCount = 0;

  // Detect consecutive duplicate-size auto backups taken close together
  for (let i = 1; i < sorted.length; i++) {
    const newer = sorted[i - 1];
    const older = sorted[i];
    const sameSize = Boolean(newer.size && older.size && newer.size === older.size);
    const isOlderAuto = older.name.includes('aquabreeder_oto_');
    if (sameSize && isOlderAuto) {
      excessIds.add(older.id);
      duplicateCount++;
    }
  }

  // Enforce retention limit on remaining kept files
  const nonDuplicateFiles = sorted.filter((f) => !excessIds.has(f.id));
  if (nonDuplicateFiles.length > maxRetained) {
    nonDuplicateFiles.slice(maxRetained).forEach((f) => {
      excessIds.add(f.id);
    });
  }

  const keptFiles = sorted.filter((f) => !excessIds.has(f.id));
  const excessFiles = sorted.filter((f) => excessIds.has(f.id));
  const recoverableBytes = excessFiles.reduce(
    (acc, f) => acc + (parseInt(f.size || '0', 10) || 0),
    0
  );

  return {
    totalFiles: sorted.length,
    totalBytes,
    keptFiles,
    excessFiles,
    recoverableBytes,
    duplicateCount,
  };
}

/**
 * Get current Drive storage and user profile
 */
export async function getDriveAboutInfo(): Promise<DriveAboutInfo> {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive yetkilendirmesi gerekli.');

  const res = await fetch(`${DRIVE_API_BASE}/about?fields=user,storageQuota`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Google Drive bilgisi alınamadı.');
  }

  return res.json();
}

/**
 * Find or create the AquaBreeder Pro dedicated folder in Google Drive
 */
export async function getOrCreateBackupFolder(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive yetkilendirmesi gerekli.');

  const query = encodeURIComponent(
    `mimeType = 'application/vnd.google-apps.folder' and name = '${BACKUP_FOLDER_NAME}' and trashed = false`
  );
  const searchRes = await fetch(`${DRIVE_API_BASE}/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  const createRes = await fetch(`${DRIVE_API_BASE}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'AquaBreeder Pro üretimhane canlı, akvaryum ve finansal bulut yedekleri',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Google Drive klasörü oluşturulamadı.');
  }

  const created = await createRes.json();
  return created.id;
}

/**
 * List backups and files in the AquaBreeder Pro folder (or matching query)
 */
export async function listDriveBackups(folderId?: string): Promise<DriveFileItem[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive yetkilendirmesi gerekli.');

  let q = "trashed = false and mimeType != 'application/vnd.google-apps.folder'";
  if (folderId) {
    q += ` and '${folderId}' in parents`;
  } else {
    q += ` and (name contains 'aquabreeder' or name contains 'AquaBreeder')`;
  }

  const encodedQ = encodeURIComponent(q);
  const fields = encodeURIComponent(
    'files(id,name,mimeType,size,modifiedTime,webViewLink,thumbnailLink,iconLink)'
  );

  const res = await fetch(
    `${DRIVE_API_BASE}/files?q=${encodedQ}&fields=${fields}&orderBy=modifiedTime desc&pageSize=100`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Drive dosyaları listelenemedi.');
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Upload a JSON hatchery backup to Google Drive using multipart upload
 * Supports compact (minified) JSON optimization (~40% storage savings)
 */
export async function uploadHatcheryBackupToDrive(
  state: any,
  customName?: string,
  options?: { compact?: boolean; isAuto?: boolean }
): Promise<DriveFileItem> {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive yetkilendirmesi gerekli.');

  const folderId = await getOrCreateBackupFolder();

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const prefix = options?.isAuto ? 'aquabreeder_oto' : 'aquabreeder_yedek';
  const fileName = customName || `${prefix}_${dateStr}_${timeStr}.json`;

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/json',
    description: `AquaBreeder Pro ${options?.isAuto ? 'otomatik' : 'manuel'} üretimhane yedeği (${dateStr} ${timeStr})`,
  };

  const payload = {
    ...state,
    backupSource: options?.isAuto
      ? 'AquaBreeder Pro Otomatik Bulut Yedeği'
      : 'AquaBreeder Pro Google Drive Sync',
    timestamp: now.toISOString(),
    appVersion: '1.3.0',
    optimized: options?.compact !== false,
  };

  const fileContent =
    options?.compact === false ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const res = await fetch(
    `${UPLOAD_API_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Yedek Google Drive'a yüklenemedi.");
  }

  return res.json();
}

/**
 * Download file content from Google Drive (e.g. for restore)
 */
export async function downloadDriveFileContent(fileId: string): Promise<any> {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive yetkilendirmesi gerekli.');

  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Dosya Google Drive'dan indirilemedi.");
  }

  return res.json();
}

/**
 * Delete a file from Google Drive (MUST be confirmed by user in UI first)
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Drive yetkilendirmesi gerekli.');

  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Dosya Google Drive'dan silinemedi.");
  }
}

/**
 * Delete multiple Drive files after explicit user confirmation
 */
export async function deleteDriveFilesBatch(
  fileIds: string[]
): Promise<{ deletedCount: number; failedCount: number }> {
  let deletedCount = 0;
  let failedCount = 0;

  for (const id of fileIds) {
    try {
      await deleteDriveFile(id);
      deletedCount++;
    } catch {
      failedCount++;
    }
  }

  return { deletedCount, failedCount };
}
