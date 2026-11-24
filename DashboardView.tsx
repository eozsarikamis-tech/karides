import React, { useState } from 'react';
import {
  TrendingUp,
  Wallet,
  Coins,
  PlusCircle,
  Image as ImageIcon,
  Upload,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react';
import { BatchPurchase, Tank, Sale, BreedingSpawn, Expense } from '../types';
import { BusinessProfile, calculateHatcheryMetrics } from '../utils/storage';
import { useSpeciesList, formatSpeciesLabel } from '../utils/speciesStorage';
import {
  compressImageFileToDataUrl,
  isLegacyStockHeroImage,
  loadSpeciesImages,
  saveSpeciesImagesMap,
} from '../utils/imageUpload';
import { LiveStockTrendChart } from './LiveStockTrendChart';
import { SalesTrendChart } from './SalesTrendChart';
import {
  SpeciesGroupDetailModal,
  SpeciesGroupDetailData,
} from './modals/SpeciesGroupDetailModal';
import { BusinessAiAnalystModal } from './modals/BusinessAiAnalystModal';

interface DashboardViewProps {
  batches: BatchPurchase[];
  tanks: Tank[];
  sales: Sale[];
  breedings: BreedingSpawn[];
  expenses: Expense[];
  activeBusiness?: BusinessProfile;
  onSelectTab?: (tab: string) => void;
  onOpenAddBatch: () => void;
  onOpenAddSale: () => void;
  onOpenPurchasesBreakdown: () => void;
  onOpenBusinessValuation?: () => void;
  onOpenManualItemDefinition?: () => void;
  onUpdateHeroImage?: (heroImage: string) => void;
  onInspectBatch?: (batch: BatchPurchase) => void;
}

const DEFAULT_GROUP_THEMES = [
  {
    accentText: 'text-emerald-300',
    emptyAccentText: 'text-emerald-700',
  },
  {
    accentText: 'text-purple-300',
    emptyAccentText: 'text-purple-700',
  },
  {
    accentText: 'text-cyan-300',
    emptyAccentText: 'text-cyan-700',
  },
  {
    accentText: 'text-rose-300',
    emptyAccentText: 'text-rose-700',
  },
];

function classifyDefaultGroup(
  rawCat: string
): 'caridina' | 'neocaridina' | 'apistogramma' | 'pleco' | null {
  const cat = (rawCat || '').trim().toLocaleLowerCase('tr-TR');
  if (!cat) return null;
  if (cat.includes('neocaridina')) return 'neocaridina';
  if (cat.includes('caridina')) return 'caridina';
  if (
    cat === 'apistogramma' ||
    cat.includes('apisto') ||
    cat.includes('cichlid') ||
    cat.includes('cüce')
  ) {
    return 'apistogramma';
  }
  if (
    cat === 'pleco' ||
    cat.includes('pleco') ||
    cat.includes('sturisoma') ||
    cat.includes('sutrisoma') ||
    cat.includes('vatos') ||
    cat.includes('whiptail') ||
    cat.includes('ancistrus')
  ) {
    return 'pleco';
  }
  return null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  batches,
  tanks,
  sales,
  breedings,
  expenses,
  activeBusiness,
  onSelectTab: _onSelectTab,
  onOpenAddBatch,
  onOpenAddSale,
  onOpenPurchasesBreakdown,
  onOpenBusinessValuation,
  onOpenManualItemDefinition,
  onUpdateHeroImage,
  onInspectBatch,
}) => {
  const speciesList = useSpeciesList();
  const [speciesImages, setSpeciesImages] = useState<Record<string, string>>(() =>
    loadSpeciesImages()
  );
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isAiAnalystOpen, setIsAiAnalystOpen] = useState(false);
  const [selectedGroupDetail, setSelectedGroupDetail] =
    useState<SpeciesGroupDetailData | null>(null);

  const activeHeroSrc =
    activeBusiness?.heroImage && !isLegacyStockHeroImage(activeBusiness.heroImage)
      ? activeBusiness.heroImage
      : '';

  const handleUploadHeroImage = async (file: File) => {
    setImageUploadError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.82,
      });
      onUpdateHeroImage?.(dataUrl);
    } catch (err) {
      setImageUploadError(
        err instanceof Error ? err.message : 'Kapak görseli yüklenemedi.'
      );
    }
  };

  const handleRemoveHeroImage = () => {
    setImageUploadError(null);
    onUpdateHeroImage?.('');
  };

  const handleUploadSpeciesImage = async (groupKey: string, file: File) => {
    setImageUploadError(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, {
        maxWidth: 640,
        maxHeight: 420,
        quality: 0.82,
      });
      setSpeciesImages((prev) => {
        const next = { ...prev, [groupKey]: dataUrl };
        saveSpeciesImagesMap(next);
        return next;
      });
    } catch (err) {
      setImageUploadError(
        err instanceof Error ? err.message : 'Tür görseli yüklenemedi.'
      );
    }
  };

  const handleRemoveSpeciesImage = (groupKey: string) => {
    setImageUploadError(null);
    setSpeciesImages((prev) => {
      const next = { ...prev };
      delete next[groupKey];
      saveSpeciesImagesMap(next);
      return next;
    });
  };

  const metrics = calculateHatcheryMetrics(batches, sales, expenses);

  const livestockSales = sales.filter(
    (s) => !s.itemType || s.itemType === 'livestock'
  );

  const computeGroupFinancialAndStockStats = (
    groupBatches: BatchPurchase[],
    groupSales: Sale[],
    groupTanksCount: number
  ) => {
    let totalStock = 0;
    let totalPurchasedQty = 0;
    let totalCost = 0;

    groupBatches.forEach((batch) => {
      const batchKey = (batch.strain || batch.batchName || '').trim().toLowerCase();
      const batchSalesQty = livestockSales
        .filter((s) => {
          if (s.batchId) return s.batchId === batch.id;
          return Boolean(batchKey && s.itemDescription.toLowerCase().includes(batchKey));
        })
        .reduce((acc, s) => acc + s.quantity, 0);

      const remaining =
        batch.manualStockCount !== undefined
          ? Math.max(0, batch.manualStockCount)
          : Math.max(0, batch.quantityReceived - (batch.mortalityCount || 0) - batchSalesQty);

      totalStock += remaining;
      totalPurchasedQty += batch.quantityReceived || 0;
      totalCost += batch.isFreeInventory ? 0 : batch.totalCost;
    });

    const totalSold = groupSales.reduce((acc, s) => acc + s.quantity, 0);
    // Ölüm yalnızca toplam satın alım adedinin altına satış olmadan düşülürse hesaplanır ve gösterilir
    const deathCount = Math.max(0, totalPurchasedQty - totalSold - totalStock);
    const totalSalesRevenue = groupSales.reduce((acc, s) => acc + s.totalPrice, 0);
    const netProfit = totalSalesRevenue - totalCost;
    const profitPercentage =
      totalCost > 0
        ? ((totalSalesRevenue - totalCost) / totalCost) * 100
        : totalSalesRevenue > 0
        ? 100
        : 0;

    return {
      totalStock,
      totalPurchasedQty,
      totalSold,
      deathCount,
      totalCost,
      totalSalesRevenue,
      netProfit,
      profitPercentage,
      batchCount: groupBatches.length,
      tankCount: groupTanksCount,
    };
  };

  const getDefaultGroupStats = (
    groupKey: 'caridina' | 'neocaridina' | 'apistogramma' | 'pleco'
  ) => {
    const groupBatches = batches.filter(
      (b) => classifyDefaultGroup(b.category) === groupKey
    );
    const groupBatchIds = new Set(groupBatches.map((b) => b.id));
    const groupSales = livestockSales.filter((s) => {
      if (s.batchId && groupBatchIds.has(s.batchId)) return true;
      return classifyDefaultGroup(s.species || '') === groupKey;
    });
    const groupTanks = tanks.filter(
      (t) => classifyDefaultGroup(t.species) === groupKey
    );
    const groupLiveItems = metrics.businessValuation.liveItems.filter(
      (item) => classifyDefaultGroup(item.category) === groupKey
    );
    const stats = computeGroupFinancialAndStockStats(
      groupBatches,
      groupSales,
      groupTanks.length
    );
    return {
      ...stats,
      batches: groupBatches,
      sales: groupSales,
      tanks: groupTanks,
      liveItems: groupLiveItems,
    };
  };

  const caridinaStats = getDefaultGroupStats('caridina');
  const neocaridinaStats = getDefaultGroupStats('neocaridina');
  const apistogrammaStats = getDefaultGroupStats('apistogramma');
  const plecoStats = getDefaultGroupStats('pleco');

  // Collect any added or currently defined custom live groups outside the 4 defaults
  const extraLiveGroupsMap = new Map<
    string,
    {
      id: string;
      label: string;
      batches: BatchPurchase[];
      strains: string[];
      tankCodes: string[];
      tanks: Tank[];
    }
  >();

  const ensureGroupEntry = (rawId: string, preferredLabel?: string) => {
    const norm = rawId.trim().toLocaleLowerCase('tr-TR');
    if (!norm || classifyDefaultGroup(norm)) return null;
    if (!extraLiveGroupsMap.has(norm)) {
      extraLiveGroupsMap.set(norm, {
        id: rawId,
        label: preferredLabel || formatSpeciesLabel(rawId, speciesList) || rawId,
        batches: [],
        strains: [],
        tankCodes: [],
        tanks: [],
      });
    }
    return extraLiveGroupsMap.get(norm)!;
  };

  // 1. Defined custom species from speciesList
  speciesList.forEach((sp) => {
    if (!classifyDefaultGroup(sp.id) && !classifyDefaultGroup(sp.name)) {
      ensureGroupEntry(sp.id, formatSpeciesLabel(sp.id, speciesList) || sp.name);
    }
  });

  // 2. Live batches/stocks belonging to any extra live group
  batches.forEach((batch) => {
    const entry = ensureGroupEntry(batch.category);
    if (!entry) return;
    entry.batches.push(batch);
    const strainLabel = (batch.strain || batch.batchName || '').trim();
    if (strainLabel && !entry.strains.includes(strainLabel)) {
      entry.strains.push(strainLabel);
    }
  });

  // 3. Tanks assigned to any extra live group
  tanks.forEach((tank) => {
    const entry = ensureGroupEntry(tank.species);
    if (!entry) return;
    entry.tanks.push(tank);
    if (tank.code && !entry.tankCodes.includes(tank.code)) {
      entry.tankCodes.push(tank.code);
    }
  });

  const extraLiveGroups = Array.from(extraLiveGroupsMap.entries()).map(
    ([normKey, entry]) => {
      const groupBatchIds = new Set(entry.batches.map((b) => b.id));
      const groupSales = livestockSales.filter((s) => {
        if (s.batchId && groupBatchIds.has(s.batchId)) return true;
        const saleNorm = (s.species || '').trim().toLocaleLowerCase('tr-TR');
        return saleNorm === normKey;
      });
      const groupLiveItems = metrics.businessValuation.liveItems.filter((item) =>
        groupBatchIds.has(item.batchId)
      );
      const stats = computeGroupFinancialAndStockStats(
        entry.batches,
        groupSales,
        entry.tankCodes.length
      );
      return {
        ...entry,
        ...stats,
        sales: groupSales,
        liveItems: groupLiveItems,
      };
    }
  );

  const formatProfitPct = (pct: number) => {
    const rounded = Math.round(pct * 10) / 10;
    if (rounded > 0) return `+%${rounded.toLocaleString('tr-TR')}`;
    if (rounded < 0) return `-%${Math.abs(rounded).toLocaleString('tr-TR')}`;
    return '%0';
  };

  const getProfitPctClass = (pct: number) => {
    if (pct > 0.05) return 'text-emerald-600';
    if (pct < -0.05) return 'text-rose-600';
    return 'text-slate-500';
  };

  const renderSalesOrLossRow = (totalSold: number, deathCount: number) => {
    if (deathCount > 0) {
      return (
        <div className="flex items-center justify-between text-slate-500">
          <span>Satış / Ölüm:</span>
          <span className="font-mono tabular-nums">
            <span className="text-slate-700 font-medium">{totalSold} Satış</span>
            <span className="text-slate-400 mx-1">·</span>
            <span className="text-red-600 font-semibold">-{deathCount} Ölüm</span>
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between text-slate-500">
        <span>Satış:</span>
        <span className="text-emerald-700 font-medium font-mono tabular-nums">
          {totalSold} Adet
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
              Üretimhane Genel Bakış
            </h1>
            <button
              type="button"
              onClick={() => setIsAiAnalystOpen(true)}
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-slate-900 border border-indigo-500/50 hover:border-indigo-400 transition-all cursor-pointer shadow-sm"
              title="Yapay zeka ile verimlilik analizi ve öneriler alın"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
              <span>Verimlilik AI Analizi</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Canlı ıslah hatları, akvaryumlar, finansal durum ve üretimhane envanteri
          </p>
        </div>

        {/* Top-Right Corner Action Button */}
        {onOpenManualItemDefinition && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              onClick={onOpenManualItemDefinition}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl transition-all shadow-lg shadow-indigo-200/60 cursor-pointer border border-indigo-400/40"
              title="Canlı, demirbaş veya sarf malzemesi tanımlayın"
            >
              <PlusCircle className="w-4 h-4 text-indigo-700" />
              <span>Yeni Ürün Tanımla</span>
            </button>
          </div>
        )}
      </div>

      {/* Image Upload Error Notice */}
      {imageUploadError && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          <span>{imageUploadError}</span>
          <button
            type="button"
            onClick={() => setImageUploadError(null)}
            className="p-1 rounded-lg hover:bg-rose-100 text-rose-600 cursor-pointer shrink-0"
            aria-label="Uyarıyı kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        {activeHeroSrc ? (
          <div className="relative h-48 sm:h-72 md:h-[360px] w-full overflow-hidden">
            <img
              src={activeHeroSrc}
              alt={`${activeBusiness?.name || 'Üretimhane'} Kapak Görseli`}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/15 pointer-events-none" />

            {/* Upload / Remove controls in bottom left */}
            <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 z-20 flex items-center gap-2">
              <label
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 text-xs font-semibold text-slate-900 bg-white/95 hover:bg-white border border-white/80 backdrop-blur-md rounded-lg transition-all cursor-pointer shadow-lg"
                title="Yeni kapak görseli yükle"
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
                      handleUploadHeroImage(file);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                type="button"
                onClick={handleRemoveHeroImage}
                className="inline-flex items-center gap-1 min-h-[40px] px-2.5 py-2 text-xs font-semibold text-rose-700 bg-white/95 hover:bg-rose-50 border border-white/80 backdrop-blur-md rounded-lg transition-all cursor-pointer shadow-lg"
                title="Kapak görselini kaldır"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kaldır</span>
              </button>
            </div>

            {/* Action buttons in bottom right */}
            <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 flex items-center gap-2 z-10">
              <button
                onClick={onOpenAddBatch}
                className="min-h-[40px] px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-black/30"
              >
                Satın Alma
              </button>
              <button
                onClick={onOpenAddSale}
                className="min-h-[40px] px-3.5 sm:px-4 py-2 text-xs font-semibold text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 backdrop-blur-md rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-black/30"
              >
                Satış
              </button>
            </div>
          </div>
        ) : (
          <div className="min-h-[190px] sm:min-h-[240px] w-full bg-slate-50/70 p-4 sm:p-6 flex flex-col justify-between gap-4 border border-dashed border-slate-300 rounded-2xl">
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-3">
              <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                <ImageIcon className="w-5 h-5 text-slate-400" />
              </div>
              <label className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 bg-white hover:bg-slate-100 active:bg-slate-200 border border-dashed border-slate-300 rounded-xl transition-all cursor-pointer shadow-xs">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Görsel Yükle</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleUploadHeroImage(file);
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80">
              <button
                onClick={onOpenAddBatch}
                className="min-h-[40px] px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-xs"
              >
                Satın Alma
              </button>
              <button
                onClick={onOpenAddSale}
                className="min-h-[40px] px-3.5 sm:px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-xs"
              >
                Satış
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Primary Financial & Operation Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1 */}
        <div className="p-3.5 sm:p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 mb-1.5 sm:mb-2 gap-1">
            <span className="truncate">Toplam Satış Geliri</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono tabular-nums truncate">
            {metrics.totalSalesRevenue.toLocaleString('tr-TR')} ₺
          </div>
          <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
            <span className="text-emerald-600 font-semibold">{metrics.totalSoldQuantity} adet</span>
            <span className="truncate">teslim edildi</span>
          </div>
        </div>

        {/* Metric 2: Toplam Satın Alımlar (Canlı + Demirbaş + Sarf) */}
        <div
          onClick={onOpenPurchasesBreakdown}
          className="p-3.5 sm:p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-500/50 hover:bg-white transition-all cursor-pointer group relative shadow-sm"
          title="Tıklayarak canlı, hava motoru, aydınlatma ve demirbaş dökümünü inceleyin"
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 mb-1.5 sm:mb-2 gap-1">
            <span className="group-hover:text-slate-900 transition-colors font-medium truncate">Toplam Alımlar</span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-blue-600 font-semibold hidden sm:inline group-hover:underline">Detaylı Döküm →</span>
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 font-mono tabular-nums truncate">
            {metrics.totalPurchases.toLocaleString('tr-TR')} ₺
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="text-purple-700 font-semibold font-mono tabular-nums">
              {metrics.totalLivestockCost.toLocaleString('tr-TR')} ₺ canlı
            </span>
            <span aria-hidden="true" className="text-slate-400 hidden sm:inline">·</span>
            <span className="text-blue-700 font-semibold font-mono tabular-nums">
              {metrics.totalEquipmentCost.toLocaleString('tr-TR')} ₺ demirbaş
            </span>
            <span aria-hidden="true" className="text-slate-400 hidden sm:inline">·</span>
            <span className="text-slate-500 font-mono tabular-nums hidden sm:inline">
              {(metrics.totalPurchases - metrics.totalLivestockCost - metrics.totalEquipmentCost).toLocaleString('tr-TR')} ₺ sarf
            </span>
          </div>
        </div>

        {/* Metric 3: Net Kâr (Canlı, Demirbaş, Sarf Dökümüyle) */}
        <div className="p-3.5 sm:p-5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 mb-1.5 sm:mb-2 gap-1">
            <span className="font-medium text-slate-700 truncate">Net Kâr</span>
            <TrendingUp
              className={`w-4 h-4 shrink-0 ${
                metrics.netHatcheryCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            />
          </div>
          <div
            className={`text-lg sm:text-2xl font-bold font-mono tabular-nums truncate ${
              metrics.netHatcheryCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {metrics.netHatcheryCashflow >= 0 ? '+' : ''}
            {metrics.netHatcheryCashflow.toLocaleString('tr-TR')} ₺
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span
              className={`font-semibold font-mono tabular-nums ${
                metrics.totalSalesRevenue - metrics.totalLivestockCost >= 0
                  ? 'text-purple-700'
                  : 'text-slate-700'
              }`}
            >
              {metrics.totalSalesRevenue - metrics.totalLivestockCost >= 0 ? '+' : ''}
              {(metrics.totalSalesRevenue - metrics.totalLivestockCost).toLocaleString('tr-TR')} ₺ canlı
            </span>
            <span aria-hidden="true" className="text-slate-400 hidden sm:inline">·</span>
            <span className="text-blue-700 font-semibold font-mono tabular-nums">
              -{metrics.totalEquipmentCost.toLocaleString('tr-TR')} ₺ demirbaş
            </span>
            <span aria-hidden="true" className="text-slate-400 hidden sm:inline">·</span>
            <span className="text-slate-500 font-mono tabular-nums hidden sm:inline">
              -{(metrics.totalPurchases - metrics.totalLivestockCost - metrics.totalEquipmentCost).toLocaleString('tr-TR')} ₺ sarf
            </span>
          </div>
        </div>

        {/* Metric 4: Envanter & Üretimhane Değeri */}
        <div
          onClick={onOpenBusinessValuation}
          className="p-3.5 sm:p-5 rounded-xl bg-white border border-slate-200 hover:border-amber-500/50 hover:bg-white transition-all cursor-pointer group relative shadow-sm"
          title="Tıklayarak canlı envanter değerlemesi, demirbaşlar ve sarf dökümünü inceleyin"
        >
          <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 mb-1.5 sm:mb-2 gap-1">
            <span className="group-hover:text-slate-900 transition-colors font-medium truncate">Toplam Değer</span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-amber-600 font-semibold hidden sm:inline group-hover:underline">Detaylı Değerleme →</span>
              <Coins className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-amber-700 truncate">
            {metrics.totalBusinessValuation.toLocaleString('tr-TR')} ₺
          </div>
          <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="text-purple-700 font-semibold font-mono tabular-nums">
              {metrics.totalLivestockValuation.toLocaleString('tr-TR')} ₺ canlı
            </span>
            <span aria-hidden="true" className="text-slate-400 hidden sm:inline">·</span>
            <span className="text-blue-700 font-semibold font-mono tabular-nums">
              {metrics.totalEquipmentValuation.toLocaleString('tr-TR')} ₺ demirbaş
            </span>
            <span aria-hidden="true" className="text-slate-400 hidden sm:inline">·</span>
            <span className="text-slate-500 font-mono tabular-nums hidden sm:inline">
              {metrics.totalSuppliesValuation.toLocaleString('tr-TR')} ₺ sarf
            </span>
          </div>
        </div>
      </div>

      {/* 30-Day Live Stock Population Growth Trend Chart */}
      <LiveStockTrendChart batches={batches} sales={sales} expenses={expenses} />

      {/* Sales Trend Chart */}
      <SalesTrendChart sales={sales} />

      {/* Species Distribution & Focus Areas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        {[
          {
            key: 'caridina',
            title: 'Crystal Red & Taiwan Bee',
            subtitle: 'Caridina Karides Kolonisi',
            badgeText: 'Caridina Kolonisi',
            badgeClass: 'text-red-300',
            emptyBadgeClass: 'text-red-700',
            imageAlt: 'Caridina Crystal Red Shrimp',
            stats: caridinaStats,
          },
          {
            key: 'neocaridina',
            title: 'Blue Dream & Bloody Mary',
            subtitle: 'Neocaridina Karides Kolonisi',
            badgeText: 'Neocaridina Kolonisi',
            badgeClass: 'text-blue-300',
            emptyBadgeClass: 'text-blue-700',
            imageAlt: 'Neocaridina Blue Dream Shrimp',
            stats: neocaridinaStats,
          },
          {
            key: 'apistogramma',
            title: 'Apistogramma Çiftleri',
            subtitle: 'Güney Amerika Cüce Cichlid Hatları',
            badgeText: 'Cüce Cichlid',
            badgeClass: 'text-amber-300',
            emptyBadgeClass: 'text-amber-700',
            imageAlt: 'Apistogramma Cacatuoides Dwarf Cichlid',
            stats: apistogrammaStats,
          },
          {
            key: 'pleco',
            title: 'Sturisoma panamense',
            subtitle: 'Pleco & Vatos Grubu',
            badgeText: 'Pleco Grubu',
            badgeClass: 'text-teal-300',
            emptyBadgeClass: 'text-teal-700',
            imageAlt: 'Sturisoma panamense - Pleco',
            stats: plecoStats,
          },
          ...extraLiveGroups.map((group, idx) => {
            const theme = DEFAULT_GROUP_THEMES[idx % DEFAULT_GROUP_THEMES.length];
            return {
              key: group.id,
              title: group.label,
              subtitle:
                group.strains.length > 0
                  ? group.strains.join(', ')
                  : 'Tanımlı Canlı Grubu',
              badgeText: 'Tanımlı Canlı Grubu',
              badgeClass: theme.accentText,
              emptyBadgeClass: theme.emptyAccentText,
              imageAlt: group.label,
              stats: group,
            };
          }),
        ].map((card) => {
          const uploadedImg = speciesImages[card.key];
          return (
            <div
              key={card.key}
              role="button"
              tabIndex={0}
              onClick={() =>
                setSelectedGroupDetail({
                  key: card.key,
                  title: card.title,
                  subtitle: card.subtitle,
                  badgeText: card.badgeText,
                  badgeClass: card.badgeClass,
                  emptyBadgeClass: card.emptyBadgeClass,
                  imageSrc: uploadedImg,
                  imageAlt: card.imageAlt,
                  batches: card.stats.batches,
                  sales: card.stats.sales,
                  tanks: card.stats.tanks,
                  liveItems: card.stats.liveItems,
                })
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
              className="group rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-slate-300 hover:bg-white transition-all cursor-pointer shadow-sm hover:shadow-lg hover:shadow-slate-200/70"
              title="Detaylı canlı ve finansal bilgileri görüntülemek için tıklayın"
            >
              {uploadedImg ? (
                <div className="h-32 sm:h-40 w-full overflow-hidden relative">
                  <img
                    src={uploadedImg}
                    alt={card.imageAlt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 z-10">
                    <span className="px-1.5 py-0.5 rounded-md bg-white/90 border border-white/70 text-[10px] font-semibold text-slate-900 backdrop-blur-sm shrink-0">
                      Detay →
                    </span>
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label
                        className="inline-flex items-center gap-1 min-h-[28px] px-1.5 sm:px-2 py-1 rounded-md bg-white/95 hover:bg-white text-slate-900 border border-white/80 text-[10px] font-semibold cursor-pointer shadow-sm"
                        title="Görsel Yükle"
                      >
                        <Upload className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="sm:hidden">Yükle</span>
                        <span className="hidden sm:inline">Görsel Yükle</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleUploadSpeciesImage(card.key, file);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSpeciesImage(card.key);
                        }}
                        className="min-w-[28px] min-h-[28px] flex items-center justify-center rounded-md bg-white/95 hover:bg-rose-50 text-rose-700 border border-white/80 cursor-pointer shadow-sm"
                        title="Görseli kaldır"
                        aria-label="Görseli kaldır"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-3 right-3">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider block ${card.badgeClass}`}>
                      {card.badgeText}
                    </span>
                    <h3 className="text-sm font-bold text-white leading-tight truncate">{card.title}</h3>
                  </div>
                </div>
              ) : (
                <div className="min-h-[128px] sm:h-40 w-full bg-slate-50 border-b border-slate-200 p-2.5 sm:p-3 flex flex-col justify-between relative">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider truncate ${card.emptyBadgeClass}`}>
                      {card.badgeText}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 shrink-0">
                      Detay →
                    </span>
                  </div>

                  <div className="flex items-center justify-center my-auto py-1">
                    <label
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 active:bg-slate-200 border border-dashed border-slate-300 text-slate-700 text-[11px] font-semibold shadow-xs cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Görsel Yükle</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadSpeciesImage(card.key, file);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">
                    {card.title}
                  </h3>
                </div>
              )}

              <div className="p-2.5 space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Stok:</span>
                  <span className="text-slate-900 font-semibold font-mono tabular-nums">
                    {card.stats.totalStock} Adet
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Alınan:</span>
                  <span className="text-sky-700 font-medium font-mono tabular-nums">
                    {card.stats.totalPurchasedQty} Adet
                  </span>
                </div>
                {renderSalesOrLossRow(card.stats.totalSold, card.stats.deathCount)}
                <div className="flex items-center justify-between text-slate-500">
                  <span>Kâr / Zarar:</span>
                  <span className={`font-semibold font-mono tabular-nums ${getProfitPctClass(card.stats.profitPercentage)}`}>
                    {formatProfitPct(card.stats.profitPercentage)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Species Group Detailed Modal */}
      {selectedGroupDetail && (
        <SpeciesGroupDetailModal
          group={{
            ...selectedGroupDetail,
            imageSrc: speciesImages[selectedGroupDetail.key],
          }}
          onClose={() => setSelectedGroupDetail(null)}
          onInspectBatch={onInspectBatch}
          onUploadImage={handleUploadSpeciesImage}
          onRemoveImage={handleRemoveSpeciesImage}
        />
      )}

      {/* Business AI Efficiency Analyst Modal */}
      <BusinessAiAnalystModal
        isOpen={isAiAnalystOpen}
        onClose={() => setIsAiAnalystOpen(false)}
        businessName="AquaBreeder Pro"
        batches={batches}
        tanks={tanks}
        sales={sales}
        breedings={breedings}
        expenses={expenses}
      />
    </div>
  );
};
