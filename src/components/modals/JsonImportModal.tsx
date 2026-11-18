import React from 'react';
import { FileJson, AlertCircle, CheckCircle2, Upload, X } from 'lucide-react';
import { ParsedBackupJSON } from '../../utils/storage';

interface JsonImportModalProps {
  fileName: string;
  parsedBackup: ParsedBackupJSON | null;
  errorMessage: string | null;
  onClose: () => void;
  onConfirmImport: (mode: 'replace' | 'append') => void;
}

export const JsonImportModal: React.FC<JsonImportModalProps> = ({
  fileName,
  parsedBackup,
  errorMessage,
  onClose,
  onConfirmImport,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 max-h-[92dvh] overflow-y-auto shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                errorMessage
                  ? 'bg-red-500/10 border-red-500/20 text-red-600'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-600'
              }`}
            >
              {errorMessage ? <AlertCircle className="w-5 h-5" /> : <FileJson className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900">
                {errorMessage ? 'JSON Yükleme Hatası' : 'JSON Yedeğini İçe Aktar'}
              </h3>
              <span className="text-[11px] text-slate-500 font-mono block truncate max-w-[260px]">
                {fileName}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage ? (
          <>
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
              {errorMessage}
            </div>
            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Tamam
              </button>
            </div>
          </>
        ) : parsedBackup ? (
          <>
            {parsedBackup.timestamp && (
              <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                <span>Yedek Tarihi:</span>
                <span className="font-mono text-slate-700">
                  {new Date(parsedBackup.timestamp).toLocaleDateString('tr-TR')}
                </span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span>Canlı Alım &amp; Stoklar:</span>
                <span className="font-mono font-bold text-slate-900">
                  {parsedBackup.counts.batches} kayıt
                </span>
              </div>
              <div className="flex justify-between">
                <span>Akvaryumlar:</span>
                <span className="font-mono font-bold text-slate-900">
                  {parsedBackup.counts.tanks} kayıt
                </span>
              </div>
              <div className="flex justify-between">
                <span>Satışlar:</span>
                <span className="font-mono font-bold text-slate-900">
                  {parsedBackup.counts.sales} kayıt
                </span>
              </div>
              <div className="flex justify-between">
                <span>Demirbaş &amp; Giderler:</span>
                <span className="font-mono font-bold text-slate-900">
                  {parsedBackup.counts.expenses} kayıt
                </span>
              </div>
              <div className="flex justify-between">
                <span>Üreme &amp; Paket Kayıtları:</span>
                <span className="font-mono font-bold text-slate-900">
                  {parsedBackup.counts.breedings + parsedBackup.counts.packages} kayıt
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              JSON yedeğini mevcut verilerin yerine yükleyerek tam geri yükleme yapabilir veya mevcut kayıtlarınıza ekleyebilirsiniz.
            </p>

            <div className="grid grid-cols-1 sm:flex sm:items-center sm:justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-lg text-xs font-semibold cursor-pointer order-3 sm:order-1"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => onConfirmImport('append')}
                className="min-h-[44px] px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer order-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Mevcuta Ekle</span>
              </button>
              <button
                type="button"
                onClick={() => onConfirmImport('replace')}
                className="min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20 order-1 sm:order-3"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Yerine Yükle</span>
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
