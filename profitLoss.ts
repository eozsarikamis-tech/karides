import { BatchPurchase, Expense, Sale } from '../types';
import { ItemProfitLossData } from '../components/modals/ItemProfitLossDetailModal';

export function calculateBatchProfitLoss(batch: BatchPurchase, sales: Sale[]): ItemProfitLossData {
  const matchingSales = sales.filter(
    (s) =>
      s.batchId === batch.id ||
      (!s.batchId &&
        s.itemDescription.toLowerCase().includes((batch.strain || batch.batchName).toLowerCase()))
  );
  const totalSalesRevenue = matchingSales.reduce((acc, s) => acc + s.totalPrice, 0);
  const totalSalesCount = matchingSales.length;
  const totalSoldQuantity = matchingSales.reduce((acc, s) => acc + s.quantity, 0);

  const totalCost = batch.isFreeInventory ? 0 : batch.totalCost;
  const netProfit = totalSalesRevenue - totalCost;
  const profitPercentage =
    totalCost > 0
      ? ((totalSalesRevenue - totalCost) / totalCost) * 100
      : totalSalesRevenue > 0
      ? 100
      : 0;

  const remainingStock =
    batch.manualStockCount !== undefined
      ? Math.max(0, batch.manualStockCount)
      : Math.max(
          0,
          batch.quantityReceived - (batch.mortalityCount || 0) - totalSoldQuantity
        );

  return {
    id: batch.id,
    type: 'livestock',
    title: batch.strain || batch.batchName,
    category: batch.category,
    purchaseDate: batch.purchaseDate,
    supplierOrNotes: batch.supplier
      ? `Tedarikçi: ${batch.supplier} ${batch.selectionNotes ? `• ${batch.selectionNotes}` : ''}`
      : batch.selectionNotes,
    quantityReceived: batch.quantityReceived,
    remainingStock,
    totalCost,
    unitCost: batch.unitCost,
    totalSalesRevenue,
    totalSalesCount,
    totalSoldQuantity,
    netProfit,
    profitPercentage,
    unit: 'adet',
    matchingSales,
    rawBatch: batch,
  };
}

export function calculateExpenseProfitLoss(expense: Expense, sales: Sale[]): ItemProfitLossData {
  const isEquipment = expense.category === 'equipment';
  const type: 'equipment' | 'supply' = isEquipment ? 'equipment' : 'supply';

  const matchingSales = sales.filter((s) => {
    if (s.itemType && s.itemType !== type) return false;
    const titleMatch =
      s.itemDescription.toLowerCase().includes(expense.title.toLowerCase()) ||
      expense.title.toLowerCase().includes(s.itemDescription.toLowerCase());
    return titleMatch;
  });

  const totalSalesRevenue = matchingSales.reduce((acc, s) => acc + s.totalPrice, 0);
  const totalSalesCount = matchingSales.length;
  const totalSoldQuantity = matchingSales.reduce((acc, s) => acc + s.quantity, 0);
  const totalCost = expense.amount;
  const netProfit = totalSalesRevenue - totalCost;
  const profitPercentage =
    totalCost > 0
      ? ((totalSalesRevenue - totalCost) / totalCost) * 100
      : totalSalesRevenue > 0
      ? 100
      : 0;

  return {
    id: expense.id,
    type,
    title: expense.title,
    category: expense.category,
    purchaseDate: expense.date,
    supplierOrNotes: expense.notes,
    quantityReceived: expense.quantity !== undefined ? expense.quantity : 1,
    remainingStock:
      expense.quantity !== undefined
        ? Math.max(0, expense.quantity)
        : expense.inStock !== false
        ? 1
        : 0,
    unit: expense.unit || 'adet',
    totalCost,
    unitCost: totalCost,
    totalSalesRevenue,
    totalSalesCount,
    totalSoldQuantity,
    netProfit,
    profitPercentage,
    matchingSales,
    rawExpense: expense,
  };
}
