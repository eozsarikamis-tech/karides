import { BatchPurchase, Sale, Tank } from '../types';
import { SpeciesItem } from './speciesStorage';

interface SpeciesPreset {
  strains: string[];
  suppliers: string[];
  minUnitCost: number;
  maxUnitCost: number;
  minQty: number;
  maxQty: number;
  tdsRange: [number, number];
  phRange: [number, number];
  tempRange: [number, number];
  image?: string;
}

const PRESETS: Record<string, SpeciesPreset> = {
  caridina: {
    strains: ['PRL Crystal Red SS', 'Taiwan Bee King Kong', 'Red Galaxy Pinto', 'Blue Bolt High Grade'],
    suppliers: ['Alman Hobici İthalat', 'İstanbul Caridina Üreticisi', 'Özel Seçki Damızlık'],
    minUnitCost: 90,
    maxUnitCost: 180,
    minQty: 15,
    maxQty: 30,
    tdsRange: [110, 135],
    phRange: [5.8, 6.3],
    tempRange: [21, 23],
    image: '/images/caridina_crystal_shrimp_1793999662698.jpg',
  },
  neocaridina: {
    strains: ['Blue Dream Velvet', 'Bloody Mary Seçki', 'Yellow Golden Back', 'Orange Sakura'],
    suppliers: ['Bursa Karides Hobihanesi', 'Ankara Akvaryum Üretim', 'Yerli Koloni Alımı'],
    minUnitCost: 18,
    maxUnitCost: 35,
    minQty: 30,
    maxQty: 60,
    tdsRange: [180, 240],
    phRange: [7.0, 7.5],
    tempRange: [22, 25],
    image: '/images/neocaridina_blue_shrimp_1793999664008.jpg',
  },
  apistogramma: {
    strains: ['Apistogramma Cacatuoides Triple Red', 'Apistogramma Agassizii Fire Red', 'Apistogramma Borellii Opal', 'Apistogramma Macmasteri'],
    suppliers: ['Çek Cumhuriyeti İthalat', 'İzmir Cichlid Üreticisi', 'Hobici Damızlık Çifti'],
    minUnitCost: 180,
    maxUnitCost: 320,
    minQty: 6,
    maxQty: 12,
    tdsRange: [100, 150],
    phRange: [6.0, 6.6],
    tempRange: [24, 26],
    image: '/images/apistogramma_cichlid_1793999664297.jpg',
  },
  pleco: {
    strains: ['Sturisoma panamense F1', 'L144 Longfin Blue Eye', 'L333 King Tiger Pleco', 'Sturisoma aureum'],
    suppliers: ['Güney Amerika İthalat', 'Ankara Vatos Üretimhanesi', 'Özel Pleco Seçkisi'],
    minUnitCost: 140,
    maxUnitCost: 280,
    minQty: 6,
    maxQty: 14,
    tdsRange: [120, 200],
    phRange: [6.5, 7.3],
    tempRange: [24, 27],
    image: '/images/sturisoma_panamense_pleco_1794584454696.jpg',
  },
  corydoras: {
    strains: ['Corydoras Sterbai', 'Corydoras Panda', 'Corydoras Adolfoi', 'Corydoras Venezuelanus Orange'],
    suppliers: ['Güney Amerika Seçki', 'İstanbul Dip Balığı Üretimi', 'Hobici Damızlık Grubu'],
    minUnitCost: 75,
    maxUnitCost: 160,
    minQty: 8,
    maxQty: 18,
    tdsRange: [130, 210],
    phRange: [6.5, 7.2],
    tempRange: [23, 26],
    image: '/images/sterbai_corydoras_1794583669825.jpg',
  },
  guppy: {
    strains: ['Full Red Albino Lepistes', 'Moscow Blue Lepistes', 'Koi Tuxedo Lepistes', 'HB White Lepistes'],
    suppliers: ['Yerli Lepistes Üreticisi', 'Özel Hat Seçkisi', 'Hobici Koloni Alımı'],
    minUnitCost: 25,
    maxUnitCost: 60,
    minQty: 15,
    maxQty: 35,
    tdsRange: [200, 300],
    phRange: [7.0, 7.8],
    tempRange: [23, 26],
    image: '/images/full_red_guppy_1794583668541.jpg',
  },
};

const CUSTOMERS = [
  { name: 'Emre Yılmaz', contact: '0532 410 22 18', city: 'İstanbul / Kadıköy' },
  { name: 'Mert Kaya', contact: '@mert_aquascape', city: 'Ankara / Çankaya' },
  { name: 'Selin Demir', contact: '0544 821 09 45', city: 'İzmir / Bornova' },
  { name: 'Caner Aksoy', contact: 'Akvaryum Forum (caner_34)', city: 'Bursa / Nilüfer' },
  { name: 'Burak Öztürk', contact: '0505 319 77 12', city: 'Eskişehir' },
  { name: 'Deniz Arslan', contact: '@deniz_shrimp', city: 'Antalya / Muratpaşa' },
];

