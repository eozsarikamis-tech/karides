import React, { useState } from 'react';
import { X, Sparkles, Wrench, Package, Check, Hash } from 'lucide-react';
import { BatchPurchase, Expense } from '../../types';
import { useSpeciesList, formatSpeciesLabel } from '../../utils/speciesStorage';

interface DirectStockEditModalProps {
  isOpen: boolean;
  batches: BatchPurchase[];
  expenses: Expense[];
  initialCategory?: 'livestock' | 'equipment' | 'supply';
  initialItemId?: string;
  onClose: () => void;
  onUpdateBatchStock: (batchId: string, newStock: number) => void;
  onUpdateExpenseStock: (expenseId: string, newStock: number) => void;
}

export const DirectStockEditModal: React.FC<DirectStockEditModalProps> = ({
  isOpen,
  batches,
  expenses,
  initialCategory = 'livestock',
  initialItemId,
  onClose,
  onUpdateBatchStock,
  onUpdateExpenseStock,
}) => {
  const speciesList = useSpeciesList();
  const [selectedCategory, setSelectedCategory] = useState<'livestock' | 'equipment' | 'supply'>(
    initialCategory
  );

  const activeBatches = batches.filter((b) => b.status !== 'culled');
  const equipmentExpenses = expenses.filter((e) => e.category === 'equipment');
  const supplyExpenses = expenses.filter((e) => e.category !== 'equipment');

  // Species filtering within modal
  const [selectedSpeciesFilter, setSelectedSpeciesFilter] = useState<string>('all');

  const distinctSpeciesList = React.useMemo(() => {
    const set = new Set<string>();
    activeBatches.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [activeBatches]);

  const displayedBatches = React.useMemo(() => {
    if (selectedSpeciesFilter === 'all') return activeBatches;
    return activeBatches.filter(
      (b) => (b.category || '').toLowerCase() === selectedSpeciesFilter.toLowerCase()
    );
  }, [activeBatches, selectedSpeciesFilter]);

  const defaultId = initialItemId || (
    selectedCategory === 'livestock'
      ? activeBatches[0]?.id
      : selectedCategory === 'equipment'
      ? equipmentExpenses[0]?.id
      : supplyExpenses[0]?.id
  );

  const [selectedId, setSelectedId] = useState<string>(defaultId || '');

  // Find currently selected item
  const selectedBatch = selectedCategory === 'livestock' ? activeBatches.find((b) => b.id === selectedId) : null;
  const selectedExpense =
    selectedCategory !== 'livestock'
      ? expenses.find((e) => e.id === selectedId)
      : null;

  const getCurrentStock = () => {
    if (selectedCategory === 'livestock' && selectedBatch) {
      if (selectedBatch.manualStockCount !== undefined) return selectedBatch.manualStockCount;
      return Math.max(0, selectedBatch.quantityReceived - (selectedBatch.mortalityCount || 0));
    }
    if (selectedExpense) {
      if (selectedExpense.quantity !== undefined) return selectedExpense.quantity;
      return selectedExpense.inStock !== false ? 1 : 0;
    }
    return 0;
  };

  const currentStock = getCurrentStock();
  const [newStockInput, setNewStockInput] = useState<string>(String(currentStock));

  // Sync state whenever modal opens or props change
  React.useEffect(() => {
    if (isOpen) {
      const cat = initialCategory || 'livestock';
      setSelectedCategory(cat);
      const targetId =
        initialItemId ||
        (cat === 'livestock'
          ? activeBatches[0]?.id
          : cat === 'equipment'
          ? equipmentExpenses[0]?.id
          : supplyExpenses[0]?.id);

      if (targetId) {
        setSelectedId(targetId);
        if (cat === 'livestock') {
          const b = activeBatches.find((item) => item.id === targetId);
          if (b?.category) {
            setSelectedSpeciesFilter(b.category);
          } else {
            setSelectedSpeciesFilter('all');
          }
          const stock =
            b?.manualStockCount !== undefined
              ? b.manualStockCount
              : Math.max(0, (b?.quantityReceived || 0) - (b?.mortalityCount || 0));
          setNewStockInput(String(stock));
        } else {
          const exp = expenses.find((e) => e.id === targetId);
          const stock =
            exp?.quantity !== undefined
              ? exp.quantity
              : exp?.inStock !== false
              ? 1
              : 0;
          setNewStockInput(String(stock));
        }
      }
    }
  }, [isOpen, initialCategory, initialItemId]);

  // Sync input when item changes
  const handleItemSelect = (id: string) => {
    setSelectedId(id);
    if (selectedCategory === 'livestock') {
      const b = activeBatches.find((item) => item.id === id);
      const stock = b?.manualStockCount !== undefined
        ? b.manualStockCount
        : Math.max(0, (b?.quantityReceived || 0) - (b?.mortalityCount || 0));
      setNewStockInput(String(stock));
    } else {
      const exp = expenses.find((e) => e.id === id);
      const stock = exp?.quantity !== undefined ? exp.quantity : (exp?.inStock !== false ? 1 : 0);
      setNewStockInput(String(stock));
    }
  };

  const handleCategorySwitch = (cat: 'livestock' | 'equipment' | 'supply') => {
    setSelectedCategory(cat);
    if (cat === 'livestock') {
      setSelectedSpeciesFilter('all');
    }
    const firstId =
      cat === 'livestock'
        ? activeBatches[0]?.id
        : cat === 'equipment'
        ? equipmentExpenses[0]?.id
        : supplyExpenses[0]?.id;
    if (firstId) {
      handleItemSelect(firstId);
    } else {
      setSelectedId('');
      setNewStockInput('0');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(newStockInput, 10);
    if (isNaN(count) || count < 0) return;

    if (selectedCategory === 'livestock' && selectedId) {
      onUpdateBatchStock(selectedId, count);
    } else if (selectedId) {
      onUpdateExpenseStock(selectedId, count);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-safe shadow-2xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-200 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-500/40 flex items-center justify-center text-emerald-600 shrink-0">
              <Hash className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Manuel Stok Adedi Güncelle
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Canlı, demirbaş veya sarf malzemenizin güncel stok sayısını doğrudan yazın.
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Category Selector Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleCategorySwitch('livestock')}
              className={`flex items-center justify-center gap-1 py-2.5 px-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer truncate ${
                selectedCategory === 'livestock'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
              <span className="truncate">🐟 Canlı</span>
            </button>

            <button
              type="button"
              onClick={() => handleCategorySwitch('equipment')}
              className={`flex items-center justify-center gap-1 py-2.5 px-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer truncate ${
                selectedCategory === 'equipment'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
              <span className="truncate">⚙️ Demirbaş</span>
            </button>

            <button
              type="button"
              onClick={() => handleCategorySwitch('supply')}
              className={`flex items-center justify-center gap-1 py-2.5 px-2 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer truncate ${
                selectedCategory === 'supply'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
              <span className="truncate">📦 Sarf</span>
            </button>
          </div>

          {/* Item Selector Dropdown */}
          <div className="space-y-2">
            {selectedCategory === 'livestock' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Tür / Koloni Grubuna Göre Filtrele (Klik ile Grup Seç):
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedSpeciesFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedSpeciesFilter === 'all'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    Tüm Türler ({activeBatches.length})
                  </button>
                  {distinctSpeciesList.map((spec) => {
                    const isSel = selectedSpeciesFilter.toLowerCase() === spec.toLowerCase();
                    const count = activeBatches.filter(
                      (b) => (b.category || '').toLowerCase() === spec.toLowerCase()
                    ).length;
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => {
                          setSelectedSpeciesFilter(spec);
                          const firstInGroup = activeBatches.find(
                            (b) => (b.category || '').toLowerCase() === spec.toLowerCase()
                          );
                          if (firstInGroup) handleItemSelect(firstInGroup.id);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                          isSel
                            ? 'bg-purple-50 text-purple-700 border-purple-500 shadow-sm'
                            : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200'
                        }`}
                      >
                        <span>{formatSpeciesLabel(spec, speciesList)}</span>
                        <span className="text-[10px] font-mono text-purple-700">({count})</span>
                        {isSel && <Check className="w-3 h-3 text-purple-700" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {selectedCategory === 'livestock'
                  ? 'Stok Sayısı Güncellenecek Canlı Varyetesi:'
                  : selectedCategory === 'equipment'
                  ? 'Stok Sayısı Güncellenecek Demirbaş Donanım:'
                  : 'Stok Sayısı Güncellenecek Sarf Malzemesi:'}
              </label>
              <select
                value={selectedId}
                onChange={(e) => handleItemSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500"
              >
                {selectedCategory === 'livestock' &&
                  displayedBatches.map((b) => {
                    const st =
                      b.manualStockCount !== undefined
                        ? b.manualStockCount
                        : Math.max(0, b.quantityReceived - (b.mortalityCount || 0));
                    return (
                      <option key={b.id} value={b.id}>
                        [{b.category ? formatSpeciesLabel(b.category, speciesList) : 'Canlı'}] {b.strain || b.batchName} — [Şu anki Stok: {st} adet]
                      </option>
                    );
                  })}

              {selectedCategory === 'equipment' &&
                equipmentExpenses.map((eq) => {
                  const st = eq.quantity !== undefined ? eq.quantity : (eq.inStock !== false ? 1 : 0);
                  const u = eq.unit || 'adet';
                  return (
                    <option key={eq.id} value={eq.id}>
                      {eq.title} — [Şu anki Stok: {st} {u}]
                    </option>
                  );
                })}

              {selectedCategory === 'supply' &&
                supplyExpenses.map((sf) => {
                  const st = sf.quantity !== undefined ? sf.quantity : (sf.inStock !== false ? 1 : 0);
                  const u = sf.unit || 'adet';
                  return (
                    <option key={sf.id} value={sf.id}>
                      {sf.title} — [Şu anki Stok: {st} {u}]
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Current vs New Quantity Input Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
              <span className="text-slate-500">Şu Anki Kayıtlı Stok:</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {currentStock} {selectedCategory === 'livestock' ? 'adet' : (selectedExpense?.unit || 'adet')}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-600 mb-1.5">
                Yeni Stok Adedini Yazın (Doğrudan Manuel):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={newStockInput}
                  onChange={(e) => setNewStockInput(e.target.value)}
                  placeholder="Örn: 25"
                  className="w-full px-3.5 py-2.5 text-base font-mono font-bold bg-white border border-emerald-500/50 rounded-xl text-slate-900 placeholder-slate-600 focus:outline-none focus:border-emerald-400 pr-20"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-emerald-700 font-semibold capitalize">
                  {selectedCategory === 'livestock' ? 'adet' : (selectedExpense?.unit || 'adet')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Stok sayısını 0 yazarsanız ürün otomatik olarak <strong>Tükenenler</strong> başlığına aktarılır. 0&apos;dan büyük bir sayı yazdığınızda anında <strong>Mevcut Stoklar</strong> listesinde güncellenir.
              </p>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500">Hızlı Değer:</span>
            {(() => {
              const u = selectedCategory === 'livestock' ? 'adet' : (selectedExpense?.unit || 'adet');
              const presets =
                u === 'gram'
                  ? [0, 50, 100, 200, 250, 500, 1000]
                  : u === 'metre'
                  ? [0, 2, 5, 10, 15, 25, 50]
                  : [0, 1, 2, 5, 10, 20, 50];
              return presets.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setNewStockInput(String(num))}
                  className="px-3 py-1.5 min-h-[36px] min-w-[40px] text-xs font-mono rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {num}
                </button>
              ));
            })()}
          </div>

          {/* Footer actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all shadow-md shadow-emerald-200/60 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Yeni Stoğu Kaydet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
