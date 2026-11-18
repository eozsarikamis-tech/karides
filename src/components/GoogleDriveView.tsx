import React, { useState, useEffect, useMemo } from 'react';
import {
  Cloud,
  UploadCloud,
  DownloadCloud,
  Trash2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  LogOut,
  FileText,
  ShieldAlert,
  FileSpreadsheet,
  FileJson,
  Download,
  Upload,
  RotateCcw,
  KeyRound,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  googleSignOut,
  getAccessToken,
} from '../services/googleAuth';
import {
  listDriveBackups,
  uploadHatcheryBackupToDrive,
  downloadDriveFileContent,
  deleteDriveFile,
  deleteDriveFilesBatch,
  getDriveAboutInfo,
  analyzeDriveOptimization,
  computeStateHash,
  formatByteSize,
  loadDriveOptSettings,
  saveDriveOptSettings,
  DriveFileItem,
  DriveAboutInfo,
  DriveOptimizationSettings,
} from '../services/googleDrive';
import {
  BatchPurchase,
  Tank,
  Sale,
  BreedingSpawn,
  Expense,
  SalePackageTemplate,
} from '../types';
import {
  downloadStarterExcelTemplate,
  downloadCurrentDataExcel,
  parseExcelWorkbook,
  ExcelImportResult,
} from '../utils/excelWorkbook';
import {
  hasResetPassword,
  setResetPassword,
  verifyResetPassword,
  clearResetPassword,
} from '../utils/storage';

interface GoogleDriveViewProps {
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
  activeBusinessName?: string;
  fullHatcheryState: {
    batches: BatchPurchase[];
    tanks: Tank[];
    sales: Sale[];
    breedings: BreedingSpawn[];
    expenses: Expense[];
    packages: SalePackageTemplate[];
  };
  onRestoreState: (state: any) => void;
  onImportExcelData?: (imported: {
    batches: BatchPurchase[];
    tanks: Tank[];
    sales: Sale[];
    expenses: Expense[];
    mode: 'append' | 'replace';
  }) => void;
  onExportJSON?: () => void;
  onImportJSON?: (file: File) => void;
  onResetBusinessData?: (mode: 'empty' | 'demo') => void;
  driveOptSettings?: DriveOptimizationSettings;
  onUpdateDriveOptSettings?: (
    updater:
      | Partial<DriveOptimizationSettings>
      | ((prev: DriveOptimizationSettings) => DriveOptimizationSettings)
  ) => void;
  autoBackupStatus?: 'idle' | 'syncing' | 'synced' | 'error';
}

