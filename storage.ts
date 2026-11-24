import {
  BatchPurchase,
  Tank,
  Sale,
  BreedingSpawn,
  Expense,
  SalePackageTemplate,
  BusinessValuationSummary,
  LiveStockValuationItem,
  LiveValuationMethod,
} from '../types';
import {
  INITIAL_BATCHES,
  INITIAL_TANKS,
  INITIAL_SALES,
  INITIAL_BREEDINGS,
  INITIAL_EXPENSES,
  INITIAL_PACKAGES,
} from '../data/initialData';
import { consolidateBatchesAndSales } from './batchConsolidation';

const STORAGE_KEYS = {
  BATCHES: 'aquabreeder_batches_v1',
  TANKS: 'aquabreeder_tanks_v1',
  SALES: 'aquabreeder_sales_v1',
  BREEDINGS: 'aquabreeder_breedings_v1',
  EXPENSES: 'aquabreeder_expenses_v1',
  PACKAGES: 'aquabreeder_packages_v1',
};

const BUSINESS_LIST_KEY = 'aquabreeder_businesses_v1';
const ACTIVE_BUSINESS_KEY = 'aquabreeder_active_business_v1';
const BUSINESS_STATE_PREFIX = 'aquabreeder_biz_state_v1_';
const RESET_PASSWORD_HASH_KEY = 'aquabreeder_reset_password_hash_v1';

export interface BusinessProfile {
  id: string;
  name: string;
  createdAt: string;
  heroImage?: string;
}

export interface HatcheryState {
  batches: BatchPurchase[];
  tanks: Tank[];
  sales: Sale[];
  breedings: BreedingSpawn[];
  expenses: Expense[];
  packages: SalePackageTemplate[];
}

export function loadData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error loading ${key} from storage:`, err);
    return fallback;
  }
}

export function saveData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving ${key} to storage:`, err);
  }
}

export function createEmptyHatcheryState(): HatcheryState {
  return {
    batches: [],
    tanks: [],
    sales: [],
    breedings: [],
    expenses: [],
    packages: [],
  };
}

export function createDemoHatcheryState(): HatcheryState {
  const consolidated = consolidateBatchesAndSales(INITIAL_BATCHES, INITIAL_SALES);
  return {
    batches: consolidated.batches,
    tanks: INITIAL_TANKS,
    sales: consolidated.sales,
    breedings: INITIAL_BREEDINGS,
    expenses: INITIAL_EXPENSES,
    packages: INITIAL_PACKAGES,
  };
}

function getLegacyHatcheryState(): HatcheryState {
  const rawBatches = loadData<BatchPurchase[]>(STORAGE_KEYS.BATCHES, INITIAL_BATCHES);
  const rawSales = loadData<Sale[]>(STORAGE_KEYS.SALES, INITIAL_SALES);
  const consolidated = consolidateBatchesAndSales(rawBatches, rawSales);
  return {
    batches: consolidated.batches,
    tanks: loadData<Tank[]>(STORAGE_KEYS.TANKS, INITIAL_TANKS),
    sales: consolidated.sales,
    breedings: loadData<BreedingSpawn[]>(STORAGE_KEYS.BREEDINGS, INITIAL_BREEDINGS),
    expenses: loadData<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES),
    packages: loadData<SalePackageTemplate[]>(STORAGE_KEYS.PACKAGES, INITIAL_PACKAGES),
  };
}

export function getBusinessStateKey(businessId: string): string {
  return `${BUSINESS_STATE_PREFIX}${businessId}`;
}

