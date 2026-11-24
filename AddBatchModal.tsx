import React, { useState } from 'react';
import { X, Sparkles, Plus } from 'lucide-react';
import { BatchPurchase, Tank, SpeciesCategory } from '../../types';
import { useSpeciesList } from '../../utils/speciesStorage';
import { AddSpeciesModal } from './AddSpeciesModal';

interface AddBatchModalProps {
  tanks: Tank[];
  onClose: () => void;
  onAddBatch: (batch: BatchPurchase) => void;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({
  tanks: _tanks,
  onClose,
  onAddBatch,
}) => {
  const speciesList = useSpeciesList();
  const [isAddSpeciesOpen, setIsAddSpeciesOpen] = useState(false);
  const [liveName, setLiveName] = useState('');
  const [category, setCategory] = useState<SpeciesCategory>('caridina');
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [quantityReceived, setQuantityReceived] = useState(25);
  const [totalCost, setTotalCost] = useState(2000);
  const [selectionNotes, setSelectionNotes] = useState('');
  const [isFreeInventory, setIsFreeInventory] = useState(false);
  const [manualValuationPrice, setManualValuationPrice] = useState(80);

  const effectiveCost = isFreeInventory ? 0 : totalCost;
  const unitCost = quantityReceived > 0 ? effectiveCost / quantityReceived : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveName) return;

    const newBatch: BatchPurchase = {
      id: `batch-${Date.now()}`,
      batchName: liveName,
      category,
      strain: liveName,
      supplier: supplier || (isFreeInventory ? 'Kendi Üretimimiz (Üretimhane Yavrusu)' : 'Doğrudan Üretici / İthalat'),
      purchaseDate,
      quantityReceived,
      totalCost: effectiveCost,
      unitCost,
      keptForBreeding: 0,
      markedForSale: quantityReceived,
      mortalityCount: 0,
      status: 'active_selection',
      selectionNotes,
      assignedTankId: '',
      isFreeInventory,
      manualValuationPrice: isFreeInventory ? manualValuationPrice : undefined,
    };

    onAddBatch(newBatch);
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
          <div>
            <span className="text-[11px] text-emerald-600 font-semibold tracking-wide uppercase block">
              Canlı Girişi
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Yeni Canlı Satın Alımı
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Canlı Adı *</label>
              <input
                type="text"
                required
                placeholder="Örn: Saf Kan PRL Crystal Red SS / Bloody Mary"
                value={liveName}
                onChange={(e) => setLiveName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-500 block font-medium">Canlı Türü</label>
                  <button
                    type="button"
                    onClick={() => setIsAddSpeciesOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                    title="Yeni Tür Ekle"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Yeni Tür Ekle</span>
                  </button>
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as SpeciesCategory)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                >
                  {speciesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Tedarikçi / Kaynak</label>
                <input
                  type="text"
                  placeholder="Örn: İthalat, Ahmet Bey, Takas"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 block mb-1">Alınan Canlı Adedi (Adet) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantityReceived}
                  onChange={(e) => setQuantityReceived(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              {isFreeInventory ? (
                <div>
                  <label className="text-amber-700 block mb-1 font-semibold">
                    Manuel Birim Kıymet (TL / adet) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={manualValuationPrice}
                    onChange={(e) => setManualValuationPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-amber-500/40 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    placeholder="Örn: 90"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-slate-500 block mb-1">Toplam Alış Tutarı (TL) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={totalCost}
                    onChange={(e) => setTotalCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Bedelsiz Envanter Seçeneği */}
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-500/30">
              <label className="text-amber-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFreeInventory}
                  onChange={(e) => {
                    setIsFreeInventory(e.target.checked);
                    if (e.target.checked && !supplier) {
                      setSupplier('Kendi Üretimimiz (Üretimhane Yavrusu)');
                    }
                  }}
                  className="w-4 h-4 rounded text-amber-500 bg-white border-slate-300 cursor-pointer"
                />
                <span>Bedelsiz Envanter Girişi (Kendi Yavrumuz / Hediye / Takas)</span>
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5 ml-5">
                Satın alma maliyeti oluşmaz. Satılana kadar işletme değeri manuel girilen kıymet üzerinden hesaplanır.
              </p>
            </div>

            <div>
              <label className="text-slate-500 block mb-1">Alış Tarihi</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>

            {/* Calculated unit cost */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-700">
              <span>{isFreeInventory ? 'Hesaplanan İşletme Kıymeti:' : 'Birim Alış Maliyeti:'}</span>
              <span className="font-mono font-bold text-emerald-600 text-sm">
                {isFreeInventory
                  ? `${manualValuationPrice} ₺ / canlı (Toplam: ${(manualValuationPrice * quantityReceived).toLocaleString('tr-TR')} ₺)`
                  : `${Math.round(unitCost)} ₺ / canlı`}
              </span>
            </div>

            <div>
              <label className="text-slate-500 block mb-1">Seleksiyon Notları / Açıklama</label>
              <textarea
                rows={2}
                value={selectionNotes}
                onChange={(e) => setSelectionNotes(e.target.value)}
                placeholder="Örn: Beyaz kabuk pigmenti yüksek safkan koloni."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>
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
              Canlıyı Kaydet
            </button>
          </div>
        </form>
      </div>

      <AddSpeciesModal
        isOpen={isAddSpeciesOpen}
        onClose={() => setIsAddSpeciesOpen(false)}
        onSpeciesAdded={(newId) => setCategory(newId)}
      />
    </div>
  );
};
