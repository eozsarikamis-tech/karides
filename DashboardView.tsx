import React, { useState, useRef, useEffect } from 'react';
import {
  TrendingUp,
  Wallet,
  Coins,
  PlusCircle,
  Fish,
  Image as ImageIcon,
  Check,
  Sparkles,
} from 'lucide-react';
import { BatchPurchase, Tank, Sale, BreedingSpawn, Expense } from '../types';
import { BusinessProfile, calculateHatcheryMetrics } from '../utils/storage';
import { useSpeciesList, formatSpeciesLabel } from '../utils/speciesStorage';
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

const HERO_BIOTOPE_IMAGE = '/images/south_america_biotope_1794001814309.jpg';
const HERO_HOME_RACKS_IMAGE = '/images/home_fishroom_racks_1794584113641.jpg';

const HERO_IMAGE_OPTIONS = [
  {
    images: HERO_BIOTOPE_IMAGE,
    label: 'Güney Amerika Biyotop (Önceki)',
    alt: 'Tekil Güney Amerika Biyotop Akvaryumu - Apistogramma Doğal Yaşam Alanı',
  },
  {
    images: HERO_HOME_RACKS_IMAGE,
    label: 'Ev İşletmesi (2 Set Akvaryum)',
    alt: 'Karides Yuvası Ev İşletmesi - Neocaridina, Caridina ve Cüce Cichlid Akvaryum Setleri',
  },
];

function resolveBusinessHeroImage(biz?: BusinessProfile): { src: string; alt: string } {
  if (biz?.heroImage) {
    const matched = HERO_IMAGE_OPTIONS.find((opt) => opt.src === biz.heroImage);
    return {
      src: biz.heroImage,
      alt: matched?.alt || `${biz.name} Kapak Görseli`,
    };
  }

  const normName = (biz?.name || '').trim().toLocaleLowerCase('tr-TR');
  const isEvIsletmesi =
    normName.includes('ev işletme') ||
    normName.includes('ev isletme') ||
    /\bev\b/.test(normName);

  if (isEvIsletmesi) {
    return {
      src: HERO_HOME_RACKS_IMAGE,
      alt: HERO_IMAGE_OPTIONS[1].alt,
    };
  }

  if (
    normName.includes('karides yuvası') ||
    normName.includes('karides yuvasi') ||
    biz?.id === 'biz-a'
  ) {
    return {
      src: HERO_BIOTOPE_IMAGE,
      alt: HERO_IMAGE_OPTIONS[0].alt,
    };
  }

  if (biz && biz.id !== 'biz-a') {
    return {
      src: HERO_HOME_RACKS_IMAGE,
      alt: HERO_IMAGE_OPTIONS[1].alt,
    };
  }

  return {
    src: HERO_BIOTOPE_IMAGE,
    alt: HERO_IMAGE_OPTIONS[0].alt,
  };
}

