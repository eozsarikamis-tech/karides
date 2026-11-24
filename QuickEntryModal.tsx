import React from 'react';
import { X, Sparkles, ShoppingBag, Droplets, RefreshCw, Receipt, PlusCircle } from 'lucide-react';

interface QuickEntryModalProps {
  onClose: () => void;
  onSelectAction: (action: 'batch' | 'sale' | 'tank' | 'livestock_adjustment' | 'expense' | 'manual_item' | 'add_species') => void;
}

export const QuickEntryModal: React.FC<QuickEntryModalProps> = ({
  onClose,
  onSelectAction,
}) => {
  const options = [
    {
      id: 'add_species' as const,
      icon: Sparkles,
      color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
      title: 'Manuel Canlı Türü Ekle',
      desc: 'Vatoz, Corydoras, Lepistes, Discus veya özel canlı türünü sisteme ekleyin.',
    },
    {
      id: 'manual_item' as const,
      icon: PlusCircle,
      color: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40',
      title: 'Manuel Malzeme Tanımla',
      desc: 'Canlı partisi, demirbaş donanım veya sarf tüketim malzemesini tek ekrandan tanımlayın.',
    },
    {
      id: 'livestock_adjustment' as const,
      icon: RefreshCw,
      color: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
      title: 'Manuel Stok Sayısı Güncelle',
      desc: 'Canlı, demirbaş veya sarf malzemenizin güncel stok sayısını doğrudan kendiniz belirleyin.',
    },
    {
      id: 'batch' as const,
      icon: Sparkles,
      color: 'text-purple-400 bg-purple-950/40 border-purple-800/40',
      title: 'Satın Alma',
      desc: 'İthalat veya hobiciden alınan yeni karides/cichlid grubunu ve alım maliyetini girin.',
    },
    {
      id: 'sale' as const,
      icon: ShoppingBag,
      color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
      title: 'Satış',
      desc: 'Seleksiyon fazlası veya yavru satışını kaydedin, kâr ve teslimatı izleyin.',
    },
    {
      id: 'tank' as const,
      icon: Droplets,
      color: 'text-blue-400 bg-blue-950/40 border-blue-800/40',
      title: 'Yeni Akvaryum Ekle',
      desc: 'Üretimhane rafına yeni nano tank, substrat ve hedef su değerleri tanımlayın.',
    },
    {
      id: 'expense' as const,
      icon: Receipt,
      color: 'text-red-400 bg-red-950/40 border-red-800/40',
      title: 'Demirbaş / Gider Gir',
      desc: 'Hava motoru, aydınlatma armatürü, çek valf, yem veya mineral alımlarını kaydedin.',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-safe shadow-2xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-200 gap-2">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold tracking-wide uppercase block">
              Hızlı İşlem Menüsü
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Hangi Kaydı Oluşturmak İstiyorsunuz?
            </h2>
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

        <div className="mt-4 space-y-2.5">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onSelectAction(opt.id);
                  onClose();
                }}
                className="w-full text-left p-3.5 min-h-[56px] rounded-xl bg-slate-50 hover:bg-slate-100 active:scale-[0.99] border border-slate-200 hover:border-slate-300 transition-all flex items-start gap-3.5 cursor-pointer group"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${opt.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-slate-900">
                    {opt.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