export const GoogleDriveView: React.FC<GoogleDriveViewProps> = ({
  currentUser,
  onUserChange,
  fullHatcheryState,
  onRestoreState,
  onImportExcelData,
  onExportJSON,
  onImportJSON,
  onResetBusinessData,
  driveOptSettings: externalOptSettings,
  onUpdateDriveOptSettings,
  autoBackupStatus = 'idle',
}) => {
  const [localOptSettings, setLocalOptSettings] = useState<DriveOptimizationSettings>(() =>
    loadDriveOptSettings()
  );
  const optSettings = externalOptSettings ?? localOptSettings;

  const updateOptSettings = (
    updater:
      | Partial<DriveOptimizationSettings>
      | ((prev: DriveOptimizationSettings) => DriveOptimizationSettings)
  ) => {
    if (onUpdateDriveOptSettings) {
      onUpdateDriveOptSettings(updater);
    } else {
      setLocalOptSettings((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
        saveDriveOptSettings(next);
        return next;
      });
    }
  };

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [aboutInfo, setAboutInfo] = useState<DriveAboutInfo | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Destructive & Optimization Confirmation states
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fileToRestore, setFileToRestore] = useState<DriveFileItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Local Tools drawer toggle (keeps page minimal)
  const [showLocalTools, setShowLocalTools] = useState(false);

  // Excel import preview/confirmation state
  const [pendingExcelImport, setPendingExcelImport] = useState<{
    fileName: string;
    result: ExcelImportResult;
  } | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);

  // Reset & Approval Password state
  const [passwordProtected, setPasswordProtected] = useState<boolean>(() => hasResetPassword());
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'empty' | 'demo'>('empty');
  const [resetApprovalChecked, setResetApprovalChecked] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [showResetPasswordText, setShowResetPasswordText] = useState(false);

  // Password management modal state
  const [passwordModalMode, setPasswordModalMode] = useState<'set' | 'change' | 'remove' | null>(
    null
  );
  const [currentPwInput, setCurrentPwInput] = useState('');
  const [newPwInput, setNewPwInput] = useState('');
  const [confirmPwInput, setConfirmPwInput] = useState('');
  const [pwFormError, setPwFormError] = useState<string | null>(null);
  const [showPwFields, setShowPwFields] = useState(false);

  const currentHash = useMemo(() => computeStateHash(fullHatcheryState), [fullHatcheryState]);
  const isStateSynced = Boolean(
    optSettings.lastBackupHash && optSettings.lastBackupHash === currentHash
  );

  const optimization = useMemo(
    () => analyzeDriveOptimization(files, optSettings.maxRetainedBackups),
    [files, optSettings.maxRetainedBackups]
  );

  const loadDriveData = async () => {
    const token = await getAccessToken();
    if (!token) return;

    setIsLoadingFiles(true);
    try {
      const [fetchedFiles, fetchedAbout] = await Promise.all([
        listDriveBackups().catch(() => []),
        getDriveAboutInfo().catch(() => null),
      ]);
      setFiles(fetchedFiles);
      if (fetchedAbout) setAboutInfo(fetchedAbout);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Drive verileri yüklenemedi.',
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadDriveData();
    }
  }, [currentUser]);

  // Refresh file list when background auto-backup finishes
  useEffect(() => {
    if (currentUser && autoBackupStatus === 'synced') {
      loadDriveData();
    }
  }, [autoBackupStatus]);

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onUserChange(result.user);
        setStatusMessage({
          type: 'success',
          text: `Google Drive bağlandı (${result.user.email}).`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Google ile giriş yapılamadı.',
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      onUserChange(null);
      setFiles([]);
      setAboutInfo(null);
      setStatusMessage({
        type: 'success',
        text: 'Google hesabından çıkış yapıldı.',
      });
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const handleUploadBackup = async () => {
    setIsUploading(true);
    setStatusMessage(null);
    try {
      const uploaded = await uploadHatcheryBackupToDrive(fullHatcheryState, undefined, {
        compact: optSettings.compactJsonEnabled,
        isAuto: false,
      });
      updateOptSettings({
        lastBackupHash: currentHash,
        lastBackupAt: new Date().toISOString(),
      });
      setStatusMessage({
        type: 'success',
        text: `Yedek kaydedildi: ${uploaded.name} (${formatByteSize(uploaded.size)})`,
      });
      await loadDriveData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || "Google Drive'a yedek yüklenemedi.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Confirmed Drive optimization (removes redundant / excess older backups)
  const confirmOptimizeDrive = async () => {
    if (optimization.excessFiles.length === 0) {
      setShowOptimizeModal(false);
      return;
    }
    setIsOptimizing(true);
    try {
      const targetIds = optimization.excessFiles.map((f) => f.id);
      const { deletedCount, failedCount } = await deleteDriveFilesBatch(targetIds);
      setShowOptimizeModal(false);
      setStatusMessage({
        type: failedCount === 0 ? 'success' : 'error',
        text:
          failedCount === 0
            ? `Drive optimize edildi: ${deletedCount} eski/yinelenen yedek temizlendi (${formatByteSize(
                optimization.recoverableBytes
              )} alan açıldı).`
            : `${deletedCount} dosya temizlendi, ${failedCount} dosya silinemedi.`,
      });
      await loadDriveData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Optimizasyon sırasında hata oluştu.',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Explicit confirmation before deleting file from Google Drive
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(fileToDelete.id);
      setStatusMessage({
        type: 'success',
        text: `'${fileToDelete.name}' Drive'dan silindi.`,
      });
      setFileToDelete(null);
      await loadDriveData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || "Dosya Drive'dan silinemedi.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Explicit confirmation before restoring data from Google Drive
  const confirmRestoreFile = async () => {
    if (!fileToRestore) return;
    setIsRestoring(true);
    try {
      const content = await downloadDriveFileContent(fileToRestore.id);
      if (content && (content.batches || content.tanks || content.sales)) {
        onRestoreState(content);
        setStatusMessage({
          type: 'success',
          text: `'${fileToRestore.name}' geri yüklendi.`,
        });
      } else {
        throw new Error('Geçersiz yedek dosyası.');
      }
      setFileToRestore(null);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Yedek geri yüklenemedi.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Excel handlers
  const handleDownloadStarterExcel = () => {
    try {
      const fileName = downloadStarterExcelTemplate();
      setStatusMessage({ type: 'success', text: `Şablon indirildi (${fileName}).` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Excel şablonu oluşturulamadı.' });
    }
  };

  const handleDownloadCurrentExcel = () => {
    try {
      const fileName = downloadCurrentDataExcel(fullHatcheryState);
      setStatusMessage({ type: 'success', text: `Veriler Excel olarak indirildi (${fileName}).` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Excel oluşturulamadı.' });
    }
  };

  const handleExcelFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsParsingExcel(true);
    setStatusMessage(null);
    try {
      const result = await parseExcelWorkbook(file, fullHatcheryState.tanks);
      const totalImported =
        result.counts.batches +
        result.counts.expenses +
        result.counts.sales +
        result.counts.tanks;
      if (totalImported === 0) {
        throw new Error('Excel dosyasında aktarılacak geçerli satır bulunamadı.');
      }
      setPendingExcelImport({ fileName: file.name, result });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Excel dosyası okunamadı.' });
    } finally {
      setIsParsingExcel(false);
    }
  };

  const confirmExcelImport = (mode: 'append' | 'replace') => {
    if (!pendingExcelImport || !onImportExcelData) return;
    const { fileName, result } = pendingExcelImport;
    onImportExcelData({
      batches: result.batches,
      tanks: result.tanks,
      sales: result.sales,
      expenses: result.expenses,
      mode,
    });
    setPendingExcelImport(null);
    setStatusMessage({
      type: 'success',
      text: `'${fileName}' aktarıldı (${result.counts.batches} canlı, ${result.counts.expenses} gider, ${result.counts.sales} satış, ${result.counts.tanks} tank).`,
    });
  };

  // Reset & password handlers
  const openResetModal = () => {
    setPasswordProtected(hasResetPassword());
    setResetMode('empty');
    setResetApprovalChecked(false);
    setResetPasswordInput('');
    setResetError(null);
    setShowResetPasswordText(false);
    setIsResetModalOpen(true);
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (!resetApprovalChecked) {
      setResetError('Sıfırlama onay kutusunu işaretleyin.');
      return;
    }
    if (hasResetPassword()) {
      if (!resetPasswordInput.trim()) {
        setResetError('Onay şifresini girin.');
        return;
      }
      const isValid = await verifyResetPassword(resetPasswordInput);
      if (!isValid) {
        setResetError('Onay şifresi hatalı.');
        return;
      }
    }
    if (onResetBusinessData) onResetBusinessData(resetMode);
    setIsResetModalOpen(false);
    setResetPasswordInput('');
    setResetApprovalChecked(false);
    setStatusMessage({
      type: 'success',
      text:
        resetMode === 'empty'
          ? 'Tüm veriler sıfırlandı.'
          : 'Veriler örnek başlangıç durumuna döndürüldü.',
    });
  };

  const openPasswordModal = (mode: 'set' | 'change' | 'remove') => {
    setPasswordModalMode(mode);
    setCurrentPwInput('');
    setNewPwInput('');
    setConfirmPwInput('');
    setPwFormError(null);
    setShowPwFields(false);
  };

  const handleSavePasswordSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwFormError(null);
    if (passwordModalMode === 'change' || passwordModalMode === 'remove') {
      const ok = await verifyResetPassword(currentPwInput);
      if (!ok) {
        setPwFormError('Mevcut şifre yanlış.');
        return;
      }
    }
    if (passwordModalMode === 'remove') {
      clearResetPassword();
      setPasswordProtected(false);
      setPasswordModalMode(null);
      setStatusMessage({ type: 'success', text: 'Onay şifresi kaldırıldı.' });
      return;
    }
    if (newPwInput.trim().length < 4) {
      setPwFormError('Şifre en az 4 karakter olmalıdır.');
      return;
    }
    if (newPwInput !== confirmPwInput) {
      setPwFormError('Şifreler eşleşmiyor.');
      return;
    }
    await setResetPassword(newPwInput);
    setPasswordProtected(true);
    setPasswordModalMode(null);
    setStatusMessage({ type: 'success', text: 'Onay şifresi kaydedildi.' });
  };

  const quotaPercent = useMemo(() => {
    const usage = parseInt(aboutInfo?.storageQuota?.usage || '0', 10);
    const limit = parseInt(aboutInfo?.storageQuota?.limit || '0', 10);
    if (!usage || !limit) return 0;
    return Math.min(100, Math.max(1, Math.round((usage / limit) * 100)));
  }, [aboutInfo]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Status Toast */}
      {statusMessage && (
        <div
          className={`px-4 py-3 rounded-xl text-xs flex items-center justify-between gap-3 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span className="leading-snug">{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-500 hover:text-slate-900 text-xs shrink-0 px-2 py-1 cursor-pointer"
          >
            Kapat
          </button>
        </div>
      )}

      {/* 1. ANA BULUT KARTI */}
      {!currentUser ? (
        <section className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
            <Cloud className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-slate-900">Google Drive Bulut Yedekleme</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Canlı stok, akvaryum ve finans verilerinizi kişisel Drive hesabınızda otomatik yedekleyin ve optimize edin.
            </p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="inline-flex items-center justify-center gap-3 min-h-[44px] px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isAuthenticating ? 'Bağlanıyor...' : 'Google ile Giriş Yap'}</span>
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
            {/* Connected User & Main CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google'}
                    className="w-10 h-10 rounded-full border border-slate-300 object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    {currentUser.displayName?.[0] || 'G'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {currentUser.displayName || 'Google Drive Bağlı'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate font-mono">
                    {currentUser.email}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleUploadBackup}
                  disabled={isUploading}
                  className="flex-1 sm:flex-none min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer transition-colors"
                >
                  <UploadCloud className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
                  <span>{isUploading ? 'Yedekleniyor...' : 'Şimdi Yedekle'}</span>
                </button>
                <button
                  onClick={loadDriveData}
                  disabled={isLoadingFiles}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
                  title="Yenile"
                  aria-label="Yenile"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleSignOut}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
                  title="Çıkış Yap"
                  aria-label="Çıkış Yap"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Compact Quota & Sync Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                    Drive Alanı
                  </span>
                  <span className="font-mono text-slate-800">
                    {aboutInfo?.storageQuota?.usage
                      ? `${formatByteSize(aboutInfo.storageQuota.usage)} / ${formatByteSize(
                          aboutInfo.storageQuota.limit
                        )}`
                      : '—'}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{ width: `${quotaPercent || 4}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between sm:block text-[11px]">
                <span className="text-slate-500 block">Bulut Yedekleri</span>
                <span className="font-mono font-semibold text-slate-900">
                  {files.length} dosya ({formatByteSize(optimization.totalBytes)})
                </span>
              </div>

              <div className="flex items-center justify-between sm:block text-[11px]">
                <span className="text-slate-500 block">Senkronizasyon</span>
                <span
                  className={`font-medium ${
                    autoBackupStatus === 'syncing'
                      ? 'text-blue-600'
                      : isStateSynced
                      ? 'text-emerald-600'
                      : 'text-amber-700'
                  }`}
                >
                  {autoBackupStatus === 'syncing'
                    ? 'Otomatik yedekleniyor...'
                    : isStateSynced
                    ? `Güncel${
                        optSettings.lastBackupAt
                          ? ` (${new Date(optSettings.lastBackupAt).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })})`
                          : ''
                      }`
                    : optSettings.autoBackupEnabled
                    ? 'Değişiklik algılandı (bekliyor)'
                    : 'Manuel mod'}
                </span>
              </div>
            </div>

            {/* Automatic Optimization Controls */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={optSettings.autoBackupEnabled}
                    onChange={(e) =>
                      updateOptSettings({ autoBackupEnabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-300 bg-white text-blue-500 focus:ring-blue-500"
                  />
                  <span>Otomatik Yedekleme</span>
                </label>

                <label
                  className="inline-flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none min-h-[36px]"
                  title="Gereksiz JSON boşluklarını kaldırarak ~%40 daha az Drive alanı kullanır"
                >
                  <input
                    type="checkbox"
                    checked={optSettings.compactJsonEnabled}
                    onChange={(e) =>
                      updateOptSettings({ compactJsonEnabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-300 bg-white text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Sıkıştırılmış Kayıt (~%40 tasarruf)</span>
                </label>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-[11px] text-slate-500">Saklama limiti:</span>
                <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
                  {([3, 5, 10] as const).map((limit) => (
                    <button
                      key={limit}
                      type="button"
                      onClick={() => updateOptSettings({ maxRetainedBackups: limit })}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                        optSettings.maxRetainedBackups === limit
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Son {limit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 2. DRIVE OPTİMİZASYON ÖNERİSİ (Sadece fazla/yinelenen dosya varsa görünür) */}
          {optimization.excessFiles.length > 0 && (
            <section className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5 text-xs text-amber-700">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  Otomatik optimizasyon: Son {optSettings.maxRetainedBackups} yedek korunarak{' '}
                  <strong>{optimization.excessFiles.length} eski/yinelenen dosya</strong>{' '}
                  temizlenebilir ({formatByteSize(optimization.recoverableBytes)} kazanılır).
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowOptimizeModal(true)}
                className="min-h-[40px] px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-colors"
              >
                Optimize Et
              </button>
            </section>
          )}

          {/* 3. DRIVE YEDEKLERİ LİSTESİ */}
          <section className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Drive Yedekleri</h3>
              <span className="text-[11px] text-slate-500 font-mono">
                AquaBreeder Pro Bulut Yedekleri
              </span>
            </div>

            {isLoadingFiles ? (
              <div className="py-10 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                <span>Yedekler yükleniyor...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs bg-slate-50/70 rounded-xl border border-slate-200 p-6 space-y-3">
                <Cloud className="w-7 h-7 mx-auto text-slate-400" />
                <p className="text-slate-700">Henüz bulut yedeği yok.</p>
                <button
                  onClick={handleUploadBackup}
                  disabled={isUploading}
                  className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  İlk Yedeği Al
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Stacked Cards */}
                <div className="md:hidden space-y-2.5">
                  {files.map((file, idx) => {
                    const isAuto = file.name.includes('aquabreeder_oto_');
                    return (
                      <div
                        key={file.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="truncate">{file.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span>
                              {file.modifiedTime
                                ? new Date(file.modifiedTime).toLocaleString('tr-TR')
                                : '—'}
                            </span>
                            <span>·</span>
                            <span className="font-mono">{formatByteSize(file.size)}</span>
                            <span>·</span>
                            <span className={idx === 0 ? 'text-emerald-400 font-semibold' : ''}>
                              {idx === 0 ? 'En Güncel' : isAuto ? 'Otomatik' : 'Manuel'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200">
                          <button
                            onClick={() => setFileToRestore(file)}
                            className="flex-1 min-h-[42px] px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <DownloadCloud className="w-4 h-4" />
                            <span>Geri Yükle</span>
                          </button>
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="min-w-[42px] min-h-[42px] flex items-center justify-center text-slate-700 bg-white border border-slate-200 rounded-xl"
                              title="Drive'da Aç"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => setFileToDelete(file)}
                            className="min-w-[42px] min-h-[42px] flex items-center justify-center text-red-600 bg-red-50 border border-red-200 rounded-xl cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                      <tr>
                        <th className="py-2.5 px-4">Dosya</th>
                        <th className="py-2.5 px-4">Tarih</th>
                        <th className="py-2.5 px-4">Boyut</th>
                        <th className="py-2.5 px-4 text-right">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {files.map((file, idx) => {
                        const isAuto = file.name.includes('aquabreeder_oto_');
                        return (
                          <tr key={file.id} className="hover:bg-slate-100 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2 font-medium text-slate-900">
                                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="truncate max-w-xs">{file.name}</span>
                                <span
                                  className={`text-[10px] font-semibold ${
                                    idx === 0 ? 'text-emerald-600' : 'text-slate-500'
                                  }`}
                                >
                                  {idx === 0 ? '• En Güncel' : isAuto ? '• Oto' : '• Manuel'}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-700">
                              {file.modifiedTime
                                ? new Date(file.modifiedTime).toLocaleString('tr-TR')
                                : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 font-mono">
                              {formatByteSize(file.size)}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setFileToRestore(file)}
                                  className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                  <DownloadCloud className="w-3.5 h-3.5" />
                                  <span>Geri Yükle</span>
                                </button>
                                {file.webViewLink && (
                                  <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                                    title="Drive'da Aç"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  onClick={() => setFileToDelete(file)}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                  title="Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {/* 4. YEREL DOSYA & GÜVENLİK ARAÇLARI (Sade Akordiyon) */}
      <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLocalTools((v) => !v)}
          className="w-full min-h-[48px] px-4 sm:px-5 py-3 flex items-center justify-between text-left hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <FileJson className="w-4 h-4 text-slate-500" />
            <span className="text-xs sm:text-sm font-semibold text-slate-900">
              Yerel Dosya Aktarımı (.json / .xlsx) &amp; Sıfırlama
            </span>
          </div>
          {showLocalTools ? (
            <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          )}
        </button>

        {showLocalTools && (
          <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-slate-200 divide-y divide-slate-200">
            {/* JSON Row */}
            {(onExportJSON || onImportJSON) && (
              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                  <FileJson className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>JSON Yedekleme</span>
                </div>
                <div className="grid grid-cols-2 sm:flex items-center gap-2">
                  {onExportJSON && (
                    <button
                      type="button"
                      onClick={onExportJSON}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>İndir</span>
                    </button>
                  )}
                  {onImportJSON && (
                    <label className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-700 border border-blue-500/30 text-xs font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Yükle</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (file) onImportJSON(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Excel Row */}
            <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Excel (.xlsx)</span>
              </div>
              <div className="grid grid-cols-1 sm:flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadStarterExcel}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Şablon İndir</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCurrentExcel}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verileri İndir</span>
                </button>
                {onImportExcelData && (
                  <label className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-700 border border-emerald-500/30 text-xs font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isParsingExcel ? 'Okunuyor...' : 'Excel Yükle'}</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleExcelFileSelected}
                      disabled={isParsingExcel}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Security & Reset Row */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                {passwordProtected ? (
                  <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <RotateCcw className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>Güvenlik &amp; Sıfırlama</span>
              </div>
              <div className="grid grid-cols-1 sm:flex items-center gap-2">
                {!passwordProtected ? (
                  <button
                    type="button"
                    onClick={() => openPasswordModal('set')}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-amber-700 text-xs font-semibold cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Şifre Belirle</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => openPasswordModal('change')}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                      <span>Şifreyi Değiştir</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openPasswordModal('remove')}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 text-xs font-semibold cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Şifreyi Kaldır</span>
                    </button>
                  </>
                )}
                {onResetBusinessData && (
                  <button
                    type="button"
                    onClick={openResetModal}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-700 border border-red-500/30 text-xs font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Verileri Sıfırla</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* MODALS */}

      {/* Drive Optimize Confirmation Modal */}
      {showOptimizeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-h-[92dvh] overflow-y-auto shadow-2xl space-y-4 pb-safe">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Drive Yedeklerini Optimize Et</h3>
                <span className="text-[11px] text-slate-500">
                  {optimization.excessFiles.length} dosya silinecek ·{' '}
                  {formatByteSize(optimization.recoverableBytes)} alan açılacak
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              En güncel <strong>{optSettings.maxRetainedBackups} yedek</strong> korunacak,
              aşağıdaki eski veya yinelenen dosyalar Google Drive&apos;dan kalıcı olarak
              silinecektir:
            </p>

            <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 divide-y divide-slate-200">
              {optimization.excessFiles.map((f) => (
                <div key={f.id} className="px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-800 truncate">{f.name}</span>
                  <span className="text-slate-500 font-mono shrink-0">
                    {formatByteSize(f.size)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowOptimizeModal(false)}
                disabled={isOptimizing}
                className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmOptimizeDrive}
                disabled={isOptimizing}
                className="min-h-[44px] px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isOptimizing ? 'Temizleniyor...' : 'Onayla ve Temizle'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single File Delete Confirmation */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-h-[92dvh] overflow-y-auto shadow-2xl space-y-4 pb-safe">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Drive Dosyasını Sil</h3>
                <span className="text-[11px] text-slate-500">Kalıcı işlem onayı</span>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong className="text-slate-900 font-mono">&apos;{fileToDelete.name}&apos;</strong>{' '}
              dosyasını Google Drive&apos;dan kalıcı olarak silmek istiyor musunuz?
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                onClick={confirmDeleteFile}
                disabled={isDeleting}
                className="min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Siliniyor...' : 'Evet, Sil'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation */}
      {fileToRestore && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-h-[92dvh] overflow-y-auto shadow-2xl space-y-4 pb-safe">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <DownloadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Yedeği Geri Yükle</h3>
                <span className="text-[11px] text-slate-500">Mevcut veriler güncellenecek</span>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong className="text-slate-900 font-mono">&apos;{fileToRestore.name}&apos;</strong>{' '}
              yedeği indirilecek ve mevcut üretimhane verilerinizin yerine yüklenecektir.
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setFileToRestore(null)}
                disabled={isRestoring}
                className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-semibold cursor-pointer"
              >
                İptal
              </button>
              <button
                onClick={confirmRestoreFile}
                disabled={isRestoring}
                className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isRestoring ? 'Yükleniyor...' : 'Onayla ve Geri Yükle'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Confirmation */}
      {pendingExcelImport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-h-[92dvh] overflow-y-auto shadow-2xl space-y-4 pb-safe">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900">Excel İçe Aktar</h3>
                <span className="text-[11px] text-slate-500 font-mono truncate block">
                  {pendingExcelImport.fileName}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span>Canlılar:</span>
                <span className="font-mono font-bold text-slate-900">
                  {pendingExcelImport.result.counts.batches}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Demirbaş &amp; Sarf:</span>
                <span className="font-mono font-bold text-slate-900">
                  {pendingExcelImport.result.counts.expenses}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Satışlar:</span>
                <span className="font-mono font-bold text-slate-900">
                  {pendingExcelImport.result.counts.sales}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Akvaryumlar:</span>
                <span className="font-mono font-bold text-slate-900">
                  {pendingExcelImport.result.counts.tanks}
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingExcelImport(null)}
                className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-semibold cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => confirmExcelImport('append')}
                className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Mevcuta Ekle
              </button>
              <button
                type="button"
                onClick={() => confirmExcelImport('replace')}
                className="min-h-[44px] px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Yerine Yükle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-h-[92dvh] overflow-y-auto shadow-2xl space-y-4 pb-safe">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Verileri Sıfırla</h3>
                <span className="text-[11px] text-slate-500">Tüm Üretimhane Verileri</span>
              </div>
            </div>

            <form onSubmit={handleConfirmReset} className="space-y-3.5">
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setResetMode('empty')}
                  className={`p-3 rounded-xl border text-left text-xs cursor-pointer ${
                    resetMode === 'empty'
                      ? 'bg-red-50 border-red-500/60 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="font-semibold">Tüm Verileri Temizle</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Canlılar, tanklar, satışlar ve giderler tamamen silinir.
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setResetMode('demo')}
                  className={`p-3 rounded-xl border text-left text-xs cursor-pointer ${
                    resetMode === 'demo'
                      ? 'bg-amber-50 border-amber-500/60 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="font-semibold">Örnek Verilere Döndür</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Mevcut kayıtlar silinip başlangıç örnekleri yüklenir.
                  </div>
                </button>
              </div>

              {passwordProtected && (
                <div className="relative">
                  <input
                    type={showResetPasswordText ? 'text' : 'password'}
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    placeholder="Onay şifrenizi girin..."
                    autoFocus
                    className="w-full px-3 py-2.5 pr-11 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordText((v) => !v)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    {showResetPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              )}

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={resetApprovalChecked}
                  onChange={(e) => setResetApprovalChecked(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 bg-white text-red-500"
                />
                <span>Mevcut tüm verilerin sıfırlanacağını onaylıyorum.</span>
              </label>

              {resetError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Onayla ve Sıfırla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Setup / Change / Remove Modal */}
      {passwordModalMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-h-[92dvh] overflow-y-auto shadow-2xl space-y-4 pb-safe">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {passwordModalMode === 'set'
                    ? 'Onay Şifresi Belirle'
                    : passwordModalMode === 'change'
                    ? 'Onay Şifresini Değiştir'
                    : 'Onay Şifresini Kaldır'}
                </h3>
                <span className="text-[11px] text-slate-500">Sıfırlama koruması</span>
              </div>
            </div>

            <form onSubmit={handleSavePasswordSettings} className="space-y-3">
              {(passwordModalMode === 'change' || passwordModalMode === 'remove') && (
                <input
                  type={showPwFields ? 'text' : 'password'}
                  required
                  value={currentPwInput}
                  onChange={(e) => setCurrentPwInput(e.target.value)}
                  placeholder="Mevcut şifreniz..."
                  autoFocus
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
              )}

              {passwordModalMode !== 'remove' && (
                <>
                  <input
                    type={showPwFields ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={newPwInput}
                    onChange={(e) => setNewPwInput(e.target.value)}
                    placeholder="Yeni şifre (en az 4 karakter)..."
                    autoFocus={passwordModalMode === 'set'}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type={showPwFields ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={confirmPwInput}
                    onChange={(e) => setConfirmPwInput(e.target.value)}
                    placeholder="Yeni şifre (tekrar)..."
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </>
              )}

              <label className="inline-flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPwFields}
                  onChange={(e) => setShowPwFields(e.target.checked)}
                  className="rounded border-slate-300 bg-white"
                />
                <span>Şifreyi göster</span>
              </label>

              {pwFormError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{pwFormError}</span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPasswordModalMode(null)}
                  className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-900 cursor-pointer ${
                    passwordModalMode === 'remove'
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'bg-amber-600 hover:bg-amber-500'
                  }`}
                >
                  {passwordModalMode === 'remove' ? 'Şifreyi Kaldır' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
