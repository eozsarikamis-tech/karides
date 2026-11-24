import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { Sale } from '../types';
import { useSpeciesList, formatSpeciesLabel } from '../utils/speciesStorage';

interface SalesTrendChartProps {
  sales: Sale[];
}

type TrendRangeKey = '30d' | '3m' | '6m' | '1y';
type SalesMetricMode = 'revenue' | 'quantity';
type SalesAccumulationMode = 'cumulative' | 'daily';

interface TrendRangeOption {
  key: TrendRangeKey;
  label: string;
  days: number;
}

const TREND_RANGES: TrendRangeOption[] = [
  { key: '30d', label: '30 Gün', days: 30 },
  { key: '3m', label: '3 Ay', days: 90 },
  { key: '6m', label: '6 Ay', days: 180 },
  { key: '1y', label: '1 Yıl', days: 365 },
];

interface SeriesMeta {
  key: string;
  label: string;
  color: string;
  isTotal?: boolean;
}

const SPECIES_COLORS: Record<string, string> = {
  caridina: '#f43f5e',
  neocaridina: '#3b82f6',
  apistogramma: '#f59e0b',
  non_livestock: '#94a3b8',
};

const EXTRA_PALETTE = ['#a855f7', '#06b6d4', '#ec4899', '#84cc16', '#14b8a6'];

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDefaultStartDateStr(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - 29);
  return toLocalDateStr(d);
}

function formatAxisDateFromStr(dateStr: string, rangeKey: TrendRangeKey): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  if (rangeKey === '1y') {
    return d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
  }
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

