import * as XLSX from 'xlsx';
import {
  BatchPurchase,
  Expense,
  Sale,
  Tank,
  BreedingSpawn,
  SalePackageTemplate,
} from '../types';
import { addCustomSpecies, formatSpeciesLabel, getStoredSpecies } from './speciesStorage';

export interface HatcheryExportState {
  batches: BatchPurchase[];
  tanks: Tank[];
  sales: Sale[];
  breedings: BreedingSpawn[];
  expenses: Expense[];
  packages: SalePackageTemplate[];
}

export interface ExcelImportResult {
  batches: BatchPurchase[];
  expenses: Expense[];
  sales: Sale[];
  tanks: Tank[];
  counts: {
    batches: number;
    expenses: number;
    sales: number;
    tanks: number;
  };
}

function getTodayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function setSheetColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map((wch) => ({ wch }));
}

function buildGuideSheet(): XLSX.WorkSheet {
  const guideRows = [
    ['AquaBreeder Pro — Excel Başlangıç & Veri Aktarım Kılavuzu'],
    [''],
    ['Sayfa Adı', 'Amaç', 'Önemli Alanlar & Geçerli Değerler'],
    [
      'Canlı Alım & Stoklar',
      'Yeni canlı partileri, üretim yavruları ve başlangıç stoklarını girmek için kullanılır.',
      'Tür Kategorisi: Caridina, Neocaridina, Apistogramma veya özel tür adı (örn. Canlı Doğuran). Tarih: YYYY-AA-GG (örn. 2026-11-13). Bedelsiz Giriş: Evet / Hayır.',
    ],
    [
      'Demirbaş & Sarflar',
      'Hava motoru, armatür, kargo kutusu, yem, mineral gibi demirbaş ve sarf giderlerini girmek için kullanılır.',
      'Kategori: Demirbaş (equipment), Kargo & Paketleme (packaging), Mineral (minerals), Yem (feed), Elektrik & Diğer (utilities). Birim: adet, metre veya gram. Stokta Mevcut: Evet / Hayır.',
    ],
    [
      'Satışlar',
      'Geçmiş veya güncel canlı, demirbaş ve sarf satışlarını girmek için kullanılır.',
      'Ürün Tipi: Canlı (livestock), Demirbaş (equipment), Sarf (supply). Teslimat: Elden (elden), Kargo (kargo), Otobüs (otobus). Ödeme: Ödendi (odendi) veya Bekliyor (bekliyor).',
    ],
    [
      'Akvaryumlar',
      'Üretimhane tanklarınızı, hacimlerini ve su parametrelerini tanımlamak için kullanılır.',
      'Tank Kodu (örn. TK-01) benzersiz olmalıdır; Canlı Alım sayfasındaki Akvaryum Kodu ile otomatik eşleşir.',
    ],
    [''],
    ['İpucu 1:', 'Örnek satırları kendi verilerinizle değiştirebilir veya altına yeni satırlar ekleyebilirsiniz.'],
    ['İpucu 2:', 'Tarih hücrelerini YYYY-AA-GG formatında (örn. 2026-11-13) yazmanız önerilir; standart Excel tarihleri de otomatik tanınır.'],
    ['İpucu 3:', 'Doldurduğunuz dosyayı Google Drive Bulut Yedekleme & Dosya Yönetimi sayfasındaki "Excel\'den Veri Yükle" alanından uygulamaya aktarabilirsiniz.'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(guideRows);
  setSheetColWidths(ws, [26, 48, 88]);
  return ws;
}

const BATCH_HEADERS = [
  'Parti / Grup Adı',
  'Tür Kategorisi',
  'Varyete / Irk',
  'Tedarikçi / Kaynak',
  'Alım Tarihi (YYYY-AA-GG)',
  'Gelen / Üretilen Adet',
  'Toplam Maliyet (TL)',
  'Damızlık Ayrılan',
  'Satışa Ayrılan',
  'Kayıp / Ölüm',
  'Hedef Satış Fiyatı (TL)',
  'Bedelsiz Giriş (Evet/Hayır)',
  'Manuel Birim Kıymet (TL)',
  'Akvaryum Kodu',
  'Notlar',
];

const EXPENSE_HEADERS = [
  'Tarih (YYYY-AA-GG)',
  'Kategori (equipment/packaging/minerals/feed/utilities)',
  'Ürün / Gider Adı',
  'Miktar',
  'Birim (adet/metre/gram)',
  'Toplam Tutar (TL)',
  'Stokta Mevcut (Evet/Hayır)',
  'Notlar',
];

const SALE_HEADERS = [
  'Tarih (YYYY-AA-GG)',
  'Ürün Tipi (livestock/equipment/supply)',
  'Tür Kategorisi',
  'Açıklama',
  'Adet / Miktar',
  'Birim Satış Fiyatı (TL)',
  'Toplam Tutar (TL)',
  'Tahmini Birim Maliyet (TL)',
  'Müşteri Adı',
  'İletişim',
  'Şehir',
  'Teslimat (elden/kargo/otobus)',
  'Ödeme Durumu (odendi/bekliyor)',
  'Notlar',
];

const TANK_HEADERS = [
  'Tank Kodu',
  'Akvaryum Adı',
  'Hacim (Litre)',
  'Tür Kategorisi',
  'Taban Malzemesi',
  'Filtrasyon',
  'Güncel TDS (ppm)',
  'Güncel pH',
  'Sıcaklık (°C)',
  'Güncel GH',
  'Güncel KH',
  'Damızlık Sayısı',
  'Yavru Sayısı',
  'Notlar',
];

/**
 * Generates and downloads a structured starter Excel (.xlsx) template for onboarding data.
 */
export function downloadStarterExcelTemplate(): string {
  const today = getTodayStr();
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildGuideSheet(), 'Kullanım Kılavuzu');

  const batchRows = [
    BATCH_HEADERS,
    [
      'Örnek: PRL Crystal Red Başlangıç Kolonisi',
      'Caridina',
      'Pure Red Line (PRL) SS Grade',
      'Özel Üretici / İthalat',
      today,
      25,
      2500,
      10,
      15,
      0,
      120,
      'Hayır',
      '',
      'TK-01',
      'Örnek satın alım satırı — kendi verilerinizi buraya yazabilirsiniz.',
    ],
    [
      'Örnek: Kendi Üretimimiz Yavru Grubu',
      'Neocaridina',
      'Bloody Mary Kırmızı',
      'Kendi Üretimimiz',
      today,
      40,
      0,
      10,
      30,
      0,
      35,
      'Evet',
      30,
      'TK-02',
      'Örnek bedelsiz üretim girişi — maliyet 0 TL ise Manuel Birim Kıymet girilebilir.',
    ],
  ];
  const wsBatches = XLSX.utils.aoa_to_sheet(batchRows);
  setSheetColWidths(wsBatches, [36, 18, 28, 24, 22, 20, 18, 16, 16, 14, 20, 24, 22, 16, 42]);
  XLSX.utils.book_append_sheet(wb, wsBatches, 'Canlı Alım & Stoklar');

  const expenseRows = [
    EXPENSE_HEADERS,
    [
      today,
      'equipment',
      'Örnek: Çift Çıkışlı Sessiz Hava Motoru',
      1,
      'adet',
      450,
      'Evet',
      'Ana üretim rafı için demirbaş kaydı',
    ],
    [
      today,
      'packaging',
      'Örnek: Kalın Strafor Kargo Kutusu',
      10,
      'adet',
      400,
      'Evet',
      'Canlı gönderimi için paketleme stoğu',
    ],
  ];
  const wsExpenses = XLSX.utils.aoa_to_sheet(expenseRows);
  setSheetColWidths(wsExpenses, [20, 40, 36, 12, 22, 18, 24, 42]);
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Demirbaş & Sarflar');

  const saleRows = [
    SALE_HEADERS,
    [
      today,
      'livestock',
      'Neocaridina',
      '10 Adet Bloody Mary Damızlık Altı',
      10,
      35,
      350,
      20,
      'Örnek Müşteri',
      '05XX XXX XX XX',
      'İstanbul',
      'elden',
      'odendi',
      'Örnek canlı satış kaydı',
    ],
  ];
  const wsSales = XLSX.utils.aoa_to_sheet(saleRows);
  setSheetColWidths(wsSales, [20, 30, 18, 34, 14, 20, 18, 22, 20, 18, 16, 26, 26, 36]);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Satışlar');

  const tankRows = [
    TANK_HEADERS,
    [
      'TK-01',
      'Örnek Caridina Islah Tankı',
      40,
      'Caridina',
      'Aktif Toprak (Soil)',
      'Çift Sünger Pipo Filtre',
      120,
      6.0,
      22.5,
      5.0,
      0.5,
      15,
      30,
      'Haftalık %20 RO su değişimi',
    ],
  ];
  const wsTanks = XLSX.utils.aoa_to_sheet(tankRows);
  setSheetColWidths(wsTanks, [12, 28, 14, 18, 24, 26, 16, 12, 14, 12, 12, 16, 14, 36]);
  XLSX.utils.book_append_sheet(wb, wsTanks, 'Akvaryumlar');

  const fileName = 'AquaBreeder_Baslangic_Veri_Sablonu.xlsx';
  XLSX.writeFile(wb, fileName);
  return fileName;
}

/**
 * Exports current live hatchery state into an Excel (.xlsx) workbook using the exact same template schema.
 */
export function downloadCurrentDataExcel(state: HatcheryExportState): string {
  const today = getTodayStr();
  const speciesList = getStoredSpecies();
  const tankCodeById = new Map(state.tanks.map((t) => [t.id, t.code]));
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildGuideSheet(), 'Kullanım Kılavuzu');

  const batchRows = [
    BATCH_HEADERS,
    ...state.batches.map((b) => [
      b.batchName,
      formatSpeciesLabel(b.category, speciesList),
      b.strain,
      b.supplier,
      b.purchaseDate,
      b.quantityReceived,
      b.totalCost,
      b.keptForBreeding,
      b.markedForSale,
      b.mortalityCount,
      b.targetSalePricePerUnit ?? '',
      b.isFreeInventory ? 'Evet' : 'Hayır',
      b.manualValuationPrice ?? '',
      tankCodeById.get(b.assignedTankId) || b.assignedTankId || '',
      b.selectionNotes || '',
    ]),
  ];
  const wsBatches = XLSX.utils.aoa_to_sheet(batchRows);
  setSheetColWidths(wsBatches, [36, 18, 28, 24, 22, 20, 18, 16, 16, 14, 20, 24, 22, 16, 42]);
  XLSX.utils.book_append_sheet(wb, wsBatches, 'Canlı Alım & Stoklar');

  const expenseRows = [
    EXPENSE_HEADERS,
    ...state.expenses.map((e) => [
      e.date,
      e.category,
      e.title,
      e.quantity ?? 1,
      e.unit || 'adet',
      e.amount,
      e.inStock === false ? 'Hayır' : 'Evet',
      e.notes || '',
    ]),
  ];
  const wsExpenses = XLSX.utils.aoa_to_sheet(expenseRows);
  setSheetColWidths(wsExpenses, [20, 40, 36, 12, 22, 18, 24, 42]);
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Demirbaş & Sarflar');

  const deliveryReverseMap: Record<Sale['deliveryMethod'], string> = {
    hand_delivery: 'elden',
    no_styrofoam: 'straforsuz',
    styrofoam_box: 'strafor',
    cargo_styrofoam: 'kargo',
    bus_freight: 'otobus',
  };

  const saleRows = [
    SALE_HEADERS,
    ...state.sales.map((s) => [
      s.date,
      s.itemType || 'livestock',
      s.species ? formatSpeciesLabel(s.species, speciesList) : '',
      s.itemDescription,
      s.quantity,
      s.unitSalePrice,
      s.totalPrice,
      s.estimatedUnitCost,
      s.customerName,
      s.customerContact,
      s.city,
      deliveryReverseMap[s.deliveryMethod] || 'elden',
      s.paymentStatus === 'pending' ? 'bekliyor' : 'odendi',
      s.trackingOrNotes || '',
    ]),
  ];
  const wsSales = XLSX.utils.aoa_to_sheet(saleRows);
  setSheetColWidths(wsSales, [20, 30, 18, 34, 14, 20, 18, 22, 20, 18, 16, 26, 26, 36]);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Satışlar');

  const tankRows = [
    TANK_HEADERS,
    ...state.tanks.map((t) => [
      t.code,
      t.name,
      t.volumeLiters,
      formatSpeciesLabel(t.species, speciesList),
      t.substrate,
      t.filtration,
      t.currentParameters.tds,
      t.currentParameters.ph,
      t.currentParameters.temp,
      t.currentParameters.gh,
      t.currentParameters.kh,
      t.population.breedingAdults,
      t.population.juveniles,
      t.notes || '',
    ]),
  ];
  const wsTanks = XLSX.utils.aoa_to_sheet(tankRows);
  setSheetColWidths(wsTanks, [12, 28, 14, 18, 24, 26, 16, 12, 14, 12, 12, 16, 14, 36]);
  XLSX.utils.book_append_sheet(wb, wsTanks, 'Akvaryumlar');

  const fileName = `AquaBreeder_Mevcut_Veriler_${today}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}

function parseExcelDate(val: unknown): string {
  if (typeof val === 'number' && !isNaN(val)) {
    const parsed = XLSX.SSF.parse_date_code(val);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  const str = String(val ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const dotMatch = str.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dotMatch) {
    return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`;
  }
  return getTodayStr();
}

function parseNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  const cleaned = String(val ?? '')
    .replace(/[^\d.,-]/g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

function parseBooleanTR(val: unknown, defaultValue = false): boolean {
  if (typeof val === 'boolean') return val;
  const s = String(val ?? '').trim().toLocaleLowerCase('tr-TR');
  if (!s) return defaultValue;
  if (['evet', 'e', 'true', '1', 'var', 'mevcut'].includes(s)) return true;
  if (['hayır', 'hayir', 'h', 'false', '0', 'yok', 'tükendi'].includes(s)) return false;
  return defaultValue;
}

function resolveSpeciesId(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return 'caridina';
  const lower = s.toLocaleLowerCase('tr-TR');
  if (lower.includes('neocaridina')) return 'neocaridina';
  if (lower.includes('caridina')) return 'caridina';
  if (lower.includes('apisto') || lower.includes('cichlid')) return 'apistogramma';
  const item = addCustomSpecies(s);
  return item.id;
}

function resolveExpenseCategory(raw: unknown): Expense['category'] {
  const lower = String(raw ?? '').trim().toLocaleLowerCase('tr-TR');
  if (lower.includes('equip') || lower.includes('demirbaş') || lower.includes('demirbas')) return 'equipment';
  if (lower.includes('pack') || lower.includes('kargo') || lower.includes('strafor') || lower.includes('paket')) return 'packaging';
  if (lower.includes('mineral') || lower.includes('ro')) return 'minerals';
  if (lower.includes('feed') || lower.includes('yem') || lower.includes('artemia')) return 'feed';
  if (lower.includes('util') || lower.includes('elektrik') || lower.includes('su')) return 'utilities';
  return 'equipment';
}

function resolveUnit(raw: unknown): string {
  const lower = String(raw ?? '').trim().toLocaleLowerCase('tr-TR');
  if (lower === 'metre' || lower === 'm') return 'metre';
  if (lower === 'gram' || lower === 'gr' || lower === 'g') return 'gram';
  return 'adet';
}

function resolveItemType(raw: unknown): Sale['itemType'] {
  const lower = String(raw ?? '').trim().toLocaleLowerCase('tr-TR');
  if (lower.includes('equip') || lower.includes('demirbaş') || lower.includes('demirbas')) return 'equipment';
  if (lower.includes('suppl') || lower.includes('sarf')) return 'supply';
  return 'livestock';
}

function resolveDeliveryMethod(raw: unknown): Sale['deliveryMethod'] {
  const lower = String(raw ?? '').trim().toLocaleLowerCase('tr-TR');
  if (lower.includes('straforsuz')) return 'no_styrofoam';
  if (lower.includes('ped') || lower.includes('pet') || lower.includes('kargo') || lower.includes('cargo')) return 'cargo_styrofoam';
  if (lower.includes('strafor') || lower.includes('kutu')) return 'styrofoam_box';
  if (lower.includes('otob') || lower.includes('bus')) return 'bus_freight';
  return 'hand_delivery';
}

function findSheetByCandidateNames(wb: XLSX.WorkBook, candidates: string[]): XLSX.WorkSheet | undefined {
  for (const name of candidates) {
    if (wb.Sheets[name]) return wb.Sheets[name];
  }
  const normalizedMap = new Map(
    wb.SheetNames.map((n) => [n.toLocaleLowerCase('tr-TR').trim(), n])
  );
  for (const name of candidates) {
    const matched = normalizedMap.get(name.toLocaleLowerCase('tr-TR').trim());
    if (matched) return wb.Sheets[matched];
  }
  return undefined;
}

/**
 * Parses an uploaded Excel (.xlsx/.xls) workbook matching the AquaBreeder template schema.
 */
export async function parseExcelWorkbook(
  file: File,
  existingTanks: Tank[]
): Promise<ExcelImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });

  const nowTs = Date.now();
  const today = getTodayStr();

  // 1. Tanks sheet
  const tanksSheet = findSheetByCandidateNames(wb, ['Akvaryumlar', 'Tanklar', 'Tanks']);
  const importedTanks: Tank[] = [];
  if (tanksSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(tanksSheet, { defval: '' });
    rows.forEach((row, idx) => {
      const code = String(row['Tank Kodu'] || '').trim();
      const name = String(row['Akvaryum Adı'] || '').trim();
      if (!code && !name) return;
      const species = resolveSpeciesId(row['Tür Kategorisi'] || row['Tür']);
      importedTanks.push({
        id: `tank-xls-${nowTs}-${idx}`,
        code: code || `TK-${idx + 1}`,
        name: name || code || `Akvaryum ${idx + 1}`,
        volumeLiters: parseNumber(row['Hacim (Litre)'], 40),
        substrate: String(row['Taban Malzemesi'] || 'Standart Kum').trim(),
        filtration: String(row['Filtrasyon'] || 'Pipo Filtre').trim(),
        species,
        targetParameters: {
          tdsMin: species === 'caridina' ? 105 : 170,
          tdsMax: species === 'caridina' ? 140 : 250,
          phMin: species === 'caridina' ? 5.6 : 6.8,
          phMax: species === 'caridina' ? 6.5 : 7.7,
          tempMin: 21,
          tempMax: 25,
          ghMin: 3,
          ghMax: 7,
        },
        currentParameters: {
          tds: parseNumber(row['Güncel TDS (ppm)'], 140),
          ph: parseNumber(row['Güncel pH'], 6.8),
          temp: parseNumber(row['Sıcaklık (°C)'], 23),
          gh: parseNumber(row['Güncel GH'], 5),
          kh: parseNumber(row['Güncel KH'], 1),
          lastMeasured: today,
        },
        population: {
          breedingAdults: parseNumber(row['Damızlık Sayısı'], 0),
          juveniles: parseNumber(row['Yavru Sayısı'], 0),
          berriedOrPairs: 0,
        },
        lastWaterChange: today,
        waterChangeFrequencyDays: 7,
        notes: String(row['Notlar'] || '').trim(),
      });
    });
  }

  const allKnownTanks = [...importedTanks, ...existingTanks];
  const tankIdByCode = new Map(
    allKnownTanks.map((t) => [t.code.toLocaleLowerCase('tr-TR').trim(), t.id])
  );

  // 2. Batches sheet
  const batchesSheet = findSheetByCandidateNames(wb, [
    'Canlı Alım & Stoklar',
    'Canlı Stoklar',
    'Batches',
  ]);
  const importedBatches: BatchPurchase[] = [];
  if (batchesSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(batchesSheet, { defval: '' });
    rows.forEach((row, idx) => {
      const batchName = String(row['Parti / Grup Adı'] || '').trim();
      const strain = String(row['Varyete / Irk'] || '').trim();
      if (!batchName && !strain) return;

      const qty = Math.max(0, Math.round(parseNumber(row['Gelen / Üretilen Adet'], 0)));
      const totalCost = Math.max(0, parseNumber(row['Toplam Maliyet (TL)'], 0));
      const isFree =
        parseBooleanTR(row['Bedelsiz Giriş (Evet/Hayır)'], false) || totalCost === 0;
      const kept = Math.max(0, Math.round(parseNumber(row['Damızlık Ayrılan'], 0)));
      const markedRaw = row['Satışa Ayrılan'];
      const marked =
        markedRaw !== '' && markedRaw !== undefined
          ? Math.max(0, Math.round(parseNumber(markedRaw, 0)))
          : Math.max(0, qty - kept);
      const mortality = Math.max(0, Math.round(parseNumber(row['Kayıp / Ölüm'], 0)));
      const targetSaleRaw = row['Hedef Satış Fiyatı (TL)'];
      const manualValRaw = row['Manuel Birim Kıymet (TL)'];
      const tankCode = String(row['Akvaryum Kodu'] || '').trim().toLocaleLowerCase('tr-TR');
      const assignedTankId =
        tankIdByCode.get(tankCode) || (allKnownTanks[0]?.id ?? '');

      importedBatches.push({
        id: `batch-xls-${nowTs}-${idx}`,
        batchName: batchName || strain,
        category: resolveSpeciesId(row['Tür Kategorisi']),
        strain: strain || batchName,
        supplier: String(row['Tedarikçi / Kaynak'] || 'Excel İçe Aktarım').trim(),
        purchaseDate: parseExcelDate(row['Alım Tarihi (YYYY-AA-GG)']),
        quantityReceived: qty,
        totalCost,
        unitCost: qty > 0 ? totalCost / qty : 0,
        keptForBreeding: kept,
        markedForSale: marked,
        mortalityCount: mortality,
        status: qty - mortality <= 0 ? 'completed' : 'active_selection',
        selectionNotes: String(row['Notlar'] || '').trim(),
        assignedTankId,
        targetSalePricePerUnit:
          targetSaleRaw !== '' && targetSaleRaw !== undefined
            ? parseNumber(targetSaleRaw, 0)
            : undefined,
        isFreeInventory: isFree,
        manualValuationPrice:
          manualValRaw !== '' && manualValRaw !== undefined
            ? parseNumber(manualValRaw, 0)
            : undefined,
      });
    });
  }

  // 3. Expenses sheet
  const expensesSheet = findSheetByCandidateNames(wb, [
    'Demirbaş & Sarflar',
    'Giderler',
    'Expenses',
  ]);
  const importedExpenses: Expense[] = [];
  if (expensesSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(expensesSheet, { defval: '' });
    rows.forEach((row, idx) => {
      const title = String(row['Ürün / Gider Adı'] || '').trim();
      if (!title) return;
      const qty = Math.max(0, parseNumber(row['Miktar'], 1));
      const inStock = parseBooleanTR(row['Stokta Mevcut (Evet/Hayır)'], qty > 0);
      importedExpenses.push({
        id: `exp-xls-${nowTs}-${idx}`,
        date: parseExcelDate(row['Tarih (YYYY-AA-GG)']),
        category: resolveExpenseCategory(
          row['Kategori (equipment/packaging/minerals/feed/utilities)'] || row['Kategori']
        ),
        title,
        quantity: qty,
        unit: resolveUnit(row['Birim (adet/metre/gram)'] || row['Birim']),
        amount: Math.max(0, parseNumber(row['Toplam Tutar (TL)'], 0)),
        inStock: qty === 0 ? false : inStock,
        notes: String(row['Notlar'] || '').trim(),
      });
    });
  }

  // 4. Sales sheet
  const salesSheet = findSheetByCandidateNames(wb, ['Satışlar', 'Sales']);
  const importedSales: Sale[] = [];
  if (salesSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(salesSheet, { defval: '' });
    rows.forEach((row, idx) => {
      const itemDescription = String(row['Açıklama'] || '').trim();
      if (!itemDescription) return;
      const qty = Math.max(1, parseNumber(row['Adet / Miktar'], 1));
      const unitSalePrice = Math.max(0, parseNumber(row['Birim Satış Fiyatı (TL)'], 0));
      const totalRaw = row['Toplam Tutar (TL)'];
      const totalPrice =
        totalRaw !== '' && totalRaw !== undefined
          ? Math.max(0, parseNumber(totalRaw, unitSalePrice * qty))
          : unitSalePrice * qty;
      const estCost = Math.max(0, parseNumber(row['Tahmini Birim Maliyet (TL)'], 0));
      const payRaw = String(row['Ödeme Durumu (odendi/bekliyor)'] || '').trim().toLocaleLowerCase('tr-TR');

      importedSales.push({
        id: `sale-xls-${nowTs}-${idx}`,
        date: parseExcelDate(row['Tarih (YYYY-AA-GG)']),
        itemType: resolveItemType(row['Ürün Tipi (livestock/equipment/supply)']),
        species: row['Tür Kategorisi'] ? resolveSpeciesId(row['Tür Kategorisi']) : undefined,
        itemDescription,
        quantity: qty,
        unitSalePrice,
        totalPrice,
        estimatedUnitCost: estCost,
        netProfit: totalPrice - estCost * qty,
        customerName: String(row['Müşteri Adı'] || 'Müşteri').trim(),
        customerContact: String(row['İletişim'] || '').trim(),
        city: String(row['Şehir'] || '').trim(),
        deliveryMethod: resolveDeliveryMethod(row['Teslimat (elden/kargo/otobus)']),
        paymentStatus: payRaw.includes('bekl') || payRaw === 'pending' ? 'pending' : 'paid',
        trackingOrNotes: String(row['Notlar'] || '').trim(),
      });
    });
  }

  return {
    batches: importedBatches,
    expenses: importedExpenses,
    sales: importedSales,
    tanks: importedTanks,
    counts: {
      batches: importedBatches.length,
      expenses: importedExpenses.length,
      sales: importedSales.length,
      tanks: importedTanks.length,
    },
  };
}
