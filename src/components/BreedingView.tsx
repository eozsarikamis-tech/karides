import React, { useState } from 'react';
import {
  Plus,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Fish,
} from 'lucide-react';
import { BreedingSpawn, Tank, SpeciesCategory } from '../types';
import { useSpeciesList } from '../utils/speciesStorage';
import { AddSpeciesModal } from './modals/AddSpeciesModal';

interface BreedingViewProps {
  breedings: BreedingSpawn[];
  tanks: Tank[];
  onOpenAddBreeding: () => void;
  onUpdateStatus: (id: string, status: BreedingSpawn['status'], actualHatch?: string) => void;
  onDeleteBreeding: (id: string) => void;
}

export const BreedingView: React.FC<BreedingViewProps> = ({
  breedings,
  tanks,
  onOpenAddBreeding,
  onUpdateStatus,
  onDeleteBreeding,
}) => {
  const speciesList = useSpeciesList();
  const [isAddSpeciesOpen, setIsAddSpeciesOpen] = useState(false);
  const [filterSpecies, setFilterSpecies] = useState<'all' | SpeciesCategory>('all');

  const filteredBreedings = breedings.filter(
    (b) => filterSpecies === 'all' || b.species === filterSpecies
  );

  const getStatusBadge = (status: BreedingSpawn['status']) => {
    switch (status) {
      case 'incubating':
        return {
          label: 'Yumurtalı / Kuluçkada',
          className: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
        };
      case 'free_swimming':
        return {
          label: 'Serbest Yüzüşte / Artemia Evresi',
          className: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
        };
      case 'growing':
        return {
          label: 'Boylandırma Tankında',
          className: 'bg-blue-950/40 text-blue-300 border-blue-800/40',
        };
      case 'culled':
        return {
          label: 'Ayıklandı / Tamamlandı',
          className: 'bg-slate-800 text-slate-400 border-slate-700',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Kuluçka & Yavru Takip Günlüğü
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Yumurtalı (berried) karides dişilerini, Apistogramma kuluçkalarını ve serbest yüzüşe geçen yavru gruplarını takip edin.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setIsAddSpeciesOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-300 hover:text-white bg-slate-900 hover:bg-emerald-950/80 border border-emerald-600/40 rounded-lg transition-colors cursor-pointer shadow-sm hover:scale-105 active:scale-95"
            title="Manuel Canlı Türü Ekle"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Manuel Canlı Türü Ekle</span>
          </button>

          <button
            onClick={onOpenAddBreeding}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Kuluçka / Yumurtlama Ekle</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/40 border border-slate-800 rounded-xl overflow-x-auto">
        <button
          onClick={() => setFilterSpecies('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            filterSpecies === 'all'
              ? 'bg-slate-800 text-white shadow-sm font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tüm Kuluçkalar
        </button>
        {speciesList.map((sp) => (
          <button
            key={sp.id}
            onClick={() => setFilterSpecies(sp.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              filterSpecies === sp.id
                ? 'bg-slate-800 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {sp.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsAddSpeciesOpen(true)}
          className="px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:text-white bg-slate-900 hover:bg-emerald-950/60 border border-emerald-700/40 rounded-lg transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ml-auto"
          title="Yeni bir canlı türü tanımla"
        >
          <Plus className="w-3 h-3" />
          <span>+ Tür Ekle</span>
        </button>
      </div>

      {/* Breedings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredBreedings.map((br) => {
          const tank = tanks.find((t) => t.id === br.tankId);
          const badge = getStatusBadge(br.status);

          return (
            <div
              key={br.id}
              className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="capitalize font-semibold text-slate-300">
                        {br.species}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-400 font-mono">{tank?.code}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500">{tank?.name}</span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {br.strain}
                    </h3>
                  </div>

                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded font-medium border shrink-0 ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Parent Info */}
                <div className="mt-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold mb-0.5">
                    Damızlık Ebeveyn Bilgisi:
                  </span>
                  <span>{br.parentInfo}</span>
                </div>

                {/* Timeline & Dates */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-950/40 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">Başlangıç / Yumurtlama:</span>
                    <span className="font-semibold text-white font-mono">{br.startDate}</span>
                  </div>

                  <div className="p-2 rounded bg-slate-950/40 border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">Beklenen Serbest Yüzüş:</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      {br.expectedHatchDate}
                    </span>
                  </div>
                </div>

                {/* Count and notes */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>Tahmini Yavru Sayısı:</span>
                  <span className="text-white font-mono font-bold">
                    ~{br.estimatedCount} adet
                  </span>
                </div>

                {br.notes && (
                  <p className="mt-3 text-xs text-slate-400 italic bg-slate-950/30 p-2.5 rounded border border-slate-800/40">
                    "{br.notes}"
                  </p>
                )}
              </div>

              {/* Status Update Actions */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {br.status === 'incubating' && (
                    <button
                      onClick={() =>
                        onUpdateStatus(
                          br.id,
                          'free_swimming',
                          new Date().toISOString().split('T')[0]
                        )
                      }
                      className="px-2.5 py-1 text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 rounded transition-colors cursor-pointer"
                    >
                      ✓ Serbest Yüzüşe Geçti
                    </button>
                  )}

                  {br.status === 'free_swimming' && (
                    <button
                      onClick={() => onUpdateStatus(br.id, 'growing')}
                      className="px-2.5 py-1 text-xs font-medium text-blue-300 hover:text-white bg-blue-950/40 hover:bg-blue-900/60 border border-blue-800/40 rounded transition-colors cursor-pointer"
                    >
                      Boylandırma Tankına Al
                    </button>
                  )}

                  {br.status === 'growing' && (
                    <button
                      onClick={() => onUpdateStatus(br.id, 'culled')}
                      className="px-2.5 py-1 text-xs font-medium text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 rounded transition-colors cursor-pointer"
                    >
                      Damızlık & Satışa Ayıkla
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Bu kuluçka kaydını silmek istediğinize emin misiniz?`)) {
                      onDeleteBreeding(br.id);
                    }
                  }}
                  className="text-xs text-slate-500 hover:text-red-400 p-1"
                >
                  Sil
                </button>
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
