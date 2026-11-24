import React, { useState } from 'react';
import {
  Sparkles,
  Wrench,
  Package,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Eye,
  Hash,
  Check,
  Info,
  FileText,
  Filter,
} from 'lucide-react';
import { BatchPurchase, Expense, Sale, Tank } from '../types';
import { calculateBusinessValuation } from '../utils/storage';
import { DirectStockEditModal } from './modals/DirectStockEditModal';
import { ItemProfitLossDetailModal, ItemProfitLossData } from './modals/ItemProfitLossDetailModal';
import { calculateBatchProfitLoss, calculateExpenseProfitLoss } from '../utils/profitLoss';
import { useSpeciesList, formatSpeciesLabel } from '../utils/speciesStorage';

interface InventoryViewProps {
  batches: BatchPurchase[];
  sales: Sale[];
  expenses: Expense[];
  tanks?: Tank[];
  onOpenManualItemDefinition: () => void;
  onUpdateBatch: (batch: BatchPurchase) => void;
  onUpdateExpense: (expense: Expense) => void;
  onDeleteBatch: (batchId: string) => void;
  onDeleteExpense: (expenseId: string) => void;
  onUpdateBatchStock?: (batchId: string, newStock: number) => void;
  onUpdateExpenseStock?: (expenseId: string, newStock: number) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  batches,
  sales,
  expenses,
  tanks = [],
  onOpenManualItemDefinition,
  onUpdateBatch,
  onUpdateExpense,
  onDeleteBatch: _onDeleteBatch,
  onDeleteExpense: _onDeleteExpense,
  onUpdateBatchStock,
  onUpdateExpenseStock,
}) => {
  const speciesList = useSpeciesList();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'livestock' | 'equipment' | 'supply'>('all');

  // Modal states for DirectStockEditModal and Profit/Loss Detail
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockModalCategory, setStockModalCategory] = useState<'livestock' | 'equipment' | 'supply'>('livestock');
  const [stockModalItemId, setStockModalItemId] = useState<string | undefined>(undefined);
  const [detailItem, setDetailItem] = useState<ItemProfitLossData | null>(null);

  // Inline edit state for typing stock numbers directly in the tables
  const [editingLiveStock, setEditingLiveStock] = useState<{ [id: string]: string }>({});
  const [editingExpenseStock, setEditingExpenseStock] = useState<{ [id: string]: string }>({});

  const handleSaveBatchDirectStock = (batch: BatchPurchase, countStr: string) => {
    const count = parseInt(countStr, 10);
    if (isNaN(count) || count < 0) return;
    if (onUpdateBatchStock) {
      onUpdateBatchStock(batch.id, count);
    } else {
      onUpdateBatch({
        ...batch,
        manualStockCount: count,
        markedForSale: count,
        status: count === 0 ? 'completed' : 'active_selection',
      });
    }
    setEditingLiveStock((prev) => {
      const next = { ...prev };
      delete next[batch.id];
      return next;
    });
  };

  const handleSaveExpenseDirectStock = (expense: Expense, countStr: string) => {
    const count = parseInt(countStr, 10);
    if (isNaN(count) || count < 0) return;
    if (onUpdateExpenseStock) {
      onUpdateExpenseStock(expense.id, count);
    } else {
      const today = new Date().toISOString().split('T')[0];
      onUpdateExpense({
        ...expense,
        quantity: count,
        inStock: count > 0,
        depletedDate: count === 0 ? today : undefined,
        depletionReason: count === 0 ? 'Tükendi / Stok Sıfırlandı' : undefined,
      });
    }
    setEditingExpenseStock((prev) => {
      const next = { ...prev };
      delete next[expense.id];
      return next;
    });
  };

  // Accordion open/close states (Açılır-kapanır sekmeler)
  const [isAvailableOpen, setIsAvailableOpen] = useState(true);
  const [isDepletedOpen, setIsDepletedOpen] = useState(true);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogSubTab, setCatalogSubTab] = useState<'all' | 'livestock' | 'equipment' | 'supply'>('all');

  // Açılır-kapanır açıklamalar ve bilgilendirme rehberi state'leri
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [areDescriptionsExpanded, setAreDescriptionsExpanded] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<{ [id: string]: boolean }>({});

  const toggleDescription = (id: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Alt tabloların açılır-kapanır durumları
  const [isLiveAvailableOpen, setIsLiveAvailableOpen] = useState(true);
  const [isEquipAvailableOpen, setIsEquipAvailableOpen] = useState(true);
  const [isSupplyAvailableOpen, setIsSupplyAvailableOpen] = useState(true);

  const [isLiveDepletedOpen, setIsLiveDepletedOpen] = useState(true);
  const [isEquipDepletedOpen, setIsEquipDepletedOpen] = useState(true);
  const [isSupplyDepletedOpen, setIsSupplyDepletedOpen] = useState(true);

  const [isLiveCatalogOpen, setIsLiveCatalogOpen] = useState(true);
  const [isEquipCatalogOpen, setIsEquipCatalogOpen] = useState(true);
  const [isSupplyCatalogOpen, setIsSupplyCatalogOpen] = useState(true);

  // Tür filtreleme (klik ile türleri grup halinde seçme)
  const [selectedSpeciesFilters, setSelectedSpeciesFilters] = useState<string[]>([]);

  // Sistemdeki benzersiz canlı türleri listesi
  const availableSpeciesList = React.useMemo(() => {
    const set = new Set<string>();
    batches.forEach((b) => {
      if (b.category && b.status !== 'culled') set.add(b.category);
    });
    return Array.from(set);
  }, [batches]);

  const toggleSpeciesFilter = (species: string) => {
    const sLower = species.toLowerCase();
    setSelectedSpeciesFilters((prev) => {
      if (prev.includes(sLower)) {
        return prev.filter((s) => s !== sLower);
      } else {
        return [...prev, sLower];
      }
    });
  };

  const clearSpeciesFilters = () => {
    setSelectedSpeciesFilters([]);
  };

  // Calculate live item valuations & remaining counts
  const valuation = calculateBusinessValuation(batches, sales, expenses);

  // Group Livestock into Available (Mevcut) and Depleted (Tükenenler)
  const livestockItemsWithStock = valuation.liveItems.map((item) => {
    const rawBatch = batches.find((b) => b.id === item.batchId);
    const isDepleted = item.remainingStock <= 0 || (rawBatch && rawBatch.status === 'completed');
    return {
      ...item,
      rawBatch,
      isDepleted,
    };
  });

  const availableLivestock = livestockItemsWithStock.filter((item) => !item.isDepleted);
  const depletedLivestock = livestockItemsWithStock.filter((item) => item.isDepleted);

  // Group Equipment (Demirbaş) into Available and Depleted
  const equipmentExpenses = expenses.filter((e) => e.category === 'equipment');
  const availableEquipment = equipmentExpenses.filter((e) =>
    e.quantity !== undefined ? e.quantity > 0 : e.inStock !== false
  );
  const depletedEquipment = equipmentExpenses.filter((e) =>
    e.quantity !== undefined ? e.quantity <= 0 : e.inStock === false
  );

  // Group Supplies (Sarf) into Available and Depleted
  const supplyExpenses = expenses.filter((e) => e.category !== 'equipment');
  const availableSupplies = supplyExpenses.filter((e) =>
    e.quantity !== undefined ? e.quantity > 0 : e.inStock !== false
  );
  const depletedSupplies = supplyExpenses.filter((e) =>
    e.quantity !== undefined ? e.quantity <= 0 : e.inStock === false
  );

  // Totals for KPIs
  const totalAvailableLiveCount = availableLivestock.reduce((acc, i) => acc + i.remainingStock, 0);
  const totalAvailableLiveValuation = availableLivestock.reduce((acc, i) => acc + i.totalValuation, 0);
  const totalAvailableEquipCount = availableEquipment.reduce(
    (acc, e) => acc + (e.quantity !== undefined ? e.quantity : 1),
    0
  );
  const totalAvailableEquipCost = availableEquipment.reduce((acc, e) => acc + e.amount, 0);
  const totalAvailableSuppliesCount = availableSupplies.reduce(
    (acc, e) => acc + (e.quantity !== undefined ? e.quantity : 1),
    0
  );
  const totalAvailableSuppliesCost = availableSupplies.reduce((acc, e) => acc + e.amount, 0);

  const totalDepletedCount =
    depletedLivestock.length + depletedEquipment.length + depletedSupplies.length;

  // Toggle Handlers
  const handleToggleExpenseStock = (expense: Expense) => {
    const isCurrentlyInStock = expense.quantity !== undefined ? expense.quantity > 0 : expense.inStock !== false;
    const today = new Date().toISOString().split('T')[0];
    onUpdateExpense({
      ...expense,
      inStock: !isCurrentlyInStock,
      quantity: isCurrentlyInStock ? 0 : 1,
      depletedDate: isCurrentlyInStock ? today : undefined,
      depletionReason: isCurrentlyInStock ? 'Kullanıldı / Tükendi' : undefined,
    });
  };

  const handleMarkBatchDepleted = (batch: BatchPurchase) => {
    onUpdateBatch({
      ...batch,
      manualStockCount: 0,
      status: 'completed',
      markedForSale: 0,
      keptForBreeding: 0,
    });
  };

  const handleRestoreBatchToStock = (batch: BatchPurchase) => {
    onUpdateBatch({
      ...batch,
      status: 'active_selection',
      manualStockCount: Math.max(1, batch.quantityReceived - batch.mortalityCount),
      markedForSale: Math.max(1, batch.quantityReceived - batch.mortalityCount),
    });
  };

  // Filter helper
  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="space-y-8">
      {/* View Header with Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Envanter & Stok Yönetimi
            </h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Canlı · Demirbaş · Sarf
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Üretimhanenizdeki mevcut stoklarınızı, tükenen ürünleri ve tanımlı malzeme kataloğunu tek merkezden izleyin.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
          <button
            onClick={onOpenManualItemDefinition}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-md shadow-indigo-200/60 active:scale-[0.98] cursor-pointer border border-indigo-400/30"
          >
            <PlusCircle className="w-4 h-4 text-indigo-700" />
            <span>Yeni Malzeme Tanımla</span>
          </button>
        </div>
      </div>

      {/* Collapsible Envanter & Stok Yönetimi Bilgilendirme ve Açıklamaları */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-950/40 to-slate-900/40 overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-900 tracking-wide">
                Envanter & Stok Yönetimi Açıklamaları ve Kullanım Rehberi
              </span>
              <span className="text-[11px] text-slate-500 ml-2 hidden sm:inline">
                (Stok sayısı girişi, tükenenler akışı ve ortalama birim maliyet rehberi)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-medium">
            <span>{isGuideOpen ? 'Açıklamaları Gizle' : 'Açıklamaları Göster'}</span>
            {isGuideOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
        {isGuideOpen && (
          <div className="p-4 pt-1 border-t border-slate-200 text-xs text-slate-700 space-y-3 leading-relaxed bg-slate-50 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-emerald-600 block mb-1">1. Doğrudan Stok Sayısı Yazma</span>
                Mevcut stok tablolarında her satırdaki kutucuğa doğrudan yeni adet, metre veya gram yazıp <strong>Kaydet</strong> butonuna basabilirsiniz. Stok <strong>0</strong> yapıldığında ürün otomatik olarak <strong>Tükenenler</strong> başlığına aktarılır.
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-indigo-600 block mb-1">2. Ortalama Birim Maliyet</span>
                <strong>Ort. Alış Fiyatı</strong> ilk alımdaki birim maliyettir. <strong>Ortalama Birim Maliyet</strong> ise <em>(Toplam Alım Tutarı ÷ Güncel Kalan Stok)</em> formülüyle anlık maliyet yükünü gösterir.
              </div>
              <div className="p-3 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-amber-600 block mb-1">3. Ölçü Birimleri & Açıklamalar</span>
                Demirbaş ve sarfları <strong>metre</strong>, <strong>adet</strong> ve <strong>gram</strong> birimleriyle kaydedebilir; her kalemin ıslah, garanti veya kullanım açıklamalarını tek tıkla açıp kapatabilirsiniz.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white border border-purple-500/30 shadow-sm">
          <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
            <span>Mevcut Canlı Stoğu</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {totalAvailableLiveCount} <span className="text-xs font-normal text-slate-500">Adet</span>
          </div>
          <div className="mt-1 text-[11px] text-purple-700/80 font-mono">
            {totalAvailableLiveValuation.toLocaleString('tr-TR')} ₺ envanter kıymeti
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-blue-500/30 shadow-sm">
          <div className="flex items-center justify-between text-xs text-blue-700 mb-1">
            <span>Mevcut Demirbaş Stoğu</span>
            <Wrench className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {totalAvailableEquipCount} <span className="text-xs font-normal text-slate-500">Adet ({availableEquipment.length} Kalem)</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-700/80 font-mono">
            {totalAvailableEquipCost.toLocaleString('tr-TR')} ₺ alım değeri
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-amber-500/30 shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-700 mb-1">
            <span>Mevcut Sarf Stoğu</span>
            <Package className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {totalAvailableSuppliesCount} <span className="text-xs font-normal text-slate-500">Adet ({availableSupplies.length} Kalem)</span>
          </div>
          <div className="mt-1 text-[11px] text-amber-700/80 font-mono">
            {totalAvailableSuppliesCost.toLocaleString('tr-TR')} ₺ alım tutarı
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-red-500/30 shadow-sm">
          <div className="flex items-center justify-between text-xs text-red-700 mb-1">
            <span>Tükenen Kalemler</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600 font-mono tabular-nums">
            {totalDepletedCount} <span className="text-xs font-normal text-slate-500">Kalem</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Stokta kalmayan / biten ürünler
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Canlı adı, demirbaş, sarf malzemesi veya not ara..."
            className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Category Filters and Descriptions Toggle */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <div className="flex items-center gap-1 shrink-0">
            {[
              { id: 'all', label: 'Tüm Malzemeler' },
              { id: 'livestock', label: '🐟 Canlılar' },
              { id: 'equipment', label: '⚙️ Demirbaşlar' },
              { id: 'supply', label: '📦 Sarflar' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategoryFilter(tab.id as any)}
                className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  activeCategoryFilter === tab.id
                    ? 'bg-slate-100 text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAreDescriptionsExpanded(!areDescriptionsExpanded)}
            className={`inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer border whitespace-nowrap shrink-0 ${
              areDescriptionsExpanded
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
                : 'bg-slate-50 text-slate-500 hover:text-slate-800 border-slate-200'
            }`}
            title="Tablolardaki tüm malzeme açıklamalarını tek tıkla açın veya kapatın"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{areDescriptionsExpanded ? 'Açıklamaları Kapat ▴' : 'Açıklamaları Aç ▾'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: MEVCUT STOKLAR (AÇILIR-KAPANIR SEKME)                        */}
      {/* ========================================================================= */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsAvailableOpen(!isAvailableOpen)}
          className="w-full p-4 sm:p-5 bg-white hover:bg-white flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-500/40 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Mevcut Stoklar
                </h2>
                <span className="text-xs font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {availableLivestock.length + availableEquipment.length + availableSupplies.length} Aktif Kalem
                </span>
                <span className="text-xs font-mono font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full hidden sm:inline">
                  {totalAvailableLiveCount} Canlı Stoğu
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Şu an üretimhanede mevcut olan canlılar, aktif donanımlar ve sarf malzemeleri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-xs font-medium hidden sm:inline">
              {isAvailableOpen ? 'Gizle' : 'Göster'}
            </span>
            {isAvailableOpen ? (
              <ChevronUp className="w-5 h-5 text-emerald-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </div>
        </button>

        {/* Collapsible Content */}
        {isAvailableOpen && (
          <div className="p-4 sm:p-5 space-y-6">
            {/* 1.1 Mevcut Canlı Stoğu */}
            {(activeCategoryFilter === 'all' || activeCategoryFilter === 'livestock') && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLiveAvailableOpen(!isLiveAvailableOpen)}
                      className="p-1 -ml-1 text-slate-500 hover:text-slate-900 rounded transition-colors cursor-pointer"
                      title={isLiveAvailableOpen ? 'Bölümü Gizle' : 'Bölümü Genişlet'}
                    >
                      {isLiveAvailableOpen ? (
                        <ChevronUp className="w-4 h-4 text-purple-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <button
                      type="button"
                      onClick={() => setIsLiveAvailableOpen(!isLiveAvailableOpen)}
                      className="text-xs font-bold text-slate-900 uppercase tracking-wider hover:text-purple-700 transition-colors cursor-pointer text-left"
                    >
                      Mevcut Canlı Stoğu
                    </button>
                    <span className="text-[11px] text-purple-700 font-mono font-semibold">
                      ({availableLivestock.filter((i) => matchesSearch(i.strain || i.batchName)).length} parti)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setStockModalCategory('livestock');
                        setStockModalItemId(undefined);
                        setIsStockModalOpen(true);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold text-purple-700 hover:text-slate-900 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-lg transition-colors cursor-pointer"
                      title="Canlı türü için doğrudan güncel stok sayısını güncelleyin"
                    >
                      <Hash className="w-3.5 h-3.5 text-purple-600" />
                      <span>+ Canlı Stoğu Güncelle</span>
                    </button>
                    <span className="text-xs font-mono text-purple-700 font-bold hidden sm:inline">
                      Toplam: {totalAvailableLiveCount} Adet Canlı
                    </span>
                  </div>
                </div>

                {isLiveAvailableOpen && (
                  <div>
                    {/* Tür Grubu Seçimi / Klik Filtresi */}
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-1 mr-1">
                          <Filter className="w-3.5 h-3.5 text-purple-600" />
                          <span>Tür Seçimi (Grup):</span>
                        </span>

                        <button
                          type="button"
                          onClick={clearSpeciesFilters}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            selectedSpeciesFilters.length === 0
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-white text-slate-500 hover:text-slate-900 border border-slate-200'
                          }`}
                          title="Tüm canlı türlerini göster"
                        >
                          Tüm Türler ({availableLivestock.length})
                        </button>

                        {availableSpeciesList.map((species) => {
                          const sLower = species.toLowerCase();
                          const isSelected = selectedSpeciesFilters.includes(sLower);
                          const count = availableLivestock.filter(
                            (i) => (i.category || '').toLowerCase() === sLower
                          ).length;

                          return (
                            <button
                              key={species}
                              type="button"
                              onClick={() => toggleSpeciesFilter(species)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-purple-50 text-purple-700 border-purple-500 shadow-sm'
                                  : 'bg-white text-slate-500 hover:text-slate-800 border-slate-200 hover:border-slate-300'
                              }`}
                              title={`Tıkla: '${formatSpeciesLabel(species, speciesList)}' türünü grup filtreye ekle / çıkar`}
                            >
                              <span>{formatSpeciesLabel(species, speciesList)}</span>
                              <span
                                className={`text-[10px] font-mono px-1 rounded ${
                                  isSelected
                                    ? 'bg-purple-800 text-purple-100'
                                    : 'bg-slate-50 text-slate-500'
                                }`}
                              >
                                {count}
                              </span>
                              {isSelected && <Check className="w-3 h-3 text-purple-700" />}
                            </button>
                          );
                        })}
                      </div>

                      {selectedSpeciesFilters.length > 0 && (
                        <button
                          type="button"
                          onClick={clearSpeciesFilters}
                          className="text-[11px] text-purple-600 hover:text-purple-700 underline cursor-pointer"
                        >
                          Seçimleri Temizle ({selectedSpeciesFilters.length} tür seçili)
                        </button>
                      )}
                    </div>

                    {/* Mobile Card List (Mevcut Canlı Stoğu) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {(() => {
                        const filteredLive = availableLivestock.filter((item) => {
                          const matchesText = matchesSearch(`${item.batchName} ${item.strain}`);
                          const matchesSpecies =
                            selectedSpeciesFilters.length === 0 ||
                            selectedSpeciesFilters.includes((item.category || '').toLowerCase());
                          return matchesText && matchesSpecies;
                        });
                        if (filteredLive.length === 0) {
                          return (
                            <div className="py-6 text-center text-xs text-slate-500">
                              Mevcut stokta canlı bulunamadı.
                            </div>
                          );
                        }
                        return filteredLive.map((item) => {
                          const pl = item.rawBatch ? calculateBatchProfitLoss(item.rawBatch, sales) : null;
                          const isProfitable = pl ? pl.netProfit >= 0 : false;
                          const totalPurchaseCost = item.rawBatch?.totalCost || 0;
                          const currentStockCount = item.remainingStock;
                          const avgUnitCost = currentStockCount > 0 ? totalPurchaseCost / currentStockCount : 0;

                          return (
                            <div
                              key={item.batchId}
                              onClick={() => {
                                if (pl) setDetailItem(pl);
                              }}
                              className="p-3.5 space-y-2.5 active:bg-slate-100 cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-slate-900 leading-snug">
                                    {item.strain || item.batchName}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSpeciesFilter(item.category || '');
                                    }}
                                    className="mt-1 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-50 text-purple-700 border border-slate-200"
                                  >
                                    {formatSpeciesLabel(item.category || '', speciesList)}
                                  </button>
                                </div>
                                <span className="font-mono text-xs font-bold text-emerald-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                                  {item.remainingStock} ad
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1.5 border-t border-slate-200">
                                <div>
                                  <span className="text-slate-500 block">Birim Maliyet</span>
                                  <span className="font-mono font-semibold text-indigo-700">
                                    {currentStockCount > 0 ? `${avgUnitCost.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ₺` : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Kâr / Zarar</span>
                                  {pl ? (
                                    <span className={`font-mono font-bold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                                      {pl.netProfit >= 0 ? '+' : ''}{pl.netProfit.toLocaleString('tr-TR')} ₺
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <span className="text-slate-500 block">Envanter Kıymeti</span>
                                  <span className="font-mono font-bold text-slate-900">
                                    {item.totalValuation.toLocaleString('tr-TR')} ₺
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Desktop Table (Mevcut Canlı Stoğu) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Canlı Adı & Varyete</th>
                            <th
                              className="py-2.5 px-4 cursor-pointer hover:text-purple-700 transition-colors select-none"
                              onClick={() => {
                                if (selectedSpeciesFilters.length > 0) {
                                  clearSpeciesFilters();
                                }
                              }}
                              title={
                                selectedSpeciesFilters.length > 0
                                  ? `Filtreyi temizlemek ve tüm türleri görmek için tıklayın (${selectedSpeciesFilters.length} tür seçili)`
                                  : "Aşağıdaki tür etiketlerine veya yukarıdaki grup butonlarına tıklayarak filtreleyin"
                              }
                            >
                              <div className="flex items-center gap-1.5">
                                <span>Tür</span>
                                <Filter className={`w-3 h-3 ${selectedSpeciesFilters.length > 0 ? 'text-purple-600' : 'text-purple-600 opacity-80'}`} />
                                {selectedSpeciesFilters.length > 0 && (
                                  <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded font-mono">
                                    {selectedSpeciesFilters.length}
                                  </span>
                                )}
                              </div>
                            </th>
                            <th className="py-2.5 px-4 text-center">Mevcut Stok</th>
                            <th className="py-2.5 px-4 text-right" title="İlk satın alma esnasındaki birim alış fiyatı">
                              Ort. Alış Fiyatı
                            </th>
                            <th className="py-2.5 px-4 text-right text-indigo-700" title="Toplam Alım Fiyatı ÷ Güncel Stok Sayısı">
                              Ortalama Birim Maliyet
                            </th>
                            <th className="py-2.5 px-4 text-right">Kâr / Zarar & % Oran</th>
                            <th className="py-2.5 px-4 text-right">Toplam Envanter</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {availableLivestock
                            .filter((item) => {
                              const matchesText = matchesSearch(`${item.batchName} ${item.strain}`);
                              const matchesSpecies =
                                selectedSpeciesFilters.length === 0 ||
                                selectedSpeciesFilters.includes((item.category || '').toLowerCase());
                              return matchesText && matchesSpecies;
                            })
                            .map((item) => {
                              const pl = item.rawBatch ? calculateBatchProfitLoss(item.rawBatch, sales) : null;
                              const isProfitable = pl ? pl.netProfit >= 0 : false;
                              const totalPurchaseCost = item.rawBatch?.totalCost || 0;
                              const currentStockCount = item.remainingStock;
                              const avgUnitCost = currentStockCount > 0 ? totalPurchaseCost / currentStockCount : 0;

                              return (
                                <tr
                                  key={item.batchId}
                                  onClick={() => {
                                    if (pl) setDetailItem(pl);
                                  }}
                                  className="hover:bg-slate-100 transition-colors cursor-pointer group"
                                  title="Tıklayarak detaylı alım-satım ve kâr/zarar dökümünü inceleyin"
                                >
                                  <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                                    <div className="group-hover:text-indigo-700 transition-colors">
                                      {item.strain || item.batchName}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 font-sans text-slate-700" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      type="button"
                                      onClick={() => toggleSpeciesFilter(item.category || '')}
                                      className={`text-[11px] px-2.5 py-0.5 rounded-md border transition-all cursor-pointer inline-flex items-center gap-1 ${
                                        selectedSpeciesFilters.includes((item.category || '').toLowerCase())
                                          ? 'bg-purple-100 text-purple-700 border-purple-500 font-bold shadow-sm ring-1 ring-purple-500/50'
                                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-purple-600 hover:text-purple-700'
                                      }`}
                                      title={`Tıkla: '${formatSpeciesLabel(item.category || '', speciesList)}' grubunu seç / filtrele`}
                                    >
                                      <span>{formatSpeciesLabel(item.category || '', speciesList)}</span>
                                      {selectedSpeciesFilters.includes((item.category || '').toLowerCase()) && (
                                        <Check className="w-2.5 h-2.5 text-purple-600" />
                                      )}
                                    </button>
                                  </td>
                                  <td className="py-3 px-4 text-center font-sans">
                                    <span className="font-mono text-xs font-bold text-emerald-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block">
                                      {item.remainingStock} <span className="text-[11px] text-slate-500 font-normal">ad</span>
                                    </span>
                                  </td>
                                  {/* Ort. Alış Fiyatı */}
                                  <td className="py-3 px-4 text-right text-slate-700 font-mono">
                                    {item.isFreeInventory ? (
                                      <span className="text-amber-600">
                                        {item.rawBatch?.manualValuationPrice
                                          ? `${item.rawBatch.manualValuationPrice.toLocaleString('tr-TR')} ₺ (Kıymet)`
                                          : '0 ₺ (Bedelsiz)'}
                                      </span>
                                    ) : (
                                      <span>
                                        {(item.rawBatch?.unitCost ?? (item.rawBatch && item.rawBatch.quantityReceived > 0 ? item.rawBatch.totalCost / item.rawBatch.quantityReceived : 0)).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ₺ / ad
                                      </span>
                                    )}
                                  </td>
                                  {/* Ortalama Birim Maliyet */}
                                  <td className="py-3 px-4 text-right font-mono">
                                    {currentStockCount > 0 ? (
                                      <div>
                                        <div className="font-bold text-indigo-700 text-sm">
                                          {avgUnitCost.toLocaleString('tr-TR', {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 2,
                                          })}{' '}
                                          ₺ / ad
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-sans">
                                          {totalPurchaseCost.toLocaleString('tr-TR')} ₺ ÷ {currentStockCount} ad
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-slate-500">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right font-sans">
                                    {pl ? (
                                      <div>
                                        <div className={`font-mono font-bold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                                          {pl.netProfit >= 0 ? '+' : ''}
                                          {pl.netProfit.toLocaleString('tr-TR')} ₺
                                        </div>
                                        <span
                                          className={`inline-block text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                            isProfitable
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              : 'bg-red-50 text-red-700 border border-red-200'
                                          }`}
                                        >
                                          %{pl.profitPercentage >= 0 ? '+' : ''}
                                          {pl.profitPercentage.toFixed(1)} K/Z
                                        </span>
                                      </div>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                                    {item.totalValuation.toLocaleString('tr-TR')} ₺
                                  </td>
                                </tr>
                              );
                            })}
                          {availableLivestock.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                                Mevcut stokta canlı bulunamadı.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 1.2 Mevcut Demirbaş Stoğu */}
            {(activeCategoryFilter === 'all' || activeCategoryFilter === 'equipment') && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEquipAvailableOpen(!isEquipAvailableOpen)}
                      className="p-1 -ml-1 text-slate-500 hover:text-slate-900 rounded transition-colors cursor-pointer"
                      title={isEquipAvailableOpen ? 'Bölümü Gizle' : 'Bölümü Genişlet'}
                    >
                      {isEquipAvailableOpen ? (
                        <ChevronUp className="w-4 h-4 text-blue-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <Wrench className="w-4 h-4 text-blue-600" />
                    <button
                      type="button"
                      onClick={() => setIsEquipAvailableOpen(!isEquipAvailableOpen)}
                      className="text-xs font-bold text-slate-900 uppercase tracking-wider hover:text-blue-700 transition-colors cursor-pointer text-left"
                    >
                      Mevcut Demirbaş Stoğu
                    </button>
                    <span className="text-[11px] text-blue-700 font-mono font-semibold">
                      ({availableEquipment.filter((e) => matchesSearch(`${e.title} ${e.notes}`)).length} kalem)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setStockModalCategory('equipment');
                        setStockModalItemId(undefined);
                        setIsStockModalOpen(true);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-slate-900 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-lg transition-colors cursor-pointer"
                      title="Demirbaş stoğunu doğrudan güncelleyin"
                    >
                      <Hash className="w-3.5 h-3.5 text-blue-600" />
                      <span>+ Demirbaş Stoğu Güncelle</span>
                    </button>
                    <span className="text-xs font-mono text-blue-700 font-bold hidden sm:inline">
                      Toplam Değer: {totalAvailableEquipCost.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                </div>

                {isEquipAvailableOpen && (
                  <>
                    {/* Mobile Cards (Demirbaş) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {availableEquipment
                        .filter((e) => matchesSearch(`${e.title} ${e.notes}`))
                        .map((exp) => {
                          const pl = calculateExpenseProfitLoss(exp, sales);
                          const currentQty = exp.quantity !== undefined ? exp.quantity : 1;
                          const origQty = exp.quantity !== undefined && exp.quantity > 0 ? exp.quantity : 1;
                          const unitCost = exp.amount / origQty;
                          const usedInTanksCount = tanks.reduce((sum, t) => {
                            if (t.filtrationExpenseId === exp.id) {
                              return sum + (t.filtrationUsedCount ?? 1);
                            }
                            return sum;
                          }, 0);

                          return (
                            <div
                              key={exp.id}
                              onClick={() => setDetailItem(pl)}
                              className="p-3.5 space-y-2 active:bg-slate-100 cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-slate-900 leading-snug">{exp.title}</div>
                                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">{exp.date}</div>
                                </div>
                                <div className="text-right shrink-0 space-y-1">
                                  <span className="font-mono text-xs font-bold text-blue-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block">
                                    {currentQty} {exp.unit || 'ad'}
                                  </span>
                                  {usedInTanksCount > 0 && (
                                    <span className="block font-mono text-[10px] text-cyan-700">
                                      ({usedInTanksCount} kullanılan)
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200">
                                <span className="text-slate-500 font-mono">
                                  Birim: {unitCost.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ₺ / {exp.unit || 'ad'}
                                </span>
                                <span className="font-mono font-bold text-blue-700 text-xs">
                                  {exp.amount.toLocaleString('tr-TR')} ₺
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      {availableEquipment.length === 0 && (
                        <div className="py-6 text-center text-xs text-slate-500">
                          Mevcut demirbaş kaydı bulunamadı.
                        </div>
                      )}
                    </div>

                    {/* Desktop Table (Demirbaş) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Demirbaş Adı</th>
                            <th className="py-2.5 px-4">Alış Tarihi</th>
                            <th className="py-2.5 px-4 text-center">Mevcut Stok</th>
                            <th className="py-2.5 px-4 text-right" title="İlk alımdaki birim alış fiyatı">
                              Ort. Alış Fiyatı
                            </th>
                            <th className="py-2.5 px-4 text-right">Alım Değeri</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {availableEquipment
                            .filter((e) => matchesSearch(`${e.title} ${e.notes}`))
                            .map((exp) => {
                              const pl = calculateExpenseProfitLoss(exp, sales);
                              const currentQty = exp.quantity !== undefined ? exp.quantity : 1;
                              const origQty = exp.quantity !== undefined && exp.quantity > 0 ? exp.quantity : 1;
                              const unitCost = exp.amount / origQty;
                              const usedInTanksCount = tanks.reduce((sum, t) => {
                                if (t.filtrationExpenseId === exp.id) {
                                  return sum + (t.filtrationUsedCount ?? 1);
                                }
                                return sum;
                              }, 0);

                              return (
                                <tr
                                  key={exp.id}
                                  onClick={() => setDetailItem(pl)}
                                  className="hover:bg-slate-100 transition-colors cursor-pointer group"
                                  title="Tıklayarak detaylı alım-satım ve kâr bilgilerini görüntüleyin"
                                >
                                  <td className="py-3 px-4 font-sans font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                                    {exp.title}
                                  </td>
                                  <td className="py-3 px-4 text-slate-500">{exp.date}</td>
                                  <td className="py-3 px-4 text-center font-sans">
                                    <div className="inline-flex items-center justify-center gap-1.5 flex-wrap">
                                      <span className="font-mono text-xs font-bold text-blue-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block">
                                        {currentQty} <span className="text-[11px] text-slate-500 font-normal">{exp.unit || 'ad'}</span>
                                      </span>
                                      {usedInTanksCount > 0 && (
                                        <span
                                          className="font-mono text-[11px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200"
                                          title="Akvaryumlarda aktif olarak kullanılan miktar (demirbaş stoğundan düşülmez)"
                                        >
                                          ({usedInTanksCount} kullanılan)
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right text-slate-700 font-mono">
                                    {unitCost.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}{' '}
                                    ₺ / {exp.unit || 'ad'}
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-blue-700">
                                    {exp.amount.toLocaleString('tr-TR')} ₺
                                  </td>
                                </tr>
                              );
                            })}
                          {availableEquipment.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                                Mevcut demirbaş kaydı bulunamadı.
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

            {/* 1.3 Mevcut Sarf Stoğu */}
            {(activeCategoryFilter === 'all' || activeCategoryFilter === 'supply') && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSupplyAvailableOpen(!isSupplyAvailableOpen)}
                      className="p-1 -ml-1 text-slate-500 hover:text-slate-900 rounded transition-colors cursor-pointer"
                      title={isSupplyAvailableOpen ? 'Bölümü Gizle' : 'Bölümü Genişlet'}
                    >
                      {isSupplyAvailableOpen ? (
                        <ChevronUp className="w-4 h-4 text-amber-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <Package className="w-4 h-4 text-amber-600" />
                    <button
                      type="button"
                      onClick={() => setIsSupplyAvailableOpen(!isSupplyAvailableOpen)}
                      className="text-xs font-bold text-slate-900 uppercase tracking-wider hover:text-amber-700 transition-colors cursor-pointer text-left"
                    >
                      Mevcut Sarf Stoğu
                    </button>
                    <span className="text-[11px] text-amber-700 font-mono font-semibold">
                      ({availableSupplies.filter((e) => matchesSearch(`${e.title} ${e.notes}`)).length} kalem)
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setStockModalCategory('supply');
                        setStockModalItemId(undefined);
                        setIsStockModalOpen(true);
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold text-amber-700 hover:text-slate-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                      title="Sarf stoğunu doğrudan güncelleyin"
                    >
                      <Hash className="w-3.5 h-3.5 text-amber-600" />
                      <span>+ Sarf Stoğu Güncelle</span>
                    </button>
                    <span className="text-xs font-mono text-amber-700 font-bold hidden sm:inline">
                      Toplam Değer: {totalAvailableSuppliesCost.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                </div>

                {isSupplyAvailableOpen && (
                  <>
                    {/* Mobile Cards (Sarf) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {availableSupplies
                        .filter((e) => matchesSearch(`${e.title} ${e.notes}`))
                        .map((exp) => {
                          const pl = calculateExpenseProfitLoss(exp, sales);
                          const isProfitable = pl.netProfit >= 0;
                          const currentQty = exp.quantity !== undefined ? exp.quantity : 1;
                          const avgUnitCost = currentQty > 0 ? exp.amount / currentQty : 0;

                          return (
                            <div
                              key={exp.id}
                              onClick={() => setDetailItem(pl)}
                              className="p-3.5 space-y-2 active:bg-slate-100 cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-slate-900 leading-snug">{exp.title}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-50 border border-slate-200 uppercase font-semibold text-slate-700">
                                      {exp.category}
                                    </span>
                                    <span className="text-[11px] text-slate-500 font-mono">{exp.date}</span>
                                  </div>
                                </div>
                                <span className="font-mono text-xs font-bold text-amber-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                                  {currentQty} {exp.unit || 'ad'}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1.5 border-t border-slate-200">
                                <div>
                                  <span className="text-slate-500 block">Ort. Birim</span>
                                  <span className="font-mono font-semibold text-amber-700">
                                    {currentQty > 0 ? `${avgUnitCost.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ₺` : '—'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Kâr / Zarar</span>
                                  <span className={`font-mono font-bold ${isProfitable ? 'text-emerald-600' : 'text-slate-500'}`}>
                                    {pl.netProfit >= 0 ? '+' : ''}{pl.netProfit.toLocaleString('tr-TR')} ₺
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-slate-500 block">Alım Tutarı</span>
                                  <span className="font-mono font-bold text-amber-700">
                                    {exp.amount.toLocaleString('tr-TR')} ₺
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      {availableSupplies.length === 0 && (
                        <div className="py-6 text-center text-xs text-slate-500">
                          Mevcut sarf malzeme kaydı bulunamadı.
                        </div>
                      )}
                    </div>

                    {/* Desktop Table (Sarf) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Sarf Malzeme Adı</th>
                            <th className="py-2.5 px-4">Kategori</th>
                            <th className="py-2.5 px-4 text-center">Mevcut Stok</th>
                            <th className="py-2.5 px-4 text-right" title="İlk alımdaki birim alış fiyatı">
                              Ort. Alış Fiyatı
                            </th>
                            <th className="py-2.5 px-4 text-right text-amber-700" title="Toplam Alım Fiyatı ÷ Güncel Stok Sayısı">
                              Ortalama Birim Maliyet
                            </th>
                            <th className="py-2.5 px-4 text-right">Alım Tutarı</th>
                            <th className="py-2.5 px-4 text-right">Kâr / Zarar & % Oran</th>
                            <th className="py-2.5 px-4">Alış Tarihi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {availableSupplies
                            .filter((e) => matchesSearch(`${e.title} ${e.notes}`))
                            .map((exp) => {
                              const pl = calculateExpenseProfitLoss(exp, sales);
                              const isProfitable = pl.netProfit >= 0;
                              const currentQty = exp.quantity !== undefined ? exp.quantity : 1;
                              const origQty = exp.quantity !== undefined && exp.quantity > 0 ? exp.quantity : 1;
                              const unitCost = exp.amount / origQty;
                              const avgUnitCost = currentQty > 0 ? exp.amount / currentQty : 0;

                              return (
                                <tr
                                  key={exp.id}
                                  onClick={() => setDetailItem(pl)}
                                  className="hover:bg-slate-100 transition-colors cursor-pointer group"
                                  title="Tıklayarak detaylı alım-satım ve kâr bilgilerini görüntüleyin"
                                >
                                  <td className="py-3 px-4 font-sans font-semibold text-slate-900 group-hover:text-amber-700 transition-colors">
                                    {exp.title}
                                  </td>
                                  <td className="py-3 px-4 font-sans text-slate-700">
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-50 border border-slate-200 uppercase font-semibold">
                                      {exp.category}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center font-sans">
                                    <span className="font-mono text-xs font-bold text-amber-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 inline-block">
                                      {currentQty} <span className="text-[11px] text-slate-500 font-normal">{exp.unit || 'ad'}</span>
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right text-slate-700 font-mono">
                                    {unitCost.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}{' '}
                                    ₺ / {exp.unit || 'ad'}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono">
                                    {currentQty > 0 ? (
                                      <div>
                                        <div className="font-bold text-amber-700 text-sm">
                                          {avgUnitCost.toLocaleString('tr-TR', {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 2,
                                          })}{' '}
                                          ₺ / {exp.unit || 'ad'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-sans">
                                          {exp.amount.toLocaleString('tr-TR')} ₺ ÷ {currentQty} {exp.unit || 'ad'}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-slate-500">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-amber-700">
                                    {exp.amount.toLocaleString('tr-TR')} ₺
                                  </td>
                                  <td className="py-3 px-4 text-right font-sans">
                                    <div>
                                      <div className={`font-mono font-bold ${isProfitable ? 'text-emerald-600' : 'text-slate-500'}`}>
                                        {pl.netProfit >= 0 ? '+' : ''}
                                        {pl.netProfit.toLocaleString('tr-TR')} ₺
                                      </div>
                                      <span
                                        className={`inline-block text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                                          isProfitable
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-white text-slate-500 border border-slate-200'
                                        }`}
                                      >
                                        %{pl.profitPercentage >= 0 ? '+' : ''}
                                        {pl.profitPercentage.toFixed(1)} K/Z
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-slate-500">{exp.date}</td>
                                </tr>
                              );
                            })}
                          {availableSupplies.length === 0 && (
                            <tr>
                              <td colSpan={8} className="py-6 text-center text-slate-500 font-sans">
                                Mevcut sarf malzeme kaydı bulunamadı.
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
      {/* SECTION 2: TÜKENENLER (AÇILIR-KAPANIR SEKME)                             */}
      {/* ========================================================================= */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsDepletedOpen(!isDepletedOpen)}
          className="w-full p-4 sm:p-5 bg-white hover:bg-white flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-500/40 flex items-center justify-center text-red-600 shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Tükenenler
                </h2>
                <span className="text-xs font-mono font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  {totalDepletedCount} Stokta Kalmayan Kalem
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tamamı satılan canlılar, ömrünü tamamlayan donanımlar veya biten sarf malzemeleri
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-xs font-medium hidden sm:inline">
              {isDepletedOpen ? 'Gizle' : 'Göster'}
            </span>
            {isDepletedOpen ? (
              <ChevronUp className="w-5 h-5 text-red-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </div>
        </button>

        {/* Collapsible Content */}
        {isDepletedOpen && (
          <div className="p-4 sm:p-5 space-y-6">
            {/* 2.1 Tükenen Canlılar */}
            {(activeCategoryFilter === 'all' || activeCategoryFilter === 'livestock') && (
              <div className="rounded-xl border border-red-950/60 bg-white overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsLiveDepletedOpen(!isLiveDepletedOpen)}
                      className="p-1 -ml-1 text-slate-500 hover:text-slate-900 rounded transition-colors cursor-pointer"
                      title={isLiveDepletedOpen ? 'Bölümü Gizle' : 'Bölümü Genişlet'}
                    >
                      {isLiveDepletedOpen ? (
                        <ChevronUp className="w-4 h-4 text-red-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <Sparkles className="w-4 h-4 text-red-600" />
                    <button
                      type="button"
                      onClick={() => setIsLiveDepletedOpen(!isLiveDepletedOpen)}
                      className="text-xs font-bold text-red-700 uppercase tracking-wider hover:text-red-100 transition-colors cursor-pointer text-left"
                    >
                      Tükenen Canlı Stoğu (Stokta Kalmayanlar)
                    </button>
                    <span className="text-[11px] text-red-600 font-mono font-semibold">
                      ({depletedLivestock.filter((i) => matchesSearch(i.strain || i.batchName)).length} parti)
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Tüm bireyleri satılmış veya amorti edilmiş canlılar
                  </span>
                </div>

                {isLiveDepletedOpen && (
                  <>
                    {/* Mobile Cards (Tükenen Canlılar) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {depletedLivestock
                        .filter((item) => matchesSearch(`${item.batchName} ${item.strain}`))
                        .map((item) => (
                          <div
                            key={item.batchId}
                            onClick={() => {
                              if (item.rawBatch) {
                                setDetailItem(calculateBatchProfitLoss(item.rawBatch, sales));
                              }
                            }}
                            className="p-3.5 space-y-2.5 cursor-pointer active:bg-slate-100"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-800">{item.strain || item.batchName}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {formatSpeciesLabel(item.category || '', speciesList)} · Alım: {item.rawBatch?.purchaseDate || '—'}
                                </div>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-700 bg-red-50 border border-red-200 shrink-0">
                                Tükendi
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200">
                              <div className="text-[11px] text-slate-500 font-mono">
                                Alınan: <strong className="text-slate-800">{item.quantityReceived}</strong> · Satılan: <strong className="text-emerald-600">{item.totalSold}</strong>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.rawBatch) handleRestoreBatchToStock(item.rawBatch);
                                }}
                                className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-slate-900 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Stoğa Al</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      {depletedLivestock.length === 0 && (
                        <div className="py-6 text-center text-xs text-slate-500">
                          Stokta tükenen canlı partisi yok (tüm canlılar mevcut).
                        </div>
                      )}
                    </div>

                    {/* Desktop Table (Tükenen Canlılar) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Canlı Adı & Varyete</th>
                            <th className="py-2.5 px-4">Tür</th>
                            <th className="py-2.5 px-4 text-center">Toplam Alınan</th>
                            <th className="py-2.5 px-4 text-center">Satılan Adet</th>
                            <th className="py-2.5 px-4 text-center">Kalan Stok</th>
                            <th className="py-2.5 px-4 text-center">Durum</th>
                            <th className="py-2.5 px-4 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {depletedLivestock
                            .filter((item) => matchesSearch(`${item.batchName} ${item.strain}`))
                            .map((item) => (
                              <tr
                                key={item.batchId}
                                onClick={() => {
                                  if (item.rawBatch) {
                                    setDetailItem(calculateBatchProfitLoss(item.rawBatch, sales));
                                  }
                                }}
                                className={`hover:bg-slate-100 text-slate-500 transition-colors ${
                                  item.rawBatch ? 'cursor-pointer' : ''
                                }`}
                                title={item.rawBatch ? 'Tıklayarak detaylı alış, satış ve kâr/zarar dökümünü inceleyin' : undefined}
                              >
                                <td className="py-3 px-4 font-sans font-semibold text-slate-800">
                                  {item.strain || item.batchName}
                                  <div className="text-[11px] text-slate-500 font-normal">
                                    Alım: {item.rawBatch?.purchaseDate || '—'}
                                  </div>
                                </td>
                                <td className="py-3 px-4 font-sans">{formatSpeciesLabel(item.category || '', speciesList)}</td>
                                <td className="py-3 px-4 text-center">{item.quantityReceived} ad</td>
                                <td className="py-3 px-4 text-center text-emerald-600 font-bold">
                                  {item.totalSold} ad satıldı
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-red-600">0 ad</td>
                                <td className="py-3 px-4 text-center font-sans">
                                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-700 bg-red-50 border border-red-200">
                                    Tükendi
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-sans" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => item.rawBatch && handleRestoreBatchToStock(item.rawBatch)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-slate-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                                    title="Stoğu yeniden aç"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Stoğa Al</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {depletedLivestock.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                                Stokta tükenen canlı partisi yok (tüm canlılar mevcut).
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

            {/* 2.2 Tükenen Demirbaşlar */}
            {(activeCategoryFilter === 'all' || activeCategoryFilter === 'equipment') && (
              <div className="rounded-xl border border-red-950/60 bg-white overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEquipDepletedOpen(!isEquipDepletedOpen)}
                      className="p-1 -ml-1 text-slate-500 hover:text-slate-900 rounded transition-colors cursor-pointer"
                      title={isEquipDepletedOpen ? 'Bölümü Gizle' : 'Bölümü Genişlet'}
                    >
                      {isEquipDepletedOpen ? (
                        <ChevronUp className="w-4 h-4 text-red-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <Wrench className="w-4 h-4 text-red-600" />
                    <button
                      type="button"
                      onClick={() => setIsEquipDepletedOpen(!isEquipDepletedOpen)}
                      className="text-xs font-bold text-red-700 uppercase tracking-wider hover:text-red-100 transition-colors cursor-pointer text-left"
                    >
                      Tükenen / Hurdaya Ayrılan Demirbaşlar
                    </button>
                    <span className="text-[11px] text-red-600 font-mono font-semibold">
                      ({depletedEquipment.filter((e) => matchesSearch(`${e.title} ${e.notes}`)).length} kalem)
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Hurdaya çıkan, ömrünü tamamlayan veya elden çıkan ekipmanlar
                  </span>
                </div>

                {isEquipDepletedOpen && (
                  <>
                    {/* Mobile Cards (Tükenen Demirbaşlar) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {depletedEquipment
                        .filter((e) => matchesSearch(`${e.title} ${e.notes}`))
                        .map((exp) => (
                          <div key={exp.id} className="p-3.5 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-800">{exp.title}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">{exp.date} · {exp.depletionReason || exp.notes || 'Hurdaya ayrıldı'}</div>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-600 bg-red-50 border border-red-200 shrink-0">
                                Stokta Yok
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                              <span className="text-xs font-mono line-through text-slate-500">
                                {exp.amount.toLocaleString('tr-TR')} ₺
                              </span>
                              <button
                                onClick={() => handleToggleExpenseStock(exp)}
                                className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-slate-900 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Stoğa Al</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      {depletedEquipment.length === 0 && (
                        <div className="py-6 text-center text-xs text-slate-500">
                          Tükenen veya hurdaya ayrılan demirbaş yok.
                        </div>
                      )}
                    </div>

                    {/* Desktop Table (Tükenen Demirbaşlar) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Demirbaş Adı</th>
                            <th className="py-2.5 px-4">İlk Alış Tarihi</th>
                            <th className="py-2.5 px-4">Tükenme / Hurda Nedeni</th>
                            <th className="py-2.5 px-4 text-right">İlk Alım Tutarı</th>
                            <th className="py-2.5 px-4 text-center">Durum</th>
                            <th className="py-2.5 px-4 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {depletedEquipment
                            .filter((e) => matchesSearch(`${e.title} ${e.notes}`))
                            .map((exp) => (
                              <tr key={exp.id} className="hover:bg-slate-100 text-slate-500">
                                <td className="py-3 px-4 font-sans font-semibold text-slate-700">
                                  {exp.title}
                                </td>
                                <td className="py-3 px-4">{exp.date}</td>
                                <td className="py-3 px-4 font-sans text-red-700/80">
                                  {exp.depletionReason || exp.notes || 'Hurdaya ayrıldı / Tükendi'}
                                </td>
                                <td className="py-3 px-4 text-right line-through text-slate-500">
                                  {exp.amount.toLocaleString('tr-TR')} ₺
                                </td>
                                <td className="py-3 px-4 text-center font-sans">
                                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-600 bg-red-50 border border-red-200">
                                    Stokta Yok
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-sans">
                                  <button
                                    onClick={() => handleToggleExpenseStock(exp)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-slate-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                                    title="Tekrar aktif demirbaş stoğuna al"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Stoğa Al</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {depletedEquipment.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                                Tükenen veya hurdaya ayrılan demirbaş yok.
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

            {/* 2.3 Tükenen Sarf Malzemeleri */}
            {(activeCategoryFilter === 'all' || activeCategoryFilter === 'supply') && (
              <div className="rounded-xl border border-red-950/60 bg-white overflow-hidden shadow-sm">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSupplyDepletedOpen(!isSupplyDepletedOpen)}
                      className="p-1 -ml-1 text-slate-500 hover:text-slate-900 rounded transition-colors cursor-pointer"
                      title={isSupplyDepletedOpen ? 'Bölümü Gizle' : 'Bölümü Genişlet'}
                    >
                      {isSupplyDepletedOpen ? (
                        <ChevronUp className="w-4 h-4 text-red-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <Package className="w-4 h-4 text-red-600" />
                    <button
                      type="button"
                      onClick={() => setIsSupplyDepletedOpen(!isSupplyDepletedOpen)}
                      className="text-xs font-bold text-red-700 uppercase tracking-wider hover:text-red-100 transition-colors cursor-pointer text-left"
                    >
                      Tükenen Sarf Malzemeleri (Bitenler)
                    </button>
                    <span className="text-[11px] text-red-600 font-mono font-semibold">
                      ({depletedSupplies.filter((e) => matchesSearch(`${e.title} ${e.notes}`)).length} kalem)
                    </span>
                  </div>
                  <span className="text-xs text-red-700/80">
                    Biten yem, mineral ve kargo malzemeleri (Yeniden sipariş verilmeli)
                  </span>
                </div>

                {isSupplyDepletedOpen && (
                  <>
                    {/* Mobile Cards (Tükenen Sarf Malzemeleri) */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {depletedSupplies
                        .filter((e) => matchesSearch(`${e.title} ${e.notes}`))
                        .map((exp) => (
                          <div key={exp.id} className="p-3.5 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-800">{exp.title}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  <span className="uppercase">{exp.category}</span> · {exp.depletedDate || exp.date}
                                </div>
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-600 bg-red-50 border border-red-200 shrink-0">
                                Bitti (0)
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200">
                              <span className="text-xs font-mono line-through text-slate-500">
                                {exp.amount.toLocaleString('tr-TR')} ₺
                              </span>
                              <button
                                onClick={() => handleToggleExpenseStock(exp)}
                                className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-slate-900 bg-emerald-50 border border-emerald-200 rounded-lg cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Stoğa Al</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      {depletedSupplies.length === 0 && (
                        <div className="py-6 text-center text-xs text-slate-500">
                          Tükenen sarf malzeme yok (tüm malzemeler mevcut).
                        </div>
                      )}
                    </div>

                    {/* Desktop Table (Tükenen Sarf Malzemeleri) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Sarf Malzeme Adı</th>
                            <th className="py-2.5 px-4">Kategori</th>
                            <th className="py-2.5 px-4">Tükenme Tarihi</th>
                            <th className="py-2.5 px-4">Durum Açıklaması</th>
                            <th className="py-2.5 px-4 text-right">Önceki Alım</th>
                            <th className="py-2.5 px-4 text-center">Stok Durumu</th>
                            <th className="py-2.5 px-4 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {depletedSupplies
                            .filter((e) => matchesSearch(`${e.title} ${e.notes}`))
                            .map((exp) => (
                              <tr key={exp.id} className="hover:bg-slate-100 text-slate-500">
                                <td className="py-3 px-4 font-sans font-semibold text-slate-700">
                                  {exp.title}
                                </td>
                                <td className="py-3 px-4 font-sans uppercase text-[10px]">
                                  {exp.category}
                                </td>
                                <td className="py-3 px-4">{exp.depletedDate || exp.date}</td>
                                <td className="py-3 px-4 font-sans text-red-700/80">
                                  {exp.depletionReason || 'Tamamı tüketildi, yeniden tedarik gerekiyor.'}
                                </td>
                                <td className="py-3 px-4 text-right text-slate-500 line-through">
                                  {exp.amount.toLocaleString('tr-TR')} ₺
                                </td>
                                <td className="py-3 px-4 text-center font-sans">
                                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-600 bg-red-50 border border-red-200">
                                    Bitti (0)
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-sans">
                                  <button
                                    onClick={() => handleToggleExpenseStock(exp)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-slate-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                                    title="Yeniden stoğa al veya stok güncelle"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Stoğa Al</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {depletedSupplies.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                                Tükenen sarf malzeme yok (tüm malzemeler mevcut).
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
      {/* SECTION 3: TANIMLI MALZEMELER KATALOĞU (ENVANTERİN EN ALT KISMINDA)       */}
      {/* ========================================================================= */}
      <section className="rounded-2xl border border-indigo-950/60 bg-white overflow-hidden shadow-sm">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsCatalogOpen(!isCatalogOpen)}
          className="w-full p-4 sm:p-5 bg-white hover:bg-white flex items-center justify-between text-left transition-colors cursor-pointer border-b border-slate-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-500/40 flex items-center justify-center text-indigo-600 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Tanımlı Malzemeler Kataloğu
                </h2>
                <span className="text-xs font-mono font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                  {batches.length + expenses.length} Tanımlı Öğe
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Sistemde tanımlanmış tüm canlı türleri, demirbaşlar ve sarf malzemelerinin tam döküm ve katalog kaydı
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-xs font-medium hidden sm:inline">
              {isCatalogOpen ? 'Gizle' : 'Göster'}
            </span>
            {isCatalogOpen ? (
              <ChevronUp className="w-5 h-5 text-indigo-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </div>
        </button>

        {/* Collapsible Content */}
        {isCatalogOpen && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Catalog Sub-Filter Buttons */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200 flex-wrap">
              <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
                {[
                  { id: 'all', label: 'Tüm Tanımlı Öğeler' },
                  { id: 'livestock', label: `🐟 Canlılar (${batches.length})` },
                  { id: 'equipment', label: `⚙️ Demirbaşlar (${equipmentExpenses.length})` },
                  { id: 'supply', label: `📦 Sarflar (${supplyExpenses.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCatalogSubTab(tab.id as any)}
                    className={`min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      catalogSubTab === tab.id
                        ? 'bg-slate-100 text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-500">
                Toplam Kayıtlı Malzeme Çeşidi: <strong>{batches.length + expenses.length}</strong>
              </span>
            </div>

            {/* Catalog 1: Tanımlı Canlılar */}
            {(catalogSubTab === 'all' || catalogSubTab === 'livestock') && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsLiveCatalogOpen(!isLiveCatalogOpen)}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isLiveCatalogOpen ? (
                      <ChevronUp className="w-4 h-4 text-purple-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span className="font-bold text-slate-900 uppercase tracking-wider">
                      Tanımlı Canlı Çeşitleri ({batches.length})
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {isLiveCatalogOpen ? 'Gizle' : 'Göster'}
                  </span>
                </button>

                {isLiveCatalogOpen && (
                  <>
                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {batches
                        .filter((b) => matchesSearch(`${b.batchName} ${b.strain} ${b.supplier}`))
                        .map((b) => {
                          const curStock =
                            b.manualStockCount !== undefined
                              ? b.manualStockCount
                              : availableLivestock.find((i) => i.batchId === b.id)?.remainingStock ?? 0;
                          const avgUnitCost = curStock > 0 ? b.totalCost / curStock : 0;

                          return (
                            <div
                              key={b.id}
                              onClick={() => setDetailItem(calculateBatchProfitLoss(b, sales))}
                              className="p-3.5 space-y-1.5 active:bg-slate-100 cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 text-sm">{b.strain || b.batchName}</div>
                                  <div className="text-[11px] text-slate-500">
                                    {formatSpeciesLabel(b.category || '', speciesList)} · {b.supplier || '—'}
                                  </div>
                                </div>
                                <span className="text-xs font-mono font-bold text-slate-800 shrink-0">
                                  {b.quantityReceived} ad giriş
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                                <span className="text-slate-500 font-mono">{b.purchaseDate}</span>
                                <span className="font-mono font-semibold text-indigo-700">
                                  {curStock > 0 ? `${avgUnitCost.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ₺/ad (${curStock} stok)` : 'Stok yok'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Canlı / Varyete Adı</th>
                            <th className="py-2.5 px-4">Kategori</th>
                            <th className="py-2.5 px-4">Tedarikçi / Menşei</th>
                            <th className="py-2.5 px-4 text-center">Toplam Giriş</th>
                            <th className="py-2.5 px-4 text-right" title="İlk alımdaki birim alış fiyatı">
                              Ort. Alış Fiyatı
                            </th>
                            <th className="py-2.5 px-4 text-right text-indigo-700" title="Toplam Alım Fiyatı ÷ Güncel Stok Sayısı">
                              Ortalama Birim Maliyet
                            </th>
                            <th className="py-2.5 px-4">Kayıt Tarihi</th>
                            <th className="py-2.5 px-4">Açıklama / Islah Notu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {batches
                            .filter((b) => matchesSearch(`${b.batchName} ${b.strain} ${b.supplier}`))
                            .map((b) => {
                              const curStock =
                                b.manualStockCount !== undefined
                                  ? b.manualStockCount
                                  : availableLivestock.find((i) => i.batchId === b.id)?.remainingStock ?? 0;
                              const avgUnitCost = curStock > 0 ? b.totalCost / curStock : 0;

                              return (
                                <tr
                                  key={b.id}
                                  onClick={() => setDetailItem(calculateBatchProfitLoss(b, sales))}
                                  className="hover:bg-slate-100 transition-colors cursor-pointer group"
                                  title="Tıklayarak detaylı alış, satış ve kâr/zarar dökümünü inceleyin"
                                >
                                  <td className="py-3 px-4 font-sans font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                    {b.strain || b.batchName}
                                    {b.isFreeInventory && (
                                      <span className="ml-2 text-[10px] text-amber-700 font-normal px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200">
                                        Bedelsiz
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 font-sans text-slate-700">
                                    {formatSpeciesLabel(b.category || '', speciesList)}
                                  </td>
                                  <td className="py-3 px-4 font-sans text-slate-500">
                                    {b.supplier || '—'}
                                  </td>
                                  <td className="py-3 px-4 text-center font-bold text-slate-800">
                                    {b.quantityReceived} adet
                                  </td>
                                  <td className="py-3 px-4 text-right text-slate-700">
                                    {b.isFreeInventory
                                      ? `${b.manualValuationPrice || 0} ₺ (Kıymet)`
                                      : `${(b.unitCost || (b.quantityReceived > 0 ? b.totalCost / b.quantityReceived : 0)).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} ₺ / ad`}
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-indigo-700 font-mono">
                                    {curStock > 0 ? (
                                      <div>
                                        <span>
                                          {avgUnitCost.toLocaleString('tr-TR', {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 2,
                                          })}{' '}
                                          ₺ / ad
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-normal block font-sans">
                                          ({curStock} ad stok)
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-500">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-slate-500">{b.purchaseDate}</td>
                                  <td className="py-3 px-4 font-sans text-slate-500 max-w-xs truncate">
                                    {b.selectionNotes || '—'}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Catalog 2: Tanımlı Demirbaşlar */}
            {(catalogSubTab === 'all' || catalogSubTab === 'equipment') && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsEquipCatalogOpen(!isEquipCatalogOpen)}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isEquipCatalogOpen ? (
                      <ChevronUp className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                    <Wrench className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-bold text-slate-900 uppercase tracking-wider">
                      Tanımlı Demirbaş & Donanım Kalemleri ({equipmentExpenses.length})
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {isEquipCatalogOpen ? 'Gizle' : 'Göster'}
                  </span>
                </button>

                {isEquipCatalogOpen && (
                  <>
                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {equipmentExpenses
                        .filter((e) => matchesSearch(`${e.title} ${e.notes}`))
                        .map((e) => (
                          <div key={e.id} className="p-3.5 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-bold text-slate-900 text-sm">{e.title}</div>
                              <span className="font-mono font-bold text-blue-700 text-xs shrink-0">
                                {e.amount.toLocaleString('tr-TR')} ₺
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-mono">{e.date}</span>
                              {e.inStock !== false ? (
                                <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                  Mevcut ({e.quantity !== undefined ? e.quantity : 1} {e.unit || 'adet'})
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-600 bg-red-50 border border-red-200">
                                  Hurda / Tükendi
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Demirbaş Tanımı</th>
                            <th className="py-2.5 px-4 text-right">Alım / Fatura Tutarı</th>
                            <th className="py-2.5 px-4">Kayıt Tarihi</th>
                            <th className="py-2.5 px-4 text-center">Stok Durumu</th>
                            <th className="py-2.5 px-4">Kullanım Alanı & Detay</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {equipmentExpenses
                            .filter((e) => matchesSearch(`${e.title} ${e.notes}`))
                            .map((e) => (
                              <tr key={e.id} className="hover:bg-slate-100 transition-colors">
                                <td className="py-3 px-4 font-sans font-bold text-slate-900">
                                  {e.title}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-blue-700">
                                  {e.amount.toLocaleString('tr-TR')} ₺
                                </td>
                                <td className="py-3 px-4 text-slate-500">{e.date}</td>
                                <td className="py-3 px-4 text-center font-sans">
                                  {e.inStock !== false ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                      Mevcut ({e.quantity !== undefined ? e.quantity : 1} {e.unit || 'adet'})
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-600 bg-red-50 border border-red-200">
                                      Hurda / Tükendi
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-sans text-slate-500 max-w-sm truncate">
                                  {e.notes || '—'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Catalog 3: Tanımlı Sarflar */}
            {(catalogSubTab === 'all' || catalogSubTab === 'supply') && (
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsSupplyCatalogOpen(!isSupplyCatalogOpen)}
                  className="w-full p-3 bg-slate-50 hover:bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isSupplyCatalogOpen ? (
                      <ChevronUp className="w-4 h-4 text-amber-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                    <Package className="w-3.5 h-3.5 text-amber-600" />
                    <span className="font-bold text-slate-900 uppercase tracking-wider">
                      Tanımlı Sarf & Tüketim Malzemeleri ({supplyExpenses.length})
                    </span>
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {isSupplyCatalogOpen ? 'Gizle' : 'Göster'}
                  </span>
                </button>

                {isSupplyCatalogOpen && (
                  <>
                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-slate-200">
                      {supplyExpenses
                        .filter((e) => matchesSearch(`${e.title} ${e.notes}`))
                        .map((e) => (
                          <div key={e.id} className="p-3.5 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="font-bold text-slate-900 text-sm">{e.title}</div>
                              <span className="font-mono font-bold text-amber-700 text-xs shrink-0">
                                {e.amount.toLocaleString('tr-TR')} ₺
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-500 font-mono uppercase">{e.category} · {e.date}</span>
                              {e.inStock !== false ? (
                                <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                  Mevcut ({e.quantity !== undefined ? e.quantity : 1} {e.unit || 'adet'})
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-600 bg-red-50 border border-red-200">
                                  Bitti (0)
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                            <th className="py-2.5 px-4">Sarf Malzeme Adı</th>
                            <th className="py-2.5 px-4">Kategori</th>
                            <th className="py-2.5 px-4 text-right">Alım Tutarı</th>
                            <th className="py-2.5 px-4">Kayıt Tarihi</th>
                            <th className="py-2.5 px-4 text-center">Stok Durumu</th>
                            <th className="py-2.5 px-4">Açıklama / Notlar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono">
                          {supplyExpenses
                            .filter((e) => matchesSearch(`${e.title} ${e.notes}`))
                            .map((e) => (
                              <tr key={e.id} className="hover:bg-slate-100 transition-colors">
                                <td className="py-3 px-4 font-sans font-bold text-slate-900">
                                  {e.title}
                                </td>
                                <td className="py-3 px-4 font-sans uppercase text-[10px] text-slate-700">
                                  {e.category}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-amber-700">
                                  {e.amount.toLocaleString('tr-TR')} ₺
                                </td>
                                <td className="py-3 px-4 text-slate-500">{e.date}</td>
                                <td className="py-3 px-4 text-center font-sans">
                                  {e.inStock !== false ? (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                      Mevcut ({e.quantity !== undefined ? e.quantity : 1} {e.unit || 'adet'})
                                    </span>
                                  ) : (
                                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold text-red-600 bg-red-50 border border-red-200">
                                      Bitti (0)
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 font-sans text-slate-500 max-w-sm truncate">
                                  {e.notes || '—'}
                                </td>
                              </tr>
                            ))}
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

      {/* Manuel Stok Belirleme Modalı */}
      <DirectStockEditModal
        isOpen={isStockModalOpen}
        batches={batches}
        expenses={expenses}
        initialCategory={stockModalCategory}
        initialItemId={stockModalItemId}
        onClose={() => {
          setIsStockModalOpen(false);
          setStockModalItemId(undefined);
        }}
        onUpdateBatchStock={(batchId, newStock) => {
          const batch = batches.find((b) => b.id === batchId);
          if (batch) {
            handleSaveBatchDirectStock(batch, String(newStock));
          }
        }}
        onUpdateExpenseStock={(expenseId, newStock) => {
          const exp = expenses.find((e) => e.id === expenseId);
          if (exp) {
            handleSaveExpenseDirectStock(exp, String(newStock));
          }
        }}
      />

      {/* Item Profit / Loss Detail Modal */}
      <ItemProfitLossDetailModal
        isOpen={!!detailItem}
        item={detailItem}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
};
