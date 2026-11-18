import React, { useState } from 'react';
import {
  Plus,
  Droplets,
  Thermometer,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  Edit3,
} from 'lucide-react';
import { Tank, SpeciesCategory, Expense, BatchPurchase } from '../types';
import { evaluateTankHealth } from '../utils/storage';
import { useSpeciesList, formatSpeciesLabel } from '../utils/speciesStorage';
import { normalizeLivestockName } from '../utils/batchConsolidation';
import { AddSpeciesModal } from './modals/AddSpeciesModal';
import {
  ACTIVE_SOIL_BRANDS,
  ActiveSoilBrandId,
  SubstrateCategoryType,
  detectInitialSubstrateState,
  findMatchingActiveSoilExpenses,
  getInventorySandExpenses,
  isExpenseInStock,
} from '../utils/substrateOptions';

interface TanksViewProps {
  tanks: Tank[];
  expenses?: Expense[];
  onOpenAddTank: () => void;
  onUpdateTankParameters: (tankId: string, params: Tank['currentParameters']) => void;
  onUpdateTankSetup?: (
    tankId: string,
    setup: {
      substrate: string;
      substrateExpenseId?: string;
      substrateLiters?: number;
      filtration: string;
      filtrationExpenseId?: string;
      filtrationUsedCount?: number;
    }
  ) => void;
  onRecordWaterChange: (tankId: string) => void;
  onDeleteTank: (tankId: string) => void;
  batches?: BatchPurchase[];
  onInspectBatch?: (batch: BatchPurchase) => void;
}

