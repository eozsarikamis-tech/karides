import { BatchPurchase, BatchPurchaseEntry, Sale } from '../types';

export function extractPurchaseHistory(batch: BatchPurchase): BatchPurchaseEntry[] {
  if (batch.purchaseHistory && batch.purchaseHistory.length > 0) {
    return batch.purchaseHistory;
  }
  return [
    {
      id: batch.id,
      purchaseDate: batch.purchaseDate,
      supplier: batch.supplier,
      quantityReceived: batch.quantityReceived,
      totalCost: batch.totalCost,
      unitCost: batch.unitCost,
      isFreeInventory: batch.isFreeInventory,
      manualValuationPrice: batch.manualValuationPrice,
      selectionNotes: batch.selectionNotes,
    },
  ];
}

export function normalizeLivestockName(name?: string): string {
  return (name || '')
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ');
}

export function getLivestockMergeKey(batch: BatchPurchase): string {
  const name = normalizeLivestockName(batch.strain || batch.batchName);
  const category = normalizeLivestockName(batch.category);
  return `${category}::${name}`;
}

export function mergeSupplierNames(
  existingSupplier?: string,
  incomingSupplier?: string
): string {
  const parts: string[] = [];
  const seen = new Set<string>();

  const pushParts = (raw?: string) => {
    if (!raw) return;
    raw.split(/[,|]+/).forEach((segment) => {
      const cleaned = segment.trim();
      if (!cleaned) return;
      const key = cleaned.toLocaleLowerCase('tr-TR');
      if (!seen.has(key)) {
        seen.add(key);
        parts.push(cleaned);
      }
    });
  };

  pushParts(existingSupplier);
  pushParts(incomingSupplier);
  return parts.join(', ');
}

export function mergeSelectionNotes(
  existingNotes?: string,
  incomingNotes?: string
): string {
  const a = (existingNotes || '').trim();
  const b = (incomingNotes || '').trim();
  if (!a) return b;
  if (!b) return a;
  if (a.includes(b)) return a;
  if (b.includes(a)) return b;
  return `${a} | Ek Alım: ${b}`;
}

export function mergeBatches(
  existing: BatchPurchase,
  incoming: BatchPurchase,
  existingSales: Sale[] = [],
  incomingSales: Sale[] = []
): BatchPurchase {
  const newQuantityReceived = existing.quantityReceived + incoming.quantityReceived;
  const newTotalCost = existing.totalCost + incoming.totalCost;
  const newUnitCost =
    newQuantityReceived > 0 ? newTotalCost / newQuantityReceived : 0;
  const newKeptForBreeding = existing.keptForBreeding + incoming.keptForBreeding;
  const newMarkedForSale = existing.markedForSale + incoming.markedForSale;
  const newMortalityCount =
    (existing.mortalityCount || 0) + (incoming.mortalityCount || 0);
  const newBirthCount =
    existing.birthCount !== undefined || incoming.birthCount !== undefined
      ? (existing.birthCount || 0) + (incoming.birthCount || 0)
      : undefined;

  let newManualStockCount: number | undefined = undefined;
  if (
    existing.manualStockCount !== undefined ||
    incoming.manualStockCount !== undefined
  ) {
    const existingSold = existingSales.reduce((acc, s) => acc + s.quantity, 0);
    const incomingSold = incomingSales.reduce((acc, s) => acc + s.quantity, 0);
    const existingCurrentStock =
      existing.manualStockCount !== undefined
        ? existing.manualStockCount
        : Math.max(
            0,
            existing.quantityReceived - (existing.mortalityCount || 0) - existingSold
          );
    const incomingCurrentStock =
      incoming.manualStockCount !== undefined
        ? incoming.manualStockCount
        : Math.max(
            0,
            incoming.quantityReceived - (incoming.mortalityCount || 0) - incomingSold
          );
    newManualStockCount = existingCurrentStock + incomingCurrentStock;
  }

  const hasRemaining =
    newManualStockCount !== undefined
      ? newManualStockCount > 0
      : newMarkedForSale > 0 ||
        newQuantityReceived - newMortalityCount - existingSales.reduce((a, s) => a + s.quantity, 0) - incomingSales.reduce((a, s) => a + s.quantity, 0) > 0;

  const existingHistory = extractPurchaseHistory(existing);
  const incomingHistory = extractPurchaseHistory(incoming);
  const seenHistoryIds = new Set<string>();
  const combinedHistory: BatchPurchaseEntry[] = [];
  for (const entry of [...existingHistory, ...incomingHistory]) {
    if (!seenHistoryIds.has(entry.id)) {
      seenHistoryIds.add(entry.id);
      combinedHistory.push(entry);
    }
  }
  combinedHistory.sort((a, b) => (b.purchaseDate || '').localeCompare(a.purchaseDate || ''));

  return {
    ...existing,
    supplier: mergeSupplierNames(existing.supplier, incoming.supplier),
    purchaseDate:
      incoming.purchaseDate > existing.purchaseDate
        ? incoming.purchaseDate
        : existing.purchaseDate,
    quantityReceived: newQuantityReceived,
    totalCost: newTotalCost,
    unitCost: newUnitCost,
    keptForBreeding: newKeptForBreeding,
    markedForSale: newMarkedForSale,
    mortalityCount: newMortalityCount,
    ...(newBirthCount !== undefined ? { birthCount: newBirthCount } : {}),
    ...(newManualStockCount !== undefined
      ? { manualStockCount: newManualStockCount }
      : {}),
    status: hasRemaining ? 'active_selection' : existing.status,
    selectionNotes: mergeSelectionNotes(
      existing.selectionNotes,
      incoming.selectionNotes
    ),
    isFreeInventory: Boolean(existing.isFreeInventory && incoming.isFreeInventory),
    manualValuationPrice:
      existing.manualValuationPrice ?? incoming.manualValuationPrice,
    targetSalePricePerUnit:
      existing.targetSalePricePerUnit ?? incoming.targetSalePricePerUnit,
    assignedTankId: existing.assignedTankId || incoming.assignedTankId,
    image: existing.image || incoming.image,
    purchaseHistory: combinedHistory,
  };
}

