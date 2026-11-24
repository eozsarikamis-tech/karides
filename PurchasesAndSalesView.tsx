import React, { useState } from 'react';
import {
  Plus,
  Search,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  Wrench,
  Package,
  Eye,
  Percent,
} from 'lucide-react';
import { BatchPurchase, Sale, Expense, Tank, SpeciesCategory } from '../types';
import { TimeFilterPeriod, TIME_FILTER_OPTIONS, isDateWithinFilter } from '../utils/dateFilters';
import { useSpeciesList, formatSpeciesLabel, formatTitleCaseTR } from '../utils/speciesStorage';
import { AddSpeciesModal } from './modals/AddSpeciesModal';
import { ItemProfitLossDetailModal, ItemProfitLossData } from './modals/ItemProfitLossDetailModal';
import { calculateBatchProfitLoss, calculateExpenseProfitLoss } from '../utils/profitLoss';
import { findMatchingBatchForSale } from '../utils/batchConsolidation';

interface PurchasesAndSalesViewProps {
  batches: BatchPurchase[];
  sales: Sale[];
  expenses?: Expense[];
  tanks: Tank[];
  onOpenAddBatch: () => void;
  onOpenAddSale: () => void;
  onOpenAddExpense?: (presetCategory?: 'equipment' | 'minerals' | 'feed' | 'packaging') => void;
  onOpenCullModal?: (batch: BatchPurchase) => void;
  onOpenSaleForBatch?: (batch: BatchPurchase) => void;
  onDeleteBatch: (batchId: string) => void;
  onDeleteSale: (saleId: string) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onTogglePaymentStatus: (saleId: string) => void;
  initialSubTab?: 'all' | 'purchases' | 'sales';
}

