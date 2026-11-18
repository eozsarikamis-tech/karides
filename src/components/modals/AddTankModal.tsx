import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Tank, SpeciesCategory, Expense } from '../../types';
import { useSpeciesList } from '../../utils/speciesStorage';
import { AddSpeciesModal } from './AddSpeciesModal';
import {
  ACTIVE_SOIL_BRANDS,
  ActiveSoilBrandId,
  SubstrateCategoryType,
  findMatchingActiveSoilExpenses,
  getInventorySandExpenses,
  isExpenseInStock,
} from '../../utils/substrateOptions';

interface AddTankModalProps {
  expenses?: Expense[];
  onClose: () => void;
  onAddTank: (tank: Tank) => void;
  existingCount: number;
}

export const AddTankModal: React.FC<AddTankModalProps> = ({
  expenses = [],
  onClose,
  onAddTank,
  existingCount,
}) => {
  const speciesList = useSpeciesList();
  const [isAddSpeciesOpen, setIsAddSpeciesOpen] = useState(false);
  const nextCode = `TK-0${existingCount + 1}`;
  const [code, setCode] = useState(nextCode);
  const [name, setName] = useState('');
  const [volumeLiters, setVolumeLiters] = useState(40);
  const [species, setSpecies] = useState<SpeciesCategory>('caridina');
  const [substrateCategory, setSubstrateCategory] =
    useState<SubstrateCategoryType>('active_soil');
  const [activeSoilBrandId, setActiveSoilBrandId] = useState<ActiveSoilBrandId | ''>('ada');
  const [substrate, setSubstrate] = useState('ADA Aktif Toprak');
  const [substrateExpenseId, setSubstrateExpenseId] = useState<string>(() => {
    const matches = findMatchingActiveSoilExpenses(expenses, 'ada');
    return matches[0]?.id || '';
  });
  const [substrateLiters, setSubstrateLiters] = useState<number>(0);
  const [filtration, setFiltration] = useState('Çift Süngerli Pipo Filtre');
  const [filtrationExpenseId, setFiltrationExpenseId] = useState<string>('');
  const [filtrationUsedCount, setFiltrationUsedCount] = useState<number>(1);
  const [tds, setTds] = useState(120);
  const [ph, setPh] = useState(6.0);
  const [temp, setTemp] = useState(22.5);
  const [gh, setGh] = useState(5.0);
  const [kh, setKh] = useState(0.5);
  const [breedingAdults, setBreedingAdults] = useState(10);
  const [juveniles, setJuveniles] = useState(0);
  const [notes, setNotes] = useState('');

  const availableSubstrateItems = expenses.filter((e) => isExpenseInStock(e));
  const availableFilterEquipments = expenses.filter(
    (e) => e.category === 'equipment' && e.inStock !== false && (e.quantity ?? 1) > 0
  );
  const selectedSubstrateExp = expenses.find((e) => e.id === substrateExpenseId);
  const matchingSoilExpenses = activeSoilBrandId
    ? findMatchingActiveSoilExpenses(expenses, activeSoilBrandId)
    : [];
  const sandExpenses = getInventorySandExpenses(expenses);
  const selectedActiveBrand = ACTIVE_SOIL_BRANDS.find((b) => b.id === activeSoilBrandId);

  // Handle species defaults
  const handleSpeciesChange = (newSpecies: SpeciesCategory) => {
    setSpecies(newSpecies);
    if (newSpecies === 'caridina') {
      const adaMatches = findMatchingActiveSoilExpenses(expenses, 'ada');
      setSubstrateCategory('active_soil');
      setActiveSoilBrandId('ada');
      setSubstrateExpenseId(adaMatches[0]?.id || '');
      setSubstrate(adaMatches[0] ? adaMatches[0].title : 'ADA Aktif Toprak');
      setTds(120);
      setPh(6.0);
      setTemp(22.5);
      setGh(5.0);
      setKh(0.5);
    } else if (newSpecies === 'neocaridina') {
      setTds(210);
      setPh(7.3);
      setTemp(24.0);
      setGh(7.0);
      setKh(3.5);
    } else {
      setTds(130);
      setPh(6.4);
      setTemp(25.5);
      setGh(4.5);
      setKh(1.0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    let targetParameters = {
      tdsMin: 110,
      tdsMax: 135,
      phMin: 5.6,
      phMax: 6.4,
      tempMin: 21,
      tempMax: 23.5,
      ghMin: 4,
      ghMax: 6,
    };

    if (species === 'neocaridina') {
      targetParameters = {
        tdsMin: 180,
        tdsMax: 250,
        phMin: 7.0,
        phMax: 7.6,
        tempMin: 22,
        tempMax: 25.5,
        ghMin: 6,
        ghMax: 8.5,
      };
    } else if (species === 'apistogramma') {
      targetParameters = {
        tdsMin: 90,
        tdsMax: 160,
        phMin: 6.0,
        phMax: 6.8,
        tempMin: 24.5,
        tempMax: 26.5,
        ghMin: 3,
        ghMax: 6,
      };
    }

    const today = new Date().toISOString().split('T')[0];

    const isNoSubstrate = substrateCategory === 'none';

    const newTank: Tank = {
      id: `tank-${Date.now()}`,
      code,
      name,
      volumeLiters,
      substrate: isNoSubstrate
        ? 'Taban Malzemesi Yok'
        : substrate.trim() || 'Belirtilmedi',
      substrateExpenseId: isNoSubstrate ? undefined : substrateExpenseId || undefined,
      substrateLiters:
        !isNoSubstrate && substrateLiters > 0 ? substrateLiters : undefined,
      filtration,
      filtrationExpenseId: filtrationExpenseId || undefined,
      filtrationUsedCount: filtrationUsedCount > 0 ? filtrationUsedCount : undefined,
      species,
      targetParameters,
      currentParameters: {
        tds,
        ph,
        temp,
        gh,
        kh,
        lastMeasured: today,
      },
      population: {
        breedingAdults,
        juveniles,
        berriedOrPairs: 0,
      },
      lastWaterChange: today,
      waterChangeFrequencyDays: species === 'caridina' ? 7 : 10,
      notes,
    };

    onAddTank(newTank);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-safe shadow-2xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-200 gap-2">
          <div>
            <span className="text-[11px] text-blue-600 font-semibold tracking-wide uppercase block">
              Raf & Tank Sistemi
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Yeni Akvaryum Ekle
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-500 block mb-1">Akvaryum Kodu</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-500 block mb-1">Akvaryum Adı & Proje</label>
              <input
                type="text"
                required
                placeholder="Örn: Caridina Boa / Apisto Yavru Küpü"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-500 block font-medium">Hedef Canlı Türü</label>
                <button
                  type="button"
                  onClick={() => setIsAddSpeciesOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                  title="Yeni bir canlı türü ekle"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Manuel Tür Ekle</span>
                </button>
              </div>
              <select
                value={species}
                onChange={(e) => handleSpeciesChange(e.target.value as SpeciesCategory)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              >
                {speciesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-500 block mb-1">Hacim (Litre)</label>
              <input
                type="number"
                min="5"
                value={volumeLiters}
                onChange={(e) => setVolumeLiters(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-1">Damızlık Sayısı</label>
              <input
                type="number"
                min="0"
                value={breedingAdults}
                onChange={(e) => setBreedingAdults(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Taban Malzemesi & Litre (Stoktan Düşülür) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <label className="text-slate-700 font-semibold block">
                Taban Malzemesi &amp; Litre
              </label>

              {/* 3 Taban Seçeneği: Aktif Toprak / Kum / Malzeme Yok */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-50 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setSubstrateCategory('active_soil');
                    if (substrateCategory === 'none') {
                      setSubstrate(selectedActiveBrand?.displaySubstrate || '');
                    }
                  }}
                  className={`py-2 px-1.5 min-h-[38px] rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    substrateCategory === 'active_soil'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  Aktif Toprak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubstrateCategory('sand');
                    setActiveSoilBrandId('');
                    const firstSand = sandExpenses[0];
                    setSubstrateExpenseId(firstSand?.id || '');
                    setSubstrate(firstSand?.title || '');
                  }}
                  className={`py-2 px-1.5 min-h-[38px] rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    substrateCategory === 'sand'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  Kum
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubstrateCategory('none');
                    setActiveSoilBrandId('');
                    setSubstrateExpenseId('');
                    setSubstrateLiters(0);
                    setSubstrate('Taban Malzemesi Yok');
                  }}
                  className={`py-2 px-1.5 min-h-[38px] rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                    substrateCategory === 'none'
                      ? 'bg-slate-200 text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  Malzeme Yok
                </button>
              </div>

              {substrateCategory === 'active_soil' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {ACTIVE_SOIL_BRANDS.map((brand) => {
                      const isSelected = activeSoilBrandId === brand.id;
                      const brandMatches = findMatchingActiveSoilExpenses(
                        expenses,
                        brand.id
                      );
                      const hasStock = brandMatches.length > 0;
                      return (
                        <button
                          key={brand.id}
                          type="button"
                          onClick={() => {
                            const matched = brandMatches[0];
                            setActiveSoilBrandId(brand.id);
                            setSubstrateExpenseId(matched ? matched.id : '');
                            setSubstrate(matched ? matched.title : brand.displaySubstrate);
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

                  {matchingSoilExpenses.length > 0 ? (
                    <select
                      value={substrateExpenseId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSubstrateExpenseId(id);
                        const found = expenses.find((exp) => exp.id === id);
                        if (found) {
                          setSubstrate(found.title);
                        } else if (selectedActiveBrand) {
                          setSubstrate(selectedActiveBrand.displaySubstrate);
                        }
                      }}
                      className="w-full bg-slate-50 border border-emerald-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
                    >
                      {matchingSoilExpenses.map((exp) => (
                        <option key={exp.id} value={exp.id}>
                          {exp.title} (Stok: {exp.quantity ?? 1} {exp.unit || 'adet'})
                        </option>
                      ))}
                      <option value="">Stoktan Düşme (Sadece Bilgi)</option>
                    </select>
                  ) : (
                    <select
                      value={substrateExpenseId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSubstrateExpenseId(id);
                        const found = expenses.find((exp) => exp.id === id);
                        if (found) setSubstrate(found.title);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 text-[11px]"
                    >
                      <option value="">Envanterle Manuel Eşleştir (Opsiyonel)</option>
                      {availableSubstrateItems.map((exp) => (
                        <option key={exp.id} value={exp.id}>
                          {exp.title} (Stok: {exp.quantity ?? 1} {exp.unit || 'adet'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {substrateCategory === 'sand' && (
                <div>
                  {sandExpenses.length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                      Envanterde henüz tanımlı bir kum bulunmuyor. Envanterden kum
                      girdiğinizde her kum türü burada otomatik tanımlanacaktır.
                    </div>
                  ) : (
                    <select
                      value={substrateExpenseId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSubstrateExpenseId(id);
                        const found = expenses.find((exp) => exp.id === id);
                        if (found) setSubstrate(found.title);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
                    >
                      <option value="">Kum Türü Seçin</option>
                      {sandExpenses.map((exp) => (
                        <option key={exp.id} value={exp.id}>
                          {exp.title} (Stok: {exp.quantity ?? 1} {exp.unit || 'adet'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {substrateCategory === 'none' && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                  Taban malzemesi kullanılmıyor (Çıplak taban). Stoktan düşüm yapılmaz.
                </div>
              )}

              {substrateCategory !== 'none' && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Taban malzemesi adı"
                        value={substrate}
                        onChange={(e) => setSubstrate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="0"
                          value={substrateLiters || ''}
                          onChange={(e) => setSubstrateLiters(Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 pr-8 text-slate-900 font-mono text-xs"
                          title="Kullanılan taban malzemesi (Litre)"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                          Lt
                        </span>
                      </div>
                    </div>
                  </div>
                  {selectedSubstrateExp && substrateLiters > 0 && (
                    <p className="text-[10px] text-amber-700">
                      Stoktan <strong>{substrateLiters}</strong>{' '}
                      {selectedSubstrateExp.unit || 'birim'} düşülür (Kalan:{' '}
                      {Math.max(
                        0,
                        Number(
                          ((selectedSubstrateExp.quantity ?? 1) - substrateLiters).toFixed(2)
                        )
                      )}{' '}
                      {selectedSubstrateExp.unit || 'adet'}).
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Filtre Metodu & Kullanılan Adet (Demirbaştan Düşülmez) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="text-slate-700 font-semibold block">
                Filtre Metodu &amp; Adet
              </label>
              <select
                value={filtrationExpenseId}
                onChange={(e) => {
                  const id = e.target.value;
                  setFiltrationExpenseId(id);
                  const found = expenses.find((exp) => exp.id === id);
                  if (found) {
                    setFiltration(found.title);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
              >
                <option value="">Serbest Metin / Özel Yöntem</option>
                {availableFilterEquipments.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.title} (Mevcut: {exp.quantity ?? 1} {exp.unit || 'adet'})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="Filtre metodu / adı"
                    value={filtration}
                    onChange={(e) => setFiltration(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={filtrationUsedCount}
                      onChange={(e) => setFiltrationUsedCount(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 pr-9 text-slate-900 font-mono text-xs"
                      title="Kullanılan filtre adedi"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                      Adet
                    </span>
                  </div>
                </div>
              </div>
              {filtrationExpenseId && (
                <p className="text-[10px] text-cyan-700">
                  Demirbaş stoğundan düşülmez; envanterde ({filtrationUsedCount} kullanılan) olarak görünür.
                </p>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[11px] font-semibold text-slate-700 block">
              İlk Su Ölçümleri:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-2">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">TDS (ppm)</label>
                <input
                  type="number"
                  value={tds}
                  onChange={(e) => setTds(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 sm:py-1 text-slate-900 font-mono text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">pH</label>
                <input
                  type="number"
                  step="0.1"
                  value={ph}
                  onChange={(e) => setPh(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 sm:py-1 text-slate-900 font-mono text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">Sıcaklık</label>
                <input
                  type="number"
                  step="0.1"
                  value={temp}
                  onChange={(e) => setTemp(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 sm:py-1 text-slate-900 font-mono text-center"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">GH</label>
                <input
                  type="number"
                  step="0.5"
                  value={gh}
                  onChange={(e) => setGh(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 sm:py-1 text-slate-900 font-mono text-center"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] text-slate-500 block mb-1">KH</label>
                <input
                  type="number"
                  step="0.5"
                  value={kh}
                  onChange={(e) => setKh(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-2 sm:py-1 text-slate-900 font-mono text-center"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-slate-500 block mb-1">Akvaryum Notları</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Meşe yaprağı ve catappa eklendi. Sadece SaltyShrimp GH+ mineral ile su hazırlanıyor."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm cursor-pointer transition-colors"
            >
              Akvaryumu Ekle
            </button>
          </div>
        </form>
      </div>

      <AddSpeciesModal
        isOpen={isAddSpeciesOpen}
        onClose={() => setIsAddSpeciesOpen(false)}
        onSpeciesAdded={(newId) => handleSpeciesChange(newId)}
      />
    </div>
  );
};