export function consolidateBatchesAndSales(
  batches: BatchPurchase[],
  sales: Sale[]
): { batches: BatchPurchase[]; sales: Sale[] } {
  if (!batches || batches.length <= 1) {
    return { batches, sales };
  }

  const primaryByKey = new Map<string, BatchPurchase>();
  const orderedKeys: string[] = [];
  const culledBatches: BatchPurchase[] = [];
  const idRemap = new Map<string, string>();

  for (const batch of batches) {
    if (batch.status === 'culled') {
      culledBatches.push(batch);
      continue;
    }

    const key = getLivestockMergeKey(batch);
    const existingPrimary = primaryByKey.get(key);

    if (!existingPrimary) {
      primaryByKey.set(key, batch);
      orderedKeys.push(key);
    } else {
      const primarySales = sales.filter(
        (s) => s.batchId === existingPrimary.id || idRemap.get(s.batchId || '') === existingPrimary.id
      );
      const incomingSales = sales.filter((s) => s.batchId === batch.id);
      const merged = mergeBatches(
        existingPrimary,
        batch,
        primarySales,
        incomingSales
      );
      idRemap.set(batch.id, existingPrimary.id);
      primaryByKey.set(key, merged);
    }
  }

  const consolidatedBatches: BatchPurchase[] = [
    ...orderedKeys.map((k) => primaryByKey.get(k)!),
    ...culledBatches,
  ];

  const remappedSales =
    idRemap.size === 0
      ? sales
      : sales.map((sale) => {
          if (sale.batchId && idRemap.has(sale.batchId)) {
            return { ...sale, batchId: idRemap.get(sale.batchId) };
          }
          return sale;
        });

  return { batches: consolidatedBatches, sales: remappedSales };
}

export function findMatchingBatchForSale(
  sale: Sale,
  batches: BatchPurchase[]
): BatchPurchase | undefined {
  if (sale.batchId) {
    const byId = batches.find((b) => b.id === sale.batchId);
    if (byId) return byId;
  }

  const desc = normalizeLivestockName(sale.itemDescription);
  const saleSpecies = normalizeLivestockName(sale.species);

  const byName = batches.find((b) => {
    const bName = normalizeLivestockName(b.strain || b.batchName);
    if (!bName) return false;
    const speciesMatches =
      !saleSpecies || normalizeLivestockName(b.category) === saleSpecies;
    return speciesMatches && (desc.includes(bName) || bName.includes(desc));
  });
  if (byName) return byName;

  if (saleSpecies) {
    return batches.find((b) => normalizeLivestockName(b.category) === saleSpecies);
  }
  return undefined;
}

