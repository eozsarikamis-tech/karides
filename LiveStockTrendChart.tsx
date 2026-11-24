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
import { Activity, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { BatchPurchase, Sale, Expense } from '../types';
import { calculateBusinessValuation } from '../utils/storage';
import { useSpeciesList, formatSpeciesLabel } from '../utils/speciesStorage';

interface LiveStockTrendChartProps {
  batches: BatchPurchase[];
  sales: Sale[];
  expenses: Expense[];
}

type TrendRangeKey = '30d' | '3m' | '6m' | '1y';

interface TrendRangeOption {
  key: TrendRangeKey;
  label: string;
  titleText: string;
  beforeLabel: string;
  days: number;
}

const TREND_RANGES: TrendRangeOption[] = [
  { key: '30d', label: '30 Gün', titleText: '30 Günlük Trend', beforeLabel: 'Başlangıç', days: 30 },
  { key: '3m', label: '3 Ay', titleText: '3 Aylık Trend', beforeLabel: 'Başlangıç', days: 90 },
  { key: '6m', label: '6 Ay', titleText: '6 Aylık Trend', beforeLabel: 'Başlangıç', days: 180 },
  { key: '1y', label: '1 Yıl', titleText: '1 Yıllık Trend', beforeLabel: 'Başlangıç', days: 365 },
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

function normalizeSpeciesKey(category: string): string {
  const cat = (category || '').toLowerCase();
  if (cat.includes('neocaridina')) return 'neocaridina';
  if (cat.includes('caridina')) return 'caridina';
  if (cat.includes('apisto') || cat.includes('cichlid')) return 'apistogramma';
  return cat || 'diger';
}

export const LiveStockTrendChart: React.FC<LiveStockTrendChartProps> = ({
  batches,
  sales,
  expenses,
}) => {
  const speciesList = useSpeciesList();
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [selectedRange, setSelectedRange] = useState<TrendRangeKey>('30d');
  const [commonStartDateStr, setCommonStartDateStr] = useState<string>(getDefaultStartDateStr);
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

  const activeRange = TREND_RANGES.find((r) => r.key === selectedRange) || TREND_RANGES[0];

  const {
    chartData,
    seriesList,
    netChange,
    pctChange,
    startLabel,
    startTotal,
    endLabel,
    endTotal,
    formattedStartBadge,
  } = useMemo(() => {
    const valuation = calculateBusinessValuation(batches, sales, expenses);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toLocalDateStr(today);

    const parsedStart = new Date((commonStartDateStr || getDefaultStartDateStr()) + 'T00:00:00');
    const anchorStart = isNaN(parsedStart.getTime())
      ? new Date(getDefaultStartDateStr() + 'T00:00:00')
      : parsedStart;
    anchorStart.setHours(0, 0, 0, 0);

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

    // Pre-index batches with their live item & matching sales
    const batchRecords = batches.map((batch) => {
      const liveItem = valuation.liveItems.find((item) => item.batchId === batch.id);
      const batchSales = sales.filter((s) => {
        if (s.batchId && s.batchId === batch.id) return true;
        if (
          s.species === batch.category &&
          batch.strain &&
          s.itemDescription.toLowerCase().includes(batch.strain.toLowerCase().slice(0, 6))
        ) {
          return true;
        }
        return false;
      });
      const currentRemaining = liveItem ? liveItem.remainingStock : 0;
      const totalSold = liveItem ? liveItem.totalSold : 0;
      const speciesKey = normalizeSpeciesKey(batch.category);
      return {
        batch,
        speciesKey,
        rawCategory: batch.category,
        batchSales,
        currentRemaining,
        totalSold,
      };
    });

    // Find earliest purchase date across all batches
    const validPurchaseDates = batchRecords
      .map((r) => r.batch.purchaseDate)
      .filter((d): d is string => Boolean(d && /^\d{4}-\d{2}-\d{2}$/.test(d)))
      .sort();
    const earliestBatchDate = validPurchaseDates.length > 0 ? validPurchaseDates[0] : null;

    // Collect distinct species keys
    const speciesKeyToRaw = new Map<string, string>();
    batchRecords.forEach((rec) => {
      if (!speciesKeyToRaw.has(rec.speciesKey)) {
        speciesKeyToRaw.set(rec.speciesKey, rec.rawCategory);
      }
    });

    const dynamicSeries: SeriesMeta[] = [
      { key: 'total', label: 'Toplam Canlı', color: '#10b981', isTotal: true },
    ];

    let extraColorIdx = 0;
    Array.from(speciesKeyToRaw.entries()).forEach(([key, rawCat]) => {
      const color =
        SPECIES_COLORS[key] || EXTRA_PALETTE[extraColorIdx++ % EXTRA_PALETTE.length];
      dynamicSeries.push({
        key,
        label: formatSpeciesLabel(
          key === 'caridina' || key === 'neocaridina' || key === 'apistogramma' ? key : rawCat,
          speciesList
        ),
        color,
      });
    });

    const todayMs = new Date(todayStr + 'T00:00:00').getTime();

    // Compute daily population per series
    const rows = days.map((day) => {
      const isBeforeFirstRecord = Boolean(earliestBatchDate && day.dateStr < earliestBatchDate);
      const isFutureDate = day.dateStr > todayStr;
      const hasNoData = isBeforeFirstRecord || isFutureDate;

      const row: Record<string, any> = {
        dateStr: day.dateStr,
        shortDate: day.shortDate,
        fullDate: day.fullDate,
        isBeforeFirstRecord,
        isFutureDate,
        total: hasNoData ? null : 0,
        addedOnDay: 0,
        soldOnDay: 0,
      };

      speciesKeyToRaw.forEach((_, key) => {
        row[key] = hasNoData ? null : 0;
      });

      if (hasNoData) {
        return row;
      }

      const curMs = new Date(day.dateStr + 'T00:00:00').getTime();

      batchRecords.forEach(({ batch, speciesKey, batchSales, currentRemaining, totalSold }) => {
        const purchaseDateStr = batch.purchaseDate || todayStr;

        if (purchaseDateStr === day.dateStr) {
          row.addedOnDay += batch.quantityReceived;
        }
        batchSales.forEach((s) => {
          if (s.date === day.dateStr) {
            row.soldOnDay += s.quantity;
          }
        });

        let stockOnDay = 0;
        if (day.dateStr < purchaseDateStr) {
          stockOnDay = 0;
        } else if (day.dateStr >= todayStr) {
          stockOnDay = currentRemaining;
        } else {
          const soldUpToDay = batchSales
            .filter((s) => s.date <= day.dateStr)
            .reduce((sum, s) => sum + s.quantity, 0);
          const baseBeforeAdjust = Math.max(0, batch.quantityReceived - soldUpToDay);
          const currentExpected = Math.max(0, batch.quantityReceived - totalSold);
          const netAdjust = currentRemaining - currentExpected;

          const startMs = new Date(purchaseDateStr + 'T00:00:00').getTime();
          const progress =
            todayMs > startMs
              ? Math.min(1, Math.max(0, (curMs - startMs) / (todayMs - startMs)))
              : 1;

          stockOnDay = Math.max(0, Math.round(baseBeforeAdjust + netAdjust * progress));
        }

        row[speciesKey] = (row[speciesKey] || 0) + stockOnDay;
        row.total += stockOnDay;
      });

      return row;
    });

    const firstActiveRow =
      rows.find((r) => r.total !== null && r.total > 0) || rows.find((r) => r.total !== null);
    const lastActiveRow = [...rows].reverse().find((r) => r.total !== null);

    const effectiveStartTotal = firstActiveRow ? firstActiveRow.total : 0;
    const effectiveEndTotal = lastActiveRow ? lastActiveRow.total : 0;

    const anchorStr = toLocalDateStr(anchorStart);
    const effectiveStartLabel = firstActiveRow
      ? `Başlangıç (${formatAxisDateFromStr(firstActiveRow.dateStr, '30d')})`
      : `Başlangıç (${formatAxisDateFromStr(anchorStr, '30d')})`;

    const effectiveEndLabel =
      lastActiveRow && lastActiveRow.dateStr < todayStr
        ? `Dönem Sonu (${formatAxisDateFromStr(lastActiveRow.dateStr, '30d')})`
        : 'Güncel Stok';

    const diff = effectiveEndTotal - effectiveStartTotal;
    const pct =
      effectiveStartTotal > 0
        ? Math.round((diff / effectiveStartTotal) * 100)
        : effectiveEndTotal > 0
        ? 100
        : 0;

    return {
      chartData: rows,
      seriesList: dynamicSeries,
      netChange: diff,
      pctChange: pct,
      startLabel: effectiveStartLabel,
      startTotal: effectiveStartTotal,
      endLabel: effectiveEndLabel,
      endTotal: effectiveEndTotal,
      formattedStartBadge: `${formatAxisDateFromStr(anchorStr, '30d')} Başlangıç · ${activeRange.label}`,
    };
  }, [batches, sales, expenses, speciesList, selectedRange, commonStartDateStr, activeRange.days, activeRange.label]);

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
          <div className="text-slate-500">Bu tarih için henüz veri bulunmuyor.</div>
        </div>
      );
    }

    if (rowFromLabel.isBeforeFirstRecord) {
      return (
        <div className="rounded-xl bg-white border border-slate-300 p-3 shadow-2xl text-xs min-w-[190px] backdrop-blur-md">
          <div className="font-semibold text-slate-900 pb-1.5 mb-1.5 border-b border-slate-200">
            {rowFromLabel.fullDate}
          </div>
          <div className="text-slate-500">Bu tarihten önce kayıt bulunmuyor.</div>
        </div>
      );
    }

    if (!payload || payload.length === 0) return null;

    return (
      <div className="rounded-xl bg-white border border-slate-300 p-3 shadow-2xl text-xs min-w-[210px] backdrop-blur-md">
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
                {entry.value} Adet
              </span>
            </div>
          ))}
        </div>
        {(rowFromLabel.addedOnDay > 0 || rowFromLabel.soldOnDay > 0) && (
          <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 text-[11px]">
            {rowFromLabel.addedOnDay > 0 && (
              <div className="flex items-center justify-between text-emerald-600 font-mono">
                <span>Gün İçi Alım / Üretim:</span>
                <span>+{rowFromLabel.addedOnDay} Adet</span>
              </div>
            )}
            {rowFromLabel.soldOnDay > 0 && (
              <div className="flex items-center justify-between text-amber-600 font-mono">
                <span>Gün İçi Satış:</span>
                <span>-{rowFromLabel.soldOnDay} Adet</span>
              </div>
            )}
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
            <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">
              Canlı Popülasyon Trendi
            </h2>
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              {formattedStartBadge}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tüm aralıklar seçili ortak başlangıç tarihinden itibaren canlı stok değişimini gösterir
          </p>
        </div>

        {/* Start Date + Range Selector + Quick Stats + Collapse Button */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {isOpen && (
            <>
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
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-500 mr-1.5">{startLabel}:</span>
                <span className="font-mono font-bold text-slate-800 tabular-nums">
                  {startTotal} Adet
                </span>
              </div>
            </>
          )}

          <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-slate-500 mr-1.5">{endLabel}:</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {endTotal} Adet
            </span>
          </div>
          <div
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 font-mono font-bold tabular-nums ${
              netChange >= 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {netChange >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            )}
            <span>
              {netChange >= 0 ? `+${netChange}` : netChange} Adet ({pctChange >= 0 ? `+${pctChange}%` : `${pctChange}%`})
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
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
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
              width={40}
              allowDecimals={false}
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
