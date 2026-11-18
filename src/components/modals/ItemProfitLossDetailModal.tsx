import React, { useMemo, useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Wrench,
  Sparkles,
  ShoppingBag,
  Layers,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { BatchPurchase, Expense, Sale } from '../../types';
import { useSpeciesList, formatSpeciesLabel } from '../../utils/speciesStorage';
import { extractPurchaseHistory } from '../../utils/batchConsolidation';

export interface ItemProfitLossData {
  id: string;
  type: 'livestock' | 'equipment' | 'supply';
  title: string;
  category: string;
  purchaseDate: string;
  supplierOrNotes?: string;
  quantityReceived: number;
  remainingStock: number;
  unit?: string; // 'adet' | 'metre' | 'gram'
  totalCost: number;
  unitCost: number;
  totalSalesRevenue: number;
  totalSalesCount: number;
  totalSoldQuantity: number;
  netProfit: number;
  profitPercentage: number; // e.g. +35.5 or -10.0
  matchingSales: Sale[];
  rawBatch?: BatchPurchase;
  rawExpense?: Expense;
}

interface PurchaseRecordRow {
  id: string;
  date: string;
  sourceOrTitle: string;
  notes?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  isFree?: boolean;
  manualValuationPrice?: number;
  entryTypeLabel: string;
}

interface ItemProfitLossDetailModalProps {
  isOpen: boolean;
  item: ItemProfitLossData | null;
  onClose: () => void;
}

export const ItemProfitLossDetailModal: React.FC<ItemProfitLossDetailModalProps> = ({
  isOpen,
  item,
  onClose,
}) => {
  const speciesList = useSpeciesList();
  const [isPurchasesOpen, setIsPurchasesOpen] = useState(true);
  const [isSalesOpen, setIsSalesOpen] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsPurchasesOpen(true);
      setIsSalesOpen(true);
    }
  }, [isOpen, item?.id]);

  const purchaseRecords = useMemo<PurchaseRecordRow[]>(() => {
    if (!item) return [];
    const unitLabel = item.unit || (item.type === 'livestock' ? 'adet' : 'ad');

    if (item.rawBatch) {
      return extractPurchaseHistory(item.rawBatch)
        .slice()
        .sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''))
        .map((entry) => ({
          id: entry.id,
          date: entry.purchaseDate,
          sourceOrTitle:
            entry.supplier ||
            (entry.isFreeInventory ? 'Kendi Üretimimiz' : 'Belirtilmemiş Tedarikçi'),
          notes: entry.selectionNotes,
          quantity: entry.quantityReceived,
          unit: 'adet',
          unitCost: entry.unitCost,
          totalCost: entry.totalCost,
          isFree: entry.isFreeInventory,
          manualValuationPrice: entry.manualValuationPrice,
          entryTypeLabel: entry.isFreeInventory ? 'Bedelsiz Giriş' : 'Satın Alım',
        }));
    }

    if (item.rawExpense) {
      const qty =
        item.rawExpense.initialQuantity !== undefined
          ? item.rawExpense.initialQuantity
          : item.rawExpense.quantity !== undefined
          ? item.rawExpense.quantity
          : 1;
      const effectiveQty = qty > 0 ? qty : 1;
      return [
        {
          id: item.rawExpense.id,
          date: item.rawExpense.date,
          sourceOrTitle: item.rawExpense.title,
          notes: item.rawExpense.notes,
          quantity: effectiveQty,
          unit: item.rawExpense.unit || unitLabel,
          unitCost: item.rawExpense.amount / effectiveQty,
          totalCost: item.rawExpense.amount,
          isFree: item.rawExpense.amount === 0,
          entryTypeLabel: item.type === 'equipment' ? 'Demirbaş Alımı' : 'Sarf Alımı',
        },
      ];
    }

    const fallbackQty = item.quantityReceived > 0 ? item.quantityReceived : 1;
    return [
      {
        id: item.id,
        date: item.purchaseDate,
        sourceOrTitle: item.supplierOrNotes || item.title,
        quantity: fallbackQty,
        unit: unitLabel,
        unitCost: item.totalCost / fallbackQty,
        totalCost: item.totalCost,
        isFree: item.totalCost === 0,
        entryTypeLabel: 'Alım Kaydı',
      },
    ];
  }, [item]);

  if (!isOpen || !item) return null;

  const isProfitable = item.netProfit >= 0;

  const getTypeBadge = (type: ItemProfitLossData['type']) => {
    switch (type) {
      case 'livestock':
        return {
          label: 'Canlı Türü / Parti',
          icon: Sparkles,
          color: 'bg-purple-950/80 text-purple-300 border-purple-800/40',
        };
      case 'equipment':
        return {
          label: 'Demirbaş & Ekipman',
          icon: Wrench,
          color: 'bg-blue-950/80 text-blue-300 border-blue-800/40',
        };
      case 'supply':
        return {
          label: 'Sarf Malzemesi',
          icon: Package,
          color: 'bg-amber-950/80 text-amber-300 border-amber-800/40',
        };
    }
  };

  const badge = getTypeBadge(item.type);
  const BadgeIcon = badge.icon;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-safe shadow-2xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 sm:pb-4 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${badge.color}`}
            >
              <BadgeIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badge.color}`}>
                  {badge.label}
                </span>
                <span className="text-[11px] text-slate-500">
                  {item.type === 'livestock'
                    ? formatSpeciesLabel(item.category, speciesList)
                    : formatSpeciesLabel(item.category)}
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight mt-0.5 break-words">
                {item.title}
              </h2>
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

        {/* 4 Financial KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-purple-500/30">
            <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
              <span>Toplam Alış Maliyeti</span>
              <ArrowDownLeft className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono tabular-nums">
              {item.totalCost.toLocaleString('tr-TR')} ₺
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {item.type === 'livestock'
                ? `${purchaseRecords.length} alım · ${item.quantityReceived} adet · ~${Math.round(item.unitCost)} ₺/ad`
                : 'Alım harcaması'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-emerald-500/30">
            <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
              <span>Toplam Satış Geliri</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-slate-900 font-mono tabular-nums">
              +{item.totalSalesRevenue.toLocaleString('tr-TR')} ₺
            </div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">
              {item.totalSalesCount} satış işlemi · {item.totalSoldQuantity} adet satıldı
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              isProfitable
                ? 'bg-emerald-50 border-emerald-500/30'
                : 'bg-red-50 border-red-500/30'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Net Kâr / Zarar Tutarı</span>
              {isProfitable ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div
              className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${
                isProfitable ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {item.netProfit >= 0 ? '+' : ''}
              {item.netProfit.toLocaleString('tr-TR')} ₺
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {item.totalSalesRevenue > 0
                ? isProfitable
                  ? 'Kâr elde edildi'
                  : 'Maliyet henüz karşılanmadı (Zarar)'
                : 'Henüz satış yapılmadı'}
            </div>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              isProfitable
                ? 'bg-emerald-50 border-emerald-500/50'
                : 'bg-red-50 border-red-500/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-900">% Kâr / Zarar Oranı</span>
              <span className="text-[10px] font-mono font-bold text-slate-500">YÜZDE</span>
            </div>
            <div
              className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${
                isProfitable ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              %{item.profitPercentage >= 0 ? '+' : ''}
              {item.profitPercentage.toFixed(1)}
            </div>
            <div
              className={`text-[10px] font-semibold mt-0.5 ${
                isProfitable ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {item.profitPercentage >= 0 ? '✓ KÂRLI İŞLEM' : '⚠ ZARARDA / AMORTİ EDİLİYOR'}
            </div>
          </div>
        </div>

        {/* Stock & Movement Summary Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 mb-5 text-xs">
          <div className="flex items-center justify-between font-semibold text-slate-900 border-b border-slate-200 pb-2">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Ürün Stok & Envanter Bilgileri</span>
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              Son Alış Tarihi: {item.purchaseDate || '—'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
            <div>
              <span className="text-[11px] text-slate-500 block">Toplam Alınan Miktar:</span>
              <span className="font-bold font-mono text-slate-900 text-sm">
                {item.quantityReceived} {item.unit || (item.type === 'livestock' ? 'adet' : 'ad')}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block">Güncel Envanter Stoğu:</span>
              <span className="font-bold font-mono text-emerald-600 text-sm">
                {item.remainingStock} {item.unit || (item.type === 'livestock' ? 'adet' : 'ad')}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block" title="Toplam alış maliyetine göre birim alış fiyatı">
                Ort. Alış Fiyatı:
              </span>
              <span className="font-bold font-mono text-slate-800 text-sm">
                {item.type === 'livestock'
                  ? `${Math.round(item.unitCost).toLocaleString('tr-TR')} ₺ / ad`
                  : `${(item.totalCost / (item.quantityReceived || 1)).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ₺ / ${item.unit || 'ad'}`}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-indigo-700 block font-semibold" title="Toplam Alım Fiyatı ÷ Güncel Stok Sayısı">
                Ortalama Birim Maliyet:
              </span>
              <span className="font-bold font-mono text-indigo-700 text-sm">
                {item.remainingStock > 0
                  ? `${(item.totalCost / item.remainingStock).toLocaleString('tr-TR', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })} ₺ / ${item.unit || 'ad'}`
                  : '—'}
              </span>
              {item.remainingStock > 0 && (
                <span className="text-[10px] text-slate-500 block font-sans">
                  ({item.totalCost.toLocaleString('tr-TR')} ₺ ÷ {item.remainingStock} {item.unit || 'ad'})
                </span>
              )}
            </div>
          </div>

          {item.supplierOrNotes && (
            <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-200">
              <strong className="text-slate-700">Tedarikçi & Notlar:</strong> {item.supplierOrNotes}
            </div>
          )}
        </div>

        {/* Separated Collapsible Purchase & Sales History Sections */}
        <div className="space-y-4">
          {/* 1. Alış Kayıtları */}
          <div className="rounded-xl border border-purple-200 bg-slate-50/90 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsPurchasesOpen((prev) => !prev)}
              className="w-full p-3 bg-white hover:bg-white border-b border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {isPurchasesOpen ? (
                  <ChevronUp className="w-4 h-4 text-purple-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
                <ArrowDownLeft className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Alış Kayıtları (Maliyet Hareketleri)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-purple-700">
                  {purchaseRecords.length} Alış Kaydı
                </span>
                <span className="text-[11px] text-slate-500">
                  {isPurchasesOpen ? 'Gizle' : 'Göster'}
                </span>
              </div>
            </button>

            {isPurchasesOpen && (
              <>
                {/* Mobile Cards (< md) */}
                <div className="md:hidden divide-y divide-slate-200 max-h-64 overflow-y-auto">
                  {purchaseRecords.map((rec) => (
                    <div key={`m-${rec.id}`} className="p-3 space-y-1.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                rec.isFree
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {rec.entryTypeLabel}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">{rec.date || '—'}</span>
                          </div>
                          <div className="font-semibold text-slate-900">{rec.sourceOrTitle}</div>
                          {rec.notes && (
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">{rec.notes}</div>
                          )}
                        </div>
                        <div className="text-right font-mono shrink-0">
                          <div className="font-bold text-purple-700">
                            {rec.isFree ? '0 ₺' : `-${rec.totalCost.toLocaleString('tr-TR')} ₺`}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {rec.quantity} {rec.unit}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {purchaseRecords.length === 0 && (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      Bu ürüne ait alış kaydı bulunamadı.
                    </div>
                  )}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto max-h-52 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium sticky top-0">
                        <th className="py-2.5 px-3">Tarih</th>
                        <th className="py-2.5 px-3">
                          {item.type === 'livestock' ? 'Tedarikçi / Kaynak' : 'Ürün / Kaynak'}
                        </th>
                        <th className="py-2.5 px-3 text-center">Alınan Miktar</th>
                        <th className="py-2.5 px-3 text-right">Birim Alış</th>
                        <th className="py-2.5 px-3 text-right">Toplam Alış Tutarı</th>
                        <th className="py-2.5 px-3 text-center">Giriş Türü</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {purchaseRecords.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-100 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            {rec.date || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                            <div>{rec.sourceOrTitle}</div>
                            {rec.notes && (
                              <div className="text-[10px] text-slate-500 font-normal truncate max-w-xs mt-0.5">
                                {rec.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                            {rec.quantity} {rec.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {rec.isFree
                              ? rec.manualValuationPrice
                                ? `${rec.manualValuationPrice.toLocaleString('tr-TR')} ₺ (Kıymet)`
                                : '0 ₺'
                              : `${rec.unitCost.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ₺`}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-purple-700">
                            {rec.isFree
                              ? '0 ₺ (Bedelsiz)'
                              : `-${rec.totalCost.toLocaleString('tr-TR')} ₺`}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                rec.isFree
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200'
                              }`}
                            >
                              {rec.entryTypeLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {purchaseRecords.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                            Bu ürüne ait alış kaydı bulunamadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* 2. Satış Kayıtları */}
          <div className="rounded-xl border border-emerald-200 bg-slate-50/90 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsSalesOpen((prev) => !prev)}
              className="w-full p-3 bg-white hover:bg-white border-b border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {isSalesOpen ? (
                  <ChevronUp className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Satış Kayıtları (Gelir Hareketleri)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-emerald-600">
                  {item.matchingSales.length} Satış Kaydı
                </span>
                <span className="text-[11px] text-slate-500">
                  {isSalesOpen ? 'Gizle' : 'Göster'}
                </span>
              </div>
            </button>

            {isSalesOpen && (
              <>
                {/* Mobile Cards (< md) */}
                <div className="md:hidden divide-y divide-slate-200 max-h-64 overflow-y-auto">
                  {item.matchingSales.map((sale) => (
                    <div key={`m-${sale.id}`} className="p-3 space-y-1.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                sale.paymentStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {sale.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">{sale.date}</span>
                          </div>
                          <div className="font-semibold text-slate-900">
                            {sale.customerName} · <span className="text-slate-500 font-normal">{sale.city}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {sale.quantity} ad × {sale.unitSalePrice.toLocaleString('tr-TR')} ₺
                          </div>
                        </div>
                        <div className="text-right font-mono shrink-0">
                          <div className="font-bold text-emerald-600">
                            +{sale.totalPrice.toLocaleString('tr-TR')} ₺
                          </div>
                          <div className={`text-[11px] font-semibold ${sale.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            Kâr: {sale.netProfit >= 0 ? '+' : ''}{sale.netProfit.toLocaleString('tr-TR')} ₺
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {item.matchingSales.length === 0 && (
                    <div className="py-6 text-center text-slate-500 text-xs">
                      Bu üründen henüz hobici satışı gerçekleşmemiştir.
                    </div>
                  )}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto max-h-52 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium sticky top-0">
                        <th className="py-2.5 px-3">Tarih</th>
                        <th className="py-2.5 px-3">Alıcı Müşteri</th>
                        <th className="py-2.5 px-3">Şehir</th>
                        <th className="py-2.5 px-3 text-center">Satılan Adet</th>
                        <th className="py-2.5 px-3 text-right">Birim Satış</th>
                        <th className="py-2.5 px-3 text-right">Toplam Tutar</th>
                        <th className="py-2.5 px-3 text-right">Elde Edilen Kâr</th>
                        <th className="py-2.5 px-3 text-center">Ödeme</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {item.matchingSales.map((sale) => (
                        <tr key={sale.id} className="hover:bg-slate-100 transition-colors">
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{sale.date}</td>
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                            {sale.customerName}
                            {sale.customerContact && (
                              <div className="text-[10px] text-slate-500 font-mono font-normal">
                                {sale.customerContact}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-700">{sale.city}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                            {sale.quantity} ad
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700">
                            {sale.unitSalePrice.toLocaleString('tr-TR')} ₺
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            +{sale.totalPrice.toLocaleString('tr-TR')} ₺
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold">
                            <span className={sale.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {sale.netProfit >= 0 ? '+' : ''}
                              {sale.netProfit.toLocaleString('tr-TR')} ₺
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                sale.paymentStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {sale.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {item.matchingSales.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-500 font-sans">
                            Bu üründen henüz hobici satışı gerçekleşmemiştir.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
