import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { BreedingSpawn, Tank, SpeciesCategory } from '../../types';
import { useSpeciesList } from '../../utils/speciesStorage';
import { AddSpeciesModal } from './AddSpeciesModal';

interface AddBreedingModalProps {
  tanks: Tank[];
  onClose: () => void;
  onAddBreeding: (spawn: BreedingSpawn) => void;
}

export const AddBreedingModal: React.FC<AddBreedingModalProps> = ({
  tanks,
  onClose,
  onAddBreeding,
}) => {
  const speciesList = useSpeciesList();
  const [isAddSpeciesOpen, setIsAddSpeciesOpen] = useState(false);
  const [tankId, setTankId] = useState(tanks.length > 0 ? tanks[0].id : '');
  const [species, setSpecies] = useState<SpeciesCategory>(
    tanks.length > 0 ? tanks[0].species : 'caridina'
  );
  const [strain, setStrain] = useState('');
  const [parentInfo, setParentInfo] = useState('');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [expectedHatchDate, setExpectedHatchDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 25);
    return d.toISOString().split('T')[0];
  });
  const [estimatedCount, setEstimatedCount] = useState(30);
  const [notes, setNotes] = useState('');

  const handleTankChange = (selectedId: string) => {
    setTankId(selectedId);
    const t = tanks.find((x) => x.id === selectedId);
    if (t) {
      setSpecies(t.species);
      const incDays = t.species === 'apistogramma' ? 7 : 28;
      const d = new Date();
      d.setDate(d.getDate() + incDays);
      setExpectedHatchDate(d.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!strain || !parentInfo) return;

    const newSpawn: BreedingSpawn = {
      id: `br-${Date.now()}`,
      tankId,
      species,
      strain,
      parentInfo,
      startDate,
      expectedHatchDate,
      estimatedCount,
      status: 'incubating',
      notes,
    };

    onAddBreeding(newSpawn);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <span className="text-[11px] text-purple-600 font-semibold tracking-wide uppercase block">
              Kuluçka Defteri
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Yeni Yumurtlama / Kuluçka Kaydı
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-500 block mb-1">Akvaryum Seçin</label>
              <select
                value={tankId}
                onChange={(e) => handleTankChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              >
                {tanks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} - {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-500 block font-medium">Tür / Kategori</label>
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
                onChange={(e) => setSpecies(e.target.value as SpeciesCategory)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              >
                {speciesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-500 block mb-1">Varyete / Varyasyon</label>
            <input
              type="text"
              required
              placeholder="Örn: Pure Red Line SS / Apisto Cacatuoides Triple Red"
              value={strain}
              onChange={(e) => setStrain(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
            />
          </div>

          <div>
            <label className="text-slate-500 block mb-1">Damızlık Ebeveyn Bilgisi</label>
            <input
              type="text"
              required
              placeholder="Örn: 2 Adet Berried Koyu Dişi veya Çift #1 (Alfa Erkek x Sarı Dişi)"
              value={parentInfo}
              onChange={(e) => setParentInfo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-500 block mb-1">Yumurtlama Tarihi</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-1">Tahmini Serbest Yüzüş</label>
              <input
                type="date"
                required
                value={expectedHatchDate}
                onChange={(e) => setExpectedHatchDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-1">Tahmini Yavru Adedi</label>
              <input
                type="number"
                min="1"
                value={estimatedCount}
                onChange={(e) => setEstimatedCount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-500 block mb-1">Besleme & Bakım Notları</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Biofilm tozu ve taze canlı artemia hazırlığı yapıldı."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-500 hover:text-slate-900"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm"
            >
              Kuluçkayı Kaydet
            </button>
          </div>
        </form>
      </div>

      <AddSpeciesModal
        isOpen={isAddSpeciesOpen}
        onClose={() => setIsAddSpeciesOpen(false)}
        onSpeciesAdded={(newId) => setSpecies(newId)}
      />
    </div>
  );
};
