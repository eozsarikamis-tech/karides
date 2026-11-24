import { BatchPurchase, Tank, Sale, BreedingSpawn, Expense } from '../types';
import { calculateHatcheryMetrics, evaluateTankHealth } from './storage';
import { calculateBatchProfitLoss } from './profitLoss';
import { formatSpeciesLabel, SpeciesItem } from './speciesStorage';

export interface BusinessAiAnalysisResult {
  efficiencyScore: number;
  healthStatus: string;
  executiveSummary: string;
  strengths: string[];
  risksAndBottlenecks: string[];
  recommendations: Array<{
    title: string;
    detail: string;
    priority: string;
    impactArea: string;
  }>;
  speciesInsights: Array<{
    speciesName: string;
    assessment: string;
  }>;
}

export function buildBusinessAiSnapshot(params: {
  businessName: string;
  batches: BatchPurchase[];
  tanks: Tank[];
  sales: Sale[];
  breedings: BreedingSpawn[];
  expenses: Expense[];
  speciesList: SpeciesItem[];
}) {
  const { businessName, batches, tanks, sales, breedings, expenses, speciesList } = params;
  const metrics = calculateHatcheryMetrics(batches, sales, expenses);

  const livestockBreakdown = batches.map((batch) => {
    const pl = calculateBatchProfitLoss(batch, sales);
    const nonSaleLoss = Math.max(0, batch.quantityReceived - pl.totalSoldQuantity - pl.remainingStock);
    return {
      name: batch.strain || batch.batchName,
      category: formatSpeciesLabel(batch.category, speciesList),
      suppliers: batch.supplier || 'Belirtilmedi',
      quantityReceived: batch.quantityReceived,
      remainingStock: pl.remainingStock,
      soldQuantity: pl.totalSoldQuantity,
      nonSaleLossOrMortality: nonSaleLoss,
      totalCostTL: pl.totalCost,
      salesRevenueTL: pl.totalSalesRevenue,
      netProfitTL: pl.netProfit,
      profitMarginPct: Number(pl.profitPercentage.toFixed(1)),
      status: batch.status,
      isFreeInventory: Boolean(batch.isFreeInventory),
    };
  });

  const tankHealthSummary = tanks.map((tank) => {
    const health = evaluateTankHealth(tank);
    return {
      code: tank.code,
      name: tank.name,
      species: formatSpeciesLabel(tank.species, speciesList),
      volumeLiters: tank.volumeLiters,
      substrate: tank.substrate,
      tds: tank.currentParameters.tds,
      ph: tank.currentParameters.ph,
      tempC: tank.currentParameters.temp,
      gh: tank.currentParameters.gh,
      kh: tank.currentParameters.kh,
      healthStatus: health.status,
      issues: health.issues,
    };
  });

  const shippingSummary = sales.reduce(
    (acc, s) => {
      acc.totalShippingChargedTL += s.shippingCharged ?? 0;
      acc.totalShippingCostTL += s.shippingCost ?? 0;
      acc.totalStyrofoamCostTL += s.styrofoamUnitCost ?? 0;
      acc.totalHeatPackCostTL += s.heatPackUnitCost ?? 0;
      if (s.paymentStatus === 'pending') {
        acc.pendingPaymentsCount += 1;
        acc.pendingPaymentsAmountTL += s.totalPrice + (s.shippingCharged ?? 0);
      }
      acc.byDeliveryMethod[s.deliveryMethod] = (acc.byDeliveryMethod[s.deliveryMethod] || 0) + 1;
      return acc;
    },
    {
      totalShippingChargedTL: 0,
      totalShippingCostTL: 0,
      totalStyrofoamCostTL: 0,
      totalHeatPackCostTL: 0,
      pendingPaymentsCount: 0,
      pendingPaymentsAmountTL: 0,
      byDeliveryMethod: {} as Record<string, number>,
    }
  );

  const lowOrOutSupplies = expenses
    .filter((e) => e.category !== 'equipment')
    .filter((e) => e.inStock === false || (e.quantity !== undefined && e.quantity <= 2))
    .map((e) => ({
      title: e.title,
      category: e.category,
      remainingQuantity: e.quantity ?? (e.inStock === false ? 0 : 1),
      unit: e.unit || 'adet',
    }));

  const totalPurchasedLivestock = batches.reduce((acc, b) => acc + (b.quantityReceived || 0), 0);
  const totalNonSaleLoss = livestockBreakdown.reduce(
    (acc, item) => acc + item.nonSaleLossOrMortality,
    0
  );

  return {
    snapshotDate: new Date().toISOString().split('T')[0],
    businessName,
    overviewCounts: {
      totalTanks: tanks.length,
      totalLivestockGroups: batches.length,
      totalSalesTransactions: sales.length,
      totalExpenseRecords: expenses.length,
      activeBreedings: breedings.filter((b) => b.status !== 'culled').length,
    },
    financialSummary: {
      totalSalesRevenueTL: metrics.totalSalesRevenue,
      totalLivestockCostTL: metrics.totalLivestockCost,
      totalEquipmentCostTL: metrics.totalEquipmentCost,
      totalSuppliesCostTL:
        metrics.totalFeedCost +
        metrics.totalMineralsCost +
        metrics.totalPackagingCost +
        metrics.totalUtilitiesCost,
      totalPurchasesTL: metrics.totalPurchases,
      netCashflowTL: metrics.netHatcheryCashflow,
      totalBusinessValuationTL: metrics.totalBusinessValuation,
      totalLivestockValuationTL: metrics.totalLivestockValuation,
      totalLivestockCount: metrics.totalLivestockCount,
      totalSoldLivestockQty: metrics.totalSoldQuantity,
      totalPurchasedLivestockQty: totalPurchasedLivestock,
      totalNonSaleLossQty: totalNonSaleLoss,
      lossRatePct:
        totalPurchasedLivestock > 0
          ? Number(((totalNonSaleLoss / totalPurchasedLivestock) * 100).toFixed(1))
          : 0,
    },
    shippingAndPayments: shippingSummary,
    livestockPerformance: livestockBreakdown,
    tankHealthSummary,
    lowOrOutOfStockSupplies: lowOrOutSupplies,
  };
}
