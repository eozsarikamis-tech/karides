import React, { useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  ShoppingBag,
  Tag,
  Droplets,
  Calendar,
  Layers,
  Upload,
} from 'lucide-react';
import { BatchPurchase, Sale, Tank, LiveStockValuationItem } from '../../types';
import { findMatchingBatchForSale } from '../../utils/batchConsolidation';

export interface SpeciesGroupDetailData {
  key: string;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeClass: string;
  emptyBadgeClass?: string;
  imageSrc?: string;
  imageAlt?: string;
  gradientClass?: string;
  batches: BatchPurchase[];
  sales: Sale[];
  tanks: Tank[];
  liveItems: LiveStockValuationItem[];
}

interface SpeciesGroupDetailModalProps {
  group: SpeciesGroupDetailData;
  onClose: () => void;
  onInspectBatch?: (batch: BatchPurchase) => void;
  onUploadImage?: (groupKey: string, file: File) => void | Promise<void>;
  onRemoveImage?: (groupKey: string) => void;
}

function formatTL(val: number, decimals = 0): string {
  return val.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function formatProfitPct(pct: number): string {
  const rounded = Math.round(pct * 10) / 10;
  if (rounded > 0) return `+%${rounded.toLocaleString('tr-TR')}`;
  if (rounded < 0) return `-%${Math.abs(rounded).toLocaleString('tr-TR')}`;
  return '%0';
}

function getProfitClass(pct: number): string {
  if (pct > 0.05) return 'text-emerald-600';
  if (pct < -0.05) return 'text-rose-600';
  return 'text-slate-600';
}

export const SpeciesGroupDetailModal: React.FC<SpeciesGroupDetailModalProps> = ({
  group,
  onClose,
  onInspectBatch,
  onUploadImage,
  onRemoveImage,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const liveItemMap = new Map<string, LiveStockValuationItem>();
  group.liveItems.forEach((item) => liveItemMap.set(item.batchId, item));

  const tankMap = new Map<string, Tank>();
  group.tanks.forEach((t) => tankMap.set(t.id, t));

  // Aggregate Group Financials & Unit Metrics
  let totalStock = 0;
  let totalPurchasedQty = 0;
  let paidPurchasedQty = 0;
  let totalPurchaseCost = 0;
  let totalLiveValuation = 0;
  let sumTargetOrUnitFallback = 0;

  const batchRows = group.batches.map((batch) => {
    const liveItem = liveItemMap.get(batch.id);
    const batchKey = (batch.strain || batch.batchName || '').trim().toLowerCase();

    const matchingSales = group.sales.filter((s) => {
      if (s.batchId) return s.batchId === batch.id;
      return Boolean(batchKey && s.itemDescription.toLowerCase().includes(batchKey));
    });

    const batchSoldQty = matchingSales.reduce((acc, s) => acc + s.quantity, 0);
    const batchSalesRevenue = matchingSales.reduce((acc, s) => acc + s.totalPrice, 0);
    const batchCost = batch.isFreeInventory ? 0 : batch.totalCost;

    const remainingStock = liveItem
      ? liveItem.remainingStock
      : batch.manualStockCount !== undefined
      ? Math.max(0, batch.manualStockCount)
      : Math.max(0, batch.quantityReceived - (batch.mortalityCount || 0) - batchSoldQty);

    const unitValuation = liveItem ? liveItem.unitValuation : batch.unitCost;
    const rowValuation = liveItem ? liveItem.totalValuation : Math.round(remainingStock * unitValuation);
    const nonSaleLoss = Math.max(0, (batch.quantityReceived || 0) - batchSoldQty - remainingStock);

    const batchNetProfit = batchSalesRevenue - batchCost;
    const batchProfitPct =
      batchCost > 0
        ? ((batchSalesRevenue - batchCost) / batchCost) * 100
        : batchSalesRevenue > 0
        ? 100
        : 0;

    const avgBatchSalePrice = batchSoldQty > 0 ? batchSalesRevenue / batchSoldQty : null;

    totalStock += remainingStock;
    totalPurchasedQty += batch.quantityReceived || 0;
    if (!batch.isFreeInventory && batch.totalCost > 0) {
      paidPurchasedQty += batch.quantityReceived || 0;
      totalPurchaseCost += batch.totalCost;
    }
    totalLiveValuation += rowValuation;
    sumTargetOrUnitFallback += unitValuation || batch.unitCost || 0;

    return {
      batch,
      tank: tankMap.get(batch.assignedTankId),
      remainingStock,
      batchSoldQty,
      batchSalesRevenue,
      batchCost,
      batchNetProfit,
      batchProfitPct,
      avgBatchSalePrice,
      unitValuation,
      valuationLabel: liveItem?.valuationMethodLabel || (batch.isFreeInventory ? 'Bedelsiz Giriş' : 'Alış Maliyeti'),
      nonSaleLoss,
    };
  });

  const totalSoldQty = group.sales.reduce((acc, s) => acc + s.quantity, 0);
  const totalSalesRevenue = group.sales.reduce((acc, s) => acc + s.totalPrice, 0);
  const netProfit = totalSalesRevenue - totalPurchaseCost;
  const profitPercentage =
    totalPurchaseCost > 0
      ? ((totalSalesRevenue - totalPurchaseCost) / totalPurchaseCost) * 100
      : totalSalesRevenue > 0
      ? 100
      : 0;

  // 1. Ortalama Alış Fiyatı (ücretli satın alımların ağırlıklı birim ortalaması)
  const avgPurchasePrice =
    paidPurchasedQty > 0
      ? totalPurchaseCost / paidPurchasedQty
      : totalPurchasedQty > 0
      ? totalPurchaseCost / totalPurchasedQty
      : 0;

  // 2. Ortalama Satış Fiyatı (satılan adetlerin ağırlıklı birim satış ortalaması)
  const avgSalePrice = totalSoldQty > 0 ? totalSalesRevenue / totalSoldQty : 0;

  // 3. Ortalama Birim Fiyatı (mevcut canlı stokların ağırlıklı birim değeri; stok yoksa parti birim ortalaması)
  const avgUnitPrice =
    totalStock > 0
      ? totalLiveValuation / totalStock
      : batchRows.length > 0
      ? sumTargetOrUnitFallback / batchRows.length
      : 0;

  const groupNonSaleLoss = Math.max(0, totalPurchasedQty - totalSoldQty - totalStock);

  const sortedSales = [...group.sales].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Visual Hero Header */}
        <div
          className={`relative w-full shrink-0 overflow-hidden ${
            group.imageSrc
              ? 'h-40 sm:h-48'
              : 'min-h-[144px] sm:min-h-[164px] bg-slate-50 border-b border-slate-200'
          }`}
        >
          {group.imageSrc ? (
            <>
              <img
                src={group.imageSrc}
                alt={group.imageAlt || group.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/45 to-black/25 pointer-events-none" />
            </>
          ) : null}

          {/* Top-right Controls (Upload / Remove / Close) */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            {onUploadImage && (
              <label
                className={`inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm ${
                  group.imageSrc
                    ? 'bg-white/95 hover:bg-white text-slate-900 border border-white/80 backdrop-blur-md'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-dashed border-slate-300'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Görsel Yükle</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onUploadImage(group.key, file);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            )}
            {group.imageSrc && onRemoveImage && (
              <button
                type="button"
                onClick={() => onRemoveImage(group.key)}
                className="min-h-[40px] px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-rose-50 text-rose-700 border border-white/80 backdrop-blur-md text-xs font-semibold cursor-pointer transition-colors shadow-sm"
                title="Görseli kaldır"
              >
                Kaldır
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl cursor-pointer transition-colors shadow-sm ${
                group.imageSrc
                  ? 'bg-white/95 hover:bg-white text-slate-900 border border-white/80 backdrop-blur-md'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className={`${
              group.imageSrc
                ? 'absolute bottom-3 left-4 right-4 sm:bottom-3.5 sm:left-5 sm:right-5'
                : 'pt-14 pb-4 px-4 sm:pt-16 sm:pb-5 sm:px-5'
            } flex flex-col sm:flex-row sm:items-end justify-between gap-2`}
          >
            <div className="min-w-0">
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider block ${
                  group.imageSrc
                    ? group.badgeClass
                    : group.emptyBadgeClass || 'text-slate-600'
                }`}
              >
                {group.badgeText}
              </span>
              <h2
                className={`text-lg sm:text-2xl font-bold tracking-tight leading-tight ${
                  group.imageSrc ? 'text-white' : 'text-slate-900'
                }`}
              >
                {group.title}
              </h2>
              {group.subtitle && (
                <p
                  className={`text-xs mt-0.5 line-clamp-1 ${
                    group.imageSrc ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {group.subtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono tabular-nums ${
                  group.imageSrc
                    ? 'bg-white/95 border border-white/80 text-slate-900 backdrop-blur-md'
                    : 'bg-white border border-slate-200 text-slate-800 shadow-xs'
                }`}
              >
                Mevcut Stok: {totalStock} Adet
              </span>
              {groupNonSaleLoss > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-red-50/95 border border-red-200 text-xs font-semibold text-red-700 font-mono tabular-nums backdrop-blur-md">
                  -{groupNonSaleLoss} Kayıp / Ölüm
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 pb-safe space-y-5">
          {/* 6 Requested Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* 1. Toplam Alım */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Toplam Alım</span>
                <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {formatTL(totalPurchaseCost)} ₺
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                {totalPurchasedQty} adet · {group.batches.length} parti
              </div>
            </div>

            {/* 2. Toplam Satış */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Toplam Satış</span>
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-lg font-bold text-emerald-700 font-mono tabular-nums">
                {formatTL(totalSalesRevenue)} ₺
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                {totalSoldQty} adet · {group.sales.length} işlem
              </div>
            </div>

            {/* 3. Kâr / Zarar Yüzdesi */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Kâr / Zarar Yüzdesi</span>
                {profitPercentage >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                )}
              </div>
              <div className={`text-lg font-bold font-mono tabular-nums ${getProfitClass(profitPercentage)}`}>
                {formatProfitPct(profitPercentage)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                Net: {netProfit >= 0 ? '+' : ''}
                {formatTL(netProfit)} ₺
              </div>
            </div>

            {/* 4. Ortalama Alış Fiyatı */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Ortalama Alış Fiyatı</span>
                <Tag className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <div className="text-lg font-bold text-sky-700 font-mono tabular-nums">
                {paidPurchasedQty > 0 || totalPurchasedQty > 0
                  ? `${formatTL(avgPurchasePrice, 2)} ₺`
                  : '—'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {paidPurchasedQty > 0
                  ? `${paidPurchasedQty} ücretli alım ort.`
                  : totalPurchasedQty > 0
                  ? 'Bedelsiz / üretim girişi'
                  : 'Henüz alım kaydı yok'}
              </div>
            </div>

            {/* 5. Ortalama Satış Fiyatı */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Ortalama Satış Fiyatı</span>
                <Tag className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-lg font-bold text-emerald-700 font-mono tabular-nums">
                {totalSoldQty > 0 ? `${formatTL(avgSalePrice, 2)} ₺` : '—'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {totalSoldQty > 0
                  ? `${totalSoldQty} adet satış ortalaması`
                  : 'Henüz satış yapılmadı'}
              </div>
            </div>

            {/* 6. Ortalama Birim Fiyatı */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-amber-500/25">
              <div className="flex items-center justify-between text-[11px] text-amber-700/90 mb-1">
                <span>Ortalama Birim Fiyatı</span>
                <Layers className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-lg font-bold text-amber-700 font-mono tabular-nums">
                {batchRows.length > 0 ? `${formatTL(avgUnitPrice, 2)} ₺` : '—'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                {totalStock > 0
                  ? `Stok değeri: ${formatTL(totalLiveValuation)} ₺`
                  : 'Mevcut canlı birim değeri'}
              </div>
            </div>
          </div>

          {/* Assigned Tanks Strip */}
          {group.tanks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                <span>Bu Gruba Atanan Akvaryumlar ({group.tanks.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {group.tanks.map((tank) => (
                  <div
                    key={tank.id}
                    className="p-3 rounded-xl bg-slate-50/90 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-cyan-700">{tank.code}</span>
                        <span className="text-slate-800 font-medium truncate">{tank.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                        {tank.volumeLiters}L · TDS {tank.currentParameters.tds} · pH {tank.currentParameters.ph} · {tank.currentParameters.temp}°C
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Livestock / Batches List */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Gruptaki Canlı Hatları & Partiler ({batchRows.length})
            </h3>

            {batchRows.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-50/90 border border-slate-200 text-center text-xs text-slate-500">
                Bu canlı grubuna ait henüz bir alım partisi veya canlı stoğu bulunmuyor.
              </div>
            ) : (
              <div className="space-y-2.5">
                {batchRows.map((row) => (
                  <div
                    key={row.batch.id}
                    onClick={() => onInspectBatch?.(row.batch)}
                    className={`p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors space-y-3 ${
                      onInspectBatch ? 'cursor-pointer hover:border-purple-500/50 hover:bg-white' : ''
                    }`}
                    title={onInspectBatch ? 'Envanter detay, alış ve satış kayıtlarını görüntülemek için tıklayın' : undefined}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">
                            {row.batch.strain || row.batch.batchName}
                          </h4>
                          {row.batch.isFreeInventory && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-300 font-semibold">
                              Bedelsiz / Üretim
                            </span>
                          )}
                          {row.tank && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-mono">
                              {row.tank.code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(row.batch.purchaseDate).toLocaleDateString('tr-TR')}
                          </span>
                          {row.batch.batchName && row.batch.strain && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span className="truncate">{row.batch.batchName}</span>
                            </>
                          )}
                          {row.batch.supplier && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span>{row.batch.supplier}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-900 font-mono tabular-nums">
                          Stok: {row.remainingStock} Adet
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold font-mono tabular-nums ${getProfitClass(
                            row.batchProfitPct
                          )}`}
                        >
                          {formatProfitPct(row.batchProfitPct)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Alım Miktarı</span>
                        <span className="text-slate-800 font-semibold font-mono tabular-nums">
                          {row.batch.quantityReceived} Adet
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Toplam Alış</span>
                        <span className="text-slate-800 font-semibold font-mono tabular-nums">
                          {formatTL(row.batchCost)} ₺
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Alış Birim Fiyatı</span>
                        <span className="text-sky-700 font-semibold font-mono tabular-nums">
                          {row.batch.isFreeInventory ? '0 ₺' : `${formatTL(row.batch.unitCost, 2)} ₺`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">
                          {row.nonSaleLoss > 0 ? 'Satış / Ölüm' : 'Satış'}
                        </span>
                        <span className="font-mono tabular-nums">
                          <span
                            className={
                              row.nonSaleLoss > 0
                                ? 'text-slate-800 font-semibold'
                                : 'text-emerald-700 font-semibold'
                            }
                          >
                            {row.batchSoldQty} Adet
                          </span>
                          {row.nonSaleLoss > 0 && (
                            <span className="text-red-600 font-semibold ml-1">
                              · -{row.nonSaleLoss} Ölüm
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Ort. Satış Fiyatı</span>
                        <span className="text-emerald-700 font-semibold font-mono tabular-nums">
                          {row.avgBatchSalePrice !== null
                            ? `${formatTL(row.avgBatchSalePrice, 2)} ₺`
                            : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Güncel Birim Fiyat</span>
                        <span className="text-amber-700 font-semibold font-mono tabular-nums">
                          {formatTL(row.unitValuation, 2)} ₺
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Group Sales History */}
          {sortedSales.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Bu Gruptaki Satış Kayıtları ({sortedSales.length})
              </h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/90">
                {/* Mobile Cards (< md) */}
                <div className="md:hidden divide-y divide-slate-200">
                  {sortedSales.map((s) => {
                    const matchedBatch = findMatchingBatchForSale(s, group.batches);
                    return (
                      <div
                        key={`m-${s.id}`}
                        onClick={() => {
                          if (matchedBatch && onInspectBatch) {
                            onInspectBatch(matchedBatch);
                          }
                        }}
                        className={`p-3 space-y-1 text-xs ${
                          matchedBatch && onInspectBatch ? 'active:bg-white cursor-pointer' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[11px] font-mono text-slate-500 block">
                              {new Date(s.date).toLocaleDateString('tr-TR')}
                            </span>
                            <div className="font-semibold text-slate-900 truncate">{s.itemDescription}</div>
                            <div className="text-[11px] text-slate-500">
                              {s.customerName || '—'} · {s.quantity} ad × {formatTL(s.unitSalePrice, 2)} ₺
                            </div>
                          </div>
                          <div className="font-mono font-bold text-emerald-700 shrink-0 tabular-nums">
                            {formatTL(s.totalPrice)} ₺
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-medium">Tarih</th>
                        <th className="py-2.5 px-3 font-medium">Açıklama</th>
                        <th className="py-2.5 px-3 font-medium">Müşteri</th>
                        <th className="py-2.5 px-3 font-medium text-right">Adet</th>
                        <th className="py-2.5 px-3 font-medium text-right">Birim</th>
                        <th className="py-2.5 px-3 font-medium text-right">Toplam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedSales.map((s) => {
                        const matchedBatch = findMatchingBatchForSale(s, group.batches);
                        return (
                        <tr
                          key={s.id}
                          onClick={() => {
                            if (matchedBatch && onInspectBatch) {
                              onInspectBatch(matchedBatch);
                            }
                          }}
                          className={`hover:bg-white ${
                            matchedBatch && onInspectBatch ? 'cursor-pointer' : ''
                          }`}
                          title={matchedBatch && onInspectBatch ? 'Canlı detayını görüntülemek için tıklayın' : undefined}
                        >
                          <td className="py-2 px-3 text-slate-500 font-mono whitespace-nowrap">
                            {new Date(s.date).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="py-2 px-3 text-slate-800 font-medium">{s.itemDescription}</td>
                          <td className="py-2 px-3 text-slate-500">{s.customerName || '—'}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-800 tabular-nums">
                            {s.quantity}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700 tabular-nums">
                            {formatTL(s.unitSalePrice, 2)} ₺
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                            {formatTL(s.totalPrice)} ₺
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
        </div>
      </div>
    </div>
  );
};