const DELIVERIES: Sale['deliveryMethod'][] = [
  'hand_delivery',
  'no_styrofoam',
  'styrofoam_box',
  'cargo_styrofoam',
  'bus_freight',
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getPresetForSpecies(sp: SpeciesItem): SpeciesPreset {
  const hay = `${sp.id} ${sp.name}`.toLocaleLowerCase('tr-TR');
  if (hay.includes('neocaridina')) return PRESETS.neocaridina;
  if (hay.includes('caridina')) return PRESETS.caridina;
  if (hay.includes('apisto') || hay.includes('cichlid') || hay.includes('cüce')) {
    return PRESETS.apistogramma;
  }
  if (hay.includes('pleco') || hay.includes('sturisoma') || hay.includes('sutrisoma') || hay.includes('vatos')) {
    return PRESETS.pleco;
  }
  if (hay.includes('cory') || hay.includes('sterbai') || hay.includes('çöpçü') || hay.includes('copcu')) {
    return PRESETS.corydoras;
  }
  if (hay.includes('doğuran') || hay.includes('doguran') || hay.includes('lepistes') || hay.includes('guppy')) {
    return PRESETS.guppy;
  }
  return {
    strains: [`${sp.name} Seçki F1`, `${sp.name} Özel Hat`],
    suppliers: ['Özel Hobici Alımı', 'Yerli Üretici Seçkisi'],
    minUnitCost: 40,
    maxUnitCost: 120,
    minQty: 10,
    maxQty: 24,
    tdsRange: [150, 220],
    phRange: [6.8, 7.4],
    tempRange: [23, 26],
  };
}

export interface GeneratedTestDataResult {
  newTanks: Tank[];
  newBatches: BatchPurchase[];
  newSales: Sale[];
  summary: {
    groupCount: number;
    tankCount: number;
    batchCount: number;
    saleCount: number;
  };
}

export function generateRandomTestDataForGroups(params: {
  selectedSpecies: SpeciesItem[];
  existingTanks: Tank[];
  includeMortalityScenarios: boolean;
}): GeneratedTestDataResult {
  const { selectedSpecies, existingTanks, includeMortalityScenarios } = params;
  const newTanks: Tank[] = [];
  const newBatches: BatchPurchase[] = [];
  const newSales: Sale[] = [];

  // Determine next numeric tank code suffix (TK-07, TK-08...)
  let maxTankNum = existingTanks.reduce((max, t) => {
    const match = t.code.match(/(\d+)/);
    const num = match ? parseInt(match[1], 10) : 0;
    return num > max ? num : max;
  }, 0);

  const seed = Date.now().toString(36);

  selectedSpecies.forEach((sp, idx) => {
    const preset = getPresetForSpecies(sp);

    // Reuse an existing tank for this species if present; otherwise create a new tank
    const existingGroupTank = [...existingTanks, ...newTanks].find(
      (t) => t.species.toLocaleLowerCase('tr-TR') === sp.id.toLocaleLowerCase('tr-TR')
    );

    let assignedTankId = existingGroupTank?.id;
    if (!assignedTankId) {
      maxTankNum += 1;
      const tankCode = `TK-${String(maxTankNum).padStart(2, '0')}`;
      assignedTankId = `tank-test-${seed}-${idx}`;
      newTanks.push({
        id: assignedTankId,
        code: tankCode,
        name: `${sp.name} Test Tankı`,
        volumeLiters: randInt(40, 80),
        substrate: 'Aktif Toprak / Dere Kumu',
        filtration: 'Çift Pipo Filtre',
        species: sp.id,
        targetParameters: {
          tdsMin: preset.tdsRange[0],
          tdsMax: preset.tdsRange[1],
          phMin: preset.phRange[0],
          phMax: preset.phRange[1],
          tempMin: preset.tempRange[0],
          tempMax: preset.tempRange[1],
          ghMin: 4,
          ghMax: 7,
        },
        currentParameters: {
          tds: randInt(preset.tdsRange[0], preset.tdsRange[1]),
          ph: Number(((preset.phRange[0] + preset.phRange[1]) / 2).toFixed(1)),
          temp: randInt(preset.tempRange[0], preset.tempRange[1]),
          gh: 5,
          kh: 2,
          lastMeasured: formatDateDaysAgo(1),
        },
        population: {
          breedingAdults: randInt(4, 12),
          juveniles: randInt(10, 35),
          berriedOrPairs: randInt(1, 4),
        },
        lastWaterChange: formatDateDaysAgo(2),
        waterChangeFrequencyDays: 7,
        notes: 'Test verisi oluşturucu ile tanımlanan akvaryum.',
      });
    }

    // Create 1 or 2 random batches for this species group
    const batchesToCreate = randInt(1, 2);
    for (let bIdx = 0; bIdx < batchesToCreate; bIdx++) {
      const strain = pickRandom(preset.strains);
      const supplier = pickRandom(preset.suppliers);
      const quantityReceived = randInt(preset.minQty, preset.maxQty);
      const unitCost = randInt(preset.minUnitCost, preset.maxUnitCost);
      const totalCost = quantityReceived * unitCost;
      const purchaseDaysAgo = randInt(10, 26);
      const purchaseDate = formatDateDaysAgo(purchaseDaysAgo);

      // Decide if this batch gets a mortality scenario (approx 40% chance when enabled, on 1st batch)
      const shouldHaveMortality =
        includeMortalityScenarios && bIdx === 0 && (idx % 2 === 1 || Math.random() < 0.35);
      const mortalityCount = shouldHaveMortality
        ? randInt(1, Math.max(1, Math.min(3, Math.floor(quantityReceived * 0.2))))
        : 0;

      // Decide how many to sell (between 30% and 75% of available stock)
      const availableAfterLoss = Math.max(1, quantityReceived - mortalityCount);
      const targetTotalSold = randInt(
        Math.max(1, Math.floor(availableAfterLoss * 0.25)),
        Math.max(1, Math.floor(availableAfterLoss * 0.75))
      );

      // Alternate profitable vs break-even/loss pricing so both +% and -% can be verified
      const profitMultiplier =
        idx % 3 === 2 ? 0.85 + Math.random() * 0.2 : 1.25 + Math.random() * 0.55;
      const targetSalePrice = Math.max(10, Math.round(unitCost * profitMultiplier));

      const batchId = `batch-test-${seed}-${idx}-${bIdx}`;
      const keptForBreeding = Math.max(1, Math.floor((availableAfterLoss - targetTotalSold) * 0.6));
      const markedForSale = Math.max(0, availableAfterLoss - targetTotalSold - keptForBreeding);

      newBatches.push({
        id: batchId,
        batchName: `${strain} Test Alımı`,
        category: sp.id,
        strain,
        supplier,
        purchaseDate,
        quantityReceived,
        totalCost,
        unitCost,
        keptForBreeding,
        markedForSale,
        mortalityCount,
        status: 'active_selection',
        selectionNotes: `Test işlemi: ${quantityReceived} adet alındı${
          mortalityCount > 0 ? `, ${mortalityCount} adaptasyon kaybı` : ''
        }.`,
        assignedTankId,
        image: preset.image,
        targetSalePricePerUnit: targetSalePrice,
      });

      // Split targetTotalSold into 1 or 2 realistic sales within recent days
      const saleSplits = targetTotalSold >= 4 ? randInt(1, 2) : 1;
      let remainingToSell = targetTotalSold;

      for (let sIdx = 0; sIdx < saleSplits && remainingToSell > 0; sIdx++) {
        const qty =
          sIdx === saleSplits - 1
            ? remainingToSell
            : Math.max(1, Math.floor(remainingToSell / 2));
        remainingToSell -= qty;

        const unitSalePrice = Math.max(
          10,
          Math.round(targetSalePrice * (0.92 + Math.random() * 0.16))
        );
        const totalPrice = qty * unitSalePrice;
        const netProfit = totalPrice - qty * unitCost;
        const customer = pickRandom(CUSTOMERS);
        const saleDaysAgo = randInt(0, Math.max(0, purchaseDaysAgo - 2));

        newSales.push({
          id: `sale-test-${seed}-${idx}-${bIdx}-${sIdx}`,
          batchId,
          date: formatDateDaysAgo(saleDaysAgo),
          customerName: customer.name,
          customerContact: customer.contact,
          city: customer.city,
          species: sp.id,
          itemDescription: `${qty} Adet ${strain}`,
          quantity: qty,
          unitSalePrice,
          totalPrice,
          estimatedUnitCost: unitCost,
          netProfit,
          paymentStatus: 'paid',
          deliveryMethod: pickRandom(DELIVERIES),
          trackingOrNotes: 'Test verisi oluşturucu ile eklendi.',
          itemType: 'livestock',
        });
      }
    }
  });

  return {
    newTanks,
    newBatches,
    newSales,
    summary: {
      groupCount: selectedSpecies.length,
      tankCount: newTanks.length,
      batchCount: newBatches.length,
      saleCount: newSales.length,
    },
  };
}