const DEFAULT_GROUP_THEMES = [
  {
    gradient: 'from-emerald-950/90 via-teal-900/40 to-slate-950',
    accentText: 'text-emerald-300',
    iconBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  },
  {
    gradient: 'from-purple-950/90 via-indigo-900/40 to-slate-950',
    accentText: 'text-purple-300',
    iconBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
  },
  {
    gradient: 'from-cyan-950/90 via-sky-900/40 to-slate-950',
    accentText: 'text-cyan-300',
    iconBg: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
  },
  {
    gradient: 'from-rose-950/90 via-pink-900/40 to-slate-950',
    accentText: 'text-rose-300',
    iconBg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
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

function getCustomGroupImage(
  id: string,
  label: string,
  strains: string[]
): { src: string; alt: string } | null {
  const haystack = `${id} ${label} ${strains.join(' ')}`.toLocaleLowerCase('tr-TR');
  if (
    haystack.includes('cory') ||
    haystack.includes('sterbai') ||
    haystack.includes('çöpçü') ||
    haystack.includes('copcu')
  ) {
    return {
      public: '/images/images/sterbai_corydoras_1794583669825.jpg',
      alt: 'Corydoras Sterbai',
    };
  }
  if (
    haystack.includes('canlı doğuran') ||
    haystack.includes('canli doguran') ||
    haystack.includes('canli_doguran') ||
    haystack.includes('doğuran') ||
    haystack.includes('doguran') ||
    haystack.includes('lepistes') ||
    haystack.includes('guppy') ||
    haystack.includes('full red')
  ) {
    return {
      public: '/images/images/full_red_guppy_1794583668541.jpg',
      alt: 'Full Red Lepistes',
    };
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
  const [isHeroMenuOpen, setIsHeroMenuOpen] = useState(false);
  const [isAiAnalystOpen, setIsAiAnalystOpen] = useState(false);
  const [selectedGroupDetail, setSelectedGroupDetail] =
    useState<SpeciesGroupDetailData | null>(null);
  const heroMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (heroMenuRef.current && !heroMenuRef.current.contains(event.target as Node)) {
        setIsHeroMenuOpen(false);
      }
    };
    if (isHeroMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHeroMenuOpen]);

  const activeHero = resolveBusinessHeroImage(activeBusiness);

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

      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-visible border border-slate-200 bg-white shadow-xl">
        <div className="relative h-48 sm:h-72 md:h-[400px] w-full overflow-hidden rounded-2xl">
          <img
            src={activeHero.src}
            alt={activeHero.alt}
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 pointer-events-none" />

          {/* Cover image switcher in bottom left */}
          {onUpdateHeroImage && (
            <div ref={heroMenuRef} className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 z-20">
              <button
                type="button"
                onClick={() => setIsHeroMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 text-xs font-medium text-slate-900 bg-white/95 hover:bg-white border border-white/80 backdrop-blur-md rounded-lg transition-all cursor-pointer shadow-lg"
                title="Kapak görselini seçin"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Görsel Seç</span>
              </button>

              {isHeroMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-slate-300 bg-white backdrop-blur-md shadow-2xl p-1.5 space-y-1">
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                    Kapak Görseli Seç
                  </div>
                  {HERO_IMAGE_OPTIONS.map((opt) => {
                    const isSelected = activeHero.src === opt.src;
                    return (
                      <button
                        key={opt.src}
                        type="button"
                        onClick={() => {
                          onUpdateHeroImage(opt.src);
                          setIsHeroMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 min-h-[42px] px-2.5 py-2 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={opt.src}
                            alt={opt.label}
                            className="w-9 h-6 rounded object-cover shrink-0 border border-slate-300"
                            referrerPolicy="no-referrer"
                          />
                          <span className="truncate font-medium">{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Action buttons in bottom right */}
          <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 flex items-center gap-2 z-10">
            <button
              onClick={onOpenAddBatch}
              className="min-h-[40px] px-3.5 sm:px-4 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-black/40"
            >
              Satın Alma
            </button>
            <button
              onClick={onOpenAddSale}
              className="min-h-[40px] px-3.5 sm:px-4 py-2 text-xs font-semibold text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 backdrop-blur-md rounded-lg transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-black/40"
            >
              Satış
            </button>
          </div>
        </div>
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
        {/* Caridina Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            setSelectedGroupDetail({
              key: 'caridina',
              title: 'Crystal Red & Taiwan Bee',
              subtitle: 'Caridina Karides Kolonisi',
              badgeText: 'Caridina Kolonisi',
              badgeClass: 'text-red-300',
              imageSrc: '/images/caridina_crystal_shrimp_1793999662698.jpg',
              imageAlt: 'Caridina Crystal Red Shrimp',
              batches: caridinaStats.batches,
              sales: caridinaStats.sales,
              tanks: caridinaStats.tanks,
              liveItems: caridinaStats.liveItems,
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
          <div className="h-28 sm:h-40 w-full overflow-hidden relative">
            <img
              public="/images/caridina_crystal_shrimp_1793999662698.jpg"
              alt="Caridina Crystal Red Shrimp"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-white/90 border border-white/70 text-[10px] font-semibold text-slate-900 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm">
              Detay →
            </span>
            <div className="absolute bottom-2 left-3 right-3">
              <span className="text-[10px] font-semibold text-red-300 uppercase tracking-wider block">
                Caridina Kolonisi
              </span>
              <h3 className="text-sm font-bold text-white leading-tight truncate">Crystal Red & Taiwan Bee</h3>
            </div>
          </div>
          <div className="p-2.5 space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-slate-500">
              <span>Stok:</span>
              <span className="text-slate-900 font-semibold font-mono tabular-nums">
                {caridinaStats.totalStock} Adet
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Alınan:</span>
              <span className="text-sky-700 font-medium font-mono tabular-nums">
                {caridinaStats.totalPurchasedQty} Adet
              </span>
            </div>
            {renderSalesOrLossRow(caridinaStats.totalSold, caridinaStats.deathCount)}
            <div className="flex items-center justify-between text-slate-500">
              <span>Kâr / Zarar:</span>
              <span className={`font-semibold font-mono tabular-nums ${getProfitPctClass(caridinaStats.profitPercentage)}`}>
                {formatProfitPct(caridinaStats.profitPercentage)}
              </span>
            </div>
          </div>
        </div>

        {/* Neocaridina Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            setSelectedGroupDetail({
              key: 'neocaridina',
              title: 'Blue Dream & Bloody Mary',
              subtitle: 'Neocaridina Karides Kolonisi',
              badgeText: 'Neocaridina Kolonisi',
              badgeClass: 'text-blue-300',
              imageSrc: '/public/images/neocaridina_blue_shrimp_1793999664008.jpg',
              imageAlt: 'Neocaridina Blue Dream Shrimp',
              batches: neocaridinaStats.batches,
              sales: neocaridinaStats.sales,
              tanks: neocaridinaStats.tanks,
              liveItems: neocaridinaStats.liveItems,
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
          <div className="h-28 sm:h-40 w-full overflow-hidden relative">
            <img
              src="/images/neocaridina_blue_shrimp_1793999664008.jpg"
              alt="Neocaridina Blue Dream Shrimp"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-white/90 border border-white/70 text-[10px] font-semibold text-slate-900 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm">
              Detay →
            </span>
            <div className="absolute bottom-2 left-3 right-3">
              <span className="text-[10px] font-semibold text-blue-300 uppercase tracking-wider block">
                Neocaridina Kolonisi
              </span>
              <h3 className="text-sm font-bold text-white leading-tight truncate">Blue Dream & Bloody Mary</h3>
            </div>
          </div>
          <div className="p-2.5 space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-slate-500">
              <span>Stok:</span>
              <span className="text-slate-900 font-semibold font-mono tabular-nums">
                {neocaridinaStats.totalStock} Adet
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Alınan:</span>
              <span className="text-sky-700 font-medium font-mono tabular-nums">
                {neocaridinaStats.totalPurchasedQty} Adet
              </span>
            </div>
            {renderSalesOrLossRow(neocaridinaStats.totalSold, neocaridinaStats.deathCount)}
            <div className="flex items-center justify-between text-slate-500">
              <span>Kâr / Zarar:</span>
              <span className={`font-semibold font-mono tabular-nums ${getProfitPctClass(neocaridinaStats.profitPercentage)}`}>
                {formatProfitPct(neocaridinaStats.profitPercentage)}
              </span>
            </div>
          </div>
        </div>

        {/* Apistogramma Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            setSelectedGroupDetail({
              key: 'apistogramma',
              title: 'Apistogramma Çiftleri',
              subtitle: 'Güney Amerika Cüce Cichlid Hatları',
              badgeText: 'Cüce Cichlid',
              badgeClass: 'text-amber-300',
              imagePublic: '/images/apistogramma_cichlid_1793999664297.jpg',
              imageAlt: 'Apistogramma Cacatuoides Dwarf Cichlid',
              batches: apistogrammaStats.batches,
              sales: apistogrammaStats.sales,
              tanks: apistogrammaStats.tanks,
              liveItems: apistogrammaStats.liveItems,
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
          <div className="h-28 sm:h-40 w-full overflow-hidden relative">
            <img
              src="/public/images/apistogramma_cichlid_1793999664297.jpg"
              alt="Apistogramma Cacatuoides Dwarf Cichlid"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-white/90 border border-white/70 text-[10px] font-semibold text-slate-900 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm">
              Detay →
            </span>
            <div className="absolute bottom-2 left-3 right-3">
              <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider block">
                Cüce Cichlid
              </span>
              <h3 className="text-sm font-bold text-white leading-tight truncate">Apistogramma Çiftleri</h3>
            </div>
          </div>
          <div className="p-2.5 space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-slate-500">
              <span>Stok:</span>
              <span className="text-slate-900 font-semibold font-mono tabular-nums">
                {apistogrammaStats.totalStock} Adet
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Alınan:</span>
              <span className="text-sky-700 font-medium font-mono tabular-nums">
                {apistogrammaStats.totalPurchasedQty} Adet
              </span>
            </div>
            {renderSalesOrLossRow(apistogrammaStats.totalSold, apistogrammaStats.deathCount)}
            <div className="flex items-center justify-between text-slate-500">
              <span>Kâr / Zarar:</span>
              <span className={`font-semibold font-mono tabular-nums ${getProfitPctClass(apistogrammaStats.profitPercentage)}`}>
                {formatProfitPct(apistogrammaStats.profitPercentage)}
              </span>
            </div>
          </div>
        </div>

        {/* Pleco Card (Sturisoma panamense) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() =>
            setSelectedGroupDetail({
              key: 'pleco',
              title: 'Sturisoma panamense',
              subtitle: 'Pleco & Vatos Grubu',
              badgeText: 'Pleco Grubu',
              badgeClass: 'text-teal-300',
              imageSrc: '/public/images/sturisoma_panamense_pleco_1794584454696.jpg',
              imageAlt: 'Sturisoma panamense - Pleco',
              batches: plecoStats.batches,
              sales: plecoStats.sales,
              tanks: plecoStats.tanks,
              liveItems: plecoStats.liveItems,
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
          <div className="h-28 sm:h-40 w-full overflow-hidden relative">
            <img
              src="/public/images/sturisoma_panamense_pleco_1794584454696.jpg"
              alt="Sturisoma panamense - Pleco"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-white/90 border border-white/70 text-[10px] font-semibold text-slate-900 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm">
              Detay →
            </span>
            <div className="absolute bottom-2 left-3 right-3">
              <span className="text-[10px] font-semibold text-teal-300 uppercase tracking-wider block">
                Pleco Grubu
              </span>
              <h3 className="text-sm font-bold text-white leading-tight truncate">Sturisoma panamense</h3>
            </div>
          </div>
          <div className="p-2.5 space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-slate-500">
              <span>Stok:</span>
              <span className="text-slate-900 font-semibold font-mono tabular-nums">
                {plecoStats.totalStock} Adet
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Alınan:</span>
              <span className="text-sky-700 font-medium font-mono tabular-nums">
                {plecoStats.totalPurchasedQty} Adet
              </span>
            </div>
            {renderSalesOrLossRow(plecoStats.totalSold, plecoStats.deathCount)}
            <div className="flex items-center justify-between text-slate-500">
              <span>Kâr / Zarar:</span>
              <span className={`font-semibold font-mono tabular-nums ${getProfitPctClass(plecoStats.profitPercentage)}`}>
                {formatProfitPct(plecoStats.profitPercentage)}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamically Added / Defined Extra Live Animal Group Cards */}
        {extraLiveGroups.map((group, idx) => {
          const theme = DEFAULT_GROUP_THEMES[idx % DEFAULT_GROUP_THEMES.length];
          const customImg = getCustomGroupImage(group.id, group.label, group.strains);
          return (
            <div
              key={group.id}
              role="button"
              tabIndex={0}
              onClick={() =>
                setSelectedGroupDetail({
                  key: group.id,
                  title: group.label,
                  subtitle:
                    group.strains.length > 0
                      ? group.strains.join(', ')
                      : 'Tanımlı Canlı Grubu',
                  badgeText: 'Tanımlı Canlı Grubu',
                  badgeClass: theme.accentText,
                  imageSrc: customImg?.src,
                  imageAlt: customImg?.alt,
                  gradientClass: theme.gradient,
                  batches: group.batches,
                  sales: group.sales,
                  tanks: group.tanks,
                  liveItems: group.liveItems,
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
              <div
                className={`h-28 sm:h-40 w-full overflow-hidden relative ${
                  customImg ? '' : `bg-gradient-to-br ${theme.gradient}`
                }`}
              >
                {customImg ? (
                  <img
                    src={customImg.src}
                    alt={customImg.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:scale-110 transition-transform duration-500">
                      <Fish className="w-16 sm:w-20 h-16 sm:h-20 text-white" />
                    </div>
                    <div className="absolute top-2 right-2">
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${theme.iconBg}`}>
                        <Fish className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-white/90 border border-white/70 text-[10px] font-semibold text-slate-900 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                  Detay →
                </span>
                <div className="absolute bottom-2 left-3 right-3">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider block ${theme.accentText}`}>
                    Tanımlı Canlı Grubu
                  </span>
                  <h3 className="text-sm font-bold text-white leading-tight truncate">{group.label}</h3>
                </div>
              </div>
              <div className="p-2.5 space-y-1 text-[11px]">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Stok:</span>
                  <span className="text-slate-900 font-semibold font-mono tabular-nums">
                    {group.totalStock} Adet
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Alınan:</span>
                  <span className="text-sky-700 font-medium font-mono tabular-nums">
                    {group.totalPurchasedQty} Adet
                  </span>
                </div>
                {renderSalesOrLossRow(group.totalSold, group.deathCount)}
                <div className="flex items-center justify-between text-slate-500">
                  <span>Kâr / Zarar:</span>
                  <span className={`font-semibold font-mono tabular-nums ${getProfitPctClass(group.profitPercentage)}`}>
                    {formatProfitPct(group.profitPercentage)}
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
          group={selectedGroupDetail}
          onClose={() => setSelectedGroupDetail(null)}
          onInspectBatch={onInspectBatch}
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
