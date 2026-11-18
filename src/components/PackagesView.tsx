import React, { useState } from 'react';
import {
  Copy,
  Check,
  Plus,
  Package,
  Sparkles,
  Share2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { SalePackageTemplate, SpeciesCategory } from '../types';
import { useSpeciesList } from '../utils/speciesStorage';
import { AddSpeciesModal } from './modals/AddSpeciesModal';

interface PackagesViewProps {
  packages: SalePackageTemplate[];
  onAddPackage: (pkg: SalePackageTemplate) => void;
  onDeletePackage: (id: string) => void;
}

export const PackagesView: React.FC<PackagesViewProps> = ({
  packages,
  onAddPackage,
  onDeletePackage,
}) => {
  const speciesList = useSpeciesList();
  const [isAddSpeciesOpen, setIsAddSpeciesOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterSpecies, setFilterSpecies] = useState<'all' | SpeciesCategory>('all');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPkg, setNewPkg] = useState({
    title: '',
    species: 'neocaridina' as SpeciesCategory,
    strain: '',
    packageQuantity: '10 + 1 Hediye',
    price: 300,
    description: '',
    parametersText: 'TDS: 180-220 | pH: 7.2 | Sıcaklık: 23°C',
    shippingText: 'Strafor kutulu, ısıtıcı pedli garantili kargo veya elden teslim.',
  });

  const filteredPackages = packages.filter(
    (p) => filterSpecies === 'all' || p.species === filterSpecies
  );

  const copyAdText = (pkg: SalePackageTemplate) => {
    const text = `🦐 [AQUABREEDER] ${pkg.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Tür & Varyete: ${pkg.strain} (${pkg.species.toUpperCase()})
📦 Paket İçeriği: ${pkg.packageQuantity}
💰 Paket Fiyatı: ${pkg.price} TL

📝 Açıklama & Form Durumu:
${pkg.description}

💧 İdeal Su Şartları:
${pkg.parametersText}

🚚 Gönderim & Teslimat:
${pkg.shippingText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📞 İletişim & Sipariş için özelden yazabilirsiniz. Keyifli hobiler!`;

    navigator.clipboard.writeText(text);
    setCopiedId(pkg.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkg.title || !newPkg.strain) return;
    onAddPackage({
      id: `pkg-${Date.now()}`,
      ...newPkg,
    });
    setIsAddingNew(false);
    setNewPkg({
      title: '',
      species: 'neocaridina',
      strain: '',
      packageQuantity: '10 + 1 Hediye',
      price: 300,
      description: '',
      parametersText: 'TDS: 180-220 | pH: 7.2 | Sıcaklık: 23°C',
      shippingText: 'Strafor kutulu, ısıtıcı pedli garantili kargo veya elden teslim.',
    });
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Hobici Satış Paketleri & İlan Oluşturucu
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ayıkladığınız canlıları hobicilerin en çok tercih ettiği 10+1 ve damızlık altı paketlere dönüştürün. Tek tıkla WhatsApp ve forum ilan metnini kopyalayın.
          </p>
        </div>

        <button
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Paket Şablonu</span>
        </button>
      </div>

      {/* New Package Form Drawer */}
      {isAddingNew && (
        <form
          onSubmit={handleCreate}
          className="p-5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Yeni Satış Paketi Şablonu Oluştur</h3>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Kapat
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Paket Başlığı</label>
              <input
                type="text"
                required
                placeholder="Örn: 10+1 Bloody Mary Hobici Paketi"
                value={newPkg.title}
                onChange={(e) => setNewPkg({ ...newPkg, title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 block font-medium">Tür Kategorisi</label>
                <button
                  type="button"
                  onClick={() => setIsAddSpeciesOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  title="Yeni bir canlı türü ekle"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ Manuel Tür Ekle</span>
                </button>
              </div>
              <select
                value={newPkg.species}
                onChange={(e) => setNewPkg({ ...newPkg, species: e.target.value as SpeciesCategory })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                {speciesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Varyete / Varyasyon</label>
              <input
                type="text"
                required
                placeholder="Örn: Blue Dream / Cacatuoides Double Red"
                value={newPkg.strain}
                onChange={(e) => setNewPkg({ ...newPkg, strain: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Paket Adedi / İçerik</label>
              <input
                type="text"
                required
                placeholder="10 + 1 Hediye veya 1 Çift (1E+1D)"
                value={newPkg.packageQuantity}
                onChange={(e) => setNewPkg({ ...newPkg, packageQuantity: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Paket Fiyatı (TL)</label>
              <input
                type="number"
                required
                value={newPkg.price}
                onChange={(e) => setNewPkg({ ...newPkg, price: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Su Değerleri Notu</label>
              <input
                type="text"
                value={newPkg.parametersText}
                onChange={(e) => setNewPkg({ ...newPkg, parametersText: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Detaylı Açıklama & Canlı Durumu</label>
              <textarea
                rows={2}
                value={newPkg.description}
                onChange={(e) => setNewPkg({ ...newPkg, description: e.target.value })}
                placeholder="Damızlık altı boyda, formları düzgün, canlı artemia ve kaliteli spirulina ile beslenmiş sağlıklı canlılar..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Kargo & Teslimat Şartları</label>
              <textarea
                rows={2}
                value={newPkg.shippingText}
                onChange={(e) => setNewPkg({ ...newPkg, shippingText: e.target.value })}
                placeholder="Strafor kutu, ısıtıcı ped ve oksijen takviyesi ile canlı teslimat garantisi..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg"
            >
              Paketi Kaydet
            </button>
          </div>
        </form>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900/40 border border-slate-800 rounded-xl overflow-x-auto">
        {(
          [
            { id: 'all', label: 'Tüm Paketler' },
            { id: 'neocaridina', label: 'Neocaridina Paketleri' },
            { id: 'caridina', label: 'Caridina Paketleri' },
            { id: 'apistogramma', label: 'Apistogramma Çiftleri' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterSpecies(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              filterSpecies === tab.id
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPackages.map((pkg) => {
          const isCopied = copiedId === pkg.id;

          return (
            <div
              key={pkg.id}
              className="p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                      <span className="capitalize font-semibold text-emerald-400">
                        {pkg.species}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-300">{pkg.strain}</span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {pkg.title}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-white font-mono tabular-nums">
                      {pkg.price} ₺
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {pkg.packageQuantity}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-300 leading-relaxed">
                  {pkg.description}
                </p>

                <div className="mt-4 space-y-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      Su Değerleri:
                    </span>
                    <span className="text-slate-300 font-mono text-[11px]">
                      {pkg.parametersText}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      Gönderim & Teslimat:
                    </span>
                    <span className="text-slate-300 text-[11px]">
                      {pkg.shippingText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  onClick={() => copyAdText(pkg)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>İlan Metni Panoya Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>WhatsApp / Forum İlan Metnini Kopyala</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Bu paketi silmek istediğinize emin misiniz?`)) {
                      onDeletePackage(pkg.id);
                    }
                  }}
                  className="px-2.5 py-2 text-xs text-slate-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                  title="Paketi Sil"
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
        onSpeciesAdded={(newId) => setNewPkg({ ...newPkg, species: newId })}
      />
    </div>
  );
};
