import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  ShieldCheck,
  Tag,
  Coins,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { BatchPurchase, Tank, SpeciesCategory } from '../types';

interface BatchesViewProps {
  batches: BatchPurchase[];
  tanks: Tank[];
  onOpenAddBatch: () => void;
  onOpenCullModal: (batch: BatchPurchase) => void;
  onOpenSaleForBatch: (batch: BatchPurchase) => void;
  onDeleteBatch: (batchId: string) => void;
}

export const BatchesView: React.FC<BatchesViewProps> = ({
  batches,
  tanks,
  onOpenAddBatch,
  onOpenCullModal,
  onOpenSaleForBatch,
  onDeleteBatch,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | SpeciesCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBatches = batches.filter((batch) => {
    const matchesCategory =
      selectedCategory === 'all' || batch.category === selectedCategory;
    const matchesSearch =
      batch.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.strain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalSpent = batches.reduce((acc, b) => acc + b.totalCost, 0);
  const totalKept = batches.reduce((acc, b) => acc + b.keptForBreeding, 0);
  const totalCull = batches.reduce((acc, b) => acc + b.markedForSale, 0);
  const totalReceived = batches.reduce((acc, b) => acc + b.quantityReceived, 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Context Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Canlı Alımları & Seçici Damızlık Islahı
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Satın aldığınız canlı gruplarını kaydedin, en kusursuz damızlıkları kendinize ayırıp kalanları hobicilere sunarak maliyetleri sıfırlayın.
          </p>
        </div>

        <button
          onClick={onOpenAddBatch}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Satın Alma</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Toplam Alınan Canlı</span>
          <span className="text-xl font-bold text-white font-mono tabular-nums">
            {totalReceived} <span className="text-xs font-normal text-slate-400">adet</span>
          </span>
          <div className="mt-1 text-[11px] text-slate-500 font-mono tabular-nums">
            {batches.length} farklı parti/ithalat
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Toplam Alış Maliyeti</span>
          <span className="text-xl font-bold text-white font-mono tabular-nums">
            {totalSpent.toLocaleString('tr-TR')} ₺
          </span>
          <div className="mt-1 text-[11px] text-slate-500 font-mono tabular-nums">
            Ort. {totalReceived > 0 ? Math.round(totalSpent / totalReceived) : 0} ₺ / canlı
          </div>
        </div>

        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40">
          <span className="text-xs text-purple-300 block mb-1">Kendime Ayırdıklarım</span>
          <span className="text-xl font-bold text-purple-200 font-mono tabular-nums">
            {totalKept} <span className="text-xs font-normal text-purple-300/70">Damızlık</span>
          </span>
          <div className="mt-1 text-[11px] text-purple-400/80">
            Elit üretim kadrosunda aktif
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
          <span className="text-xs text-emerald-300 block mb-1">Hobicilere Satış Havuzu</span>
          <span className="text-xl font-bold text-emerald-300 font-mono tabular-nums">
            {totalCull} <span className="text-xs font-normal text-emerald-400/70">Adet</span>
          </span>
          <div className="mt-1 text-[11px] text-emerald-400/80">
            10+1 ve damızlık altı paketlerde
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-slate-900/40 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          {(
            [
              { id: 'all', label: 'Tüm Türler' },
              { id: 'caridina', label: 'Caridina' },
              { id: 'neocaridina', label: 'Neocaridina' },
              { id: 'apistogramma', label: 'Apistogramma' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === tab.id
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Parti adı, varyete veya kaynak ara..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredBatches.map((batch) => {
          const tank = tanks.find((t) => t.id === batch.assignedTankId);
          const keptPercent = Math.round((batch.keptForBreeding / batch.quantityReceived) * 100);
          const salePercent = Math.round((batch.markedForSale / batch.quantityReceived) * 100);
          const mortalityPercent = Math.round((batch.mortalityCount / batch.quantityReceived) * 100);

          // Potential recovery:
          const targetPrice = batch.targetSalePricePerUnit || batch.unitCost * 1.2;
          const potentialRevenue = batch.markedForSale * targetPrice;
          const netCostForBreeder = batch.totalCost - potentialRevenue;

          return (
            <div
              key={batch.id}
              className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="capitalize font-semibold text-slate-300">
                        {batch.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{batch.purchaseDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-500">{batch.supplier}</span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {batch.batchName}
                    </h3>
                    <div className="text-xs text-emerald-400 font-medium mt-0.5">
                      {batch.strain}
                    </div>
                  </div>

                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded font-medium shrink-0 border ${
                      batch.status === 'completed'
                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                        : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                    }`}
                  >
                    {batch.status === 'completed' ? 'Amorti Edildi' : 'Ayıklama / Satışta'}
                  </span>
                </div>

                {/* Financial overview strip */}
                <div className="mt-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Toplam Alış:</span>
                    <span className="font-bold text-white font-mono tabular-nums">
                      {batch.isFreeInventory ? '0 ₺' : `${batch.totalCost.toLocaleString('tr-TR')} ₺`}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {batch.isFreeInventory ? '(Bedelsiz Yavru)' : `(${batch.quantityReceived} adet)`}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {batch.isFreeInventory ? 'Manuel Kıymet:' : 'Ort. Alış Fiyatı:'}
                    </span>
                    <span className="font-bold text-blue-300 font-mono tabular-nums">
                      {batch.isFreeInventory
                        ? `${batch.manualValuationPrice || batch.targetSalePricePerUnit || 0} ₺ / ad`
                        : `${Math.round(batch.unitCost)} ₺ / adet`}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {batch.isFreeInventory ? 'İşletme kıymeti' : 'Satın alma başı'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Atanan Tank:</span>
                    <span className="font-bold text-slate-300 truncate block">
                      {tank ? tank.code : 'Atanmadı'}
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      {tank?.name || ''}
                    </span>
                  </div>
                </div>

                {/* Selection & Culling Visualizer */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-medium flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      <span>Kendime Ayrılan: <strong className="text-purple-300 font-mono tabular-nums">{batch.keptForBreeding} adet</strong></span>
                    </span>
                    <span className="font-medium flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Hobici Satış: <strong className="text-emerald-300 font-mono tabular-nums">{batch.markedForSale} adet</strong></span>
                    </span>
                  </div>

                  {/* Multi-segmented visual bar */}
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      title={`Kendime Ayrılan: ${batch.keptForBreeding} adet (%${keptPercent})`}
                      style={{ width: `${keptPercent}%` }}
                      className="bg-purple-500 h-full"
                    />
                    <div
                      title={`Hobici Satış Havuzu: ${batch.markedForSale} adet (%${salePercent})`}
                      style={{ width: `${salePercent}%` }}
                      className="bg-emerald-500 h-full"
                    />
                    {batch.mortalityCount > 0 && (
                      <div
                        title={`Kayıp: ${batch.mortalityCount} adet (%${mortalityPercent})`}
                        style={{ width: `${mortalityPercent}%` }}
                        className="bg-slate-600 h-full"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>% {keptPercent} Damızlık</span>
                    <span>% {salePercent} Satış Havuzu</span>
                    {batch.mortalityCount > 0 && <span>{batch.mortalityCount} kayıp</span>}
                  </div>
                </div>

                {/* Business Outcome: Amortization logic */}
                <div className="mt-4 p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-semibold mb-1">
                    <Coins className="w-3.5 h-3.5" />
                    <span>Ekonomik Amortisman Hesabı</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Satış havuzundaki {batch.markedForSale} adet canlı ortalama{' '}
                    <span className="text-emerald-300 font-mono font-semibold">{targetPrice} ₺</span>{' '}
                    fiyatla satıldığında{' '}
                    <span className="text-emerald-300 font-mono font-semibold">
                      +{potentialRevenue.toLocaleString('tr-TR')} ₺
                    </span>{' '}
                    hasılat getirecektir.
                  </p>
                  <div className="mt-2 pt-2 border-t border-emerald-900/40 text-[11px] text-slate-300 flex items-center justify-between">
                    <span>Damızlıkların Net Maliyeti:</span>
                    <span className="font-bold text-white font-mono tabular-nums">
                      {netCostForBreeder <= 0 ? (
                        <span className="text-emerald-400">
                          0 ₺ (Ücretsiz) + {Math.abs(netCostForBreeder)} ₺ Kâr!
                        </span>
                      ) : (
                        <span>Sadece {netCostForBreeder.toLocaleString('tr-TR')} ₺</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Notes & Selection Criteria */}
                {batch.selectionNotes && (
                  <div className="mt-3 text-xs text-slate-400 italic bg-slate-950/40 p-2.5 rounded border border-slate-800/60">
                    "{batch.selectionNotes}"
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenCullModal(batch)}
                  className="px-3 py-1.5 text-xs font-semibold text-purple-300 hover:text-white bg-purple-950/30 hover:bg-purple-900/50 border border-purple-800/40 rounded-lg transition-colors cursor-pointer"
                >
                  Damızlık / Satış Ayıkla
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenSaleForBatch(batch)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
                  >
                    Satış Yap
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`"${batch.batchName}" partisini silmek istediğinize emin misiniz?`)) {
                        onDeleteBatch(batch.id);
                      }
                    }}
                    className="px-2 py-1.5 text-xs text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded transition-colors cursor-pointer"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBatches.length === 0 && (
        <div className="text-center py-12 p-8 rounded-xl bg-slate-900/30 border border-slate-800">
          <Info className="w-8 h-8 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Canlı Partisi Bulunamadı</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Arama kriterlerinize uyan parti yok ya da henüz yeni canlı alımı girmediniz.
          </p>
          <button
            onClick={onOpenAddBatch}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
          >
            + İlk Canlı Partisini Ekle
          </button>
        </div>
      )}
    </div>
  );
};
