import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Expense, InventoryUnit } from '../../types';

interface AddExpenseModalProps {
  onClose: () => void;
  onAddExpense: (expense: Expense) => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  onClose,
  onAddExpense,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Expense['category']>('minerals');
  const [amount, setAmount] = useState(450);
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<InventoryUnit>('adet');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [substrateType, setSubstrateType] = useState<'' | 'sand' | 'active_soil'>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      title: title.trim(),
      category,
      amount,
      quantity,
      initialQuantity: quantity,
      unit,
      inStock: quantity > 0,
      date,
      notes,
      ...(substrateType ? { substrateType } : {}),
    };

    onAddExpense(newExpense);
    onClose();
  };

  const presets = [
    {
      label: 'Hava Motoru',
      title: 'Çift Çıkışlı Sessiz Hava Motoru',
      category: 'equipment' as const,
      amount: 380,
      quantity: 1,
      unit: 'adet' as InventoryUnit,
      notes: 'Üretimhane tankları için sessiz titreşimsiz motor',
    },
    {
      label: 'Aydınlatma',
      title: 'LED Akvaryum Armatürü (Full Spectrum)',
      category: 'equipment' as const,
      amount: 480,
      quantity: 1,
      unit: 'adet' as InventoryUnit,
      notes: 'Bitkiler ve karides gelişimi için 6500K aydınlatma',
    },
    {
      label: 'Silikon Hortum',
      title: 'Silikon Hava Hortumu + Çek Valf',
      category: 'equipment' as const,
      amount: 180,
      quantity: 15,
      unit: 'metre' as InventoryUnit,
      notes: 'Geri su kaçırmayan güvenlikli çek valf ve silikon hortum seti',
    },
    {
      label: 'Pipo Filtre',
      title: 'Çift Süngerli Biyolojik Pipo Filtre',
      category: 'equipment' as const,
      amount: 150,
      quantity: 1,
      unit: 'adet' as InventoryUnit,
      notes: 'Yavru güvenli biyolojik sünger filtre',
    },
    {
      label: 'SaltyShrimp GH+',
      title: 'SaltyShrimp Bee Shrimp Mineral GH+',
      category: 'minerals' as const,
      amount: 550,
      quantity: 230,
      unit: 'gram' as InventoryUnit,
      notes: 'RO suyu Caridina için 115 ppm TDS seviyesine getiren mineral',
    },
    {
      label: 'Canlı Artemia Kisti',
      title: 'Salt Lake Artemia Kisti (%95 Açılım)',
      category: 'feed' as const,
      amount: 380,
      quantity: 100,
      unit: 'gram' as InventoryUnit,
      notes: 'Apisto yavruları için yüksek açılımlı taze canlı yem',
    },
    {
      label: 'Strafor Kutu',
      title: 'Kalın Strafor Kargo Kutusu',
      category: 'packaging' as const,
      amount: 400,
      quantity: 10,
      unit: 'adet' as InventoryUnit,
      notes: 'Canlı gönderimi için yalıtımlı strafor kargo kutusu',
    },
    {
      label: 'Isıtıcı Ped',
      title: '40 Saatlik Isıtıcı Ped',
      category: 'packaging' as const,
      amount: 300,
      quantity: 10,
      unit: 'adet' as InventoryUnit,
      notes: 'Kışlık canlı gönderimi için ısıtıcı ped',
    },
  ];

  const applyPreset = (preset: (typeof presets)[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setAmount(preset.amount);
    setQuantity(preset.quantity);
    setUnit(preset.unit);
    setNotes(preset.notes);
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
              Gider & Demirbaş Satın Alımı
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Yeni Harcama / Demirbaş Alımı Ekle
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

        {/* Quick Templates Strip */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Hızlı Hazır Şablonlar (Tek Tıkla Doldur):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-2.5 py-2 min-h-[36px] text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 hover:border-blue-500/50 rounded-lg transition-colors cursor-pointer"
              >
                + {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="text-slate-500 block mb-1">Gider / Malzeme Tanımı *</label>
            <input
              type="text"
              required
              placeholder="Örn: Sobo SB-8806 Çift Çıkışlı Hava Motoru / SaltyShrimp GH+"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
            />
          </div>

          {/* Unit Selection Options */}
          <div>
            <label className="text-slate-700 font-semibold block mb-1">
              Ölçü Birimi (Tanımlama Seçeneği) *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-50 border border-slate-300 rounded-lg">
              {(['adet', 'metre', 'gram', 'litre'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`py-2 px-2 min-h-[38px] rounded-md text-xs font-semibold capitalize transition-all cursor-pointer text-center ${
                    unit === u
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-500 block mb-1">Miktar ({unit}) *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Expense['category'])}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              >
                <option value="equipment">Demirbaş & Donanım</option>
                <option value="minerals">RO Su & Mineral</option>
                <option value="feed">Yem & Canlı Artemia</option>
                <option value="packaging">Strafor Kutu & Kargo Malz.</option>
                <option value="utilities">Elektrik / Diğer</option>
              </select>
            </div>

            <div>
              <label className="text-slate-500 block mb-1">Toplam Tutar (TL)</label>
              <input
                type="number"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-500 block mb-1">Harcama Tarihi</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="text-slate-500 block mb-1">
                Taban Sınıfı (Opsiyonel)
              </label>
              <select
                value={substrateType}
                onChange={(e) =>
                  setSubstrateType(e.target.value as '' | 'sand' | 'active_soil')
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              >
                <option value="">Otomatik Algıla / Taban Değil</option>
                <option value="sand">Kum (Akvaryum Taban &gt; Kum listesine ekle)</option>
                <option value="active_soil">Aktif Toprak</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-500 block mb-1">Notlar / Satıcı</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: 9 Litre aktif toprak veya akvaryum taban kumu."
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
              Gideri Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
