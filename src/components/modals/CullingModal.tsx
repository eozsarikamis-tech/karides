import React, { useState } from 'react';
import { X, ShieldCheck, Tag, AlertCircle, Coins } from 'lucide-react';
import { BatchPurchase } from '../../types';

interface CullingModalProps {
  batch: BatchPurchase;
  onClose: () => void;
  onSave: (updatedBatch: BatchPurchase) => void;
}

export const CullingModal: React.FC<CullingModalProps> = ({
  batch,
  onClose,
  onSave,
}) => {
  const [kept, setKept] = useState(batch.keptForBreeding);
  const [markedForSale, setMarkedForSale] = useState(batch.markedForSale);
  const [mortality, setMortality] = useState(batch.mortalityCount);
  const [targetPrice, setTargetPrice] = useState(
    batch.targetSalePricePerUnit || Math.round(batch.unitCost * 1.25)
  );
  const [notes, setNotes] = useState(batch.selectionNotes);

  const totalAccounted = kept + markedForSale + mortality;
  const difference = batch.quantityReceived - totalAccounted;

  const potentialRevenue = markedForSale * targetPrice;
  const netForBreeder = batch.totalCost - potentialRevenue;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...batch,
      keptForBreeding: kept,
      markedForSale: markedForSale,
      mortalityCount: mortality,
      targetSalePricePerUnit: targetPrice,
      selectionNotes: notes,
      status: difference === 0 && markedForSale === 0 ? 'completed' : 'active_selection',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-safe shadow-2xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-200 gap-2">
          <div className="min-w-0">
            <span className="text-[11px] text-purple-600 font-semibold tracking-wide uppercase block">
              Seçici Islah & Ayıklama
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              {batch.batchName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4 text-xs">
          {/* Summary Banner */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[11px]">Toplam Alınan:</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {batch.quantityReceived} adet
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Toplam Ödenen:</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {batch.totalCost.toLocaleString('tr-TR')} ₺
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Alış Birim:</span>
              <span className="text-base font-bold text-blue-700 font-mono">
                {Math.round(batch.unitCost)} ₺
              </span>
            </div>
          </div>

          {/* Culling Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
              <label className="text-purple-700 font-semibold block mb-1">
                ⭐️ Kendime Ayrılan
              </label>
              <input
                type="number"
                min="0"
                max={batch.quantityReceived}
                value={kept}
                onChange={(e) => setKept(Number(e.target.value))}
                className="w-full bg-slate-50 border border-purple-200 rounded px-2.5 py-1.5 text-slate-900 font-bold font-mono text-sm"
              />
              <span className="text-[10px] text-purple-600 block mt-1">Elit Damızlık</span>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <label className="text-emerald-700 font-semibold block mb-1">
                🏷️ Satış Havuzu
              </label>
              <input
                type="number"
                min="0"
                max={batch.quantityReceived}
                value={markedForSale}
                onChange={(e) => setMarkedForSale(Number(e.target.value))}
                className="w-full bg-slate-50 border border-emerald-200 rounded px-2.5 py-1.5 text-slate-900 font-bold font-mono text-sm"
              />
              <span className="text-[10px] text-emerald-600 block mt-1">Hobiciye Satılacak</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50/70 border border-slate-200">
              <label className="text-slate-500 font-medium block mb-1">
                Adaptasyon Kaybı
              </label>
              <input
                type="number"
                min="0"
                max={batch.quantityReceived}
                value={mortality}
                onChange={(e) => setMortality(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 font-mono text-sm"
              />
              <span className="text-[10px] text-slate-500 block mt-1">Ölen / Fire</span>
            </div>
          </div>

          {difference !== 0 && (
            <div className="text-[11px] text-amber-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Henüz sınıflandırılmamış {difference > 0 ? `${difference} adet canlı var.` : `${Math.abs(difference)} adet fazla girildi.`}
              </span>
            </div>
          )}

          {/* Pricing & Amortization target */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-medium">
                Hedeflenen Hobici Satış Fiyatı (TL / adet):
              </label>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(Number(e.target.value))}
                className="w-24 bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono font-bold text-right"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Beklenen Satış Hasılatı:</span>
                <span className="font-mono text-emerald-600 font-semibold">
                  +{potentialRevenue.toLocaleString('tr-TR')} ₺
                </span>
              </div>
              <div className="flex justify-between">
                <span>{kept} Adet Damızlığın Gerçek Maliyeti:</span>
                <span className="font-mono font-bold text-slate-900">
                  {netForBreeder <= 0 ? (
                    <span className="text-emerald-600">
                      0 ₺ (Amorti Edildi) + {Math.abs(netForBreeder)} ₺ Kâr!
                    </span>
                  ) : (
                    <span>{netForBreeder.toLocaleString('tr-TR')} ₺ (Damızlık başı ~{kept > 0 ? Math.round(netForBreeder / kept) : 0} ₺)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Selection Notes */}
          <div>
            <label className="text-slate-500 block mb-1 font-medium">
              Ayıklama & Seleksiyon Kriterleri / Notlar:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Beyaz opaklığı yüksek, bacakları tam kırmızı olanlar ayrıldı. Çizgisi kırık ve soluk renkli 16 adet hobici paketine çekildi."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 text-xs"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm cursor-pointer transition-colors"
            >
              Ayıklamayı Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
