import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Expense } from '../types';

interface ExpensesViewProps {
  expenses: Expense[];
  onOpenAddExpense: () => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onOpenAddExpense,
  onDeleteExpense,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredExpenses = expenses.filter(
    (e) => selectedCategory === 'all' || e.category === selectedCategory
  );

  const totalExpense = expenses.reduce((acc, e) => acc + e.amount, 0);

  const getCategoryLabel = (cat: Expense['category']) => {
    switch (cat) {
      case 'feed':
        return 'Yem & Canlı Artemia';
      case 'minerals':
        return 'Su Düzenleyici & RO Mineral';
      case 'packaging':
        return 'Strafor Kutu & Isıtıcı Ped';
      case 'equipment':
        return 'Demirbaş & Donanım';
      case 'utilities':
        return 'Elektrik & Diğer Giderler';
      default:
        return 'Genel Gider';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
            Üretimhane Giderleri & Demirbaş Bütçesi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Demirbaşlar (hava motoru, LED armatür), RO mineralleri, Artemia kistleri ve kargo kutusu maliyetlerini takip edin.
          </p>
        </div>

        <button
          onClick={onOpenAddExpense}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-xl sm:rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Gider Ekle</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] sm:text-xs text-slate-500 block mb-1">Toplam Gider</span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 font-mono tabular-nums">
            {totalExpense.toLocaleString('tr-TR')} ₺
          </span>
          <div className="mt-1 text-[10px] sm:text-[11px] text-slate-500">
            Canlı alımları hariç sarflar
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200">
          <span className="text-[11px] sm:text-xs text-slate-500 block mb-1">Kayıt Sayısı</span>
          <span className="text-lg sm:text-xl font-bold text-slate-900 font-mono tabular-nums">
            {expenses.length} Harcama
          </span>
          <div className="mt-1 text-[10px] sm:text-[11px] text-slate-500">
            Düzenli takip ediliyor
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-xl overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'all', label: 'Tüm Harcamalar' },
            { id: 'packaging', label: 'Strafor Kargo & Ped' },
            { id: 'equipment', label: 'Demirbaşlar' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`min-h-[40px] sm:min-h-0 px-3 py-2 sm:py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              selectedCategory === tab.id
                ? 'bg-slate-100 text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mobile Cards (< md) */}
      <div className="md:hidden space-y-2.5">
        {filteredExpenses.map((exp) => {
          const isConfirming = confirmDeleteId === exp.id;
          return (
            <div
              key={exp.id}
              className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 leading-snug">
                    {exp.title}
                  </div>
                  {exp.notes && (
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                      {exp.notes}
                    </div>
                  )}
                </div>
                <span className="text-sm font-mono tabular-nums font-bold text-red-600 shrink-0">
                  -{exp.amount.toLocaleString('tr-TR')} ₺
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-[11px] font-mono text-slate-500">{exp.date}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 truncate max-w-[175px]">
                    {getCategoryLabel(exp.category)}
                  </span>
                </div>

                {isConfirming ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="min-h-[36px] px-2.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium cursor-pointer"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteExpense(exp.id);
                        setConfirmDeleteId(null);
                      }}
                      className="min-h-[36px] px-2.5 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      Sil
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(exp.id)}
                    className="min-h-[36px] px-2.5 inline-flex items-center gap-1 rounded-lg text-xs text-slate-500 hover:text-red-600 hover:bg-slate-100 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sil</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredExpenses.length === 0 && (
          <div className="p-6 rounded-xl border border-slate-200 bg-white text-center text-xs text-slate-500">
            Bu kategoride gider kaydı bulunamadı.
          </div>
        )}
      </div>

      {/* Desktop Table (>= md) */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-medium">
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4">Gider Başlığı & Detay</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Tutar (TL)</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExpenses.map((exp) => {
                const isConfirming = confirmDeleteId === exp.id;
                return (
                  <tr key={exp.id} className="hover:bg-slate-100 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{exp.title}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{exp.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
                        {getCategoryLabel(exp.category)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-red-600">
                      -{exp.amount.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isConfirming ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[11px] cursor-pointer"
                          >
                            İptal
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteExpense(exp.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold cursor-pointer"
                          >
                            Onayla
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(exp.id)}
                          className="text-xs text-slate-500 hover:text-red-600 p-1 cursor-pointer"
                        >
                          Sil
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    Bu kategoride gider kaydı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
