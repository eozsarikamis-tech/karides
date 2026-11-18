import React, { useState } from 'react';
import { X, Dices, CheckSquare, Square, Sparkles, AlertCircle } from 'lucide-react';
import { useSpeciesList, SpeciesItem } from '../../utils/speciesStorage';
import { Tank } from '../../types';
import {
  generateRandomTestDataForGroups,
  GeneratedTestDataResult,
} from '../../utils/testDataGenerator';

interface TestDataGeneratorModalProps {
  existingTanks: Tank[];
  activeBusinessName: string;
  onApplyTestData: (result: GeneratedTestDataResult) => void;
  onClose: () => void;
}

export const TestDataGeneratorModal: React.FC<TestDataGeneratorModalProps> = ({
  existingTanks,
  activeBusinessName,
  onApplyTestData,
  onClose,
}) => {
  const speciesList = useSpeciesList();
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    speciesList.map((s) => s.id)
  );
  const [includeMortalityScenarios, setIncludeMortalityScenarios] = useState(true);

  const toggleGroup = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(speciesList.map((s) => s.id));
  const clearAll = () => setSelectedIds([]);

  const handleGenerate = () => {
    const selectedSpecies: SpeciesItem[] = speciesList.filter((s) =>
      selectedIds.includes(s.id)
    );
    if (selectedSpecies.length === 0) return;
    const result = generateRandomTestDataForGroups({
      selectedSpecies,
      existingTanks,
      includeMortalityScenarios,
    });
    onApplyTestData(result);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Dices className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Rastgele Test Verisi Oluştur
              </h2>
              <p className="text-[11px] text-slate-400">
                {activeBusinessName} için seçili canlı gruplarına alım, stok ve satış ekler
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Tanımlı Canlı Grupları ({selectedIds.length}/{speciesList.length})
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-emerald-400 hover:text-emerald-300 cursor-pointer font-medium"
                >
                  Tümünü Seç
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Temizle
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {speciesList.map((sp) => {
                const isSelected = selectedIds.includes(sp.id);
                return (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => toggleGroup(sp.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className="font-medium truncate">{sp.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={includeMortalityScenarios}
              onChange={(e) => setIncludeMortalityScenarios(e.target.checked)}
              className="mt-0.5 accent-amber-500 cursor-pointer"
            />
            <div className="text-xs">
              <div className="font-semibold text-slate-200">
                Ölüm / Kayıp ve Kâr-Zarar Senaryolarını Birlikte Test Et
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Bazı gruplara ölüm eklenerek kırmızı (-X Ölüm) görünümü, diğerlerine sıfır ölüm ve farklı kâr/zarar oranları üretilir.
              </p>
            </div>
          </label>

          {selectedIds.length === 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Lütfen en az bir canlı grubu seçin.</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl cursor-pointer transition-all shadow-lg shadow-amber-950/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rastgele Alım & Satış Ekle</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
