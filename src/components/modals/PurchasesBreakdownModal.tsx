import React, { useState } from 'react';
import {
  X,
  Wallet,
  Sparkles,
  Layers,
  Wrench,
  Receipt,
  Plus,
  ArrowRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import { BatchPurchase, Expense } from '../../types';
import { useSpeciesList, formatSpeciesLabel } from '../../utils/speciesStorage';

interface PurchasesBreakdownModalProps {
  batches: BatchPurchase[];
  expenses: Expense[];
  onClose: () => void;
  onOpenAddExpense: () => void;
  onOpenAddBatch: () => void;
  onInspectBatch?: (batch: BatchPurchase) => void;
}

export const PurchasesBreakdownModal: React.FC<PurchasesBreakdownModalProps> = ({
  batches,
  expenses,
  onClose,
  onOpenAddExpense,
  onOpenAddBatch,
  onInspectBatch,
}) => {
  const speciesList = useSpeciesList();
  const [filterType, setFilterType] = useState<'all' | 'equipment' | 'livestock' | 'supplies'>('all');

  const totalLivestock = batches.reduce((acc, b) => acc + b.totalCost, 0);
  const totalEquipment = expenses
    .filter((e) => e.category === 'equipment')
    .reduce((acc, e) => acc + e.amount, 0);
  const totalSupplies = expenses
    .filter((e) => e.category !== 'equipment')
    .reduce((acc, e) => acc + e.amount, 0);
  const totalCombined = totalLivestock + totalEquipment + totalSupplies;

  const livestockPct = totalCombined > 0 ? Math.round((totalLivestock / totalCombined) * 100) : 0;
  const equipmentPct = totalCombined > 0 ? Math.round((totalEquipment / totalCombined) * 100) : 0;
  const suppliesPct = totalCombined > 0 ? Math.round((totalSupplies / totalCombined) * 100) : 0;

  // Unified list of purchases
  interface PurchaseItem {
    id: string;
    date: string;
    title: string;
    categoryGroup: 'livestock' | 'equipment' | 'supplies';
    categoryLabel: string;
    amount: number;
    details: string;
  }

  const items: PurchaseItem[] = [
    // Livestock batches
    ...batches.map((b) => ({
      id: b.id,
      date: b.purchaseDate,
      title: b.batchName,
      categoryGroup: 'livestock' as const,
      categoryLabel: `Canlı Alımı (${formatSpeciesLabel(b.category, speciesList)})`,
      amount: b.totalCost,
      details: `${b.quantityReceived} adet canlı (${Math.round(b.unitCost)} ₺/adet) · ${b.supplier}`,
    })),
    // Equipment & expenses
    ...expenses.map((e) => ({
      id: e.id,
      date: e.date,
      title: e.title,
      categoryGroup: e.category === 'equipment' ? ('equipment' as const) : ('supplies' as const),
      categoryLabel:
        e.category === 'equipment'
          ? 'Demirbaş & Donanım'
          : e.category === 'minerals'
          ? 'RO Su & Mineral'
          : e.category === 'feed'
          ? 'Yem & Canlı Artemia'
          : e.category === 'packaging'
          ? 'Strafor Kargo & İzolasyon'
          : 'İşletme Gideri',
      amount: e.amount,
      details: e.notes || 'İşletme faturası / malzeme alımı',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    return item.categoryGroup === filterType;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-safe shadow-2xl flex flex-col max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-200 shrink-0 gap-2">
          <div className="min-w-0">
            <span className="text-[11px] text-blue-600 font-semibold tracking-wide uppercase block">
              Genişletilmiş Finansal Döküm
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              Toplam Satın Alımlar & Demirbaş Yatırımları
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

        {/* 4-Column KPI Summary Strip */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 block mb-0.5">Toplam Satın Alım</span>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {totalCombined.toLocaleString('tr-TR')} ₺
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">Tüm üretimhane yatırımı</span>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200">
            <span className="text-[11px] text-purple-700 block mb-0.5">Canlı Alımları</span>
            <div className="text-xl font-bold text-purple-700 font-mono tabular-nums">
              {totalLivestock.toLocaleString('tr-TR')} ₺
            </div>
            <span className="text-[10px] text-purple-600/80 block mt-0.5">%{livestockPct} pay</span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
            <span className="text-[11px] text-blue-700 block mb-0.5">Demirbaşlar</span>
            <div className="text-xl font-bold text-blue-700 font-mono tabular-nums">
              {totalEquipment.toLocaleString('tr-TR')} ₺
            </div>
            <span className="text-[10px] text-blue-600/80 block mt-0.5">
              Hava mot., LED, hortum (%{equipmentPct})
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-[11px] text-amber-700 block mb-0.5">Yem, Mineral & Sarf</span>
            <div className="text-xl font-bold text-amber-700 font-mono tabular-nums">
              {totalSupplies.toLocaleString('tr-TR')} ₺
            </div>
            <span className="text-[10px] text-amber-600/80 block mt-0.5">
              GH+, Artemia, Strafor (%{suppliesPct})
            </span>
          </div>
        </div>

        {/* Visual Stacked Progress Bar */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50/90 border border-slate-200 shrink-0 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-700">
            <span className="font-semibold text-slate-700">Yatırım Sermayesi Dağılımı:</span>
            <span className="text-[11px] text-slate-500 font-mono">
              %{livestockPct} Canlı · %{equipmentPct} Demirbaş · %{suppliesPct} Sarf Malzeme
            </span>
          </div>

          <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
            <div
              title={`Canlı Alımları: ${totalLivestock.toLocaleString('tr-TR')} ₺ (%${livestockPct})`}
              style={{ width: `${livestockPct}%` }}
              className="bg-purple-500 h-full"
            />
            <div
              title={`Demirbaşlar: ${totalEquipment.toLocaleString('tr-TR')} ₺ (%${equipmentPct})`}
              style={{ width: `${equipmentPct}%` }}
              className="bg-blue-500 h-full"
            />
            <div
              title={`Yem & Sarflar: ${totalSupplies.toLocaleString('tr-TR')} ₺ (%${suppliesPct})`}
              style={{ width: `${suppliesPct}%` }}
              className="bg-amber-500 h-full"
            />
          </div>
        </div>

        {/* Filter Segmented Controls */}
        <div className="mt-4 flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl shrink-0 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'all', label: `Tüm Satın Alımlar (${items.length})` },
              { id: 'equipment', label: `Demirbaşlar (${expenses.filter((e) => e.category === 'equipment').length})` },
              { id: 'livestock', label: `Canlı Partileri (${batches.length})` },
              { id: 'supplies', label: `Yem & Sarf Malzeme (${expenses.filter((e) => e.category !== 'equipment').length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-2 min-h-[38px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterType === tab.id
                  ? 'bg-slate-100 text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Purchases List */}
        <div className="mt-3 flex-1 overflow-y-auto divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50/70">
          {filteredItems.map((item) => {
            const matchedBatch =
              item.categoryGroup === 'livestock'
                ? batches.find((b) => b.id === item.id)
                : undefined;
            return (
            <div
              key={item.id}
              onClick={() => {
                if (matchedBatch && onInspectBatch) {
                  onInspectBatch(matchedBatch);
                }
              }}
              className={`p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-white transition-colors ${
                matchedBatch && onInspectBatch ? 'cursor-pointer' : ''
              }`}
              title={matchedBatch && onInspectBatch ? 'Envanter detay, alış ve satış kayıtlarını görüntülemek için tıklayın' : undefined}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-medium border whitespace-nowrap ${
                      item.categoryGroup === 'livestock'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : item.categoryGroup === 'equipment'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {item.categoryLabel}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">{item.date}</span>
                </div>
                <h4 className="font-semibold text-slate-900 truncate text-xs">{item.title}</h4>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.details}</p>
              </div>

              <div className="text-right shrink-0">
                <div className="text-sm font-bold font-mono tabular-nums text-red-600">
                  -{item.amount.toLocaleString('tr-TR')} ₺
                </div>
              </div>
            </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-500">
              Bu kategoride kayıtlı satın alım bulunamadı.
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="mt-4 pt-3.5 sm:pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Hava motoru, armatür ve sarf malzemeleri amortisman hesabına dahildir.</span>
          </div>

          <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAddExpense();
              }}
              className="px-4 py-2.5 min-h-[44px] text-xs font-semibold text-blue-700 hover:text-slate-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
            >
              + Yeni Demirbaş Al
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAddBatch();
              }}
              className="px-4 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              + Yeni Canlı Partisi Al
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
