import React, { useState } from 'react';
import { X, Sparkles, Check, Plus } from 'lucide-react';
import { addCustomSpecies } from '../../utils/speciesStorage';

interface AddSpeciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeciesAdded: (newSpeciesId: string) => void;
}

export const AddSpeciesModal: React.FC<AddSpeciesModalProps> = ({
  isOpen,
  onClose,
  onSpeciesAdded,
}) => {
  const [speciesName, setSpeciesName] = useState('');

  if (!isOpen) return null;

  const quickPresets = [
    { label: 'Vatoz / L144 Pleco', value: 'Vatoz (L-Serisi Pleco)' },
    { label: 'Corydoras (Çöpçü)', value: 'Corydoras (Çöpçü)' },
    { label: 'Lepistes / Canlı Doğuran', value: 'Lepistes (Canlı Doğuran)' },
    { label: 'Betta Splendens', value: 'Betta Splendens' },
    { label: 'Discus & Melek', value: 'Discus / Melek Balığı' },
    { label: 'Salyangoz (Nerite/Katil)', value: 'Salyangoz Türleri' },
    { label: 'Su Altı Moss & Bitki', value: 'Akvaryum Bitkisi / Moss' },
    { label: 'Kerevit / Cüce Kerevit', value: 'Cüce Kerevit (CPO)' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!speciesName.trim()) return;

    const added = addCustomSpecies(speciesName.trim());
    onSpeciesAdded(added.id);
    setSpeciesName('');
    onClose();
  };

  const handleSelectPreset = (value: string) => {
    const added = addCustomSpecies(value);
    onSpeciesAdded(added.id);
    setSpeciesName('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white border border-slate-300 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-safe shadow-2xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-500/40 flex items-center justify-center text-emerald-600 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Manuel Canlı Türü Tanımla
              </h2>
              <p className="text-[11px] text-slate-500">
                Sisteme dilediğiniz yeni balık, omurgasız veya bitki türünü ekleyin
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Presets */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-700 mb-2 flex items-center justify-between">
            <span>Hızlı Örnek Türler (Tek Tıkla Ekle):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {quickPresets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(p.value)}
                className="px-2.5 py-2 min-h-[38px] text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-600/50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="text-slate-700 font-semibold block mb-1.5">
              Yeni Canlı Türü / Kategori Adı *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Örn: Vatoz (L144 / Süper Kırmızı) veya Corydoras Panda"
              value={speciesName}
              onChange={(e) => setSpeciesName(e.target.value)}
              className="w-full min-h-[44px] bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm sm:text-xs placeholder-slate-500 outline-none transition-colors"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Bu tür kaydedildikten sonra tüm akvaryum, alım, satış ve envanter pencerelerinde seçenek olarak görünecektir.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!speciesName.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-emerald-200/60 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Türü Kaydet ve Seç</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
