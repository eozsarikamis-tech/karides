import { Expense } from '../types';

export type SubstrateCategoryType = 'active_soil' | 'sand' | 'none';

export type ActiveSoilBrandId =
  | 'benibachi'
  | 'platinum'
  | 'neo_soil'
  | 'dennerle_soil'
  | 'ada';

export interface ActiveSoilBrand {
  id: ActiveSoilBrandId;
  label: string;
  displaySubstrate: string;
  keywords: string[];
}

export const ACTIVE_SOIL_BRANDS: ActiveSoilBrand[] = [
  {
    id: 'benibachi',
    label: 'Benibachi',
    displaySubstrate: 'Benibachi Aktif Toprak',
    keywords: ['benibachi'],
  },
  {
    id: 'platinum',
    label: 'Platinum',
    displaySubstrate: 'Platinum Aktif Toprak',
    keywords: ['platinum'],
  },
  {
    id: 'neo_soil',
    label: 'Neo Soil',
    displaySubstrate: 'Neo Soil Aktif Toprak',
    keywords: ['neo soil', 'neosoil'],
  },
  {
    id: 'dennerle_soil',
    label: 'Dennerle Soil',
    displaySubstrate: 'Dennerle Soil Aktif Toprak',
    keywords: ['dennerle', 'dennnerle'],
  },
  {
    id: 'ada',
    label: 'ADA',
    displaySubstrate: 'ADA Aktif Toprak',
    keywords: ['ada', 'amazonia'],
  },
];

const normalizeText = (value?: string): string =>
  (value || '').toLocaleLowerCase('tr-TR').trim();

const matchesKeyword = (text: string, keyword: string): boolean => {
  if (!text) return false;
  if (keyword === 'ada') {
    return /(^|[^a-z0-9çğıöşü])ada([^a-z0-9çğıöşü]|$)/i.test(text);
  }
  return text.includes(keyword);
};

export const matchesActiveSoilBrand = (
  textOrExpense: string | Expense,
  brandId: ActiveSoilBrandId
): boolean => {
  const brand = ACTIVE_SOIL_BRANDS.find((b) => b.id === brandId);
  if (!brand) return false;

  if (typeof textOrExpense !== 'string' && textOrExpense.substrateType === 'sand') {
    return false;
  }

  const text =
    typeof textOrExpense === 'string'
      ? normalizeText(textOrExpense)
      : normalizeText(`${textOrExpense.title} ${textOrExpense.notes || ''}`);

  if (brand.keywords.some((kw) => matchesKeyword(text, kw))) {
    return true;
  }

  if (
    brandId === 'neo_soil' &&
    /(^|[^a-z0-9çğıöşü])neo([^a-z0-9çğıöşü]|$)/i.test(text) &&
    (text.includes('soil') || text.includes('toprak'))
  ) {
    return true;
  }

  return false;
};

export const isExpenseInStock = (exp: Expense): boolean => {
  if (exp.quantity !== undefined) {
    return exp.quantity > 0 && exp.inStock !== false;
  }
  return exp.inStock !== false;
};

export const findMatchingActiveSoilExpenses = (
  expenses: Expense[],
  brandId: ActiveSoilBrandId,
  currentLinkedExpenseId?: string
): Expense[] => {
  return expenses.filter((exp) => {
    const isAvailable = isExpenseInStock(exp) || exp.id === currentLinkedExpenseId;
    return isAvailable && matchesActiveSoilBrand(exp, brandId);
  });
};

export const isInventorySandExpense = (exp: Expense): boolean => {
  if (exp.substrateType === 'sand') return true;
  if (exp.substrateType === 'active_soil') return false;

  const text = normalizeText(`${exp.title} ${exp.notes || ''}`);
  if (!text) return false;

  const hasExplicitSandWord =
    /(^|[^a-zçğıöşü])kum(u|um|lar|ları|sal|lu)?([^a-zçğıöşü]|$)/i.test(text) ||
    text.includes('derekumu') ||
    text.includes('dere kumu') ||
    /(^|[^a-z])sand([^a-z]|$)/i.test(text) ||
    text.includes('silis') ||
    text.includes('bazalt') ||
    text.includes('kuvars') ||
    text.includes('quartz') ||
    text.includes('sansibar') ||
    text.includes('hagen');

  if (!hasExplicitSandWord) return false;

  // Exclude active soils unless explicitly named as sand/kum
  const isActiveSoil = ACTIVE_SOIL_BRANDS.some((brand) =>
    matchesActiveSoilBrand(exp, brand.id)
  );
  if (isActiveSoil && !text.includes('kum') && !/\bsand\b/i.test(text)) {
    return false;
  }

  return true;
};

export const getInventorySandExpenses = (
  expenses: Expense[],
  currentLinkedExpenseId?: string
): Expense[] => {
  return expenses.filter((exp) => {
    if (!isInventorySandExpense(exp)) return false;
    return isExpenseInStock(exp) || exp.id === currentLinkedExpenseId;
  });
};

export const detectInitialSubstrateState = (
  substrateText: string,
  linkedExpense?: Expense
): {
  categoryType: SubstrateCategoryType;
  activeSoilBrandId: ActiveSoilBrandId | '';
} => {
  const normalized = normalizeText(substrateText);
  if (
    !linkedExpense &&
    (normalized === 'taban malzemesi yok' ||
      normalized === 'yok' ||
      normalized === 'çıplak taban' ||
      normalized === 'bare bottom' ||
      normalized === 'kullanılmıyor')
  ) {
    return { categoryType: 'none', activeSoilBrandId: '' };
  }

  if (linkedExpense) {
    if (isInventorySandExpense(linkedExpense)) {
      return { categoryType: 'sand', activeSoilBrandId: '' };
    }
    for (const brand of ACTIVE_SOIL_BRANDS) {
      if (matchesActiveSoilBrand(linkedExpense, brand.id)) {
        return { categoryType: 'active_soil', activeSoilBrandId: brand.id };
      }
    }
  }

  for (const brand of ACTIVE_SOIL_BRANDS) {
    if (matchesActiveSoilBrand(normalized, brand.id)) {
      return { categoryType: 'active_soil', activeSoilBrandId: brand.id };
    }
  }

  if (
    /(^|[^a-zçğıöşü])kum(u|lar|ları)?([^a-zçğıöşü]|$)/i.test(normalized) ||
    normalized.includes('silis') ||
    normalized.includes('bazalt') ||
    normalized.includes('sand')
  ) {
    return { categoryType: 'sand', activeSoilBrandId: '' };
  }

  return { categoryType: 'active_soil', activeSoilBrandId: '' };
};
