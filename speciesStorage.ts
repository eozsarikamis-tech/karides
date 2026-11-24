import { useState, useEffect } from 'react';

export interface SpeciesItem {
  id: string;
  name: string;
  isCustom?: boolean;
}

export const DEFAULT_SPECIES: SpeciesItem[] = [
  { id: 'caridina', name: 'Caridina Karides' },
  { id: 'neocaridina', name: 'Neocaridina Karides' },
  { id: 'apistogramma', name: 'Apistogramma (Cüce Cichlid)' },
  { id: 'pleco', name: 'Pleco (Sturisoma & Vatos)' },
];

const STORAGE_KEY = 'aquabreeder_species_list_v1';

export function formatTitleCaseTR(text: string): string {
  if (!text) return '';
  return text
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => {
      if (!word) return '';
      const first = word.charAt(0).toLocaleUpperCase('tr-TR');
      const rest = word.slice(1).toLocaleLowerCase('tr-TR');
      return first + rest;
    })
    .join(' ');
}

export function formatSpeciesLabel(categoryOrId: string, speciesList?: SpeciesItem[]): string {
  if (!categoryOrId) return '';
  if (speciesList) {
    const matched = speciesList.find(
      (s) => s.id.toLowerCase() === categoryOrId.toLowerCase()
    );
    if (matched && matched.isCustom) {
      return formatTitleCaseTR(matched.name);
    }
  }
  return formatTitleCaseTR(categoryOrId);
}

export function getStoredSpecies(): SpeciesItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SPECIES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure default species always exist and custom species names are cleanly formatted
      const existingIds = new Set(parsed.map((p: SpeciesItem) => p.id));
      const combined = parsed.map((p: SpeciesItem) =>
        p.isCustom ? { ...p, name: formatTitleCaseTR(p.name) } : p
      );
      DEFAULT_SPECIES.forEach((d) => {
        if (!existingIds.has(d.id)) combined.push(d);
      });
      return combined;
    }
    return DEFAULT_SPECIES;
  } catch (err) {
    console.error('Error reading species list:', err);
    return DEFAULT_SPECIES;
  }
}

export function saveStoredSpecies(speciesList: SpeciesItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(speciesList));
    window.dispatchEvent(new Event('aquabreeder_species_updated'));
  } catch (err) {
    console.error('Error saving species list:', err);
  }
}

export function addCustomSpecies(name: string): SpeciesItem {
  const formatted = formatTitleCaseTR(name);
  if (!formatted) {
    return DEFAULT_SPECIES[0];
  }

  // Create clean ID
  const id = formatted
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9ğüşıöç]/gi, '_')
    .replace(/_+/g, '_');

  const current = getStoredSpecies();
  const existing = current.find(
    (s) => s.id.toLowerCase() === id.toLowerCase() || s.name.toLocaleLowerCase('tr-TR') === formatted.toLocaleLowerCase('tr-TR')
  );

  if (existing) {
    return existing;
  }

  const newItem: SpeciesItem = {
    id: id || `sp_${Date.now()}`,
    name: formatted,
    isCustom: true,
  };

  const updated = [...current, newItem];
  saveStoredSpecies(updated);
  return newItem;
}

/**
 * React hook to access and subscribe to the dynamic species list.
 */
export function useSpeciesList() {
  const [speciesList, setSpeciesList] = useState<SpeciesItem[]>(getStoredSpecies);

  useEffect(() => {
    const handler = () => {
      setSpeciesList(getStoredSpecies());
    };
    window.addEventListener('aquabreeder_species_updated', handler);
    return () => {
      window.removeEventListener('aquabreeder_species_updated', handler);
    };
  }, []);

  return speciesList;
}
