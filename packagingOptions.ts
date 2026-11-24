import { Expense } from '../types';
import { isExpenseInStock } from './substrateOptions';

const normalizeText = (value?: string): string =>
  (value || '').toLocaleLowerCase('tr-TR').trim();

export const isStyrofoamExpense = (exp: Expense): boolean => {
  const text = normalizeText(`${exp.title} ${exp.notes || ''}`);
  if (!text) return false;
  return (
    text.includes('strafor') ||
    text.includes('köpük kutu') ||
    text.includes('kopuk kutu')
  );
};

export const isHeatPackExpense = (exp: Expense): boolean => {
  const text = normalizeText(`${exp.title} ${exp.notes || ''}`);
  if (!text) return false;

  const hasHeaterWord =
    text.includes('ısıtıcı') || text.includes('isitici');
  const hasPadWord =
    /(^|[^a-zçğıöşü])(ped|pedi|pet|peti)([^a-zçğıöşü]|$)/i.test(text);

  if (hasHeaterWord && hasPadWord) return true;
  if (text.includes('heat pack') || text.includes('heatpack')) return true;

  return false;
};

export const getInStockStyrofoamExpenses = (expenses: Expense[]): Expense[] => {
  return expenses
    .filter((exp) => isExpenseInStock(exp) && isStyrofoamExpense(exp))
    .sort((a, b) => {
      const aPure = !isHeatPackExpense(a) ? 0 : 1;
      const bPure = !isHeatPackExpense(b) ? 0 : 1;
      return aPure - bPure;
    });
};

export const getInStockHeatPackExpenses = (expenses: Expense[]): Expense[] => {
  return expenses
    .filter((exp) => isExpenseInStock(exp) && isHeatPackExpense(exp))
    .sort((a, b) => {
      const aPure = !isStyrofoamExpense(a) ? 0 : 1;
      const bPure = !isStyrofoamExpense(b) ? 0 : 1;
      return aPure - bPure;
    });
};

export const getExpenseUnitCost = (exp?: Expense): number => {
  if (!exp) return 0;
  let origQty = exp.initialQuantity;
  if (!origQty || origQty <= 0) {
    const noteMatch = exp.notes?.match(/Tanımlı Stok:\s*(\d+(?:[.,]\d+)?)/i);
    const titleMatch = exp.title?.match(/^(\d+(?:[.,]\d+)?)\s*(?:adet|ad)\b/i);
    if (noteMatch) {
      origQty = parseFloat(noteMatch[1].replace(',', '.'));
    } else if (titleMatch) {
      origQty = parseFloat(titleMatch[1].replace(',', '.'));
    } else if (exp.quantity !== undefined && exp.quantity > 0) {
      origQty = exp.quantity;
    } else {
      origQty = 1;
    }
  }
  return origQty > 0 ? Number((exp.amount / origQty).toFixed(2)) : exp.amount;
};