function formatFullDateTR(date: Date): string {
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function normalizeSaleGroupKey(sale: Sale): string {
  if (sale.itemType && sale.itemType !== 'livestock') {
    return 'non_livestock';
  }
  const cat = (sale.species || '').trim().toLocaleLowerCase('tr-TR');
  if (!cat) return 'diger';
  if (cat.includes('neocaridina')) return 'neocaridina';
  if (cat.includes('caridina')) return 'caridina';
  if (cat.includes('apisto') || cat.includes('cichlid')) return 'apistogramma';
  return cat;
}

export const SalesTrendChart: React.FC<SalesTrendChartProps> = ({ sales }) => {
  const speciesList = useSpeciesList();
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [selectedRange, setSelectedRange] = useState<TrendRangeKey>('30d');
  const [commonStartDateStr, setCommonStartDateStr] = useState<string>(getDefaultStartDateStr);
  const [metricMode, setMetricMode] = useState<SalesMetricMode>('revenue');
  const [accumMode, setAccumMode] = useState<SalesAccumulationMode>('cumulative');
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

  const activeRange = TREND_RANGES.find((r) => r.key === selectedRange) || TREND_RANGES[0];

  const {
    chartData,
    seriesList,
    periodRevenue,
    periodQuantity,
    periodProfit,
    periodTransactions,
    formattedStartBadge,
  } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toLocalDateStr(today);

    const parsedStart = new Date((commonStartDateStr || getDefaultStartDateStr()) + 'T00:00:00');
    const anchorStart = isNaN(parsedStart.getTime())
      ? new Date(getDefaultStartDateStr() + 'T00:00:00')
      : parsedStart;
    anchorStart.setHours(0, 0, 0, 0);
    const anchorStr = toLocalDateStr(anchorStart);

    const totalDays = activeRange.days;
    const days: { date: Date; dateStr: string; shortDate: string; fullDate: string }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(anchorStart);
      d.setDate(anchorStart.getDate() + i);
      const dateStr = toLocalDateStr(d);
      days.push({
        date: d,
        dateStr,
        shortDate: formatAxisDateFromStr(dateStr, selectedRange),
        fullDate: formatFullDateTR(d),
      });
    }

    const endDateStr = days[days.length - 1]?.dateStr || todayStr;
    const effectiveEndStr = endDateStr < todayStr ? endDateStr : todayStr;

    // Group distinct series from sales
    const groupKeyToRaw = new Map<string, string>();
    sales.forEach((s) => {
      const key = normalizeSaleGroupKey(s);
      if (!groupKeyToRaw.has(key)) {
        groupKeyToRaw.set(key, s.species || '');
      }
    });

    const dynamicSeries: SeriesMeta[] = [
      {
        key: 'total',
        label: metricMode === 'revenue' ? 'Toplam Satış (₺)' : 'Toplam Satış (Adet)',
        color: '#3b82f6',
        isTotal: true,
      },
    ];

    let extraIdx = 0;
    Array.from(groupKeyToRaw.entries()).forEach(([key, rawCat]) => {
      const color =
        SPECIES_COLORS[key] || EXTRA_PALETTE[extraIdx++ % EXTRA_PALETTE.length];
      let label = 'Diğer Satışlar';
      if (key === 'non_livestock') {
        label = 'Demirbaş & Sarf';
      } else if (key !== 'diger') {
        label = formatSpeciesLabel(
          key === 'caridina' || key === 'neocaridina' || key === 'apistogramma' ? key : rawCat,
          speciesList
        );
      }
      dynamicSeries.push({
        key,
        label,
        color,
      });
    });

    // Aggregate daily sales by dateStr and groupKey
    const dailyMap = new Map<
      string,
      {
        totalRevenue: number;
        totalQuantity: number;
        totalProfit: number;
        txCount: number;
        byGroupRevenue: Record<string, number>;
        byGroupQuantity: Record<string, number>;
      }
    >();

    let sumRevenue = 0;
    let sumQuantity = 0;
    let sumProfit = 0;
    let sumTx = 0;

    sales.forEach((sale) => {
      const dStr = sale.date || '';
      if (!dStr) return;
      const gKey = normalizeSaleGroupKey(sale);

      if (dStr >= anchorStr && dStr <= effectiveEndStr) {
        sumRevenue += sale.totalPrice || 0;
        sumQuantity += sale.quantity || 0;
        sumProfit += sale.netProfit || 0;
        sumTx += 1;
      }

      if (!dailyMap.has(dStr)) {
        dailyMap.set(dStr, {
          totalRevenue: 0,
          totalQuantity: 0,
          totalProfit: 0,
          txCount: 0,
          byGroupRevenue: {},
          byGroupQuantity: {},
        });
      }
      const bucket = dailyMap.get(dStr)!;
      bucket.totalRevenue += sale.totalPrice || 0;
      bucket.totalQuantity += sale.quantity || 0;
      bucket.totalProfit += sale.netProfit || 0;
      bucket.txCount += 1;
      bucket.byGroupRevenue[gKey] = (bucket.byGroupRevenue[gKey] || 0) + (sale.totalPrice || 0);
      bucket.byGroupQuantity[gKey] = (bucket.byGroupQuantity[gKey] || 0) + (sale.quantity || 0);
    });

    let runningTotal = 0;
    const runningByGroup: Record<string, number> = {};
    groupKeyToRaw.forEach((_, k) => {
      runningByGroup[k] = 0;
    });

    const rows = days.map((day) => {
      const isFutureDate = day.dateStr > todayStr;
      if (isFutureDate) {
        const emptyRow: Record<string, any> = {
          dateStr: day.dateStr,
          shortDate: day.shortDate,
          fullDate: day.fullDate,
          isFutureDate: true,
          total: null,
          dayRevenue: 0,
          dayQuantity: 0,
          dayProfit: 0,
          dayTxCount: 0,
        };
        groupKeyToRaw.forEach((_, k) => {
          emptyRow[k] = null;
        });
        return emptyRow;
      }

      const bucket = dailyMap.get(day.dateStr);
      const dayRevenue = bucket ? bucket.totalRevenue : 0;
      const dayQuantity = bucket ? bucket.totalQuantity : 0;
      const dayProfit = bucket ? bucket.totalProfit : 0;
      const dayTxCount = bucket ? bucket.txCount : 0;
      const dayMetricTotal = metricMode === 'revenue' ? dayRevenue : dayQuantity;

      runningTotal += dayMetricTotal;

      const row: Record<string, any> = {
        dateStr: day.dateStr,
        shortDate: day.shortDate,
        fullDate: day.fullDate,
        isFutureDate: false,
        total: accumMode === 'cumulative' ? Math.round(runningTotal) : Math.round(dayMetricTotal),
        dayRevenue: Math.round(dayRevenue),
        dayQuantity,
        dayProfit: Math.round(dayProfit),
        dayTxCount,
      };

      groupKeyToRaw.forEach((_, k) => {
        const val = bucket
          ? metricMode === 'revenue'
            ? bucket.byGroupRevenue[k] || 0
            : bucket.byGroupQuantity[k] || 0
          : 0;
        runningByGroup[k] += val;
        row[k] = accumMode === 'cumulative' ? Math.round(runningByGroup[k]) : Math.round(val);
      });

      return row;
    });

    return {
      chartData: rows,
      seriesList: dynamicSeries,
      periodRevenue: Math.round(sumRevenue),
      periodQuantity: sumQuantity,
      periodProfit: Math.round(sumProfit),
      periodTransactions: sumTx,
      formattedStartBadge: `${formatAxisDateFromStr(anchorStr, '30d')} Başlangıç · ${activeRange.label}`,
    };
  }, [sales, speciesList, selectedRange, commonStartDateStr, metricMode, accumMode, activeRange.days, activeRange.label]);

  const toggleSeries = (key: string) => {
    setHiddenSeries((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active) return null;
    const rowFromLabel =
      (payload && payload[0]?.payload) ||
      chartData.find((r) => r.dateStr === label);
    if (!rowFromLabel) return null;

    if (rowFromLabel.isFutureDate) {
      return (
        <div className="rounded-xl bg-white border border-slate-300 p-3 shadow-2xl text-xs min-w-[190px] backdrop-blur-md">
          <div className="font-semibold text-slate-900 pb-1.5 mb-1.5 border-b border-slate-200">
            {rowFromLabel.fullDate}
          </div>
          <div className="text-slate-500">Bu tarih için henüz satış verisi bulunmuyor.</div>
        </div>
      );
    }

    if (!payload || payload.length === 0) return null;

    return (
      <div className="rounded-xl bg-white border border-slate-300 p-3 shadow-2xl text-xs min-w-[220px] backdrop-blur-md">
        <div className="font-semibold text-slate-900 pb-2 mb-2 border-b border-slate-200">
          {rowFromLabel.fullDate}
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-700">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className={entry.dataKey === 'total' ? 'font-semibold text-white' : ''}>
                  {entry.name}
                </span>
              </div>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {metricMode === 'revenue'
                  ? `${Number(entry.value || 0).toLocaleString('tr-TR')} ₺`
                  : `${entry.value || 0} Adet`}
              </span>
            </div>
          ))}
        </div>
        {rowFromLabel.dayTxCount > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-blue-700 font-mono">
              <span>Gün İçi Satış ({rowFromLabel.dayTxCount} işlem):</span>
              <span>{rowFromLabel.dayRevenue.toLocaleString('tr-TR')} ₺</span>
            </div>
            <div className="flex items-center justify-between text-emerald-600 font-mono">
              <span>Gün İçi Adet / Net Kâr:</span>
              <span>
                {rowFromLabel.dayQuantity} ad · {rowFromLabel.dayProfit >= 0 ? '+' : ''}
                {rowFromLabel.dayProfit.toLocaleString('tr-TR')} ₺
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-sm">
      {/* Chart Header */}
      <div className={`flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4 ${isOpen ? 'mb-4 sm:mb-5' : ''}`}>
        <div
          onClick={() => setIsOpen((prev) => !prev)}
          className="cursor-pointer select-none group"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <ShoppingBag className="w-4 h-4 text-blue-600 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight group-hover:text-blue-700 transition-colors">
              Satış Trendleri
            </h2>
            <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              {formattedStartBadge}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Seçili dönem içindeki canlı ve ürün satış cirosu, adet ve kârlılık eğrisi
          </p>
        </div>

        {/* Controls + Summary Badges + Collapse Button */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {isOpen && (
            <>
              {/* Metric Switcher: Gelir (₺) vs Adet */}
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-50 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setMetricMode('revenue')}
                  className={`min-h-[32px] px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    metricMode === 'revenue'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Gelir (₺)
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode('quantity')}
                  className={`min-h-[32px] px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    metricMode === 'quantity'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Adet
                </button>
              </div>

              {/* Accumulation Switcher: Kümülatif vs Günlük */}
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-50 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAccumMode('cumulative')}
                  className={`min-h-[32px] px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    accumMode === 'cumulative'
                      ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Kümülatif
                </button>
                <button
                  type="button"
                  onClick={() => setAccumMode('daily')}
                  className={`min-h-[32px] px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    accumMode === 'daily'
                      ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Günlük
                </button>
              </div>

              {/* Common Start Date Input */}
              <label className="inline-flex items-center gap-1.5 min-h-[38px] px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
                <span className="text-[11px]">Başlangıç:</span>
                <input
                  type="date"
                  value={commonStartDateStr}
                  onChange={(e) => {
                    if (e.target.value) setCommonStartDateStr(e.target.value);
                  }}
                  className="bg-transparent text-slate-800 text-xs font-mono focus:outline-none cursor-pointer [color-scheme:light]"
                />
              </label>

              {/* Time Range Switcher: 30 Gün · 3 Ay · 6 Ay · 1 Yıl */}
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-50 border border-slate-200">
                {TREND_RANGES.map((opt) => {
                  const isActive = selectedRange === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedRange(opt.key)}
                      className={`min-h-[32px] px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 mr-1.5">Dönem Cirosu:</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {periodRevenue.toLocaleString('tr-TR')} ₺
            </span>
          </div>

          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 mr-1.5">Satılan:</span>
            <span className="font-mono font-bold text-blue-700 tabular-nums">
              {periodQuantity} Adet ({periodTransactions} İşlem)
            </span>
          </div>

          <div
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 font-mono font-bold tabular-nums ${
              periodProfit >= 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {periodProfit >= 0 ? `+${periodProfit.toLocaleString('tr-TR')}` : periodProfit.toLocaleString('tr-TR')} ₺ Kâr
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex items-center gap-1 min-h-[38px] px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
            aria-expanded={isOpen}
            title={isOpen ? 'Grafiği Daralt' : 'Grafiği Aç'}
          >
            {isOpen ? (
              <>
                <span className="hidden sm:inline text-[11px] font-medium">Gizle</span>
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                <span className="hidden sm:inline text-[11px] font-medium">Aç</span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <>
          {/* Interactive Series Legend */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {seriesList.map((series) => {
              const isHidden = !!hiddenSeries[series.key];
              return (
                <button
                  key={series.key}
                  type="button"
                  onClick={() => toggleSeries(series.key)}
                  className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    isHidden
                      ? 'bg-slate-50/70 border-slate-200 text-slate-500 opacity-60'
                      : 'bg-slate-50 border-slate-300 text-slate-800 hover:border-slate-300'
                  }`}
                  title={`${series.label} çizgisini gizle/göster`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: isHidden ? '#475569' : series.color }}
                  />
                  <span>{series.label}</span>
                </button>
              );
            })}
          </div>

          {/* Recharts LineChart */}
          <div className="w-full h-56 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="dateStr"
                  tickFormatter={(val) => formatAxisDateFromStr(String(val), selectedRange)}
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={selectedRange === '30d' ? 24 : 38}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={metricMode === 'revenue' ? 54 : 40}
                  allowDecimals={false}
                  tickFormatter={(v) =>
                    metricMode === 'revenue' ? `${Number(v).toLocaleString('tr-TR')}₺` : String(v)
                  }
                />
                <Tooltip content={renderTooltip} />
                {seriesList.map((series) =>
                  hiddenSeries[series.key] ? null : (
                    <Line
                      key={series.key}
                      type="monotone"
                      dataKey={series.key}
                      name={series.label}
                      stroke={series.color}
                      strokeWidth={series.isTotal ? 2.75 : 2}
                      dot={false}
                      activeDot={{ r: series.isTotal ? 5 : 4, strokeWidth: 0 }}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  )
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};