export const PurchasesAndSalesView: React.FC<PurchasesAndSalesViewProps> = ({
  batches,
  sales,
  expenses = [],
  tanks: _tanks,
  onOpenAddBatch,
  onOpenAddSale,
  onOpenAddExpense,
  onOpenCullModal: _onOpenCullModal,
  onOpenSaleForBatch: _onOpenSaleForBatch,
  onDeleteBatch,
  onDeleteSale,
  onDeleteExpense,
  onTogglePaymentStatus,
}) => {
  const speciesList = useSpeciesList();
  const [isAddSpeciesOpen, setIsAddSpeciesOpen] = useState(false);

  // Time range filter: 'all' | '1y' | '6m' | '3m' | '1m' | '1w'
  const [timeFilter, setTimeFilter] = useState<TimeFilterPeriod>('all');

  // Category filter: 'all' | 'livestock' | 'equipment' | 'supply'
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'livestock' | 'equipment' | 'supply'>('all');

  // Species filter (for livestock): 'all' | 'caridina' | 'neocaridina' | 'apistogramma' | custom
  const [selectedSpecies, setSelectedSpecies] = useState<'all' | SpeciesCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Açılır-kapanır ana sekmeler (Accordions for Alımlar and Satışlar)
  const [isPurchasesOpen, setIsPurchasesOpen] = useState(true);
  const [isSalesOpen, setIsSalesOpen] = useState(true);

  // Sub-accordions for category sections within Alımlar
  const [isLivestockPurchasesOpen, setIsLivestockPurchasesOpen] = useState(true);
  const [isEquipmentPurchasesOpen, setIsEquipmentPurchasesOpen] = useState(true);
  const [isSupplyPurchasesOpen, setIsSupplyPurchasesOpen] = useState(true);

  // Sub-accordions for category sections within Satışlar
  const [isLivestockSalesOpen, setIsLivestockSalesOpen] = useState(true);
  const [isEquipmentSalesOpen, setIsEquipmentSalesOpen] = useState(true);
  const [isSupplySalesOpen, setIsSupplySalesOpen] = useState(true);

  // Profit / Loss Detail Modal & dedicated section state
  const [selectedDetailItem, setSelectedDetailItem] = useState<ItemProfitLossData | null>(null);
  const [isProfitLossTableOpen, setIsProfitLossTableOpen] = useState(true);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Filter logic based on Date Range, Category, Species, & Search
  // -------------------------------------------------------------

  // 1. Canlı Alımları (Batches)
  const filteredBatches = batches.filter((b) => {
    const matchesTime = isDateWithinFilter(b.purchaseDate, timeFilter);
    const matchesCategory = categoryFilter === 'all' || categoryFilter === 'livestock';
    const matchesSpecies = selectedSpecies === 'all' || b.category === selectedSpecies;
    const matchesSearch =
      !searchQuery.trim() ||
      b.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.strain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.selectionNotes && b.selectionNotes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTime && matchesCategory && matchesSpecies && matchesSearch;
  });

  // 2. Demirbaş Alımları (Expenses with category 'equipment')
  const equipmentExpenses = expenses.filter((e) => e.category === 'equipment');
  const filteredEquipmentPurchases = equipmentExpenses.filter((e) => {
    const matchesTime = isDateWithinFilter(e.date, timeFilter);
    const matchesCategory = categoryFilter === 'all' || categoryFilter === 'equipment';
    const matchesSearch =
      !searchQuery.trim() ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTime && matchesCategory && matchesSearch;
  });

  // 3. Sarf Malzeme Alımları (Expenses with category !== 'equipment')
  const supplyExpenses = expenses.filter((e) => e.category !== 'equipment');
  const filteredSupplyPurchases = supplyExpenses.filter((e) => {
    const matchesTime = isDateWithinFilter(e.date, timeFilter);
    const matchesCategory = categoryFilter === 'all' || categoryFilter === 'supply';
    const matchesSearch =
      !searchQuery.trim() ||
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTime && matchesCategory && matchesSearch;
  });

  // 4. Satışlar (Sales) - separated by itemType ('livestock' | 'equipment' | 'supply')
  const filteredAllSales = sales.filter((s) => {
    const matchesTime = isDateWithinFilter(s.date, timeFilter);
    const sType = s.itemType || 'livestock';
    const matchesCategory = categoryFilter === 'all' || sType === categoryFilter;
    const matchesSpecies =
      sType !== 'livestock' || selectedSpecies === 'all' || !s.species || s.species === selectedSpecies;
    const matchesSearch =
      !searchQuery.trim() ||
      s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.itemDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerContact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.trackingOrNotes && s.trackingOrNotes.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTime && matchesCategory && matchesSpecies && matchesSearch;
  });

  const filteredLivestockSales = filteredAllSales.filter((s) => !s.itemType || s.itemType === 'livestock');
  const filteredEquipmentSales = filteredAllSales.filter((s) => s.itemType === 'equipment');
  const filteredSupplySales = filteredAllSales.filter((s) => s.itemType === 'supply');

  // -------------------------------------------------------------
  // Dynamic KPIs (Calculated based on active time and category filters)
  // -------------------------------------------------------------
  const livePurchasesCost = filteredBatches.reduce((acc, b) => acc + b.totalCost, 0);
  const equipPurchasesCost = filteredEquipmentPurchases.reduce((acc, e) => acc + e.amount, 0);
  const supplyPurchasesCost = filteredSupplyPurchases.reduce((acc, e) => acc + e.amount, 0);
  const totalPurchasesCost = livePurchasesCost + equipPurchasesCost + supplyPurchasesCost;

  const totalReceivedQuantity = filteredBatches.reduce((acc, b) => acc + b.quantityReceived, 0);
  const totalPurchasesCount = filteredBatches.length + filteredEquipmentPurchases.length + filteredSupplyPurchases.length;

  const totalSalesRevenue = filteredAllSales.reduce((acc, s) => acc + s.totalPrice, 0);
  const totalNetProfit = filteredAllSales.reduce((acc, s) => acc + s.netProfit, 0);
  const totalLiveSold = filteredLivestockSales.reduce((acc, s) => acc + s.quantity, 0);

  const getDeliveryLabel = (method: Sale['deliveryMethod']) => {
    switch (method) {
      case 'hand_delivery':
        return 'Elden Teslim';
      case 'no_styrofoam':
        return 'Straforsuz Gönderim';
      case 'styrofoam_box':
        return 'Strafor Kutu';
      case 'cargo_styrofoam':
        return 'Strafor Kutu + Isıtıcı Ped';
      case 'bus_freight':
        return 'Otobüs Emanet';
      default:
        return 'Teslimat';
    }
  };

  const activeTimeLabel = TIME_FILTER_OPTIONS.find((t) => t.id === timeFilter)?.label || 'Tüm Zamanlar';

  const profitLossItems: ItemProfitLossData[] = [
    ...(categoryFilter === 'all' || categoryFilter === 'livestock'
      ? filteredBatches.map((b) => calculateBatchProfitLoss(b, sales))
      : []),
    ...(categoryFilter === 'all' || categoryFilter === 'equipment'
      ? filteredEquipmentPurchases.map((eq) => calculateExpenseProfitLoss(eq, sales))
      : []),
    ...(categoryFilter === 'all' || categoryFilter === 'supply'
      ? filteredSupplyPurchases.map((sf) => calculateExpenseProfitLoss(sf, sales))
      : []),
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* View Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Alımlar & Satışlar
            </h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Canlı · Demirbaş · Sarf
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-700 border border-slate-300">
              🗓️ {activeTimeLabel}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Canlı partileri, demirbaş donanımları ve sarf malzemelerinin alım ile satışlarını zaman filtreli ayrı sekmelerle izleyin.
          </p>
        </div>

        {/* Quick Add Actions */}
        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 w-full sm:w-auto shrink-0 sm:flex-wrap">
          <button
            onClick={onOpenAddBatch}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 active:scale-[0.98] rounded-xl sm:rounded-lg transition-all cursor-pointer shadow-sm"
            title="Yeni Canlı Alımı Kaydet"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ Canlı Alımı</span>
          </button>

          {onOpenAddExpense && (
            <button
              onClick={() => onOpenAddExpense()}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.98] rounded-xl sm:rounded-lg transition-all cursor-pointer shadow-sm"
              title="Demirbaş veya Sarf Malzemesi Alımı Kaydet"
            >
              <Plus className="w-4 h-4" />
              <span>+ Demirbaş / Sarf Al</span>
            </button>
          )}

          <button
            onClick={onOpenAddSale}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] rounded-xl sm:rounded-lg transition-all cursor-pointer shadow-sm"
            title="Stoktan Adet Satışı Yap"
          >
            <Plus className="w-4 h-4" />
            <span>+ Satış Yap</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ZAMAN ARALIĞI SEÇENEKLERİ (TÜM ZAMANLAR, 1 YIL, 6 AY, 3 AY, 1 AY, 1 HAFTA)  */}
      {/* ========================================================================= */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Zaman Aralığına Göre Filtrele:</span>
            <span className="text-[11px] text-slate-500 font-normal hidden md:inline">
              (Bütün alım, harcama ve satışlar seçilen döneme göre anlık filtrelenir)
            </span>
          </div>

          <div className="text-[11px] font-mono text-emerald-700/90 font-medium">
            Seçili Dönem: <strong className="text-slate-900">{activeTimeLabel}</strong>
          </div>
        </div>

        {/* Time Filter Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
          {TIME_FILTER_OPTIONS.map((option) => {
            const isSelected = timeFilter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTimeFilter(option.id)}
                className={`flex flex-col items-center justify-center py-2.5 px-2.5 min-h-[48px] rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-200/60'
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span>{option.label}</span>
                <span
                  className={`text-[9px] mt-0.5 font-normal truncate max-w-full ${
                    isSelected ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  {option.id === 'all'
                    ? 'Tüm Kayıtlar'
                    : option.id === '1w'
                    ? 'Son 7 Gün'
                    : option.id === '1m'
                    ? 'Son 30 Gün'
                    : option.id === '3m'
                    ? 'Son 90 Gün'
                    : option.id === '6m'
                    ? 'Son 180 Gün'
                    : 'Son 365 Gün'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards Strip (Dynamically updated for the time filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-purple-500/20 shadow-sm">
          <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
            <span>Toplam Alımlar & Maliyet</span>
            <ArrowDownLeft className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            {totalPurchasesCost.toLocaleString('tr-TR')} ₺
          </span>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">
            {filteredBatches.length} Canlı · {filteredEquipmentPurchases.length} Demirbaş · {filteredSupplyPurchases.length} Sarf
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-700 mb-1">
            <span>Toplam Satış Geliri</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            +{totalSalesRevenue.toLocaleString('tr-TR')} ₺
          </span>
          <div className="mt-1 text-[11px] text-emerald-600 font-mono">
            {totalLiveSold} canlı teslim · {filteredEquipmentSales.length} demirbaş · {filteredSupplySales.length} sarf
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Net Kâr (Dönem İçi)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <span
            className={`text-xl font-bold font-mono tabular-nums ${
              totalNetProfit >= 0 ? 'text-emerald-600' : 'text-slate-700'
            }`}
          >
            {totalNetProfit >= 0 ? '+' : ''}
            {totalNetProfit.toLocaleString('tr-TR')} ₺
          </span>
          <div className="mt-1 text-[11px] text-slate-500">
            Satış Hasılatı - Satılan Ürün Maliyeti
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Toplam İşlem Hacmi</span>
            <ShoppingBag className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
            {totalPurchasesCount + filteredAllSales.length}{' '}
            <span className="text-xs font-normal text-slate-500">İşlem</span>
          </span>
          <div className="mt-1 text-[11px] text-slate-500">
            {totalPurchasesCount} Alım · {filteredAllSales.length} Satış ({activeTimeLabel})
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Canlı adı, demirbaş, sarf, alıcı veya tedarikçi ara..."
            className="w-full pl-9 pr-3 py-2.5 min-h-[44px] text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl sm:rounded-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category & Species Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {/* Category Tabs: All, Canlı, Demirbaş, Sarf */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
            {[
              { id: 'all', label: 'Tüm Kalemler' },
              { id: 'livestock', label: '🐟 Canlılar' },
              { id: 'equipment', label: '⚙️ Demirbaşlar' },
              { id: 'supply', label: '📦 Sarflar' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id as any)}
                className={`px-3 py-2 min-h-[38px] text-xs sm:text-[11px] font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  categoryFilter === tab.id
                    ? 'bg-slate-100 text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Species Filter Tabs (Active when livestock or all is shown) */}
          {(categoryFilter === 'all' || categoryFilter === 'livestock') && (
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setSelectedSpecies('all')}
                className={`px-2.5 py-2 min-h-[38px] text-[11px] font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  selectedSpecies === 'all'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tüm Türler
              </button>
              {speciesList.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => setSelectedSpecies(sp.id)}
                  className={`px-2.5 py-2 min-h-[38px] text-[11px] font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    selectedSpecies === sp.id
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {sp.isCustom ? formatTitleCaseTR(sp.name) : sp.name.split(' ')[0]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsAddSpeciesOpen(true)}
                className="px-2.5 py-2 min-h-[38px] text-[11px] font-semibold text-emerald-600 hover:text-slate-900 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                title="Yeni Tür Ekle"
              >
                <Plus className="w-3 h-3" />
                <span>+ Yeni Tür Ekle</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ÖZEL BÖLÜM: ÜRÜN BAZLI KÂR / ZARAR & % ORAN TABLOSU (CANLI · DEMİRBAŞ · SARF)*/}
      {/* ========================================================================= */}
      <section className="rounded-2xl border border-emerald-950/70 bg-white overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsProfitLossTableOpen(!isProfitLossTableOpen)}
          className="w-full p-4 sm:p-5 bg-white hover:bg-white flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-500/40 flex items-center justify-center text-emerald-600 shrink-0">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Ürün Bazlı Alım-Satım Kâr / Zarar & % Oran Tablosu
                </h2>
                <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {filteredBatches.length + filteredEquipmentPurchases.length + filteredSupplyPurchases.length} Ürün Kalemi
                </span>
                <span className="text-[11px] font-mono text-emerald-600/90 hidden sm:inline">
                  (Her bir ürüne tıklayarak detaylı alım-satım ve kâr bilgilerini açın)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Her bir canlı, demirbaş ve sarfın alım maliyetine karşı elde edilen satış geliri, net kârı ve % kâr-zarar oranı
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-xs font-medium hidden sm:inline">
              {isProfitLossTableOpen ? 'Gizle' : 'Göster'}
            </span>
            {isProfitLossTableOpen ? (
              <ChevronUp className="w-5 h-5 text-emerald-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </div>
        </button>

        {isProfitLossTableOpen && (
          <div className="p-0 md:p-5">
            {/* Mobile Cards (< md) */}
            <div className="md:hidden divide-y divide-slate-200">
              {profitLossItems.map((item) => {
                const isProfitable = item.netProfit >= 0;
                return (
                  <div
                    key={`m-${item.type}-${item.id}`}
                    onClick={() => setSelectedDetailItem(item)}
                    className="p-3.5 space-y-2.5 active:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          {item.type === 'livestock' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-purple-700 bg-purple-50 border border-purple-200">
                              🐟 Canlı
                            </span>
                          ) : item.type === 'equipment' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-blue-700 bg-blue-50 border border-blue-200">
                              ⚙️ Demirbaş
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                              📦 Sarf
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-slate-500">
                            {item.purchaseDate || '—'}
                          </span>
                        </div>
                        <div className="font-bold text-sm text-slate-900 leading-snug">
                          {item.title}
                        </div>
                        {item.supplierOrNotes && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {item.supplierOrNotes}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block text-xs font-mono px-2 py-0.5 rounded font-semibold ${
                            isProfitable
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          %{item.profitPercentage >= 0 ? '+' : ''}
                          {item.profitPercentage.toFixed(1)}
                        </span>
                        <div
                          className={`text-sm font-bold font-mono mt-1 ${
                            isProfitable ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {item.netProfit >= 0 ? '+' : ''}
                          {item.netProfit.toLocaleString('tr-TR')} ₺
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[11px] font-mono">
                      <div>
                        <span className="text-slate-500 font-sans block text-[10px]">Alım</span>
                        <span className="text-slate-800">{item.totalCost.toLocaleString('tr-TR')} ₺</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans block text-[10px]">Satış ({item.totalSoldQuantity} ad)</span>
                        <span className="text-emerald-600">+{item.totalSalesRevenue.toLocaleString('tr-TR')} ₺</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 font-sans block text-[10px]">Stok</span>
                        {item.type === 'livestock' ? (
                          <span className="text-slate-800 font-bold">{item.remainingStock} ad</span>
                        ) : item.remainingStock > 0 ? (
                          <span className="text-emerald-600 font-sans font-semibold">Stokta</span>
                        ) : (
                          <span className="text-red-600 font-sans font-semibold">Tükendi</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {profitLossItems.length === 0 && (
                <div className="py-8 px-4 text-center text-xs text-slate-500">
                  Seçilen zaman filtresine uygun alım-satım ürünü bulunamadı.
                </div>
              )}
            </div>

            {/* Desktop Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                    <th className="py-2.5 px-3">Tür</th>
                    <th className="py-2.5 px-3">Ürün / Kalem Tanımı</th>
                    <th className="py-2.5 px-3 text-right">Alış Tarihi</th>
                    <th className="py-2.5 px-3 text-right">Alım Maliyeti</th>
                    <th className="py-2.5 px-3 text-right">Satış Geliri</th>
                    <th className="py-2.5 px-3 text-center">Satılan Miktar</th>
                    <th className="py-2.5 px-3 text-right font-bold text-slate-900">Net Kâr / Zarar (₺)</th>
                    <th className="py-2.5 px-3 text-right font-bold text-emerald-700">% Kâr / Zarar Oranı</th>
                    <th className="py-2.5 px-3 text-center">Kalan Stok</th>
                    <th className="py-2.5 px-3 text-right">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {profitLossItems.map((item) => {
                    const isProfitable = item.netProfit >= 0;
                    return (
                      <tr
                        key={`${item.type}-${item.id}`}
                        onClick={() => setSelectedDetailItem(item)}
                        className="hover:bg-slate-100 transition-colors cursor-pointer group"
                        title="Tıklayarak detaylı alım-satım ve kâr bilgilerini görüntüleyin"
                      >
                        <td className="py-3 px-3">
                          {item.type === 'livestock' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-purple-700 bg-purple-50 border border-purple-200">
                              🐟 Canlı
                            </span>
                          ) : item.type === 'equipment' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-blue-700 bg-blue-50 border border-blue-200">
                              ⚙️ Demirbaş
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                              📦 Sarf
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-sans font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {item.title}
                          {item.supplierOrNotes && (
                            <div className="text-[10px] text-slate-500 font-normal truncate max-w-xs mt-0.5 font-sans">
                              {item.supplierOrNotes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-500 whitespace-nowrap">
                          {item.purchaseDate || '—'}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {item.totalCost.toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-600">
                          +{item.totalSalesRevenue.toLocaleString('tr-TR')} ₺
                        </td>
                        <td className="py-3 px-3 text-center text-slate-800">
                          {item.totalSoldQuantity} adet
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-sm">
                          <span className={isProfitable ? 'text-emerald-400' : 'text-red-400'}>
                            {item.netProfit >= 0 ? '+' : ''}
                            {item.netProfit.toLocaleString('tr-TR')} ₺
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold font-mono">
                          <span
                            className={`inline-block text-[11px] px-2 py-0.5 rounded font-semibold ${
                              isProfitable
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            %{item.profitPercentage >= 0 ? '+' : ''}
                            {item.profitPercentage.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.type === 'livestock' ? (
                            <span className="text-slate-700 font-bold">{item.remainingStock} ad</span>
                          ) : item.remainingStock > 0 ? (
                            <span className="text-emerald-600 text-[10px] font-sans font-semibold">Stokta</span>
                          ) : (
                            <span className="text-red-600 text-[10px] font-sans font-semibold">Tükendi</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedDetailItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-slate-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                            title="Tüm alım-satım ve kâr/zarar dökümünü incele"
                          >
                            <Eye className="w-3 h-3" />
                            <span>İncele</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {profitLossItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-slate-500 font-sans">
                        Seçilen zaman filtresine uygun alım-satım ürünü bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 1. BÖLÜM: ALIMLAR (GİRİŞLER) - AÇILIR-KAPANIR ANA SEKME                    */}
      {/*    Ayrı Ayrı: Canlı Alımları, Demirbaş Alımları, Sarf Alımları            */}
      {/* ========================================================================= */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsPurchasesOpen(!isPurchasesOpen)}
          className="w-full p-4 sm:p-5 bg-white hover:bg-white flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-500/40 flex items-center justify-center text-purple-600 shrink-0">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Alımlar (Girişler & Harcamalar)
                </h2>
                <span className="text-xs font-mono font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                  {totalPurchasesCount} Alım Kaydı
                </span>
                <span className="text-xs font-mono font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full hidden sm:inline">
                  Toplam Harcama: {totalPurchasesCost.toLocaleString('tr-TR')} ₺
                </span>
                <span className="text-[11px] font-mono text-purple-700/80 hidden md:inline">
                  ({activeTimeLabel})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Canlı alımları, demirbaş donanımları ve sarf malzemesi harcamaları ayrı dökümlerle
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-xs font-medium hidden sm:inline">
              {isPurchasesOpen ? 'Gizle' : 'Göster'}
            </span>
            {isPurchasesOpen ? (
              <ChevronUp className="w-5 h-5 text-purple-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </div>
        </button>

        {/* Collapsible Content */}
        {isPurchasesOpen && (
          <div className="p-3 sm:p-5 space-y-6">
            {/* ------------------------------------------------------------- */}
            {/* 1.1 CANLI ALIMLARI (Ayrı Açılır-Kapanır Sekme)                */}
            {/* ------------------------------------------------------------- */}
            {(categoryFilter === 'all' || categoryFilter === 'livestock') && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsLivestockPurchasesOpen(!isLivestockPurchasesOpen)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-50 border-b border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      🐟 Canlı Alımları (Parti Girişleri)
                    </span>
                    <span className="text-[11px] text-purple-700 font-mono font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {filteredBatches.length} Parti · {totalReceivedQuantity} Adet
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-700 hidden sm:inline">
                      Maliyet: {livePurchasesCost.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    {isLivestockPurchasesOpen ? (
                      <ChevronUp className="w-4 h-4 text-purple-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {isLivestockPurchasesOpen && (
                  <>
                    {/* Mobile Cards (< md) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {filteredBatches.map((batch) => {
                        const delKey = `batch-${batch.id}`;
                        return (
                          <div
                            key={`m-${batch.id}`}
                            onClick={() => setSelectedDetailItem(calculateBatchProfitLoss(batch, sales))}
                            className="p-3.5 space-y-2.5 active:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                                    {formatSpeciesLabel(batch.category, speciesList)}
                                  </span>
                                  {batch.isFreeInventory ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                                      Bedelsiz Yavru
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-purple-700 bg-purple-50 border border-purple-200">
                                      Satın Alım
                                    </span>
                                  )}
                                  <span className="text-[11px] font-mono text-slate-500">{batch.purchaseDate}</span>
                                </div>
                                <div className="font-bold text-sm text-slate-900">
                                  {batch.strain || batch.batchName}
                                </div>
                                {batch.supplier && (
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    Tedarikçi: {batch.supplier}
                                  </div>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-sm text-purple-700">
                                  {batch.isFreeInventory ? '0 ₺' : `-${batch.totalCost.toLocaleString('tr-TR')} ₺`}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                  {batch.quantityReceived} adet
                                </div>
                              </div>
                            </div>

                            <div
                              className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-[11px] font-mono text-slate-500">
                                {batch.isFreeInventory
                                  ? `${batch.manualValuationPrice || 0} ₺ / ad (Kıymet)`
                                  : `Birim: ${Math.round(batch.unitCost)} ₺ / ad`}
                              </span>

                              {confirmDeleteKey === delKey ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteBatch(batch.id);
                                      setConfirmDeleteKey(null);
                                    }}
                                    className="px-3 py-1.5 min-h-[36px] text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg cursor-pointer"
                                  >
                                    Sil
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteKey(null)}
                                    className="px-3 py-1.5 min-h-[36px] text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                  >
                                    Vazgeç
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteKey(delKey)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Alım Kaydını Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Sil</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {filteredBatches.length === 0 && (
                        <div className="py-8 px-4 text-center text-xs text-slate-500">
                          Seçili zaman aralığında ({activeTimeLabel}) canlı alım kaydı bulunamadı.
                        </div>
                      )}
                    </div>

                    {/* Desktop Table (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Tarih</th>
                            <th className="py-2.5 px-4">Canlı Adı & Varyete</th>
                            <th className="py-2.5 px-4">Tür</th>
                            <th className="py-2.5 px-4 text-center">Alınan Adet</th>
                            <th className="py-2.5 px-4 text-right">Birim Alış</th>
                            <th className="py-2.5 px-4 text-right">Toplam Maliyet</th>
                            <th className="py-2.5 px-4">Tedarikçi / Menşei</th>
                            <th className="py-2.5 px-4 text-center">Giriş Türü</th>
                            <th className="py-2.5 px-4 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {filteredBatches.map((batch) => {
                            const delKey = `batch-${batch.id}`;
                            return (
                              <tr
                                key={batch.id}
                                onClick={() => setSelectedDetailItem(calculateBatchProfitLoss(batch, sales))}
                                className="hover:bg-slate-100 transition-colors cursor-pointer group"
                                title="Tıklayarak bu canlının envanter, alış ve satış dökümünü inceleyin"
                              >
                                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                  {batch.purchaseDate}
                                </td>
                                <td className="py-3 px-4 font-sans font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                  <div>{batch.strain || batch.batchName}</div>
                                  {batch.selectionNotes && (
                                    <div className="text-[11px] text-slate-500 font-normal truncate max-w-xs mt-0.5">
                                      {batch.selectionNotes}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-sans text-slate-700">
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200">
                                    {formatSpeciesLabel(batch.category, speciesList)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-slate-900">
                                  {batch.quantityReceived} <span className="text-[11px] text-slate-500 font-normal">adet</span>
                                </td>
                                <td className="py-3 px-4 text-right text-slate-700">
                                  {batch.isFreeInventory
                                    ? `${batch.manualValuationPrice || 0} ₺ / ad (Kıymet)`
                                    : `${Math.round(batch.unitCost)} ₺ / ad`}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-purple-700">
                                  {batch.isFreeInventory ? '0 ₺ (Bedelsiz)' : `-${batch.totalCost.toLocaleString('tr-TR')} ₺`}
                                </td>
                                <td
                                  className="py-3 px-4 font-sans text-slate-500 max-w-xs truncate"
                                  title={batch.supplier || ''}
                                >
                                  {batch.supplier || '—'}
                                </td>
                                <td className="py-3 px-4 text-center font-sans">
                                  {batch.isFreeInventory ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-amber-700 bg-amber-50 border border-amber-200">
                                      Bedelsiz Yavru
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-purple-700 bg-purple-50 border border-purple-200">
                                      Satın Alım
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                                  {confirmDeleteKey === delKey ? (
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeleteBatch(batch.id);
                                          setConfirmDeleteKey(null);
                                        }}
                                        className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-500 rounded cursor-pointer"
                                      >
                                        Sil
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteKey(null)}
                                        className="px-2 py-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                      >
                                        Vazgeç
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteKey(delKey)}
                                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                      title="Alım Kaydını Sil"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredBatches.length === 0 && (
                            <tr>
                              <td colSpan={9} className="py-6 text-center text-slate-500 font-sans">
                                Seçili zaman aralığında ({activeTimeLabel}) canlı alım kaydı bulunamadı.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 1.2 DEMİRBAŞ ALIMLARI (Ayrı Açılır-Kapanır Sekme)              */}
            {/* ------------------------------------------------------------- */}
            {(categoryFilter === 'all' || categoryFilter === 'equipment') && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsEquipmentPurchasesOpen(!isEquipmentPurchasesOpen)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-50 border-b border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-4 h-4 text-blue-600" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      ⚙️ Demirbaş Alımları (Donanım & Ekipman)
                    </span>
                    <span className="text-[11px] text-blue-700 font-mono font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {filteredEquipmentPurchases.length} Kalem
                    </span>
                    <span className="text-xs font-mono font-semibold text-blue-700 hidden sm:inline">
                      Maliyet: {equipPurchasesCost.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    {isEquipmentPurchasesOpen ? (
                      <ChevronUp className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {isEquipmentPurchasesOpen && (
                  <>
                    {/* Mobile Cards (< md) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {filteredEquipmentPurchases.map((eq) => {
                        const delKey = `eq-${eq.id}`;
                        return (
                          <div key={`m-${eq.id}`} className="p-3.5 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  {eq.inStock !== false ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                      Mevcut ({eq.quantity !== undefined ? eq.quantity : 1} {eq.unit || 'adet'})
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-700 bg-red-50 border border-red-200">
                                      Tükendi / Hurda
                                    </span>
                                  )}
                                  <span className="text-[11px] font-mono text-slate-500">{eq.date}</span>
                                </div>
                                <div className="font-semibold text-sm text-slate-900">{eq.title}</div>
                                {eq.notes && (
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{eq.notes}</div>
                                )}
                              </div>
                              <div className="font-mono font-bold text-sm text-blue-700 shrink-0">
                                -{eq.amount.toLocaleString('tr-TR')} ₺
                              </div>
                            </div>

                            {onDeleteExpense && (
                              <div className="flex items-center justify-end pt-2 border-t border-slate-200">
                                {confirmDeleteKey === delKey ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteExpense(eq.id);
                                        setConfirmDeleteKey(null);
                                      }}
                                      className="px-3 py-1.5 min-h-[36px] text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg cursor-pointer"
                                    >
                                      Sil
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteKey(null)}
                                      className="px-3 py-1.5 min-h-[36px] text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                    >
                                      Vazgeç
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteKey(delKey)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Demirbaş Kaydını Sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Sil</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {filteredEquipmentPurchases.length === 0 && (
                        <div className="py-8 px-4 text-center text-xs text-slate-500">
                          Seçili zaman aralığında ({activeTimeLabel}) demirbaş alım kaydı bulunamadı.
                        </div>
                      )}
                    </div>

                    {/* Desktop Table (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Alış Tarihi</th>
                            <th className="py-2.5 px-4">Demirbaş Malzeme Adı</th>
                            <th className="py-2.5 px-4">Kullanım Yeri / Açıklama</th>
                            <th className="py-2.5 px-4 text-right">Alım Maliyeti</th>
                            <th className="py-2.5 px-4 text-center">Stok Durumu</th>
                            <th className="py-2.5 px-4 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {filteredEquipmentPurchases.map((eq) => {
                            const delKey = `eq-${eq.id}`;
                            return (
                              <tr key={eq.id} className="hover:bg-slate-100 transition-colors">
                                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{eq.date}</td>
                                <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                                  {eq.title}
                                </td>
                                <td className="py-3 px-4 font-sans text-slate-500 max-w-sm truncate">
                                  {eq.notes || '—'}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-blue-700">
                                  -{eq.amount.toLocaleString('tr-TR')} ₺
                                </td>
                                <td className="py-3 px-4 text-center font-sans">
                                  {eq.inStock !== false ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                      Mevcut ({eq.quantity !== undefined ? eq.quantity : 1} {eq.unit || 'adet'})
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-700 bg-red-50 border border-red-200">
                                      Tükendi / Hurda
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right font-sans">
                                  {onDeleteExpense && (
                                    confirmDeleteKey === delKey ? (
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onDeleteExpense(eq.id);
                                            setConfirmDeleteKey(null);
                                          }}
                                          className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-500 rounded cursor-pointer"
                                        >
                                          Sil
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteKey(null)}
                                          className="px-2 py-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                        >
                                          Vazgeç
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteKey(delKey)}
                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                        title="Demirbaş Kaydını Sil"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredEquipmentPurchases.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                                Seçili zaman aralığında ({activeTimeLabel}) demirbaş alım kaydı bulunamadı.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 1.3 SARF MALZEME ALIMLARI (Ayrı Açılır-Kapanır Sekme)         */}
            {/* ------------------------------------------------------------- */}
            {(categoryFilter === 'all' || categoryFilter === 'supply') && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsSupplyPurchasesOpen(!isSupplyPurchasesOpen)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-50 border-b border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      📦 Sarf Malzeme Alımları (Yem, Mineral, Kargo vb.)
                    </span>
                    <span className="text-[11px] text-amber-700 font-mono font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {filteredSupplyPurchases.length} Kalem
                    </span>
                    <span className="text-xs font-mono font-semibold text-amber-700 hidden sm:inline">
                      Maliyet: {supplyPurchasesCost.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    {isSupplyPurchasesOpen ? (
                      <ChevronUp className="w-4 h-4 text-amber-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {isSupplyPurchasesOpen && (
                  <>
                    {/* Mobile Cards (< md) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {filteredSupplyPurchases.map((sup) => {
                        const delKey = `sup-${sup.id}`;
                        return (
                          <div key={`m-${sup.id}`} className="p-3.5 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-50 border border-slate-200 uppercase font-semibold text-slate-700">
                                    {sup.category}
                                  </span>
                                  {sup.inStock !== false ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                      Mevcut ({sup.quantity !== undefined ? sup.quantity : 1} {sup.unit || 'adet'})
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-700 bg-red-50 border border-red-200">
                                      Bitti / Tükendi
                                    </span>
                                  )}
                                  <span className="text-[11px] font-mono text-slate-500">{sup.date}</span>
                                </div>
                                <div className="font-semibold text-sm text-slate-900">{sup.title}</div>
                                {sup.notes && (
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">{sup.notes}</div>
                                )}
                              </div>
                              <div className="font-mono font-bold text-sm text-amber-700 shrink-0">
                                -{sup.amount.toLocaleString('tr-TR')} ₺
                              </div>
                            </div>

                            {onDeleteExpense && (
                              <div className="flex items-center justify-end pt-2 border-t border-slate-200">
                                {confirmDeleteKey === delKey ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteExpense(sup.id);
                                        setConfirmDeleteKey(null);
                                      }}
                                      className="px-3 py-1.5 min-h-[36px] text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg cursor-pointer"
                                    >
                                      Sil
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteKey(null)}
                                      className="px-3 py-1.5 min-h-[36px] text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                    >
                                      Vazgeç
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteKey(delKey)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] text-xs text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Sarf Kaydını Sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Sil</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {filteredSupplyPurchases.length === 0 && (
                        <div className="py-8 px-4 text-center text-xs text-slate-500">
                          Seçili zaman aralığında ({activeTimeLabel}) sarf malzeme alım kaydı bulunamadı.
                        </div>
                      )}
                    </div>

                    {/* Desktop Table (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Alış Tarihi</th>
                            <th className="py-2.5 px-4">Sarf Malzeme Adı</th>
                            <th className="py-2.5 px-4">Kategori</th>
                            <th className="py-2.5 px-4">Kullanım Notu</th>
                            <th className="py-2.5 px-4 text-right">Alım Maliyeti</th>
                            <th className="py-2.5 px-4 text-center">Stok Durumu</th>
                            <th className="py-2.5 px-4 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {filteredSupplyPurchases.map((sup) => {
                            const delKey = `sup-${sup.id}`;
                            return (
                              <tr key={sup.id} className="hover:bg-slate-100 transition-colors">
                                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{sup.date}</td>
                                <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                                  {sup.title}
                                </td>
                                <td className="py-3 px-4 font-sans capitalize text-slate-700">
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-50 border border-slate-200 uppercase font-semibold">
                                    {sup.category}
                                  </span>
                                </td>
                                <td className="py-3 px-4 font-sans text-slate-500 max-w-sm truncate">
                                  {sup.notes || '—'}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-amber-700">
                                  -{sup.amount.toLocaleString('tr-TR')} ₺
                                </td>
                                <td className="py-3 px-4 text-center font-sans">
                                  {sup.inStock !== false ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                      Mevcut ({sup.quantity !== undefined ? sup.quantity : 1} {sup.unit || 'adet'})
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-700 bg-red-50 border border-red-200">
                                      Bitti / Tükendi
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right font-sans">
                                  {onDeleteExpense && (
                                    confirmDeleteKey === delKey ? (
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onDeleteExpense(sup.id);
                                            setConfirmDeleteKey(null);
                                          }}
                                          className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-500 rounded cursor-pointer"
                                        >
                                          Sil
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteKey(null)}
                                          className="px-2 py-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                        >
                                          Vazgeç
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteKey(delKey)}
                                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                        title="Sarf Kaydını Sil"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredSupplyPurchases.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                                Seçili zaman aralığında ({activeTimeLabel}) sarf malzeme alım kaydı bulunamadı.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 2. BÖLÜM: SATIŞLAR (ÇIKIŞLAR) - AÇILIR-KAPANIR ANA SEKME                  */}
      {/*    Ayrı Ayrı: Canlı Satışları, Demirbaş Satışları, Sarf Satışları         */}
      {/* ========================================================================= */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsSalesOpen(!isSalesOpen)}
          className="w-full p-4 sm:p-5 bg-white hover:bg-white flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-500/40 flex items-center justify-center text-emerald-600 shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Satışlar (Çıkışlar & Gelirler)
                </h2>
                <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  {filteredAllSales.length} Satış Kaydı
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-700 bg-slate-100 px-2 py-0.5 rounded-full hidden sm:inline">
                  Gelir: +{totalSalesRevenue.toLocaleString('tr-TR')} ₺
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full hidden sm:inline">
                  Net Kâr: +{totalNetProfit.toLocaleString('tr-TR')} ₺
                </span>
                <span className="text-[11px] font-mono text-emerald-700/80 hidden md:inline">
                  ({activeTimeLabel})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Canlı, demirbaş donanım ve sarf malzemesi satışları, teslimat yöntemleri ve kâr dökümü
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-xs font-medium hidden sm:inline">
              {isSalesOpen ? 'Gizle' : 'Göster'}
            </span>
            {isSalesOpen ? (
              <ChevronUp className="w-5 h-5 text-emerald-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </div>
        </button>

        {/* Collapsible Content */}
        {isSalesOpen && (
          <div className="p-3 sm:p-5 space-y-6">
            {/* ------------------------------------------------------------- */}
            {/* 2.1 CANLI SATIŞLARI (Ayrı Açılır-Kapanır Sekme)               */}
            {/* ------------------------------------------------------------- */}
            {(categoryFilter === 'all' || categoryFilter === 'livestock') && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsLivestockSalesOpen(!isLivestockSalesOpen)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-50 border-b border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      🐟 Canlı Satışları (Adet Teslimatları)
                    </span>
                    <span className="text-[11px] text-purple-700 font-mono font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {filteredLivestockSales.length} Satış · {totalLiveSold} Canlı
                    </span>
                    <span className="text-xs font-mono font-semibold text-emerald-600 hidden sm:inline">
                      Gelir: +{filteredLivestockSales.reduce((a, s) => a + s.totalPrice, 0).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    {isLivestockSalesOpen ? (
                      <ChevronUp className="w-4 h-4 text-purple-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {isLivestockSalesOpen && (
                  <>
                    {/* Mobile Cards (< md) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {filteredLivestockSales.map((sale) => {
                        const matchedBatch = findMatchingBatchForSale(sale, batches);
                        const delKey = `sale-${sale.id}`;
                        return (
                          <div
                            key={`m-${sale.id}`}
                            onClick={() => {
                              if (matchedBatch) {
                                setSelectedDetailItem(calculateBatchProfitLoss(matchedBatch, sales));
                              }
                            }}
                            className={`p-3.5 space-y-2.5 ${matchedBatch ? 'active:bg-slate-100 cursor-pointer' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                  {sale.species && (
                                    <span className="text-[10px] uppercase text-emerald-600 font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                                      {formatSpeciesLabel(sale.species, speciesList)}
                                    </span>
                                  )}
                                  <span className="text-[11px] font-mono text-slate-500">{sale.date}</span>
                                </div>
                                <div className="font-bold text-sm text-slate-900 leading-snug">
                                  {sale.itemDescription}
                                </div>
                                <div className="text-xs text-slate-700 mt-0.5">
                                  {sale.customerName} · <span className="text-slate-500">{sale.city}</span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-sm text-emerald-600">
                                  +{sale.totalPrice.toLocaleString('tr-TR')} ₺
                                </div>
                                <div className={`text-[11px] font-mono font-semibold ${sale.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                  Kâr: {sale.netProfit >= 0 ? '+' : ''}{sale.netProfit.toLocaleString('tr-TR')} ₺
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                              <span>{sale.quantity} ad × {sale.unitSalePrice.toLocaleString('tr-TR')} ₺</span>
                              <span className="font-sans">{getDeliveryLabel(sale.deliveryMethod)}</span>
                            </div>

                            <div
                              className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => onTogglePaymentStatus(sale.id)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                  sale.paymentStatus === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {sale.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                              </button>

                              {confirmDeleteKey === delKey ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteSale(sale.id);
                                      setConfirmDeleteKey(null);
                                    }}
                                    className="px-3 py-1.5 min-h-[38px] text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg cursor-pointer"
                                  >
                                    Sil
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteKey(null)}
                                    className="px-3 py-1.5 min-h-[38px] text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                  >
                                    Vazgeç
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteKey(delKey)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[38px] text-xs text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Satışı Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Sil</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {filteredLivestockSales.length === 0 && (
                        <div className="py-8 px-4 text-center text-xs text-slate-500">
                          Seçili zaman aralığında ({activeTimeLabel}) canlı satış kaydı bulunamadı.
                        </div>
                      )}
                    </div>

                    {/* Desktop Table (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Tarih</th>
                            <th className="py-2.5 px-4">Alıcı / Müşteri</th>
                            <th className="py-2.5 px-4">Şehir</th>
                            <th className="py-2.5 px-4">Satılan Canlı & Varyete</th>
                            <th className="py-2.5 px-4 text-center">Adet</th>
                            <th className="py-2.5 px-4 text-right">Birim Satış</th>
                            <th className="py-2.5 px-4 text-right">Toplam Hasılat</th>
                            <th className="py-2.5 px-4 text-right">Net Kâr</th>
                            <th className="py-2.5 px-4 text-center">Teslimat</th>
                            <th className="py-2.5 px-4 text-center">Ödeme</th>
                            <th className="py-2.5 px-4 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {filteredLivestockSales.map((sale) => {
                            const matchedBatch = findMatchingBatchForSale(sale, batches);
                            const delKey = `sale-${sale.id}`;
                            return (
                            <tr
                              key={sale.id}
                              onClick={() => {
                                if (matchedBatch) {
                                  setSelectedDetailItem(calculateBatchProfitLoss(matchedBatch, sales));
                                }
                              }}
                              className={`hover:bg-slate-100 transition-colors group ${
                                matchedBatch ? 'cursor-pointer' : ''
                              }`}
                              title={matchedBatch ? 'Tıklayarak bu canlının envanter, alış ve satış dökümünü inceleyin' : undefined}
                            >
                              <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{sale.date}</td>
                              <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                                {sale.customerName}
                                <div className="text-[11px] text-slate-500 font-mono font-normal">
                                  {sale.customerContact || '—'}
                                </div>
                              </td>
                              <td className="py-3 px-4 font-sans text-slate-700">{sale.city}</td>
                              <td className="py-3 px-4 font-sans">
                                <div className="text-slate-900 font-medium group-hover:text-emerald-700 transition-colors">
                                  {sale.itemDescription}
                                </div>
                                {sale.species && (
                                  <span className="text-[10px] uppercase text-emerald-600 font-mono">
                                    {formatSpeciesLabel(sale.species, speciesList)}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center font-bold text-slate-900">
                                {sale.quantity} <span className="text-[11px] text-slate-500 font-normal">ad</span>
                              </td>
                              <td className="py-3 px-4 text-right text-slate-700">
                                {sale.unitSalePrice.toLocaleString('tr-TR')} ₺ / ad
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-emerald-600">
                                <div>+{sale.totalPrice.toLocaleString('tr-TR')} ₺</div>
                                {(sale.shippingCharged ?? 0) > 0 && (
                                  <div className="text-[10px] font-normal text-slate-500">
                                    +{sale.shippingCharged?.toLocaleString('tr-TR')} ₺ Kargo
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-semibold">
                                <span className={sale.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                  {sale.netProfit >= 0 ? '+' : ''}
                                  {sale.netProfit.toLocaleString('tr-TR')} ₺
                                </span>
                                {((sale.shippingCharged ?? 0) > 0 ||
                                  (sale.shippingCost ?? 0) > 0 ||
                                  (sale.styrofoamUnitCost ?? 0) > 0 ||
                                  (sale.heatPackUnitCost ?? 0) > 0) && (
                                  <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                                    Krg: +{sale.shippingCharged ?? 0} - {sale.shippingCost ?? 0}
                                    {(sale.styrofoamUnitCost ?? 0) > 0
                                      ? ` - ${sale.styrofoamUnitCost} Str`
                                      : ''}
                                    {(sale.heatPackUnitCost ?? 0) > 0
                                      ? ` - ${sale.heatPackUnitCost} Ped`
                                      : ''}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center font-sans">
                                <span className="text-[11px] text-slate-500">
                                  {getDeliveryLabel(sale.deliveryMethod)}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center font-sans" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => onTogglePaymentStatus(sale.id)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                                    sale.paymentStatus === 'paid'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {sale.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                                </button>
                              </td>
                              <td className="py-3 px-4 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                                {confirmDeleteKey === delKey ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteSale(sale.id);
                                        setConfirmDeleteKey(null);
                                      }}
                                      className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-500 rounded cursor-pointer"
                                    >
                                      Sil
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteKey(null)}
                                      className="px-2 py-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                    >
                                      Vazgeç
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteKey(delKey)}
                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                    title="Satışı Sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                            );
                          })}
                          {filteredLivestockSales.length === 0 && (
                            <tr>
                              <td colSpan={11} className="py-6 text-center text-slate-500 font-sans">
                                Seçili zaman aralığında ({activeTimeLabel}) canlı satış kaydı bulunamadı.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2.2 DEMİRBAŞ SATIŞLARI (Ayrı Açılır-Kapanır Sekme)            */}
            {/* ------------------------------------------------------------- */}
            {(categoryFilter === 'all' || categoryFilter === 'equipment') && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsEquipmentSalesOpen(!isEquipmentSalesOpen)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-50 border-b border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-4 h-4 text-blue-600" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      ⚙️ Demirbaş Satışları (Ekipman & Donanım)
                    </span>
                    <span className="text-[11px] text-blue-700 font-mono font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {filteredEquipmentSales.length} Satış
                    </span>
                    <span className="text-xs font-mono font-semibold text-blue-700 hidden sm:inline">
                      Gelir: +{filteredEquipmentSales.reduce((a, s) => a + s.totalPrice, 0).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    {isEquipmentSalesOpen ? (
                      <ChevronUp className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {isEquipmentSalesOpen && (
                  <>
                    {/* Mobile Cards (< md) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {filteredEquipmentSales.map((sale) => {
                        const delKey = `sale-${sale.id}`;
                        return (
                          <div key={`m-${sale.id}`} className="p-3.5 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[11px] font-mono text-slate-500 block mb-0.5">{sale.date}</span>
                                <div className="font-bold text-sm text-slate-900">{sale.itemDescription}</div>
                                <div className="text-xs text-slate-700 mt-0.5">
                                  {sale.customerName} · <span className="text-slate-500">{sale.city}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-sm text-blue-700">
                                  +{sale.totalPrice.toLocaleString('tr-TR')} ₺
                                </div>
                                <div className={`text-[11px] font-mono font-semibold ${sale.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  Kâr: {sale.netProfit >= 0 ? '+' : ''}{sale.netProfit.toLocaleString('tr-TR')} ₺
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                              <span>{sale.quantity} ad · Maliyet: {sale.estimatedUnitCost.toLocaleString('tr-TR')} ₺</span>
                              <span className="font-sans">{getDeliveryLabel(sale.deliveryMethod)}</span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => onTogglePaymentStatus(sale.id)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                  sale.paymentStatus === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {sale.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                              </button>

                              {confirmDeleteKey === delKey ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteSale(sale.id);
                                      setConfirmDeleteKey(null);
                                    }}
                                    className="px-3 py-1.5 min-h-[38px] text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg cursor-pointer"
                                  >
                                    Sil
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteKey(null)}
                                    className="px-3 py-1.5 min-h-[38px] text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                  >
                                    Vazgeç
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteKey(delKey)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[38px] text-xs text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Satışı Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Sil</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {filteredEquipmentSales.length === 0 && (
                        <div className="py-8 px-4 text-center text-xs text-slate-500">
                          Seçili zaman aralığında ({activeTimeLabel}) demirbaş satış kaydı bulunamadı.
                        </div>
                      )}
                    </div>

                    {/* Desktop Table (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Tarih</th>
                            <th className="py-2.5 px-4">Alıcı / Müşteri</th>
                            <th className="py-2.5 px-4">Şehir</th>
                            <th className="py-2.5 px-4">Satılan Demirbaş</th>
                            <th className="py-2.5 px-4 text-center">Adet</th>
                            <th className="py-2.5 px-4 text-right">Alış Maliyeti</th>
                            <th className="py-2.5 px-4 text-right">Satış Fiyatı</th>
                            <th className="py-2.5 px-4 text-right">Net Kâr</th>
                            <th className="py-2.5 px-4 text-center">Teslimat</th>
                            <th className="py-2.5 px-4 text-center">Ödeme</th>
                            <th className="py-2.5 px-4 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {filteredEquipmentSales.map((sale) => {
                            const delKey = `sale-${sale.id}`;
                            return (
                              <tr key={sale.id} className="hover:bg-slate-100 transition-colors">
                                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{sale.date}</td>
                                <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                                  {sale.customerName}
                                  <div className="text-[11px] text-slate-500 font-mono font-normal">
                                    {sale.customerContact || '—'}
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-sans text-slate-700">{sale.city}</td>
                                <td className="py-3 px-4 font-sans font-medium text-slate-900">
                                  {sale.itemDescription}
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-slate-900">
                                  {sale.quantity} <span className="text-[11px] text-slate-500 font-normal">ad</span>
                                </td>
                                <td className="py-3 px-4 text-right text-slate-500">
                                  {sale.estimatedUnitCost.toLocaleString('tr-TR')} ₺
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-blue-700">
                                  <div>+{sale.totalPrice.toLocaleString('tr-TR')} ₺</div>
                                  {(sale.shippingCharged ?? 0) > 0 && (
                                    <div className="text-[10px] font-normal text-slate-500">
                                      +{sale.shippingCharged?.toLocaleString('tr-TR')} ₺ Kargo
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold">
                                  <span className={sale.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                    {sale.netProfit >= 0 ? '+' : ''}
                                    {sale.netProfit.toLocaleString('tr-TR')} ₺
                                  </span>
                                  {((sale.shippingCharged ?? 0) > 0 ||
                                    (sale.shippingCost ?? 0) > 0 ||
                                    (sale.styrofoamUnitCost ?? 0) > 0 ||
                                    (sale.heatPackUnitCost ?? 0) > 0) && (
                                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                                      Krg: +{sale.shippingCharged ?? 0} - {sale.shippingCost ?? 0}
                                      {(sale.styrofoamUnitCost ?? 0) > 0
                                        ? ` - ${sale.styrofoamUnitCost} Str`
                                        : ''}
                                      {(sale.heatPackUnitCost ?? 0) > 0
                                        ? ` - ${sale.heatPackUnitCost} Ped`
                                        : ''}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center font-sans">
                                  <span className="text-[11px] text-slate-500">
                                    {getDeliveryLabel(sale.deliveryMethod)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-sans">
                                  <button
                                    onClick={() => onTogglePaymentStatus(sale.id)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                                      sale.paymentStatus === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}
                                  >
                                    {sale.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-right font-sans">
                                  {confirmDeleteKey === delKey ? (
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeleteSale(sale.id);
                                          setConfirmDeleteKey(null);
                                        }}
                                        className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-500 rounded cursor-pointer"
                                      >
                                        Sil
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteKey(null)}
                                        className="px-2 py-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                      >
                                        Vazgeç
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteKey(delKey)}
                                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                      title="Satışı Sil"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredEquipmentSales.length === 0 && (
                            <tr>
                              <td colSpan={11} className="py-6 text-center text-slate-500 font-sans">
                                Seçili zaman aralığında ({activeTimeLabel}) demirbaş satış kaydı bulunamadı.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* 2.3 SARF MALZEME SATIŞLARI (Ayrı Açılır-Kapanır Sekme)         */}
            {/* ------------------------------------------------------------- */}
            {(categoryFilter === 'all' || categoryFilter === 'supply') && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsSupplySalesOpen(!isSupplySalesOpen)}
                  className="w-full p-3.5 bg-slate-50 hover:bg-slate-50 border-b border-slate-200 flex items-center justify-between text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      📦 Sarf Malzeme Satışları (Yem, Mineral, Paket vb.)
                    </span>
                    <span className="text-[11px] text-amber-700 font-mono font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {filteredSupplySales.length} Satış
                    </span>
                    <span className="text-xs font-mono font-semibold text-amber-700 hidden sm:inline">
                      Gelir: +{filteredSupplySales.reduce((a, s) => a + s.totalPrice, 0).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                    {isSupplySalesOpen ? (
                      <ChevronUp className="w-4 h-4 text-amber-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {isSupplySalesOpen && (
                  <>
                    {/* Mobile Cards (< md) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {filteredSupplySales.map((sale) => {
                        const delKey = `sale-${sale.id}`;
                        return (
                          <div key={`m-${sale.id}`} className="p-3.5 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[11px] font-mono text-slate-500 block mb-0.5">{sale.date}</span>
                                <div className="font-bold text-sm text-slate-900">{sale.itemDescription}</div>
                                <div className="text-xs text-slate-700 mt-0.5">
                                  {sale.customerName} · <span className="text-slate-500">{sale.city}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-mono font-bold text-sm text-amber-700">
                                  +{sale.totalPrice.toLocaleString('tr-TR')} ₺
                                </div>
                                <div className={`text-[11px] font-mono font-semibold ${sale.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  Kâr: {sale.netProfit >= 0 ? '+' : ''}{sale.netProfit.toLocaleString('tr-TR')} ₺
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                              <span>{sale.quantity} ad · Maliyet: {sale.estimatedUnitCost.toLocaleString('tr-TR')} ₺</span>
                              <span className="font-sans">{getDeliveryLabel(sale.deliveryMethod)}</span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => onTogglePaymentStatus(sale.id)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 min-h-[38px] rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                                  sale.paymentStatus === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {sale.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                              </button>

                              {confirmDeleteKey === delKey ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteSale(sale.id);
                                      setConfirmDeleteKey(null);
                                    }}
                                    className="px-3 py-1.5 min-h-[38px] text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg cursor-pointer"
                                  >
                                    Sil
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteKey(null)}
                                    className="px-3 py-1.5 min-h-[38px] text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                  >
                                    Vazgeç
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteKey(delKey)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[38px] text-xs text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  title="Satışı Sil"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Sil</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {filteredSupplySales.length === 0 && (
                        <div className="py-8 px-4 text-center text-xs text-slate-500">
                          Seçili zaman aralığında ({activeTimeLabel}) sarf malzeme satış kaydı bulunamadı.
                        </div>
                      )}
                    </div>

                    {/* Desktop Table (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Tarih</th>
                            <th className="py-2.5 px-4">Alıcı / Müşteri</th>
                            <th className="py-2.5 px-4">Şehir</th>
                            <th className="py-2.5 px-4">Satılan Sarf Malzemesi</th>
                            <th className="py-2.5 px-4 text-center">Miktar</th>
                            <th className="py-2.5 px-4 text-right">Alış Maliyeti</th>
                            <th className="py-2.5 px-4 text-right">Satış Fiyatı</th>
                            <th className="py-2.5 px-4 text-right">Net Kâr</th>
                            <th className="py-2.5 px-4 text-center">Teslimat</th>
                            <th className="py-2.5 px-4 text-center">Ödeme</th>
                            <th className="py-2.5 px-4 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {filteredSupplySales.map((sale) => {
                            const delKey = `sale-${sale.id}`;
                            return (
                              <tr key={sale.id} className="hover:bg-slate-100 transition-colors">
                                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{sale.date}</td>
                                <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                                  {sale.customerName}
                                  <div className="text-[11px] text-slate-500 font-mono font-normal">
                                    {sale.customerContact || '—'}
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-sans text-slate-700">{sale.city}</td>
                                <td className="py-3 px-4 font-sans font-medium text-slate-900">
                                  {sale.itemDescription}
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-slate-900">
                                  {sale.quantity} <span className="text-[11px] text-slate-500 font-normal">ad</span>
                                </td>
                                <td className="py-3 px-4 text-right text-slate-500">
                                  {sale.estimatedUnitCost.toLocaleString('tr-TR')} ₺
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-amber-700">
                                  <div>+{sale.totalPrice.toLocaleString('tr-TR')} ₺</div>
                                  {(sale.shippingCharged ?? 0) > 0 && (
                                    <div className="text-[10px] font-normal text-slate-500">
                                      +{sale.shippingCharged?.toLocaleString('tr-TR')} ₺ Kargo
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right font-semibold">
                                  <span className={sale.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                    {sale.netProfit >= 0 ? '+' : ''}
                                    {sale.netProfit.toLocaleString('tr-TR')} ₺
                                  </span>
                                  {((sale.shippingCharged ?? 0) > 0 ||
                                    (sale.shippingCost ?? 0) > 0 ||
                                    (sale.styrofoamUnitCost ?? 0) > 0 ||
                                    (sale.heatPackUnitCost ?? 0) > 0) && (
                                    <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                                      Krg: +{sale.shippingCharged ?? 0} - {sale.shippingCost ?? 0}
                                      {(sale.styrofoamUnitCost ?? 0) > 0
                                        ? ` - ${sale.styrofoamUnitCost} Str`
                                        : ''}
                                      {(sale.heatPackUnitCost ?? 0) > 0
                                        ? ` - ${sale.heatPackUnitCost} Ped`
                                        : ''}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center font-sans">
                                  <span className="text-[11px] text-slate-500">
                                    {getDeliveryLabel(sale.deliveryMethod)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-sans">
                                  <button
                                    onClick={() => onTogglePaymentStatus(sale.id)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                                      sale.paymentStatus === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}
                                  >
                                    {sale.paymentStatus === 'paid' ? 'Ödendi' : 'Bekliyor'}
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-right font-sans">
                                  {confirmDeleteKey === delKey ? (
                                    <div className="inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeleteSale(sale.id);
                                          setConfirmDeleteKey(null);
                                        }}
                                        className="px-2 py-1 text-[11px] font-semibold text-white bg-red-600 hover:bg-red-500 rounded cursor-pointer"
                                      >
                                        Sil
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteKey(null)}
                                        className="px-2 py-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                      >
                                        Vazgeç
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteKey(delKey)}
                                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                      title="Satışı Sil"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {filteredSupplySales.length === 0 && (
                            <tr>
                              <td colSpan={11} className="py-6 text-center text-slate-500 font-sans">
                                Seçili zaman aralığında ({activeTimeLabel}) sarf malzeme satış kaydı bulunamadı.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <AddSpeciesModal
        isOpen={isAddSpeciesOpen}
        onClose={() => setIsAddSpeciesOpen(false)}
        onSpeciesAdded={(newId) => setSelectedSpecies(newId)}
      />

      <ItemProfitLossDetailModal
        isOpen={!!selectedDetailItem}
        item={selectedDetailItem}
        onClose={() => setSelectedDetailItem(null)}
      />
    </div>
  );
};
