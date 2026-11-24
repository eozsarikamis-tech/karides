import React, { useState } from 'react';
import { X, Sparkles, Wrench, Package, PlusCircle, Check, Plus } from 'lucide-react';
import { BatchPurchase, Expense, Tank, SpeciesCategory, InventoryUnit } from '../../types';
import { useSpeciesList } from '../../utils/speciesStorage';
import { AddSpeciesModal } from './AddSpeciesModal';

interface ManualItemDefinitionModalProps {
  tanks: Tank[];
  onClose: () => void;
  onAddBatch: (batch: BatchPurchase) => void;
  onAddExpense: (expense: Expense) => void;
}

type MaterialType = 'livestock' | 'equipment' | 'supply';

export const ManualItemDefinitionModal: React.FC<ManualItemDefinitionModalProps> = ({
  tanks: _tanks,
  onClose,
  onAddBatch,
  onAddExpense,
}) => {
  const speciesList = useSpeciesList();
  const [isAddSpeciesOpen, setIsAddSpeciesOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<MaterialType>('livestock');

  // ==================== 1. CANLI (LIVESTOCK) STATE ====================
  // Combined into single "Canlı Adı"
  const [liveName, setLiveName] = useState('');
  const [category, setCategory] = useState<SpeciesCategory>('caridina');
  const [supplier, setSupplier] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [quantityReceived, setQuantityReceived] = useState(30);
  const [totalCost, setTotalCost] = useState(2500);
  const [selectionNotes, setSelectionNotes] = useState('');
  const [isFreeInventory, setIsFreeInventory] = useState(false);
  const [manualValuationPrice, setManualValuationPrice] = useState(90);

  const effectiveCost = isFreeInventory ? 0 : totalCost;
  const unitCost = quantityReceived > 0 ? effectiveCost / quantityReceived : 0;

  // ==================== 2. DEMİRBAŞ (EQUIPMENT) STATE ====================
  const [equipTitle, setEquipTitle] = useState('');
  const [equipQuantity, setEquipQuantity] = useState(1);
  const [equipUnit, setEquipUnit] = useState<InventoryUnit>('adet');
  const [equipUnitCost, setEquipUnitCost] = useState(450);
  const [equipTotalCost, setEquipTotalCost] = useState(450);
  const [equipDate, setEquipDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [equipLocation, setEquipLocation] = useState('1. Set Raf Akvaryumları');
  const [equipNotes, setEquipNotes] = useState('');

  // ==================== 3. SARF (SUPPLY) STATE ====================
  const [supplyCategory, setSupplyCategory] = useState<Expense['category']>('minerals');
  const [supplyTitle, setSupplyTitle] = useState('');
  const [supplyAmount, setSupplyAmount] = useState(550);
  const [supplyQuantity, setSupplyQuantity] = useState<number>(230);
  const [supplyUnit, setSupplyUnit] = useState<InventoryUnit>('gram');
  const [supplyDate, setSupplyDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [supplyNotes, setSupplyNotes] = useState('');
  const [supplySubstrateType, setSupplySubstrateType] = useState<
    '' | 'sand' | 'active_soil'
  >('');

  // Quick Presets for Livestock
  const livestockPresets = [
    {
      label: 'PRL Crystal Red',
      category: 'caridina' as SpeciesCategory,
      liveName: 'Saf Kan PRL Crystal Red SS',
      qty: 25,
      cost: 2500,
      notes: 'Gövde kabuk beyazlığı ve bacak pigmenti yüksek hat. RO su 120 ppm TDS.',
    },
    {
      label: 'Bloody Mary',
      category: 'neocaridina' as SpeciesCategory,
      liveName: 'Bloody Mary (Derin Kırmızı Doku)',
      qty: 40,
      cost: 1200,
      notes: 'Et rengi kırmızı safkan koloni.',
    },
    {
      label: 'Apisto Triple Red',
      category: 'apistogramma' as SpeciesCategory,
      liveName: 'Apistogramma Cacatuoides Triple Red',
      qty: 4,
      cost: 1400,
      notes: '2 çift (2 erkek + 2 dişi). Kuyruk alev deseni belirgin.',
    },
    {
      label: 'Blue Dream',
      category: 'neocaridina' as SpeciesCategory,
      liveName: 'Blue Dream Top Grade',
      qty: 30,
      cost: 900,
      notes: 'Açık maviye kaçmayan derin kobalt pigmentli bireyler.',
    },
    {
      label: 'Black Fancy Tiger',
      category: 'caridina' as SpeciesCategory,
      liveName: 'Black Fancy Tiger Islah Hattı',
      qty: 15,
      cost: 3000,
      notes: 'Çizgi desenleri simetrik, yüksek kontrasta sahip özel ıslah bireyleri.',
    },
  ];

  // Quick Presets for Equipment (Demirbaş)
  const equipmentPresets = [
    {
      label: 'Hava Motoru',
      title: 'Sobo SB-8806 Çift Çıkışlı Sessiz Hava Motoru',
      unitCost: 380,
      notes: 'Üretimhane tankları için sessiz titreşimsiz motor',
      location: '1. ve 2. Set Akvaryumlar',
    },
    {
      label: 'LED Armatür',
      title: 'Akvaryum LED Armatürü Full Spectrum 6500K',
      unitCost: 520,
      notes: 'Bitki fotosentezi ve karides kabuk renkleri için armatür',
      location: '1. Set 4 Katlı Akvaryumlar',
    },
    {
      label: 'Hortum & Çek Valf',
      title: 'Silikon Hava Hortumu + Çek Valf Seti',
      unitCost: 15,
      quantity: 15,
      unit: 'metre' as InventoryUnit,
      notes: 'Geri su basmasını önleyen emniyet valfleri ve hava dağıtıcı',
      location: 'Tüm Raf Setleri',
    },
    {
      label: 'Pipo Filtre',
      title: 'Çift Süngerli Biyolojik Pipo Filtre (L Boy)',
      unitCost: 140,
      quantity: 1,
      unit: 'adet' as InventoryUnit,
      notes: 'Yavru karides güvenli biyolojik sünger filtre',
      location: 'Üretim Akvaryumları',
    },
    {
      label: 'RO Arıtma Cihazı',
      title: '5 Aşamalı Ters Ozmoz (RO) Su Arıtma Ünitesi',
      unitCost: 2200,
      quantity: 1,
      unit: 'adet' as InventoryUnit,
      notes: 'Caridina karidesler için 0-10 ppm saf RO su üretim sistemi',
      location: 'Su Hazırlama İstasyonu',
    },
    {
      label: 'Dijital TDS Metre',
      title: 'Hassas Sıcaklık Kompanzasyonlu Dijital TDS Metre',
      unitCost: 280,
      quantity: 1,
      unit: 'adet' as InventoryUnit,
      notes: 'RO su mineralizasyonu ve tank ölçümleri için',
      location: 'Test ve Kontrol İstasyonu',
    },
  ];

  // Quick Presets for Supplies (Sarf)
  const supplyPresets = [
    {
      label: 'SaltyShrimp GH+',
      title: 'SaltyShrimp Bee Shrimp Mineral GH+',
      category: 'minerals' as Expense['category'],
      amount: 550,
      quantity: 230,
      unit: 'gram' as InventoryUnit,
      notes: 'RO suyunu Caridina karidesler için 115 ppm TDS seviyesine getiren mineral',
    },
    {
      label: 'Canlı Artemia Kisti',
      title: 'Salt Lake Artemia Kisti (%95 Açılımlı)',
      category: 'feed' as Expense['category'],
      amount: 390,
      quantity: 100,
      unit: 'gram' as InventoryUnit,
      notes: 'Apistogramma yavruları için günlük taze canlı yem',
    },
    {
      label: 'Karides Yemi',
      title: 'Shirakura Ebi Dama & Mineral Takviyeli Yem',
      category: 'feed' as Expense['category'],
      amount: 320,
      quantity: 80,
      unit: 'gram' as InventoryUnit,
      notes: 'Kabuk sertleştirici ve renk pigmentasyonu destekleyici yem',
    },
    {
      label: 'Strafor Kutu',
      title: 'Kalın Strafor Kargo Kutusu',
      category: 'packaging' as Expense['category'],
      amount: 400,
      quantity: 10,
      unit: 'adet' as InventoryUnit,
      notes: 'Hobicilere canlı gönderimi için yalıtımlı strafor kutu',
    },
    {
      label: 'Isıtıcı Ped',
      title: '40 Saatlik Akvaryum Isıtıcı Ped',
      category: 'packaging' as Expense['category'],
      amount: 300,
      quantity: 10,
      unit: 'adet' as InventoryUnit,
      notes: 'Kışlık canlı gönderimleri için ısıtıcı ped',
    },
    {
      label: 'Silikon Hortum Sarfı',
      title: 'Yedek Silikon Hava Hortumu (Rulo)',
      category: 'utilities' as Expense['category'],
      amount: 250,
      quantity: 25,
      unit: 'metre' as InventoryUnit,
      notes: 'Akvaryum hava ve su aktarım yedek hortumu',
    },
    {
      label: 'Montmorillonite Kil',
      title: 'Japon Beyaz Montmorillonite Mineral Taşı',
      category: 'minerals' as Expense['category'],
      amount: 280,
      quantity: 200,
      unit: 'gram' as InventoryUnit,
      notes: 'Tank suyundaki toksinleri bağlar, beyaz pigmenti güçlendirir',
    },
  ];

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedType === 'livestock') {
      if (!liveName) return;
      const newBatch: BatchPurchase = {
        id: `batch-${Date.now()}`,
        batchName: liveName,
        category,
        strain: liveName,
        supplier:
          supplier ||
          (isFreeInventory
            ? 'Kendi Üretimimiz (Üretimhane Yavrusu)'
            : 'Doğrudan Üretici / İthalat'),
        purchaseDate,
        quantityReceived,
        totalCost: effectiveCost,
        unitCost,
        keptForBreeding: 0,
        markedForSale: quantityReceived,
        mortalityCount: 0,
        status: 'active_selection',
        selectionNotes,
        assignedTankId: '',
        isFreeInventory,
        manualValuationPrice: isFreeInventory ? manualValuationPrice : undefined,
      };
      onAddBatch(newBatch);
      onClose();
    } else if (selectedType === 'equipment') {
      if (!equipTitle) return;
      const finalCost = equipTotalCost > 0 ? equipTotalCost : equipQuantity * equipUnitCost;
      const newExpense: Expense = {
        id: `exp-equip-${Date.now()}`,
        title: equipTitle.trim(),
        category: 'equipment',
        amount: finalCost,
        quantity: equipQuantity,
        initialQuantity: equipQuantity,
        unit: equipUnit,
        inStock: equipQuantity > 0,
        date: equipDate,
        notes: `Demirbaş Tanımlaması. Tanımlı Stok: ${equipQuantity} ${equipUnit}. Kullanım Alanı: ${equipLocation}. ${equipNotes}`.trim(),
      };
      onAddExpense(newExpense);
      onClose();
    } else if (selectedType === 'supply') {
      if (!supplyTitle) return;
      const newExpense: Expense = {
        id: `exp-supply-${Date.now()}`,
        title: supplyTitle.trim(),
        category: supplyCategory,
        amount: supplyAmount,
        quantity: supplyQuantity,
        initialQuantity: supplyQuantity,
        unit: supplyUnit,
        inStock: supplyQuantity > 0,
        date: supplyDate,
        notes: `Sarf Malzeme Tanımlaması. Tanımlı Stok: ${supplyQuantity} ${supplyUnit}. ${supplyNotes}`.trim(),
        ...(supplySubstrateType ? { substrateType: supplySubstrateType } : {}),
      };
      onAddExpense(newExpense);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-safe shadow-2xl max-h-[92dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-200 shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-300 flex items-center justify-center text-indigo-600 shrink-0">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] text-indigo-600 font-semibold tracking-wider uppercase block">
                Envanter Yönetimi
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                Manuel Malzeme Tanımlama
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Material Type Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 mt-4 p-1.5 bg-slate-50 border border-slate-200 rounded-xl shrink-0">
          {/* Canlı Tab */}
          <button
            type="button"
            onClick={() => setSelectedType('livestock')}
            className={`p-2.5 rounded-lg text-left transition-all cursor-pointer flex flex-col sm:flex-row items-center sm:items-start gap-2 ${
              selectedType === 'livestock'
                ? 'bg-purple-50 border border-purple-500/50 text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white'
            }`}
          >
            <div className="w-7 h-7 rounded-md bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-700 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <span className="text-xs font-bold block truncate">1. Canlı</span>
              <span className="text-[10px] text-purple-700 block truncate">
                Karides & Cichlid
              </span>
            </div>
          </button>

          {/* Demirbaş Tab */}
          <button
            type="button"
            onClick={() => setSelectedType('equipment')}
            className={`p-2.5 rounded-lg text-left transition-all cursor-pointer flex flex-col sm:flex-row items-center sm:items-start gap-2 ${
              selectedType === 'equipment'
                ? 'bg-blue-50 border border-blue-500/50 text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white'
            }`}
          >
            <div className="w-7 h-7 rounded-md bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 shrink-0">
              <Wrench className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <span className="text-xs font-bold block truncate">2. Demirbaş</span>
              <span className="text-[10px] text-blue-700 block truncate">
                Motor, LED, RO, Pipo
              </span>
            </div>
          </button>

          {/* Sarf Tab */}
          <button
            type="button"
            onClick={() => setSelectedType('supply')}
            className={`p-2.5 rounded-lg text-left transition-all cursor-pointer flex flex-col sm:flex-row items-center sm:items-start gap-2 ${
              selectedType === 'supply'
                ? 'bg-amber-50 border border-amber-500/50 text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white'
            }`}
          >
            <div className="w-7 h-7 rounded-md bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0">
              <Package className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <span className="text-xs font-bold block truncate">3. Sarf</span>
              <span className="text-[10px] text-amber-700 block truncate">
                Mineral, Yem, Strafor
              </span>
            </div>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto pr-1 mt-4 flex-1">
          {/* ========================================================= */}
          {/* TAB 1: CANLI TANIMLAMA FORMU                             */}
          {/* ========================================================= */}
          {selectedType === 'livestock' && (
            <div className="space-y-4">
              {/* Livestock Presets */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Hızlı Canlı Şablonları (Tek Tıkla Otomatik Doldur):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {livestockPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setLiveName(p.liveName);
                        setCategory(p.category);
                        setQuantityReceived(p.qty);
                        setTotalCost(p.cost);
                        setSelectionNotes(p.notes);
                        setIsFreeInventory(false);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-purple-100 border border-slate-300 hover:border-purple-500/50 rounded-md transition-colors cursor-pointer"
                    >
                      + {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bedelsiz Envanter Checkbox */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-500/30">
                <label className="text-amber-700 font-semibold text-xs flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFreeInventory}
                    onChange={(e) => {
                      setIsFreeInventory(e.target.checked);
                      if (e.target.checked && !supplier) {
                        setSupplier('Kendi Üretimimiz (Üretimhane Yavrusu)');
                      }
                    }}
                    className="w-4 h-4 rounded text-amber-500 bg-white border-slate-300 cursor-pointer"
                  />
                  <span>Bedelsiz Envanter Tanımlaması (Kendi Üretim Yavrumuz / Hediye / Takas)</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-1 ml-6">
                  Satın alma maliyeti (0 ₺) oluşturmaz. İşletme değeri hesaplamasında belirleyeceğiniz manuel birim kıymet esas alınır.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                {/* Single Combined "Canlı Adı" Field */}
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">
                    Canlı Adı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Saf Kan PRL Crystal Red SS / Bloody Mary / Apistogramma Cacatuoides"
                    value={liveName}
                    onChange={(e) => setLiveName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-500 block font-medium">Canlı Türü</label>
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
                      value={category}
                      onChange={(e) => setCategory(e.target.value as SpeciesCategory)}
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
                    <label className="text-slate-500 block mb-1">Tedarikçi / Menşei</label>
                    <input
                      type="text"
                      placeholder="Örn: İthalat, Kendi Üretimimiz, Hobici Takası"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">Envantere Alınan Canlı Adedi (Adet) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quantityReceived}
                      onChange={(e) => setQuantityReceived(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  {isFreeInventory ? (
                    <div>
                      <label className="text-amber-700 block mb-1 font-semibold">
                        Manuel Birim Kıymet (TL / adet) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={manualValuationPrice}
                        onChange={(e) => setManualValuationPrice(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-amber-500/50 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-slate-500 block mb-1">Toplam Alış Tutarı (TL) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={totalCost}
                        onChange={(e) => setTotalCost(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-slate-500 block mb-1">Tarih</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>

                {/* Calculated unit valuation display */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-700">
                  <span>{isFreeInventory ? 'Hesaplanan İşletme Kıymeti:' : 'Birim Alış Maliyeti:'}</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">
                    {isFreeInventory
                      ? `${manualValuationPrice} ₺ / canlı (Toplam: ${(manualValuationPrice * quantityReceived).toLocaleString('tr-TR')} ₺)`
                      : `${Math.round(unitCost)} ₺ / canlı`}
                  </span>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1">Notlar / Açıklama</label>
                  <textarea
                    rows={2}
                    value={selectionNotes}
                    onChange={(e) => setSelectionNotes(e.target.value)}
                    placeholder="Örn: Beyaz pigmenti yüksek safkan koloni."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: DEMİRBAŞ TANIMLAMA FORMU                           */}
          {/* ========================================================= */}
          {selectedType === 'equipment' && (
            <div className="space-y-4">
              {/* Equipment Presets */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Hızlı Demirbaş Şablonları (Tek Tıkla Doldur):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {equipmentPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setEquipTitle(p.title);
                        setEquipUnitCost(p.unitCost);
                        const q = p.quantity !== undefined ? p.quantity : 1;
                        setEquipQuantity(q);
                        setEquipUnit(p.unit || 'adet');
                        setEquipTotalCost(p.unitCost * q);
                        setEquipNotes(p.notes);
                        setEquipLocation(p.location);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-blue-100 border border-slate-300 hover:border-blue-500/50 rounded-md transition-colors cursor-pointer"
                    >
                      + {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">Demirbaş Malzeme Adı *</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: Sobo SB-8806 Çift Çıkışlı Sessiz Hava Motoru"
                      value={equipTitle}
                      onChange={(e) => setEquipTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">
                      Ölçü Birimi (Tanımlama Seçeneği) *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-50 border border-slate-300 rounded-lg">
                      {(['adet', 'metre', 'gram', 'litre'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setEquipUnit(u)}
                          className={`py-2 px-2 min-h-[38px] rounded-md text-xs font-semibold capitalize transition-all cursor-pointer text-center ${
                            equipUnit === u
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                          }`}
                        >
                          {u === 'adet' && '📦 Adet'}
                          {u === 'metre' && '📏 Metre'}
                          {u === 'gram' && '⚖️ Gram'}
                          {u === 'litre' && '💧 Litre'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">
                      Miktar ({equipUnit}) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={equipQuantity}
                      onChange={(e) => {
                        const q = Number(e.target.value);
                        setEquipQuantity(q);
                        setEquipTotalCost(q * equipUnitCost);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">
                      Birim Alış (TL / {equipUnit})
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={equipUnitCost}
                      onChange={(e) => {
                        const u = Number(e.target.value);
                        setEquipUnitCost(u);
                        setEquipTotalCost(equipQuantity * u);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-blue-700 block mb-1 font-semibold">Toplam Demirbaş Tutarı (TL)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={equipTotalCost}
                      onChange={(e) => setEquipTotalCost(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-blue-500/50 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">Satın Alma / Kurulum Tarihi</label>
                    <input
                      type="date"
                      required
                      value={equipDate}
                      onChange={(e) => setEquipDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">Kullanıldığı Alan / Raf</label>
                    <input
                      type="text"
                      placeholder="Örn: 1. Set Rafı, RO İstasyonu, Tüm Üretimhane"
                      value={equipLocation}
                      onChange={(e) => setEquipLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1">Notlar / Satıcı & Garanti</label>
                  <textarea
                    rows={2}
                    value={equipNotes}
                    onChange={(e) => setEquipNotes(e.target.value)}
                    placeholder="Örn: 2 yıl garantili, sessiz kauçuk ayaklı, yedek süngerli."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-slate-700 text-xs">
                  <span className="font-semibold text-blue-700 block mb-0.5">İşletme Değeri Etkisi:</span>
                  Bu kayıt, işletme bilançosunda doğrudan <strong className="text-slate-900">Demirbaşlar</strong> kalemi altında alım değeriyle değerlenir ve toplam satın alımlara yansır.
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: SARF MALZEME TANIMLAMA FORMU                       */}
          {/* ========================================================= */}
          {selectedType === 'supply' && (
            <div className="space-y-4">
              {/* Supply Presets */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Hızlı Sarf Malzeme Şablonları (Tek Tıkla Doldur):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {supplyPresets.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSupplyTitle(p.title);
                        setSupplyCategory(p.category);
                        setSupplyAmount(p.amount);
                        setSupplyQuantity(p.quantity);
                        setSupplyUnit(p.unit || 'gram');
                        setSupplyNotes(p.notes);
                      }}
                      className="px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-amber-100 border border-slate-300 hover:border-amber-500/50 rounded-md transition-colors cursor-pointer"
                    >
                      + {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">Sarf Malzeme Adı *</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: SaltyShrimp Bee Shrimp Mineral GH+"
                      value={supplyTitle}
                      onChange={(e) => setSupplyTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-semibold block mb-1">
                      Ölçü Birimi (Tanımlama Seçeneği) *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-50 border border-slate-300 rounded-lg">
                      {(['adet', 'metre', 'gram', 'litre'] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setSupplyUnit(u)}
                          className={`py-2 px-2 min-h-[38px] rounded-md text-xs font-semibold capitalize transition-all cursor-pointer text-center ${
                            supplyUnit === u
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                          }`}
                        >
                          {u === 'adet' && '📦 Adet'}
                          {u === 'metre' && '📏 Metre'}
                          {u === 'gram' && '⚖️ Gram'}
                          {u === 'litre' && '💧 Litre'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">
                      Stok Miktarı ({supplyUnit}) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={supplyQuantity}
                      onChange={(e) => setSupplyQuantity(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-amber-700 block mb-1 font-semibold">Toplam Tutar (TL) *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={supplyAmount}
                      onChange={(e) => setSupplyAmount(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-amber-500/50 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                    />
                    <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                      ~{supplyQuantity > 0 ? (supplyAmount / supplyQuantity).toFixed(1) : 0} ₺ / {supplyUnit}
                    </span>
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">Sarf Türü / Kategori</label>
                    <select
                      value={supplyCategory}
                      onChange={(e) => setSupplyCategory(e.target.value as Expense['category'])}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    >
                      <option value="minerals">RO Su & Mineral (GH+, Kil vb.)</option>
                      <option value="feed">Yem & Besin (Artemia, Toz Yem vb.)</option>
                      <option value="packaging">Strafor Kutu & Kargo Seti</option>
                      <option value="utilities">Filtre Kartuşu & Genel Tüketim</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">Satın Alım Tarihi</label>
                    <input
                      type="date"
                      required
                      value={supplyDate}
                      onChange={(e) => setSupplyDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-500 block mb-1">
                      Taban Malzemesi Sınıfı (Opsiyonel)
                    </label>
                    <select
                      value={supplySubstrateType}
                      onChange={(e) =>
                        setSupplySubstrateType(
                          e.target.value as '' | 'sand' | 'active_soil'
                        )
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    >
                      <option value="">Otomatik Algıla / Taban Değil</option>
                      <option value="sand">
                        Kum (Akvaryum Taban &gt; Kum listesinde tanımla)
                      </option>
                      <option value="active_soil">Aktif Toprak</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 block mb-1">Açıklama / Kullanım Notu</label>
                  <textarea
                    rows={2}
                    value={supplyNotes}
                    onChange={(e) => setSupplyNotes(e.target.value)}
                    placeholder="Örn: Caridina akvaryumları için 6 aylık yetecek GH+ mineral stoğu."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-slate-700 text-xs">
                  <span className="font-semibold text-amber-700 block mb-0.5">İşletme Değeri Etkisi:</span>
                  Bu kayıt, işletme bilançosunda doğrudan <strong className="text-slate-900">Sarf Malzemeler</strong> kalemi altında alım tutarıyla değerlenir ve kârlılık dökümünde gider olarak izlenir.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3.5 sm:pt-4 mt-3.5 sm:mt-4 border-t border-slate-200 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            {selectedType === 'livestock' && 'Canlı envanter kaydı oluşturulacak'}
            {selectedType === 'equipment' && 'Demirbaş envantere kaydedilecek'}
            {selectedType === 'supply' && 'Sarf malzeme gideri kaydedilecek'}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className={`w-full sm:w-auto px-5 py-2.5 min-h-[44px] text-xs font-semibold text-slate-900 rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                selectedType === 'livestock'
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : selectedType === 'equipment'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {selectedType === 'livestock' && 'Canlıyı Envantere Tanımla'}
                {selectedType === 'equipment' && 'Demirbaşı Envantere Tanımla'}
                {selectedType === 'supply' && 'Sarf Malzemeyi Tanımla'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <AddSpeciesModal
        isOpen={isAddSpeciesOpen}
        onClose={() => setIsAddSpeciesOpen(false)}
        onSpeciesAdded={(newId) => setCategory(newId)}
      />
    </div>
  );
};