export function getStoredBusinesses(): BusinessProfile[] {
  const stored = loadData<BusinessProfile[] | null>(BUSINESS_LIST_KEY, null);
  if (stored && Array.isArray(stored) && stored.length > 0) {
    return stored.map((b) =>
      b.heroImage?.startsWith('/src/assets/images/')
        ? { ...b, heroImage: b.heroImage.replace(/^\/src\/assets\/images\//, '/images/') }
        : b
    );
  }

  // First-time migration: create default "A İşletmesi" with existing/demo data
  const defaultBiz: BusinessProfile = {
    id: 'biz-a',
    name: 'A İşletmesi',
    createdAt: new Date().toISOString(),
  };
  saveData(BUSINESS_LIST_KEY, [defaultBiz]);
  saveData(ACTIVE_BUSINESS_KEY, defaultBiz.id);
  const existing = getLegacyHatcheryState();
  saveData(getBusinessStateKey(defaultBiz.id), existing);
  return [defaultBiz];
}

export function saveStoredBusinesses(businesses: BusinessProfile[]): void {
  saveData(BUSINESS_LIST_KEY, businesses);
}

export function getActiveBusinessId(businesses?: BusinessProfile[]): string {
  const list = businesses || getStoredBusinesses();
  const storedId = loadData<string | null>(ACTIVE_BUSINESS_KEY, null);
  if (storedId && list.some((b) => b.id === storedId)) {
    return storedId;
  }
  const fallbackId = list[0]?.id || 'biz-a';
  saveData(ACTIVE_BUSINESS_KEY, fallbackId);
  return fallbackId;
}

export function setActiveBusinessId(businessId: string): void {
  saveData(ACTIVE_BUSINESS_KEY, businessId);
}

export function loadBusinessState(businessId: string): HatcheryState {
  const key = getBusinessStateKey(businessId);
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<HatcheryState>;
      const rawBatches = (Array.isArray(parsed.batches) ? parsed.batches : []).map((b) =>
        b?.image?.startsWith('/src/assets/images/')
          ? { ...b, image: b.image.replace(/^\/src\/assets\/images\//, '/images/') }
          : b
      );
      const rawSales = Array.isArray(parsed.sales) ? parsed.sales : [];
      const consolidated = consolidateBatchesAndSales(rawBatches, rawSales);
      return {
        batches: consolidated.batches,
        tanks: Array.isArray(parsed.tanks) ? parsed.tanks : [],
        sales: consolidated.sales,
        breedings: Array.isArray(parsed.breedings) ? parsed.breedings : [],
        expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
        packages: Array.isArray(parsed.packages) ? parsed.packages : [],
      };
    } catch (err) {
      console.error(`Error parsing business state ${businessId}:`, err);
    }
  }
  if (businessId === 'biz-a') {
    const legacy = getLegacyHatcheryState();
    saveData(key, legacy);
    return legacy;
  }
  const empty = createEmptyHatcheryState();
  saveData(key, empty);
  return empty;
}

export function saveBusinessState(businessId: string, state: HatcheryState): void {
  saveData(getBusinessStateKey(businessId), state);
}

export function deleteBusinessStorage(businessId: string): void {
  try {
    localStorage.removeItem(getBusinessStateKey(businessId));
  } catch (err) {
    console.error(`Error deleting business state ${businessId}:`, err);
  }
}

export function getInitialState(): HatcheryState {
  const businesses = getStoredBusinesses();
  const activeId = getActiveBusinessId(businesses);
  return loadBusinessState(activeId);
}

export function saveAllState(state: HatcheryState) {
  const activeId = getActiveBusinessId();
  saveBusinessState(activeId, state);
}

export function resetToDemoData(businessId?: string): HatcheryState {
  const targetId = businessId || getActiveBusinessId();
  const demo = createDemoHatcheryState();
  saveBusinessState(targetId, demo);
  return demo;
}

export function clearBusinessData(businessId?: string): HatcheryState {
  const targetId = businessId || getActiveBusinessId();
  const empty = createEmptyHatcheryState();
  saveBusinessState(targetId, empty);
  return empty;
}

// Reset Confirmation Password Helpers
async function hashPasswordString(password: string): Promise<string> {
  const salted = `aquabreeder_salt_v1:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoded = new TextEncoder().encode(salted);
      const buffer = await crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // Fallback below
    }
  }
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < salted.length; i++) {
    const ch = salted.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, '0')}${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

export function hasResetPassword(): boolean {
  try {
    const val = localStorage.getItem(RESET_PASSWORD_HASH_KEY);
    return Boolean(val && val.trim().length > 0);
  } catch {
    return false;
  }
}

export async function setResetPassword(password: string): Promise<void> {
  const hash = await hashPasswordString(password);
  localStorage.setItem(RESET_PASSWORD_HASH_KEY, hash);
}

export async function verifyResetPassword(password: string): Promise<boolean> {
  try {
    const storedHash = localStorage.getItem(RESET_PASSWORD_HASH_KEY);
    if (!storedHash) return true;
    const candidateHash = await hashPasswordString(password);
    return storedHash === candidateHash;
  } catch {
    return false;
  }
}

export function clearResetPassword(): void {
  try {
    localStorage.removeItem(RESET_PASSWORD_HASH_KEY);
  } catch (err) {
    console.error('Error clearing reset password:', err);
  }
}

export function exportBackupJSON(state: any, businessName?: string): void {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(state, null, 2)
  )}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  const dateStr = new Date().toISOString().split('T')[0];
  const safeBiz = businessName
    ? `${businessName.toLowerCase().replace(/[^a-z0-9çğıöşü]+/gi, '_')}_`
    : '';
  downloadAnchor.setAttribute('download', `aquabreeder_${safeBiz}yedek_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export interface ParsedBackupJSON {
  state: HatcheryState;
  counts: {
    batches: number;
    tanks: number;
    sales: number;
    breedings: number;
    expenses: number;
    packages: number;
  };
  timestamp?: string;
  backupSource?: string;
}

export async function parseBackupJSON(file: File): Promise<ParsedBackupJSON> {
  let rawText = '';
  try {
    rawText = await file.text();
  } catch {
    throw new Error('JSON dosyası okunamadı.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Geçersiz JSON formatı. Dosya bozuk veya geçerli bir JSON değil.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON içeriği beklenen AquaBreeder Pro yedek formatında değil.');
  }

  const source =
    parsed.state && typeof parsed.state === 'object' && !Array.isArray(parsed.state)
      ? parsed.state
      : parsed;

  const hasKnownSection =
    Array.isArray(source.batches) ||
    Array.isArray(source.tanks) ||
    Array.isArray(source.sales) ||
    Array.isArray(source.breedings) ||
    Array.isArray(source.expenses) ||
    Array.isArray(source.packages);

  if (!hasKnownSection) {
    throw new Error(
      'Bu JSON dosyasında AquaBreeder Pro verisi bulunamadı (canlı, akvaryum, satış veya gider kaydı yok).'
    );
  }

  const rawBatches: BatchPurchase[] = (Array.isArray(source.batches) ? source.batches : []).map((b: BatchPurchase) =>
    b?.image?.startsWith('/src/assets/images/')
      ? { ...b, image: b.image.replace(/^\/src\/assets\/images\//, '/images/') }
      : b
  );
  const rawSales: Sale[] = Array.isArray(source.sales) ? source.sales : [];
  const consolidated = consolidateBatchesAndSales(rawBatches, rawSales);

  const tanks: Tank[] = Array.isArray(source.tanks) ? source.tanks : [];
  const breedings: BreedingSpawn[] = Array.isArray(source.breedings) ? source.breedings : [];
  const expenses: Expense[] = Array.isArray(source.expenses) ? source.expenses : [];
  const packages: SalePackageTemplate[] = Array.isArray(source.packages) ? source.packages : [];

  const state: HatcheryState = {
    batches: consolidated.batches,
    tanks,
    sales: consolidated.sales,
    breedings,
    expenses,
    packages,
  };

  return {
    state,
    counts: {
      batches: state.batches.length,
      tanks: state.tanks.length,
      sales: state.sales.length,
      breedings: state.breedings.length,
      expenses: state.expenses.length,
      packages: state.packages.length,
    },
    timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : undefined,
    backupSource: typeof parsed.backupSource === 'string' ? parsed.backupSource : undefined,
  };
}

// Enterprise Valuation (İşletme Değeri) Calculation
export function calculateBusinessValuation(
  batches: BatchPurchase[],
  sales: Sale[],
  expenses: Expense[]
): BusinessValuationSummary {
  // 1. Demirbaşlar: Alım (satın alma) değeri toplamı
  const totalEquipmentValuation = expenses
    .filter((e) => e.category === 'equipment')
    .reduce((acc, e) => acc + e.amount, 0);

  // 2. Sarflar: Alım (satın alma) değeri toplamı (yem, mineral, paketleme, fatura vb.)
  const totalSuppliesValuation = expenses
    .filter((e) => e.category !== 'equipment')
    .reduce((acc, e) => acc + e.amount, 0);

  // 3. Mevcut Canlıların Değerlemesi
  const liveItems: LiveStockValuationItem[] = batches.map((batch) => {
    // Find all sales matching this batch: by batchId or matching strain/category
    const batchSales = sales
      .filter((s) => {
        if (s.batchId && s.batchId === batch.id) return true;
        if (
          s.species === batch.category &&
          batch.strain &&
          s.itemDescription.toLowerCase().includes(batch.strain.toLowerCase().slice(0, 6))
        ) {
          return true;
        }
        return false;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalSold = batchSales.reduce((acc, s) => acc + s.quantity, 0);
    // Kalan mevcut canlı sayısı (adet) - doğrudan elle yazılan veya hesaplanan
    const remainingStock =
      batch.manualStockCount !== undefined
        ? Math.max(0, batch.manualStockCount)
        : Math.max(0, batch.quantityReceived - batch.mortalityCount - totalSold);

    const hasSales = batchSales.length > 0;
    const lastSale = hasSales ? batchSales[0] : null;
    const lastSalePrice = lastSale ? lastSale.unitSalePrice : undefined;
    const lastSaleDate = lastSale ? lastSale.date : undefined;

    const isFree = Boolean(batch.isFreeInventory || batch.totalCost === 0);

    let unitValuation = 0;
    let valuationMethod: LiveValuationMethod = 'purchase_cost';
    let valuationMethodLabel = '';

    if (isFree) {
      if (hasSales && lastSalePrice) {
        // Bedelsiz envantere girmiş ve satılmışsa: doğrudan son satış fiyatında
        unitValuation = lastSalePrice;
        valuationMethod = 'free_at_sale_price';
        valuationMethodLabel = 'Bedelsiz (Son Satış Fiyatı)';
      } else {
        // Bedelsiz envantere girmiş ve satılmamışsa: manuel girilen kıymet
        unitValuation =
          batch.manualValuationPrice !== undefined && batch.manualValuationPrice >= 0
            ? batch.manualValuationPrice
            : batch.targetSalePricePerUnit || 0;
        valuationMethod = 'manual_valuation';
        valuationMethodLabel = 'Bedelsiz (Manuel Kıymet Girişi)';
      }
    } else {
      // Satın alınarak girmiş ürün
      if (hasSales && lastSalePrice) {
        // Canlı satıldı ise: son satış değerinin %10 eksiği
        unitValuation = Math.round(lastSalePrice * 0.9 * 100) / 100;
        valuationMethod = 'sale_discount';
        valuationMethodLabel = 'Son Satış Değeri (-%10 İskonto)';
      } else {
        // Alınmış fakat satılmamışsa: alınan ürünün alış değerini doğrudan hesapla
        unitValuation = batch.unitCost;
        valuationMethod = 'purchase_cost';
        valuationMethodLabel = 'Alış Değeri (Maliyet)';
      }
    }

    const totalValuation = Math.round(remainingStock * unitValuation);

    return {
      batchId: batch.id,
      batchName: batch.batchName,
      category: batch.category,
      strain: batch.strain,
      quantityReceived: batch.quantityReceived,
      mortalityCount: batch.mortalityCount,
      totalSold,
      remainingStock,
      isFreeInventory: isFree,
      totalCost: batch.totalCost,
      unitCost: batch.unitCost,
      hasSales,
      lastSalePrice,
      lastSaleDate,
      unitValuation,
      totalValuation,
      valuationMethod,
      valuationMethodLabel,
      manualValuationPrice: batch.manualValuationPrice,
    };
  });

  const totalLivestockValuation = liveItems.reduce((acc, item) => acc + item.totalValuation, 0);
  const totalLivestockCount = liveItems.reduce((acc, item) => acc + item.remainingStock, 0);

  const totalBusinessValuation =
    totalLivestockValuation + totalEquipmentValuation + totalSuppliesValuation;

  return {
    totalBusinessValuation,
    totalLivestockValuation,
    totalEquipmentValuation,
    totalSuppliesValuation,
    totalLivestockCount,
    liveItems,
  };
}

// Financial calculations
export function calculateHatcheryMetrics(
  batches: BatchPurchase[],
  sales: Sale[],
  expenses: Expense[]
) {
  const totalSalesRevenue = sales.reduce((acc, s) => acc + s.totalPrice, 0);
  const totalLivestockCost = batches.reduce((acc, b) => acc + b.totalCost, 0);

  // Categorized expenses breakdown
  const totalEquipmentCost = expenses
    .filter((e) => e.category === 'equipment')
    .reduce((acc, e) => acc + e.amount, 0);
  const totalFeedCost = expenses
    .filter((e) => e.category === 'feed')
    .reduce((acc, e) => acc + e.amount, 0);
  const totalMineralsCost = expenses
    .filter((e) => e.category === 'minerals')
    .reduce((acc, e) => acc + e.amount, 0);
  const totalPackagingCost = expenses
    .filter((e) => e.category === 'packaging')
    .reduce((acc, e) => acc + e.amount, 0);
  const totalUtilitiesCost = expenses
    .filter((e) => e.category === 'utilities')
    .reduce((acc, e) => acc + e.amount, 0);

  const totalOtherExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  
  // Total Purchases: Livestock + Equipment + Consumables/Minerals
  const totalPurchases = totalLivestockCost + totalOtherExpenses;
  const netHatcheryCashflow = totalSalesRevenue - totalPurchases;

  // Total breeders kept in possession
  const totalBreedingStockKept = batches.reduce((acc, b) => acc + b.keptForBreeding, 0);
  const totalCullForSale = batches.reduce((acc, b) => acc + b.markedForSale, 0);
  const totalSoldQuantity = sales.reduce((acc, s) => acc + s.quantity, 0);

  // Enterprise Valuation (İşletme Değeri: Canlılar + Demirbaşlar + Sarflar)
  const businessValuation = calculateBusinessValuation(batches, sales, expenses);

  // Approximate value of kept elite breeders (legacy reference)
  const estimatedValueOfBreedingStock = batches.reduce(
    (acc, b) => acc + b.keptForBreeding * (b.unitCost * 1.5),
    0
  );

  return {
    totalSalesRevenue,
    totalAcquisitionCost: totalLivestockCost,
    totalLivestockCost,
    totalEquipmentCost,
    totalFeedCost,
    totalMineralsCost,
    totalPackagingCost,
    totalUtilitiesCost,
    totalOtherExpenses,
    totalPurchases,
    totalCosts: totalPurchases,
    netHatcheryCashflow,
    totalBreedingStockKept,
    totalCullForSale,
    totalSoldQuantity,
    estimatedValueOfBreedingStock,
    netHatcheryNetWorth: netHatcheryCashflow + estimatedValueOfBreedingStock,
    businessValuation,
    totalBusinessValuation: businessValuation.totalBusinessValuation,
    totalLivestockValuation: businessValuation.totalLivestockValuation,
    totalEquipmentValuation: businessValuation.totalEquipmentValuation,
    totalSuppliesValuation: businessValuation.totalSuppliesValuation,
    totalLivestockCount: businessValuation.totalLivestockCount,
  };
}

// Check if tank parameters are in danger
export function evaluateTankHealth(tank: Tank): {
  status: 'optimal' | 'warning' | 'danger';
  issues: string[];
} {
  const issues: string[] = [];
  const { currentParameters: cur, targetParameters: tgt } = tank;

  if (cur.tds < tgt.tdsMin) {
    issues.push(`Düşük TDS (${cur.tds} ppm < ${tgt.tdsMin} ppm)`);
  } else if (cur.tds > tgt.tdsMax) {
    issues.push(`Yüksek TDS (${cur.tds} ppm > ${tgt.tdsMax} ppm)`);
  }

  if (cur.ph < tgt.phMin) {
    issues.push(`Düşük pH (${cur.ph} < ${tgt.phMin})`);
  } else if (cur.ph > tgt.phMax) {
    issues.push(`Yüksek pH (${cur.ph} > ${tgt.phMax})`);
  }

  if (cur.temp < tgt.tempMin) {
    issues.push(`Düşük Sıcaklık (${cur.temp}°C < ${tgt.tempMin}°C)`);
  } else if (cur.temp > tgt.tempMax) {
    issues.push(`Yüksek Sıcaklık (${cur.temp}°C > ${tgt.tempMax}°C)`);
  }

  // Water change check
  const lastDate = new Date(tank.lastWaterChange).getTime();
  const now = new Date().getTime();
  const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
  if (daysSince > tank.waterChangeFrequencyDays) {
    issues.push(`Su değişimi gecikti (${daysSince} gün oldu, periyot: ${tank.waterChangeFrequencyDays} gün)`);
  }

  if (issues.length === 0) {
    return { status: 'optimal', issues: [] };
  } else if (issues.length >= 2 || cur.ph < 5.2 || cur.ph > 8.0) {
    return { status: 'danger', issues };
  } else {
    return { status: 'warning', issues };
  }
}
