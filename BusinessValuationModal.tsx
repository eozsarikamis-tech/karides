import React, { useState } from 'react';
import {
  X,
  Building2,
  Coins,
  Sparkles,
  Wrench,
  Package,
  Layers,
  Edit3,
  Check,
  Info,
  Plus,
} from 'lucide-react';
import { BatchPurchase, Expense, Sale } from '../../types';
import { calculateBusinessValuation } from '../../utils/storage';

interface BusinessValuationModalProps {
  batches: BatchPurchase[];
  sales: Sale[];
  expenses: Expense[];
  onClose: () => void;
  onUpdateBatch: (batch: BatchPurchase) => void;
  onOpenAddBatch?: () => void;
  onOpenAddExpense?: () => void;
  onInspectBatch?: (batch: BatchPurchase) => void;
}

export const BusinessValuationModal: React.FC<BusinessValuationModalProps> = ({
  batches,
  sales,
  expenses,
  onClose,
  onUpdateBatch,
  onOpenAddBatch,
  onOpenAddExpense,
  onInspectBatch,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'livestock' | 'equipment' | 'supplies'>('all');
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editPriceInput, setEditPriceInput] = useState<string>('');

  const valuation = calculateBusinessValuation(batches, sales, expenses);

  const equipmentExpenses = expenses.filter((e) => e.category === 'equipment');
  const suppliesExpenses = expenses.filter((e) => e.category !== 'equipment');

  const startEditManualPrice = (batchId: string, currentVal: number) => {
    setEditingBatchId(batchId);
    setEditPriceInput(currentVal.toString());
  };

  const saveManualPrice = (batch: BatchPurchase) => {
    const val = parseFloat(editPriceInput);
    if (!isNaN(val) && val >= 0) {
      onUpdateBatch({
        ...batch,
        manualValuationPrice: val,
      });
    }
    setEditingBatchId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-2xl p-4 sm:p-7 pb-safe max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 sm:pb-4 border-b border-slate-200 shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-amber-600 font-semibold tracking-wide uppercase block">
                İşletme Değerleme & Envanter Bilançosu
              </span>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                Üretimhane İşletme Değeri
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 mt-4 space-y-5">
          {/* 4 Cards Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Total Valuation */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900 border border-amber-500/30">
              <span className="text-[11px] text-amber-600/90 font-medium block">
                Toplam İşletme Değeri
              </span>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 text-amber-700">
                {valuation.totalBusinessValuation.toLocaleString('tr-TR')} ₺
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">
                Canlı + Demirbaş + Sarf
              </span>
            </div>

            {/* Livestock */}
            <div className="p-4 rounded-xl bg-slate-50/90 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-purple-700 font-medium">Mevcut Canlılar</span>
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1 text-purple-700">
                {valuation.totalLivestockValuation.toLocaleString('tr-TR')} ₺
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">
                {valuation.totalLivestockCount} adet canlı stokta
              </span>
            </div>

            {/* Equipment / Demirbaşlar */}
            <div className="p-4 rounded-xl bg-slate-50/90 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-blue-700 font-medium">Demirbaşlar</span>
                <Wrench className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1 text-blue-700">
                {valuation.totalEquipmentValuation.toLocaleString('tr-TR')} ₺
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">
                {equipmentExpenses.length} kalem alım değeri
              </span>
            </div>

            {/* Supplies / Sarflar */}
            <div className="p-4 rounded-xl bg-slate-50/90 border border-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-700 font-medium">Sarf Malzemeler</span>
                <Package className="w-3.5 h-3.5 text-slate-500" />
              </div>
              <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1 text-slate-800">
                {valuation.totalSuppliesValuation.toLocaleString('tr-TR')} ₺
              </div>
              <span className="text-[11px] text-slate-500 block mt-1">
                Yem, mineral & ambalaj
              </span>
            </div>
          </div>

          {/* Business Valuation Rules Explainer Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-semibold text-slate-800 mb-1.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>İşletme Değeri Hesaplama & Değerleme Kuralları</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-500 mt-2">
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-600 font-bold">•</span>
                <span>
                  <strong className="text-slate-800">Satılan Canlılar:</strong> Son satış fiyatından{' '}
                  <strong className="text-emerald-700">%10 iskonto</strong> düşülerek kalan stokla çarpılır.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-blue-600 font-bold">•</span>
                <span>
                  <strong className="text-slate-800">Alınmış / Satılmamış Canlılar:</strong> Doğrudan{' '}
                  <strong className="text-blue-700">alış maliyeti</strong> üzerinden hesaplanır.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-purple-600 font-bold">•</span>
                <span>
                  <strong className="text-slate-800">Bedelsiz / Yavru Canlılar:</strong> Satıldıysa{' '}
                  <strong className="text-purple-700">satış fiyatı</strong>, satılmadıysa{' '}
                  <strong className="text-amber-700">manuel girilen kıymet</strong> esas alınır.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-slate-500 font-bold">•</span>
                <span>
                  <strong className="text-slate-800">Demirbaş & Sarflar:</strong> Alınan ekipman ve malzemelerin{' '}
                  <strong className="text-slate-700">alım değeri</strong> doğrudan eklenir.
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-2 min-h-[38px] text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-amber-500/20 text-amber-700 border border-amber-500/40'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Tüm Envanter
              </button>
              <button
                onClick={() => setActiveTab('livestock')}
                className={`px-3 py-2 min-h-[38px] text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'livestock'
                    ? 'bg-purple-500/20 text-purple-700 border border-purple-500/40'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Canlılar ({valuation.totalLivestockCount})
              </button>
              <button
                onClick={() => setActiveTab('equipment')}
                className={`px-3 py-2 min-h-[38px] text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'equipment'
                    ? 'bg-blue-500/20 text-blue-700 border border-blue-500/40'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Demirbaşlar ({equipmentExpenses.length})
              </button>
              <button
                onClick={() => setActiveTab('supplies')}
                className={`px-3 py-2 min-h-[38px] text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'supplies'
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Sarflar ({suppliesExpenses.length})
              </button>
            </div>

            {onOpenAddBatch && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAddBatch();
                }}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 min-h-[38px] cursor-pointer transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Yeni Canlı / Bedelsiz Ekle</span>
              </button>
            )}
          </div>

          {/* Section: Live Stock Valuation Table */}
          {(activeTab === 'all' || activeTab === 'livestock') && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Mevcut Canlı Stokları Değerlemesi</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  Toplam Canlı Değeri:{' '}
                  <strong className="text-purple-700 font-mono">
                    {valuation.totalLivestockValuation.toLocaleString('tr-TR')} ₺
                  </strong>
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {/* Mobile Cards (< md) */}
                <div className="md:hidden divide-y divide-slate-200">
                  {valuation.liveItems.map((item) => {
                    const batch = batches.find((b) => b.id === item.batchId);
                    const isEditing = editingBatchId === item.batchId;
                    return (
                      <div
                        key={`m-${item.batchId}`}
                        onClick={() => {
                          if (batch && onInspectBatch && !isEditing) {
                            onInspectBatch(batch);
                          }
                        }}
                        className={`p-3.5 space-y-2 ${batch && onInspectBatch && !isEditing ? 'active:bg-slate-100 cursor-pointer' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-slate-900">{item.batchName}</div>
                            <div className="text-[11px] text-slate-500">{item.strain}</div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              {item.isFreeInventory
                                ? 'Bedelsiz / Kendi Yavrumuz'
                                : `Alış: ${item.unitCost.toLocaleString('tr-TR')} ₺/ad`}
                              {' · '}
                              <span className="text-slate-800 font-mono">{item.remainingStock} adet</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-sm text-emerald-700">
                              {item.totalValuation.toLocaleString('tr-TR')} ₺
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {item.unitValuation.toLocaleString('tr-TR')} ₺ / ad
                            </div>
                          </div>
                        </div>

                        <div
                          className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] text-slate-500">
                            {item.valuationMethod === 'sale_discount' && `Son Satış (${item.lastSalePrice} ₺ - %10)`}
                            {item.valuationMethod === 'purchase_cost' && 'Alış Maliyeti'}
                            {item.valuationMethod === 'free_at_sale_price' && `Bedelsiz (${item.lastSalePrice} ₺)`}
                            {item.valuationMethod === 'manual_valuation' && 'Bedelsiz (Manuel Kıymet)'}
                          </span>
                          {isEditing && batch ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                step="5"
                                value={editPriceInput}
                                onChange={(e) => setEditPriceInput(e.target.value)}
                                className="w-20 px-2 py-1.5 bg-slate-50 border border-amber-500/60 rounded-lg text-right text-slate-900 font-mono text-xs focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => saveManualPrice(batch)}
                                className="px-3 py-1.5 min-h-[36px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Kaydet</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditManualPrice(item.batchId, item.unitValuation)}
                              className="px-2.5 py-1.5 min-h-[36px] text-slate-700 hover:text-amber-700 bg-slate-100 hover:bg-slate-100 rounded-lg text-xs inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Kıymet Düzenle</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                      <tr>
                        <th className="py-2.5 px-3">Parti / Canlı Grubu</th>
                        <th className="py-2.5 px-3">Envanter Türü</th>
                        <th className="py-2.5 px-3 text-right">Kalan Stok</th>
                        <th className="py-2.5 px-3">Değerleme Metodu</th>
                        <th className="py-2.5 px-3 text-right">Birim Kıymet</th>
                        <th className="py-2.5 px-3 text-right">Toplam Değer</th>
                        <th className="py-2.5 px-3 text-center">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {valuation.liveItems.map((item) => {
                        const batch = batches.find((b) => b.id === item.batchId);
                        const isEditing = editingBatchId === item.batchId;

                        return (
                          <tr
                            key={item.batchId}
                            onClick={() => {
                              if (batch && onInspectBatch && !isEditing) {
                                onInspectBatch(batch);
                              }
                            }}
                            className={`hover:bg-slate-100 transition-colors ${
                              batch && onInspectBatch && !isEditing ? 'cursor-pointer' : ''
                            }`}
                            title={batch && onInspectBatch ? 'Envanter detay, alış ve satış kayıtlarını görüntülemek için tıklayın' : undefined}
                          >
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900 font-sans">{item.batchName}</div>
                              <div className="text-[11px] text-slate-500 font-sans">{item.strain}</div>
                            </td>
                            <td className="py-3 px-3 font-sans">
                              {item.isFreeInventory ? (
                                <span className="text-amber-600 font-medium text-[11px]">
                                  Bedelsiz / Kendi Yavrumuz
                                </span>
                              ) : (
                                <span className="text-slate-700 text-[11px]">
                                  Satın Alındı ({item.unitCost.toLocaleString('tr-TR')} ₺/ad)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className="text-slate-900 font-bold">{item.remainingStock}</span>
                              <span className="text-slate-500 font-sans text-[11px] ml-1">adet</span>
                            </td>
                            <td className="py-3 px-3 font-sans">
                              {item.valuationMethod === 'sale_discount' && (
                                <span className="text-emerald-600 text-[11px] font-medium block">
                                  Son Satış ({item.lastSalePrice} ₺ - %10)
                                </span>
                              )}
                              {item.valuationMethod === 'purchase_cost' && (
                                <span className="text-blue-600 text-[11px] font-medium block">
                                  Alış Maliyeti (Satış Yok)
                                </span>
                              )}
                              {item.valuationMethod === 'free_at_sale_price' && (
                                <span className="text-purple-600 text-[11px] font-medium block">
                                  Bedelsiz (Son Satış Fiyatı: {item.lastSalePrice} ₺)
                                </span>
                              )}
                              {item.valuationMethod === 'manual_valuation' && (
                                <span className="text-amber-600 text-[11px] font-medium block">
                                  Bedelsiz (Manuel Kıymet)
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="5"
                                    value={editPriceInput}
                                    onChange={(e) => setEditPriceInput(e.target.value)}
                                    className="w-20 px-2 py-0.5 bg-slate-50 border border-amber-500/60 rounded text-right text-slate-900 font-mono text-xs focus:outline-none"
                                  />
                                  <span className="text-slate-500 text-[11px]">₺</span>
                                </div>
                              ) : (
                                <span className="text-slate-800 font-semibold">
                                  {item.unitValuation.toLocaleString('tr-TR')} ₺
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <span className="text-emerald-700 font-bold text-sm">
                                {item.totalValuation.toLocaleString('tr-TR')} ₺
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-sans" onClick={(e) => e.stopPropagation()}>
                              {isEditing && batch ? (
                                <button
                                  onClick={() => saveManualPrice(batch)}
                                  className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] flex items-center gap-1 mx-auto cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Kaydet</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => startEditManualPrice(item.batchId, item.unitValuation)}
                                  title="Manuel Kıymet Belirle / Düzenle"
                                  className="px-2 py-1 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded text-[11px] flex items-center gap-1 mx-auto cursor-pointer transition-colors"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Kıymet Düzenle</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Section: Equipment / Demirbaşlar Table */}
          {(activeTab === 'all' || activeTab === 'equipment') && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-blue-600" />
                  <span>Demirbaş & Donanım Envanteri (Alım Değeri)</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  Toplam Demirbaş Değeri:{' '}
                  <strong className="text-blue-700 font-mono">
                    {valuation.totalEquipmentValuation.toLocaleString('tr-TR')} ₺
                  </strong>
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {/* Mobile Cards (< md) */}
                <div className="md:hidden divide-y divide-slate-200">
                  {equipmentExpenses.map((exp) => (
                    <div key={`m-${exp.id}`} className="p-3 flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="text-[11px] font-mono text-slate-500 block">{exp.date}</span>
                        <div className="font-semibold text-slate-900">{exp.title}</div>
                        {exp.notes && <div className="text-[11px] text-slate-500 truncate mt-0.5">{exp.notes}</div>}
                      </div>
                      <span className="font-mono font-bold text-blue-700 shrink-0">
                        {exp.amount.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  ))}
                </div>
                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                      <tr>
                        <th className="py-2.5 px-3">Tarih</th>
                        <th className="py-2.5 px-3">Demirbaş Başlığı</th>
                        <th className="py-2.5 px-3">Açıklama / Not</th>
                        <th className="py-2.5 px-3 text-right">Alım Değeri</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {equipmentExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-100 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500">{exp.date}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 font-sans">
                            {exp.title}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-sans text-[11px]">
                            {exp.notes || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                            {exp.amount.toLocaleString('tr-TR')} ₺
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Section: Supplies / Sarflar Table */}
          {(activeTab === 'all' || activeTab === 'supplies') && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sarf Malzemeler (Alım Değeri)</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  Toplam Sarf Değeri:{' '}
                  <strong className="text-slate-700 font-mono">
                    {valuation.totalSuppliesValuation.toLocaleString('tr-TR')} ₺
                  </strong>
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {/* Mobile Cards (< md) */}
                <div className="md:hidden divide-y divide-slate-200">
                  {suppliesExpenses.map((exp) => (
                    <div key={`m-${exp.id}`} className="p-3 flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase text-slate-500 font-semibold">{exp.category}</span>
                          <span className="text-[11px] font-mono text-slate-500">{exp.date}</span>
                        </div>
                        <div className="font-semibold text-slate-900">{exp.title}</div>
                      </div>
                      <span className="font-mono font-bold text-slate-700 shrink-0">
                        {exp.amount.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  ))}
                </div>
                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-medium">
                      <tr>
                        <th className="py-2.5 px-3">Tarih</th>
                        <th className="py-2.5 px-3">Sarf Kalemi</th>
                        <th className="py-2.5 px-3">Kategori</th>
                        <th className="py-2.5 px-3 text-right">Alım Değeri</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {suppliesExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-100 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500">{exp.date}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 font-sans">
                            {exp.title}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-sans text-[11px] uppercase">
                            {exp.category}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                            {exp.amount.toLocaleString('tr-TR')} ₺
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3.5 sm:pt-4 mt-3.5 sm:mt-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Toplam Bilanço:</span>
            <span className="text-amber-700 font-bold font-mono">
              {valuation.totalBusinessValuation.toLocaleString('tr-TR')} ₺
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