export const TanksView: React.FC<TanksViewProps> = ({
  tanks,
  expenses = [],
  onOpenAddTank,
  onUpdateTankParameters,
  onUpdateTankSetup,
  onRecordWaterChange,
  onDeleteTank,
  batches = [],
  onInspectBatch,
}) => {
  const speciesList = useSpeciesList();
  const [isAddSpeciesOpen, setIsAddSpeciesOpen] = useState(false);
  const [filterSpecies, setFilterSpecies] = useState<'all' | SpeciesCategory>('all');
  const [editingTankId, setEditingTankId] = useState<string | null>(null);
  const [confirmDeleteTankId, setConfirmDeleteTankId] = useState<string | null>(null);
  const [paramEdit, setParamEdit] = useState({
    tds: 120,
    ph: 6.2,
    temp: 23.0,
    gh: 5.0,
    kh: 1.0,
  });

  // Inline Taban & Filtre editing state
  const [editingSetupTankId, setEditingSetupTankId] = useState<string | null>(null);
  const [setupEdit, setSetupEdit] = useState<{
    substrateCategory: SubstrateCategoryType;
    activeSoilBrandId: ActiveSoilBrandId | '';
    substrate: string;
    substrateExpenseId: string;
    substrateLiters: number;
    filtration: string;
    filtrationExpenseId: string;
    filtrationUsedCount: number;
  }>({
    substrateCategory: 'active_soil',
    activeSoilBrandId: '',
    substrate: '',
    substrateExpenseId: '',
    substrateLiters: 0,
    filtration: '',
    filtrationExpenseId: '',
    filtrationUsedCount: 1,
  });

  const filteredTanks = tanks.filter(
    (t) => filterSpecies === 'all' || t.species === filterSpecies
  );

  const startEditParams = (tank: Tank) => {
    setEditingSetupTankId(null);
    setEditingTankId(tank.id);
    setParamEdit({
      tds: tank.currentParameters.tds,
      ph: tank.currentParameters.ph,
      temp: tank.currentParameters.temp,
      gh: tank.currentParameters.gh,
      kh: tank.currentParameters.kh,
    });
  };

  const saveEditedParams = (tankId: string) => {
    const today = new Date().toISOString().split('T')[0];
    onUpdateTankParameters(tankId, {
      ...paramEdit,
      lastMeasured: today,
    });
    setEditingTankId(null);
  };

  const startEditSetup = (tank: Tank) => {
    setEditingTankId(null);
    setEditingSetupTankId(tank.id);
    const linkedExp = expenses.find((e) => e.id === tank.substrateExpenseId);
    const detected = detectInitialSubstrateState(tank.substrate || '', linkedExp);
    setSetupEdit({
      substrateCategory: detected.categoryType,
      activeSoilBrandId: detected.activeSoilBrandId,
      substrate: tank.substrate || '',
      substrateExpenseId: tank.substrateExpenseId || '',
      substrateLiters: tank.substrateLiters ?? 0,
      filtration: tank.filtration || '',
      filtrationExpenseId: tank.filtrationExpenseId || '',
      filtrationUsedCount: tank.filtrationUsedCount ?? 1,
    });
  };

  const saveEditedSetup = (tankId: string) => {
    if (onUpdateTankSetup) {
      const isNoSubstrate = setupEdit.substrateCategory === 'none';
      onUpdateTankSetup(tankId, {
        substrate: isNoSubstrate
          ? 'Taban Malzemesi Yok'
          : setupEdit.substrate.trim() || 'Belirtilmedi',
        substrateExpenseId: isNoSubstrate
          ? undefined
          : setupEdit.substrateExpenseId || undefined,
        substrateLiters:
          !isNoSubstrate && setupEdit.substrateLiters > 0
            ? setupEdit.substrateLiters
            : undefined,
        filtration: setupEdit.filtration.trim() || 'Belirtilmedi',
        filtrationExpenseId: setupEdit.filtrationExpenseId || undefined,
        filtrationUsedCount:
          setupEdit.filtrationUsedCount > 0 ? setupEdit.filtrationUsedCount : undefined,
      });
    }
    setEditingSetupTankId(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
            Akvaryumlar & Su Parametreleri
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Caridina, Neocaridina ve Apistogramma için kritik olan TDS, pH, GH, KH ve su değişimi takibini yönetin.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            onClick={() => setIsAddSpeciesOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2 text-xs font-semibold text-emerald-700 hover:text-slate-900 bg-white hover:bg-emerald-50 border border-emerald-600/40 rounded-xl sm:rounded-lg transition-colors cursor-pointer shadow-sm"
            title="Manuel Canlı Türü Ekle"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Manuel Canlı Türü Ekle</span>
          </button>

          <button
            onClick={onOpenAddTank}
            className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl sm:rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Akvaryum Ekle</span>
          </button>
        </div>
      </div>

      {/* Species Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-xl overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterSpecies('all')}
          className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            filterSpecies === 'all'
              ? 'bg-slate-100 text-slate-900 shadow-sm font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Tüm Akvaryumlar
        </button>
        {speciesList.map((sp) => (
          <button
            key={sp.id}
            onClick={() => setFilterSpecies(sp.id)}
            className={`min-h-[38px] sm:min-h-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              filterSpecies === sp.id
                ? 'bg-slate-100 text-slate-900 shadow-sm font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {sp.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsAddSpeciesOpen(true)}
          className="min-h-[38px] sm:min-h-0 px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:text-slate-900 bg-white hover:bg-emerald-50 border border-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ml-auto"
          title="Yeni bir canlı türü tanımla"
        >
          <Plus className="w-3 h-3" />
          <span>+ Tür Ekle</span>
        </button>
      </div>

      {/* Tanks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {filteredTanks.map((tank) => {
          const health = evaluateTankHealth(tank);
          const isOptimal = health.status === 'optimal';
          const isEditing = editingTankId === tank.id;

          return (
            <div
              key={tank.id}
              className={`p-5 rounded-xl border transition-all ${
                isOptimal
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : 'bg-white border-amber-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <span className="font-mono font-bold text-slate-800">{tank.code}</span>
                    <span aria-hidden="true">·</span>
                    {(() => {
                      const matchedBatch =
                        batches.find((b) => b.assignedTankId === tank.id) ||
                        batches.find(
                          (b) =>
                            normalizeLivestockName(b.category) ===
                            normalizeLivestockName(tank.species)
                        );
                      if (matchedBatch && onInspectBatch) {
                        return (
                          <button
                            type="button"
                            onClick={() => onInspectBatch(matchedBatch)}
                            className="capitalize text-purple-700 hover:text-purple-700 hover:underline font-medium cursor-pointer transition-colors"
                            title="Bu canlının envanter, alış ve satış detay sekmesini aç"
                          >
                            {formatSpeciesLabel(tank.species, speciesList)}
                          </button>
                        );
                      }
                      return (
                        <span className="capitalize">
                          {formatSpeciesLabel(tank.species, speciesList)}
                        </span>
                      );
                    })()}
                    <span aria-hidden="true">·</span>
                    <span>{tank.volumeLiters} Litre</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {tank.name}
                  </h3>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded font-medium border ${
                      isOptimal
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {isOptimal ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Parametreler İdeal</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3" />
                        <span>Dikkat Gerektiriyor</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Warnings display if any */}
              {!isOptimal && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 space-y-1">
                  {health.issues.map((iss, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span>•</span>
                      <span>{iss}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Water Parameters Dashboard Cards */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                {/* TDS */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">TDS (İletkenlik)</span>
                  <div className="text-base font-bold text-slate-900 font-mono tabular-nums my-0.5">
                    {tank.currentParameters.tds}{' '}
                    <span className="text-[10px] font-normal text-slate-500">ppm</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Hedef: {tank.targetParameters.tdsMin}-{tank.targetParameters.tdsMax}
                  </span>
                </div>

                {/* pH */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">pH Seviyesi</span>
                  <div className="text-base font-bold text-slate-900 font-mono tabular-nums my-0.5">
                    {tank.currentParameters.ph}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Hedef: {tank.targetParameters.phMin}-{tank.targetParameters.phMax}
                  </span>
                </div>

                {/* Sıcaklık */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">Sıcaklık</span>
                  <div className="text-base font-bold text-slate-900 font-mono tabular-nums my-0.5">
                    {tank.currentParameters.temp}°C
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Hedef: {tank.targetParameters.tempMin}-{tank.targetParameters.tempMax}°C
                  </span>
                </div>

                {/* GH */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">GH (Sertlik)</span>
                  <div className="text-base font-bold text-slate-900 font-mono tabular-nums my-0.5">
                    {tank.currentParameters.gh} dGH
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Hedef: {tank.targetParameters.ghMin}-{tank.targetParameters.ghMax}
                  </span>
                </div>

                {/* KH */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">KH (Karbonat)</span>
                  <div className="text-base font-bold text-slate-900 font-mono tabular-nums my-0.5">
                    {tank.currentParameters.kh} dKH
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {tank.species === 'caridina' ? '0 - 1 dKH' : '2 - 5 dKH'}
                  </span>
                </div>
              </div>

              {/* Editing Parameters Form Drawer */}
              {isEditing ? (
                <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-emerald-500/40 space-y-3">
                  <div className="text-xs font-bold text-emerald-600">
                    Yeni Ölçüm Değerlerini Girin:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">TDS (ppm)</label>
                      <input
                        type="number"
                        value={paramEdit.tds}
                        onChange={(e) => setParamEdit({ ...paramEdit, tds: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">pH</label>
                      <input
                        type="number"
                        step="0.1"
                        value={paramEdit.ph}
                        onChange={(e) => setParamEdit({ ...paramEdit, ph: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">Sıcaklık (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={paramEdit.temp}
                        onChange={(e) => setParamEdit({ ...paramEdit, temp: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">GH</label>
                      <input
                        type="number"
                        step="0.5"
                        value={paramEdit.gh}
                        onChange={(e) => setParamEdit({ ...paramEdit, gh: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">KH</label>
                      <input
                        type="number"
                        step="0.5"
                        value={paramEdit.kh}
                        onChange={(e) => setParamEdit({ ...paramEdit, kh: Number(e.target.value) })}
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingTankId(null)}
                      className="px-3 py-1 text-xs text-slate-500 hover:text-slate-900"
                    >
                      İptal
                    </button>
                    <button
                      onClick={() => saveEditedParams(tank.id)}
                      className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Details: Substrate, Filtration & Population */}
              <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1.5 text-slate-500">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-500">Taban:</span>
                    <span className="text-slate-700">{tank.substrate}</span>
                    {tank.substrateLiters !== undefined && tank.substrateLiters > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 font-mono text-[10px]">
                        {tank.substrateLiters} Litre
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-500">Filtre:</span>
                    <span className="text-slate-700">{tank.filtration}</span>
                    {tank.filtrationUsedCount !== undefined && tank.filtrationUsedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-cyan-700 font-mono text-[10px]">
                        ({tank.filtrationUsedCount} kullanılan)
                      </span>
                    )}
                  </div>
                  {onUpdateTankSetup && (
                    <button
                      type="button"
                      onClick={() =>
                        editingSetupTankId === tank.id
                          ? setEditingSetupTankId(null)
                          : startEditSetup(tank)
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer pt-0.5"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>
                        {editingSetupTankId === tank.id ? 'Düzenlemeyi Kapat' : 'Taban & Filtre Düzenle'}
                      </span>
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 text-slate-500 sm:text-right">
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <span className="text-slate-500">Popülasyon:</span>
                    <span className="text-slate-800 font-semibold font-mono tabular-nums">
                      {tank.population.breedingAdults} Damızlık · {tank.population.juveniles} Yavru
                    </span>
                  </div>
                  <div className="flex items-center sm:justify-end gap-1.5">
                    <span className="text-slate-500">Kuluçka/Çift:</span>
                    <span className="text-purple-700 font-medium">
                      {tank.population.berriedOrPairs} aktif kuluçka
                    </span>
                  </div>
                </div>
              </div>

              {/* Inline Taban & Filtre Setup Drawer */}
              {editingSetupTankId === tank.id && (
                <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-emerald-500/40 space-y-3 text-xs">
                  <div className="font-bold text-emerald-600">
                    Taban Malzemesi &amp; Filtre Metodu Düzenle
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Taban Malzemesi */}
                    {(() => {
                      const activeBrand = ACTIVE_SOIL_BRANDS.find(
                        (b) => b.id === setupEdit.activeSoilBrandId
                      );
                      const matchingSoilExpenses = setupEdit.activeSoilBrandId
                        ? findMatchingActiveSoilExpenses(
                            expenses,
                            setupEdit.activeSoilBrandId,
                            tank.substrateExpenseId
                          )
                        : [];
                      const sandExpenses = getInventorySandExpenses(
                        expenses,
                        tank.substrateExpenseId
                      );
                      const linkedSubstrateExp = expenses.find(
                        (exp) => exp.id === setupEdit.substrateExpenseId
                      );
                      const otherAvailableExpenses = expenses.filter(
                        (exp) =>
                          isExpenseInStock(exp) || exp.id === tank.substrateExpenseId
                      );

                      return (
                        <div className="space-y-2.5 p-3 rounded-lg bg-white border border-slate-200">
                          <label className="text-[11px] font-semibold text-amber-700 block">
                            Taban Malzemesi (Envanterden Düşülür)
                          </label>

                          {/* 3 Taban Seçeneği: Aktif Toprak / Kum / Taban Malzemesi Yok */}
                          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-slate-50 border border-slate-200">
                            <button
                              type="button"
                              onClick={() =>
                                setSetupEdit((prev) => ({
                                  ...prev,
                                  substrateCategory: 'active_soil',
                                  substrate:
                                    prev.substrateCategory === 'none'
                                      ? activeBrand?.displaySubstrate || ''
                                      : prev.substrate,
                                }))
                              }
                              className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                setupEdit.substrateCategory === 'active_soil'
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                              }`}
                            >
                              Aktif Toprak
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const firstSand = sandExpenses[0];
                                setSetupEdit((prev) => ({
                                  ...prev,
                                  substrateCategory: 'sand',
                                  activeSoilBrandId: '',
                                  substrateExpenseId:
                                    prev.substrateCategory === 'sand' &&
                                    prev.substrateExpenseId
                                      ? prev.substrateExpenseId
                                      : firstSand?.id || '',
                                  substrate:
                                    prev.substrateCategory === 'sand' &&
                                    prev.substrate &&
                                    prev.substrate !== 'Taban Malzemesi Yok'
                                      ? prev.substrate
                                      : firstSand?.title || '',
                                }));
                              }}
                              className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                setupEdit.substrateCategory === 'sand'
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                              }`}
                            >
                              Kum
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSetupEdit((prev) => ({
                                  ...prev,
                                  substrateCategory: 'none',
                                  activeSoilBrandId: '',
                                  substrateExpenseId: '',
                                  substrateLiters: 0,
                                  substrate: 'Taban Malzemesi Yok',
                                }))
                              }
                              className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                                setupEdit.substrateCategory === 'none'
                                  ? 'bg-slate-200 text-slate-900 shadow-sm'
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                              }`}
                            >
                              Malzeme Yok
                            </button>
                          </div>

                          {/* 1. AKTİF TOPRAK SEÇENEKLERİ */}
                          {setupEdit.substrateCategory === 'active_soil' && (
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-500 block">
                                Tanımlı Aktif Toprak Türleri:
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {ACTIVE_SOIL_BRANDS.map((brand) => {
                                  const isSelected =
                                    setupEdit.activeSoilBrandId === brand.id;
                                  const brandMatches = findMatchingActiveSoilExpenses(
                                    expenses,
                                    brand.id,
                                    tank.substrateExpenseId
                                  );
                                  const hasStock = brandMatches.length > 0;
                                  return (
                                    <button
                                      key={brand.id}
                                      type="button"
                                      onClick={() => {
                                        const matched = brandMatches[0];
                                        setSetupEdit((prev) => ({
                                          ...prev,
                                          activeSoilBrandId: brand.id,
                                          substrateExpenseId: matched ? matched.id : '',
                                          substrate: matched
                                            ? matched.title
                                            : brand.displaySubstrate,
                                        }));
                                      }}
                                      className={`px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-amber-50 border-amber-500 text-amber-700'
                                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900'
                                      }`}
                                    >
                                      <span className="text-[11px] font-semibold block truncate">
                                        {brand.label}
                                      </span>
                                      <span
                                        className={`text-[9px] block truncate ${
                                          hasStock ? 'text-emerald-600' : 'text-slate-500'
                                        }`}
                                      >
                                        {hasStock
                                          ? `Stok: ${brandMatches[0].quantity ?? 1} ${brandMatches[0].unit || 'adet'}`
                                          : 'Stok yok'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Matching inventory dropdown or manual fallback */}
                              {matchingSoilExpenses.length > 0 ? (
                                <div>
                                  <label className="text-[10px] text-emerald-600 block mb-1">
                                    Eşleşen Envanter Toprağı (Stoktan Düşülecek):
                                  </label>
                                  <select
                                    value={setupEdit.substrateExpenseId}
                                    onChange={(e) => {
                                      const id = e.target.value;
                                      const found = expenses.find((exp) => exp.id === id);
                                      setSetupEdit((prev) => ({
                                        ...prev,
                                        substrateExpenseId: id,
                                        substrate: found
                                          ? found.title
                                          : activeBrand?.displaySubstrate || prev.substrate,
                                      }));
                                    }}
                                    className="w-full bg-slate-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
                                  >
                                    {matchingSoilExpenses.map((exp) => (
                                      <option key={exp.id} value={exp.id}>
                                        {exp.title} (Stok: {exp.quantity ?? 1}{' '}
                                        {exp.unit || 'adet'})
                                      </option>
                                    ))}
                                    <option value="">Stoktan Düşme (Sadece Bilgi)</option>
                                  </select>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {activeBrand && (
                                    <p className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5">
                                      Envanterde <strong>{activeBrand.label}</strong> adına
                                      kayıtlı toprak bulunamadı. Envantere eklediğinizde
                                      otomatik eşleşir.
                                    </p>
                                  )}
                                  <select
                                    value={setupEdit.substrateExpenseId}
                                    onChange={(e) => {
                                      const id = e.target.value;
                                      const found = expenses.find((exp) => exp.id === id);
                                      setSetupEdit((prev) => ({
                                        ...prev,
                                        substrateExpenseId: id,
                                        substrate: found ? found.title : prev.substrate,
                                      }));
                                    }}
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 text-[11px]"
                                  >
                                    <option value="">
                                      Envanterle Manuel Eşleştir (Opsiyonel)
                                    </option>
                                    {otherAvailableExpenses.map((exp) => (
                                      <option key={exp.id} value={exp.id}>
                                        {exp.title} (Stok: {exp.quantity ?? 1}{' '}
                                        {exp.unit || 'adet'})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 2. DİNAMİK KUM SEÇENEĞİ */}
                          {setupEdit.substrateCategory === 'sand' && (
                            <div className="space-y-2">
                              <span className="text-[10px] text-slate-500 block">
                                Envanterden Tanımlanan Kum Türleri:
                              </span>
                              {sandExpenses.length === 0 ? (
                                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                                  Envanterde henüz tanımlı bir kum bulunmuyor. Envanter veya
                                  Giderler kısmından kum girdiğinizde eklediğiniz her kum
                                  türü burada otomatik olarak tanımlanacaktır.
                                </div>
                              ) : (
                                <select
                                  value={setupEdit.substrateExpenseId}
                                  onChange={(e) => {
                                    const id = e.target.value;
                                    const found = expenses.find((exp) => exp.id === id);
                                    setSetupEdit((prev) => ({
                                      ...prev,
                                      substrateExpenseId: id,
                                      substrate: found ? found.title : prev.substrate,
                                    }));
                                  }}
                                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
                                >
                                  <option value="">Kum Türü Seçin</option>
                                  {sandExpenses.map((exp) => (
                                    <option key={exp.id} value={exp.id}>
                                      {exp.title} (Stok: {exp.quantity ?? 1}{' '}
                                      {exp.unit || 'adet'})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}

                          {/* 3. TABAN MALZEMESİ YOK */}
                          {setupEdit.substrateCategory === 'none' && (
                            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 leading-relaxed">
                              Taban malzemesi kullanılmıyor (Çıplak taban). Envanterden
                              herhangi bir düşüm yapılmaz.
                            </div>
                          )}

                          {/* Malzeme Adı & Litre (Malzeme Yok dışında göster) */}
                          {setupEdit.substrateCategory !== 'none' && (
                            <>
                              <div className="grid grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  placeholder="Malzeme adı"
                                  value={setupEdit.substrate}
                                  onChange={(e) =>
                                    setSetupEdit((prev) => ({
                                      ...prev,
                                      substrate: e.target.value,
                                    }))
                                  }
                                  className="col-span-2 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
                                />
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    placeholder="0"
                                    value={setupEdit.substrateLiters || ''}
                                    onChange={(e) =>
                                      setSetupEdit((prev) => ({
                                        ...prev,
                                        substrateLiters: Math.max(
                                          0,
                                          Number(e.target.value)
                                        ),
                                      }))
                                    }
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 pr-7 text-slate-900 font-mono text-xs"
                                    title="Kaç litre taban malzemesi kullanıldı?"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                                    Lt
                                  </span>
                                </div>
                              </div>
                              {linkedSubstrateExp && setupEdit.substrateLiters > 0 && (
                                <p className="text-[10px] text-amber-700/90">
                                  Kaydettiğinizde{' '}
                                  <strong>{linkedSubstrateExp.title}</strong> stoğundan{' '}
                                  <strong>
                                    {setupEdit.substrateLiters}{' '}
                                    {linkedSubstrateExp.unit || 'birim'}
                                  </strong>{' '}
                                  düşülür.
                                </p>
                              )}
                              {linkedSubstrateExp && setupEdit.substrateLiters <= 0 && (
                                <p className="text-[10px] text-slate-500">
                                  Stoktan düşüm yapılması için kullanılan miktarı (Lt) girin.
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })()}

                    {/* Filtre Metodu */}
                    <div className="space-y-2 p-3 rounded-lg bg-white border border-slate-200">
                      <label className="text-[11px] font-semibold text-cyan-700 block">
                        Filtre Metodu (Demirbaştan Düşülmez)
                      </label>
                      <select
                        value={setupEdit.filtrationExpenseId}
                        onChange={(e) => {
                          const id = e.target.value;
                          const found = expenses.find((exp) => exp.id === id);
                          setSetupEdit((prev) => ({
                            ...prev,
                            filtrationExpenseId: id,
                            filtration: found ? found.title : prev.filtration,
                          }));
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
                      >
                        <option value="">Serbest Metin / Özel Yöntem</option>
                        {expenses
                          .filter((exp) => exp.category === 'equipment')
                          .map((exp) => (
                            <option key={exp.id} value={exp.id}>
                              {exp.title} (Mevcut: {exp.quantity ?? 1} {exp.unit || 'adet'})
                            </option>
                          ))}
                      </select>

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Filtre metodu / adı"
                          value={setupEdit.filtration}
                          onChange={(e) =>
                            setSetupEdit((prev) => ({ ...prev, filtration: e.target.value }))
                          }
                          className="col-span-2 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
                        />
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={setupEdit.filtrationUsedCount}
                            onChange={(e) =>
                              setSetupEdit((prev) => ({
                                ...prev,
                                filtrationUsedCount: Math.max(1, Number(e.target.value)),
                              }))
                            }
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 pr-9 text-slate-900 font-mono text-xs"
                            title="Kaç adet filtre kullanılıyor?"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                            Adet
                          </span>
                        </div>
                      </div>
                      {setupEdit.filtrationExpenseId && (
                        <p className="text-[10px] text-cyan-700/90">
                          Demirbaş stoğu değişmez; envanterde ({setupEdit.filtrationUsedCount}{' '}
                          kullanılan) şeklinde gösterilir.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingSetupTankId(null)}
                      className="px-3 py-1 text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      onClick={() => saveEditedSetup(tank.id)}
                      className="px-3.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded cursor-pointer"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              )}

              {/* Maintenance & Footer actions */}
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="text-slate-500 text-[11px] flex items-center gap-1.5 flex-wrap">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Son Su Değişimi: <strong className="text-slate-700">{tank.lastWaterChange}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500">{tank.waterChangeFrequencyDays} günde bir</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => onRecordWaterChange(tank.id)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-0 px-3 py-1.5 sm:py-1 text-xs font-medium text-blue-700 hover:text-slate-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg sm:rounded transition-colors cursor-pointer"
                  >
                    <Droplets className="w-3.5 h-3.5 text-blue-600" />
                    <span>Su Değişimi Yaptım</span>
                  </button>

                  <button
                    onClick={() => startEditParams(tank)}
                    className="min-h-[40px] sm:min-h-0 px-3 py-1.5 sm:py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg sm:rounded transition-colors cursor-pointer"
                  >
                    Ölçüm Gir
                  </button>

                  {confirmDeleteTankId === tank.id ? (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTankId(null)}
                        className="min-h-[40px] sm:min-h-0 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs cursor-pointer"
                      >
                        İptal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteTank(tank.id);
                          setConfirmDeleteTankId(null);
                        }}
                        className="min-h-[40px] sm:min-h-0 px-2.5 py-1 rounded bg-red-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Sil
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteTankId(tank.id)}
                      className="min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 flex items-center justify-center text-slate-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title="Akvaryumu Sil"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AddSpeciesModal
        isOpen={isAddSpeciesOpen}
        onClose={() => setIsAddSpeciesOpen(false)}
        onSpeciesAdded={(newId) => setFilterSpecies(newId)}
      />
    </div>
  );
};
