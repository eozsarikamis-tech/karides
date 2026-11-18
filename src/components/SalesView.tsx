import React, { useState } from 'react';
import {
  Plus,
  Search,
  ShoppingBag,
  TrendingUp,
  Truck,
  CheckCircle2,
  Clock,
  User,
  MapPin,
  MessageSquare,
  DollarSign,
  Download,
} from 'lucide-react';
import { Sale, SpeciesCategory } from '../types';

interface SalesViewProps {
  sales: Sale[];
  onOpenAddSale: () => void;
  onTogglePaymentStatus: (saleId: string) => void;
  onDeleteSale: (saleId: string) => void;
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  onOpenAddSale,
  onTogglePaymentStatus,
  onDeleteSale,
}) => {
  const [selectedSpecies, setSelectedSpecies] = useState<'all' | SpeciesCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSales = sales.filter((sale) => {
    const matchesSpecies =
      selectedSpecies === 'all' || sale.species === selectedSpecies;
    const matchesSearch =
      sale.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.itemDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.customerContact.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpecies && matchesSearch;
  });

  const totalRevenue = sales.reduce((acc, s) => acc + s.totalPrice, 0);
  const totalNetProfit = sales.reduce((acc, s) => acc + s.netProfit, 0);
  const totalCountSold = sales.reduce((acc, s) => acc + s.quantity, 0);
  const pendingRevenue = sales
    .filter((s) => s.paymentStatus === 'pending')
    .reduce((acc, s) => acc + s.totalPrice, 0);

  const getDeliveryLabel = (method: Sale['deliveryMethod']) => {
    switch (method) {
      case 'hand_delivery':
        return 'Elden Teslim';
      case 'no_styrofoam':
        return 'Straforsuz Gönderim';
      case 'styrofoam_box':
        return 'Strafor Kutu';
      case 'cargo_styrofoam':
        return 'Strafor Kutu + Isıtıcı Ped';
      case 'bus_freight':
        return 'Otobüs Emanet';
      default:
        return 'Teslimat';
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Hobici Satışları & Gelir Defteri
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ayıkladığınız canlıların hobicilere satışını kaydedin, kargo ve ödeme durumunu takip edin.
          </p>
        </div>

        <button
          onClick={onOpenAddSale}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Satış Kaydet</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Toplam Ciro</span>
          <span className="text-xl font-bold text-white font-mono tabular-nums">
            {totalRevenue.toLocaleString('tr-TR')} ₺
          </span>
          <div className="mt-1 text-[11px] text-slate-500 font-mono tabular-nums">
            {sales.length} tamamlanan sipariş
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Toplam Net Kâr</span>
          <span className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
            +{totalNetProfit.toLocaleString('tr-TR')} ₺
          </span>
          <div className="mt-1 text-[11px] text-slate-500">
            Damızlık amortismanı dahil
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Teslim Edilen Canlı</span>
          <span className="text-xl font-bold text-white font-mono tabular-nums">
            {totalCountSold} <span className="text-xs font-normal text-slate-400">adet</span>
          </span>
          <div className="mt-1 text-[11px] text-slate-500">
            Karides ve Cichlid bireyleri
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
          <span className="text-xs text-slate-400 block mb-1">Bekleyen Ödeme</span>
          <span className="text-xl font-bold text-amber-300 font-mono tabular-nums">
            {pendingRevenue.toLocaleString('tr-TR')} ₺
          </span>
          <div className="mt-1 text-[11px] text-slate-500">
            Tahsilat bekleyen siparişler
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-slate-900/40 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
          {(
            [
              { id: 'all', label: 'Tüm Satışlar' },
              { id: 'caridina', label: 'Caridina' },
              { id: 'neocaridina', label: 'Neocaridina' },
              { id: 'apistogramma', label: 'Apistogramma' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSpecies(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                selectedSpecies === tab.id
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
            placeholder="Müşteri adı, varyete, şehir..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table / High Density List */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4">Alıcı / Müşteri</th>
                <th className="py-3 px-4">Şehir</th>
                <th className="py-3 px-4">Satılan Canlı & Paket</th>
                <th className="py-3 px-4 text-center">Adet</th>
                <th className="py-3 px-4 text-right">Tutar (TL)</th>
                <th className="py-3 px-4 text-right">Net Kâr</th>
                <th className="py-3 px-4 text-center">Teslimat</th>
                <th className="py-3 px-4 text-center">Ödeme</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  className="hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                    {sale.date}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{sale.customerName}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                      {sale.customerContact}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                    {sale.city}
                  </td>

                  <td className="py-3 px-4">
                    <div className="text-slate-200 font-medium">
                      {sale.itemDescription}
                    </div>
                    {sale.trackingOrNotes && (
                      <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
                        {sale.trackingOrNotes}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-200">
                    {sale.quantity}
                  </td>

                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-white">
                    <div>{sale.totalPrice} ₺</div>
                    {(sale.shippingCharged ?? 0) > 0 && (
                      <div className="text-[10px] font-normal text-slate-400">
                        +{sale.shippingCharged} ₺ Kargo
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    <span
                      className={
                        sale.netProfit >= 0
                          ? 'text-emerald-400 font-semibold'
                          : 'text-red-400 font-semibold'
                      }
                    >
                      {sale.netProfit >= 0 ? `+${sale.netProfit}` : sale.netProfit} ₺
                    </span>
                    {((sale.shippingCharged ?? 0) > 0 ||
                      (sale.shippingCost ?? 0) > 0 ||
                      (sale.styrofoamUnitCost ?? 0) > 0 ||
                      (sale.heatPackUnitCost ?? 0) > 0) && (
                      <div className="text-[10px] text-slate-400 mt-0.5 space-x-1">
                        <span>
                          Kargo: +{sale.shippingCharged ?? 0} - {sale.shippingCost ?? 0}
                        </span>
                        {(sale.styrofoamUnitCost ?? 0) > 0 && (
                          <span>- {sale.styrofoamUnitCost} Strafor</span>
                        )}
                        {(sale.heatPackUnitCost ?? 0) > 0 && (
                          <span>- {sale.heatPackUnitCost} Ped</span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {getDeliveryLabel(sale.deliveryMethod)}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <button
                      onClick={() => onTogglePaymentStatus(sale.id)}
                      className={`text-[11px] px-2.5 py-0.5 rounded font-medium border cursor-pointer transition-colors ${
                        sale.paymentStatus === 'paid'
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/60'
                          : 'bg-amber-950/40 text-amber-300 border-amber-800/40 hover:bg-amber-900/60'
                      }`}
                    >
                      {sale.paymentStatus === 'paid' ? 'Tahsil Edildi' : 'Ödeme Bekliyor'}
                    </button>
                  </td>

                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        if (confirm(`Bu satış kaydını silmek istediğinize emin misiniz?`)) {
                          onDeleteSale(sale.id);
                        }
                      }}
                      className="text-slate-500 hover:text-red-400 text-xs cursor-pointer p-1"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSales.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-xs">
            Kayıtlı satış bulunamadı.
          </div>
        )}
      </div>
    </div>
  );
};
