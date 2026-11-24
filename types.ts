export type SpeciesCategory = 'caridina' | 'neocaridina' | 'apistogramma' | string;

export interface BatchPurchaseEntry {
  id: string;
  purchaseDate: string;
  supplier: string;
  quantityReceived: number;
  totalCost: number;
  unitCost: number;
  isFreeInventory?: boolean;
  manualValuationPrice?: number;
  selectionNotes?: string;
}

export interface BatchPurchase {
  id: string;
  batchName: string;
  category: SpeciesCategory;
  strain: string;
  supplier: string;
  purchaseDate: string;
  quantityReceived: number;
  totalCost: number; // TL
  unitCost: number; // totalCost / quantityReceived
  keptForBreeding: number; // Damızlık olarak kendine ayrılanlar
  markedForSale: number; // Hobicilere satılacak olanlar (cull-out / B grade)
  mortalityCount: number; // Adaptasyon kaybı / Ölümler
  birthCount?: number; // Doğum / Yeni yavru sayısı
  manualStockCount?: number; // Doğrudan manuel belirlenen güncel stok adedi
  status: 'active_selection' | 'culled' | 'completed';
  selectionNotes: string;
  assignedTankId: string;
  image?: string;
  targetSalePricePerUnit?: number; // Hedeflenen hobici satış fiyatı
  isFreeInventory?: boolean; // Satın alınmadan bedelsiz envantere giren ürün (üretim yavrusu / hediye vb.)
  manualValuationPrice?: number; // Satılmamış ve bedelsiz canlılar için manuel girilen birim kıymet (TL)
  purchaseHistory?: BatchPurchaseEntry[]; // Birleştirilmiş alımlarda her tekil alış kaydının geçmişi
}

export type LiveValuationMethod =
  | 'sale_discount' // Canlı satıldıysa: Son satış değerinin %10 eksiği
  | 'purchase_cost' // Alınmış fakat satılmamışsa: Alış değeri
  | 'free_at_sale_price' // Bedelsiz girmiş ve satılmışsa: Satış fiyatı
  | 'manual_valuation'; // Bedelsiz girmiş ve satılmamışsa: Manuel girilen kıymet

export interface LiveStockValuationItem {
  batchId: string;
  batchName: string;
  category: SpeciesCategory;
  strain: string;
  quantityReceived: number;
  mortalityCount: number;
  totalSold: number;
  remainingStock: number;
  isFreeInventory: boolean;
  totalCost: number;
  unitCost: number;
  hasSales: boolean;
  lastSalePrice?: number;
  lastSaleDate?: string;
  unitValuation: number;
  totalValuation: number;
  valuationMethod: LiveValuationMethod;
  valuationMethodLabel: string;
  manualValuationPrice?: number;
}

export interface BusinessValuationSummary {
  totalBusinessValuation: number; // Canlı + Demirbaş + Sarf
  totalLivestockValuation: number;
  totalEquipmentValuation: number;
  totalSuppliesValuation: number;
  totalLivestockCount: number;
  liveItems: LiveStockValuationItem[];
}

export interface Tank {
  id: string;
  code: string; // e.g. TK-01
  name: string;
  volumeLiters: number;
  substrate: string;
  filtration: string;
  species: SpeciesCategory;
  targetParameters: {
    tdsMin: number;
    tdsMax: number;
    phMin: number;
    phMax: number;
    tempMin: number;
    tempMax: number;
    ghMin: number;
    ghMax: number;
  };
  currentParameters: {
    tds: number;
    ph: number;
    temp: number;
    gh: number;
    kh: number;
    lastMeasured: string;
  };
  population: {
    breedingAdults: number;
    juveniles: number;
    berriedOrPairs: number;
  };
  lastWaterChange: string;
  waterChangeFrequencyDays: number;
  notes: string;
  substrateExpenseId?: string;
  substrateLiters?: number;
  filtrationExpenseId?: string;
  filtrationUsedCount?: number;
}

export interface Sale {
  id: string;
  batchId?: string;
  expenseId?: string;
  date: string;
  customerName: string;
  customerContact: string; // Phone, Instagram, Forum nick
  city: string;
  species?: SpeciesCategory;
  itemDescription: string; // e.g. "10+1 Bloody Mary Damızlık Altı"
  quantity: number;
  unitSalePrice: number;
  totalPrice: number;
  estimatedUnitCost: number;
  netProfit: number;
  paymentStatus: 'paid' | 'pending';
  deliveryMethod:
    | 'hand_delivery'
    | 'no_styrofoam'
    | 'styrofoam_box'
    | 'cargo_styrofoam'
    | 'bus_freight';
  trackingOrNotes: string;
  itemType?: 'livestock' | 'equipment' | 'supply';
  styrofoamExpenseId?: string;
  heatPackExpenseId?: string;
  shippingCharged?: number;
  shippingCost?: number;
  styrofoamUnitCost?: number;
  heatPackUnitCost?: number;
}

export interface BreedingSpawn {
  id: string;
  tankId: string;
  species: SpeciesCategory;
  strain: string;
  parentInfo: string;
  startDate: string; // Yumurtlama / Berried olma tarihi
  expectedHatchDate: string;
  actualHatchDate?: string;
  estimatedCount: number;
  survivalCount?: number;
  status: 'incubating' | 'free_swimming' | 'growing' | 'culled';
  notes: string;
}

export type InventoryUnit = 'adet' | 'metre' | 'gram' | 'litre';

export interface Expense {
  id: string;
  date: string;
  category: 'feed' | 'minerals' | 'equipment' | 'packaging' | 'utilities';
  title: string;
  amount: number; // TL
  notes: string;
  quantity?: number;
  initialQuantity?: number;
  unit?: InventoryUnit | string; // 'adet' | 'metre' | 'gram' | 'litre'
  inStock?: boolean; // true = Mevcut Stokta, false = Tükendi / Stokta Kalmadı
  depletedDate?: string;
  depletionReason?: string;
  substrateType?: 'active_soil' | 'sand';
}

export interface SalePackageTemplate {
  id: string;
  title: string;
  species: SpeciesCategory;
  strain: string;
  packageQuantity: string; // "10 + 1 Hediye" or "1 Çift (1E + 1D)"
  price: number;
  description: string;
  parametersText: string;
  shippingText: string;
}

