import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DashboardView } from './components/DashboardView';
import { PurchasesAndSalesView } from './components/PurchasesAndSalesView';
import { InventoryView } from './components/InventoryView';
import { TanksView } from './components/TanksView';
import { ExpensesView } from './components/ExpensesView';

import { AddBatchModal } from './components/modals/AddBatchModal';
import { AddSaleModal } from './components/modals/AddSaleModal';
import { AddTankModal } from './components/modals/AddTankModal';
import { DirectStockEditModal } from './components/modals/DirectStockEditModal';
import { AddExpenseModal } from './components/modals/AddExpenseModal';
import { CullingModal } from './components/modals/CullingModal';
import { QuickEntryModal } from './components/modals/QuickEntryModal';
import { PurchasesBreakdownModal } from './components/modals/PurchasesBreakdownModal';
import { BusinessValuationModal } from './components/modals/BusinessValuationModal';
import { ManualItemDefinitionModal } from './components/modals/ManualItemDefinitionModal';
import { AddSpeciesModal } from './components/modals/AddSpeciesModal';
import {
  ItemProfitLossDetailModal,
  ItemProfitLossData,
} from './components/modals/ItemProfitLossDetailModal';
import { JsonImportModal } from './components/modals/JsonImportModal';
import { calculateBatchProfitLoss } from './utils/profitLoss';
import { GoogleDriveView } from './components/GoogleDriveView';
import { initAuth, getAccessToken } from './services/googleAuth';
import {
  DriveOptimizationSettings,
  loadDriveOptSettings,
  saveDriveOptSettings,
  computeStateHash,
  uploadHatcheryBackupToDrive,
} from './services/googleDrive';
import { User } from 'firebase/auth';
import {
  getInStockStyrofoamExpenses,
  getInStockHeatPackExpenses,
} from './utils/packagingOptions';

import {
  BusinessProfile,
  HatcheryState,
  getStoredBusinesses,
  saveStoredBusinesses,
  getActiveBusinessId,
  loadBusinessState,
  saveBusinessState,
  resetToDemoData,
  clearBusinessData,
  exportBackupJSON,
  ParsedBackupJSON,
  parseBackupJSON,
} from './utils/storage';
import { BatchPurchase, Tank, Sale, BreedingSpawn, Expense, SalePackageTemplate } from './types';
import {
  getLivestockMergeKey,
  mergeBatches,
  consolidateBatchesAndSales,
} from './utils/batchConsolidation';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Preserved active business state without multi-business switching UI
  const [businesses, setBusinesses] = useState<BusinessProfile[]>(() => getStoredBusinesses());
  const [activeBusinessId] = useState<string>(() =>
    getActiveBusinessId(getStoredBusinesses())
  );

  // Atomic per-business state (businessId + state always update together to avoid cross-save bugs)
  const [hatcheryRecord, setHatcheryRecord] = useState<{
    businessId: string;
    state: HatcheryState;
  }>(() => {
    const initialList = getStoredBusinesses();
    const initialBizId = getActiveBusinessId(initialList);
    return {
      businessId: initialBizId,
      state: loadBusinessState(initialBizId),
    };
  });

  const { batches, tanks, sales, breedings, expenses, packages } = hatcheryRecord.state;

  const updateStateField = <K extends keyof HatcheryState>(
    key: K,
    updater: React.SetStateAction<HatcheryState[K]>
  ) => {
    setHatcheryRecord((prev) => ({
      ...prev,
      state: {
        ...prev.state,
        [key]:
          typeof updater === 'function'
            ? (updater as (curr: HatcheryState[K]) => HatcheryState[K])(prev.state[key])
            : updater,
      },
    }));
  };

  const setBatches = (u: React.SetStateAction<BatchPurchase[]>) => updateStateField('batches', u);
  const setTanks = (u: React.SetStateAction<Tank[]>) => updateStateField('tanks', u);
  const setSales = (u: React.SetStateAction<Sale[]>) => updateStateField('sales', u);
  const setBreedings = (u: React.SetStateAction<BreedingSpawn[]>) => updateStateField('breedings', u);
  const setExpenses = (u: React.SetStateAction<Expense[]>) => updateStateField('expenses', u);
  const setPackages = (u: React.SetStateAction<SalePackageTemplate[]>) =>
    updateStateField('packages', u);

  // Sync active business state to localStorage
  useEffect(() => {
    saveBusinessState(hatcheryRecord.businessId, hatcheryRecord.state);
  }, [hatcheryRecord]);

  // Sync businesses registry (preserves hero image preference)
  useEffect(() => {
    saveStoredBusinesses(businesses);
  }, [businesses]);

  const activeBusiness =
    businesses.find((b) => b.id === activeBusinessId) || businesses[0];

  const handleUpdateHeroImage = (heroImage: string) => {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === activeBusinessId ? { ...b, heroImage } : b))
    );
  };

  // Modals state
  const [isAddSpeciesModalOpen, setIsAddSpeciesModalOpen] = useState(false);
  const [isManualItemModalOpen, setIsManualItemModalOpen] = useState(false);
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [isAddSaleOpen, setIsAddSaleOpen] = useState(false);
  const [saleInitialBatch, setSaleInitialBatch] = useState<BatchPurchase | undefined>(undefined);
  const [isAddTankOpen, setIsAddTankOpen] = useState(false);
  const [isLiveStockAdjustmentOpen, setIsLiveStockAdjustmentOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isPurchasesBreakdownOpen, setIsPurchasesBreakdownOpen] = useState(false);
  const [isBusinessValuationOpen, setIsBusinessValuationOpen] = useState(false);
  const [batchToCull, setBatchToCull] = useState<BatchPurchase | null>(null);
  const [inspectedItem, setInspectedItem] = useState<ItemProfitLossData | null>(null);
  const [pendingJsonImport, setPendingJsonImport] = useState<{
    fileName: string;
    parsedBackup: ParsedBackupJSON | null;
    errorMessage: string | null;
  } | null>(null);

  const handleInspectBatch = (batch: BatchPurchase) => {
    setInspectedItem(calculateBatchProfitLoss(batch, sales));
  };

  // Google Drive Authentication & Automatic Optimization state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [driveOptSettings, setDriveOptSettings] = useState<DriveOptimizationSettings>(() =>
    loadDriveOptSettings()
  );
  const [autoBackupStatus, setAutoBackupStatus] = useState<
    'idle' | 'syncing' | 'synced' | 'error'
  >('idle');

  const handleUpdateDriveOptSettings = (
    updater:
      | Partial<DriveOptimizationSettings>
      | ((prev: DriveOptimizationSettings) => DriveOptimizationSettings)
  ) => {
    setDriveOptSettings((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      saveDriveOptSettings(next);
      return next;
    });
  };

  // Initialize Firebase Auth listener on app load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setCurrentUser(user),
      () => setCurrentUser(null)
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Debounced automatic Drive backup when data changes (skips unchanged hashes)
  useEffect(() => {
    if (!currentUser || !driveOptSettings.autoBackupEnabled) return;

    const currentHash = computeStateHash(hatcheryRecord.state);
    if (driveOptSettings.lastBackupHash === currentHash) {
      return;
    }

    const timer = window.setTimeout(async () => {
      const token = await getAccessToken();
      if (!token) return;

      setAutoBackupStatus('syncing');
      try {
        await uploadHatcheryBackupToDrive(hatcheryRecord.state, undefined, {
          compact: driveOptSettings.compactJsonEnabled,
          isAuto: true,
        });
        const nowIso = new Date().toISOString();
        handleUpdateDriveOptSettings({
          lastBackupHash: currentHash,
          lastBackupAt: nowIso,
        });
        setAutoBackupStatus('synced');
      } catch (err) {
        console.error('Auto Drive backup error:', err);
        setAutoBackupStatus('error');
      }
    }, 15000);

    return () => window.clearTimeout(timer);
  }, [
    currentUser,
    hatcheryRecord.state,
    driveOptSettings.autoBackupEnabled,
    driveOptSettings.compactJsonEnabled,
    driveOptSettings.lastBackupHash,
  ]);

  // Restore state from Google Drive
  const handleRestoreState = (restored: any) => {
    setHatcheryRecord((prev) => {
      const nextBatches = Array.isArray(restored.batches) ? restored.batches : prev.state.batches;
      const nextSales = Array.isArray(restored.sales) ? restored.sales : prev.state.sales;
      const consolidated = consolidateBatchesAndSales(nextBatches, nextSales);
      return {
        ...prev,
        state: {
          batches: consolidated.batches,
          tanks: Array.isArray(restored.tanks) ? restored.tanks : prev.state.tanks,
          sales: consolidated.sales,
          breedings: Array.isArray(restored.breedings) ? restored.breedings : prev.state.breedings,
          expenses: Array.isArray(restored.expenses) ? restored.expenses : prev.state.expenses,
          packages: Array.isArray(restored.packages) ? restored.packages : prev.state.packages,
        },
      };
    });
  };

  // Import state from Excel workbook
  const handleImportExcelData = (imported: {
    batches: BatchPurchase[];
    tanks: Tank[];
    sales: Sale[];
    expenses: Expense[];
    mode: 'append' | 'replace';
  }) => {
    if (imported.mode === 'replace') {
      const consolidated = consolidateBatchesAndSales(imported.batches, imported.sales);
      setHatcheryRecord((prev) => ({
        ...prev,
        state: {
          ...prev.state,
          batches: consolidated.batches,
          tanks: imported.tanks,
          sales: consolidated.sales,
          expenses: imported.expenses,
          breedings: [],
        },
      }));
    } else {
      setHatcheryRecord((prev) => {
        const nextBatches =
          imported.batches.length > 0
            ? [...prev.state.batches, ...imported.batches]
            : prev.state.batches;
        const nextSales =
          imported.sales.length > 0
            ? [...imported.sales, ...prev.state.sales]
            : prev.state.sales;
        const consolidated = consolidateBatchesAndSales(nextBatches, nextSales);
        return {
          ...prev,
          state: {
            ...prev.state,
            tanks: imported.tanks.length > 0 ? [...imported.tanks, ...prev.state.tanks] : prev.state.tanks,
            batches: consolidated.batches,
            expenses: imported.expenses.length > 0 ? [...imported.expenses, ...prev.state.expenses] : prev.state.expenses,
            sales: consolidated.sales,
          },
        };
      });
    }
  };

  // Password-verified reset handler from Dosya Yönetimi
  const handleResetBusinessData = (mode: 'empty' | 'demo') => {
    const nextState =
      mode === 'empty'
        ? clearBusinessData(activeBusinessId)
        : resetToDemoData(activeBusinessId);
    setHatcheryRecord({ businessId: activeBusinessId, state: nextState });
    setSaleInitialBatch(undefined);
    setBatchToCull(null);
  };

  // Sidebar quick reset navigates to Dosya Yönetimi confirmation & password dialog
  const handleResetDemo = () => {
    setCurrentTab('drive');
  };

  // Export JSON
  const handleExportJSON = () => {
    exportBackupJSON(
      { batches, tanks, sales, breedings, expenses, packages },
      activeBusiness?.name
    );
  };

  // Import JSON
  const handleImportJSONFile = async (file: File) => {
    try {
      const parsedBackup = await parseBackupJSON(file);
      setPendingJsonImport({
        fileName: file.name,
        parsedBackup,
        errorMessage: null,
      });
    } catch (err: any) {
      setPendingJsonImport({
        fileName: file.name,
        parsedBackup: null,
        errorMessage: err?.message || 'JSON dosyası okunamadı.',
      });
    }
  };

  const handleConfirmJsonImport = (mode: 'replace' | 'append') => {
    if (!pendingJsonImport?.parsedBackup) return;
    const importedState = pendingJsonImport.parsedBackup.state;

    if (mode === 'replace') {
      const consolidated = consolidateBatchesAndSales(importedState.batches, importedState.sales);
      setHatcheryRecord((prev) => ({
        ...prev,
        state: {
          batches: consolidated.batches,
          tanks: importedState.tanks,
          sales: consolidated.sales,
          breedings: importedState.breedings,
          expenses: importedState.expenses,
          packages: importedState.packages,
        },
      }));
    } else {
      const mergeById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
        const seen = new Set(existing.map((item) => item.id));
        const uniqueIncoming = incoming.filter((item) => !item.id || !seen.has(item.id));
        return [...uniqueIncoming, ...existing];
      };

      setHatcheryRecord((prev) => {
        const nextBatches = [...prev.state.batches, ...importedState.batches];
        const nextSales = mergeById(prev.state.sales, importedState.sales);
        const consolidated = consolidateBatchesAndSales(nextBatches, nextSales);
        return {
          ...prev,
          state: {
            batches: consolidated.batches,
            tanks: mergeById(prev.state.tanks, importedState.tanks),
            sales: consolidated.sales,
            breedings: mergeById(prev.state.breedings, importedState.breedings),
            expenses: mergeById(prev.state.expenses, importedState.expenses),
            packages: mergeById(prev.state.packages, importedState.packages),
          },
        };
      });
    }

    setPendingJsonImport(null);
    setSaleInitialBatch(undefined);
    setBatchToCull(null);
  };

  // Batches handlers: Same livestock variety & category consolidates into a single entry regardless of supplier
  const handleAddBatch = (newBatch: BatchPurchase) => {
    const newKey = getLivestockMergeKey(newBatch);
    const existingIndex = batches.findIndex(
      (b) => b.status !== 'culled' && getLivestockMergeKey(b) === newKey
    );

    if (existingIndex !== -1) {
      const existing = batches[existingIndex];
      const existingSales = sales.filter((s) => s.batchId === existing.id);
      const updatedBatch = mergeBatches(existing, newBatch, existingSales, []);

      const updatedBatches = [...batches];
      updatedBatches[existingIndex] = updatedBatch;
      setBatches(updatedBatches);
    } else {
      setBatches([newBatch, ...batches]);
    }

    if (newBatch.assignedTankId) {
      setTanks(
        tanks.map((t) => {
          if (t.id === newBatch.assignedTankId) {
            return {
              ...t,
              population: {
                ...t.population,
                breedingAdults: t.population.breedingAdults + newBatch.keptForBreeding,
                juveniles: t.population.juveniles + newBatch.markedForSale,
              },
            };
          }
          return t;
        })
      );
    }
  };

  const handleUpdateBatch = (updatedBatch: BatchPurchase) => {
    setBatches(batches.map((b) => (b.id === updatedBatch.id ? updatedBatch : b)));
  };

  const handleDeleteBatch = (batchId: string) => {
    setBatches(batches.filter((b) => b.id !== batchId));
  };

  // Sales handlers
  const handleAddSale = (newSale: Sale) => {
    setSales([newSale, ...sales]);
    if (newSale.batchId) {
      setBatches(
        batches.map((b) => {
          if (b.id === newSale.batchId) {
            const remaining = Math.max(0, b.markedForSale - newSale.quantity);
            return {
              ...b,
              markedForSale: remaining,
              status: remaining === 0 ? 'completed' : b.status,
            };
          }
          return b;
        })
      );
    }

    const needsStyrofoam =
      newSale.deliveryMethod === 'styrofoam_box' ||
      newSale.deliveryMethod === 'cargo_styrofoam';
    const needsHeatPack = newSale.deliveryMethod === 'cargo_styrofoam';

    const styrofoamIdToDeduct = needsStyrofoam
      ? newSale.styrofoamExpenseId || getInStockStyrofoamExpenses(expenses)[0]?.id
      : undefined;
    const heatPackIdToDeduct = needsHeatPack
      ? newSale.heatPackExpenseId || getInStockHeatPackExpenses(expenses)[0]?.id
      : undefined;

    if (newSale.expenseId || styrofoamIdToDeduct || heatPackIdToDeduct) {
      setExpenses((prevExpenses) =>
        prevExpenses.map((e) => {
          let updated = e;

          if (newSale.expenseId && e.id === newSale.expenseId) {
            updated = {
              ...updated,
              inStock: false,
              depletedDate: newSale.date,
              depletionReason: `Hobiciye satıldı (${newSale.customerName} - ${newSale.totalPrice} ₺)`,
            };
          }

          const shouldDeductPackaging =
            (styrofoamIdToDeduct && e.id === styrofoamIdToDeduct) ||
            (heatPackIdToDeduct && e.id === heatPackIdToDeduct);

          if (shouldDeductPackaging) {
            const currentQty = updated.quantity !== undefined ? updated.quantity : 1;
            const initialQty =
              updated.initialQuantity !== undefined ? updated.initialQuantity : currentQty;
            const nextQty = Math.max(0, Number((currentQty - 1).toFixed(2)));
            updated = {
              ...updated,
              initialQuantity: initialQty,
              quantity: nextQty,
              inStock: nextQty > 0,
              depletedDate: nextQty === 0 ? newSale.date : updated.depletedDate,
              depletionReason:
                nextQty === 0
                  ? `Teslimatta kullanıldı (${newSale.customerName})`
                  : updated.depletionReason,
            };
          }

          return updated;
        })
      );
    }
  };

  const handleTogglePayment = (saleId: string) => {
    setSales(
      sales.map((s) => {
        if (s.id === saleId) {
          return {
            ...s,
            paymentStatus: s.paymentStatus === 'paid' ? 'pending' : 'paid',
          };
        }
        return s;
      })
    );
  };

  const handleDeleteSale = (saleId: string) => {
    setSales(sales.filter((s) => s.id !== saleId));
  };

  // Tanks handlers
  const handleAddTank = (newTank: Tank) => {
    setTanks((prev) => [...prev, newTank]);
    if (
      newTank.substrateExpenseId &&
      newTank.substrateLiters &&
      newTank.substrateLiters > 0
    ) {
      const today = new Date().toISOString().split('T')[0];
      const deduct = newTank.substrateLiters;
      setExpenses((prevExpenses) =>
        prevExpenses.map((exp) => {
          if (exp.id !== newTank.substrateExpenseId) return exp;
          const currentQty = exp.quantity !== undefined ? exp.quantity : 1;
          const nextQty = Math.max(0, Number((currentQty - deduct).toFixed(2)));
          return {
            ...exp,
            quantity: nextQty,
            inStock: nextQty > 0,
            depletedDate: nextQty === 0 ? today : exp.depletedDate,
            depletionReason:
              nextQty === 0
                ? `${newTank.code} akvaryum taban kurulumunda kullanıldı`
                : exp.depletionReason,
          };
        })
      );
    }
  };

  const handleUpdateTankSetup = (
    tankId: string,
    setup: {
      substrate: string;
      substrateExpenseId?: string;
      substrateLiters?: number;
      filtration: string;
      filtrationExpenseId?: string;
      filtrationUsedCount?: number;
    }
  ) => {
    const prevTank = tanks.find((t) => t.id === tankId);
    const today = new Date().toISOString().split('T')[0];

    setTanks((prevTanks) =>
      prevTanks.map((t) =>
        t.id === tankId
          ? {
              ...t,
              substrate: setup.substrate,
              substrateExpenseId: setup.substrateExpenseId,
              substrateLiters: setup.substrateLiters,
              filtration: setup.filtration,
              filtrationExpenseId: setup.filtrationExpenseId,
              filtrationUsedCount: setup.filtrationUsedCount,
            }
          : t
      )
    );

    const prevSubId = prevTank?.substrateExpenseId;
    const prevSubQty = prevTank?.substrateLiters ?? 0;
    const nextSubId = setup.substrateExpenseId;
    const nextSubQty = setup.substrateLiters ?? 0;

    if ((prevSubId && prevSubQty > 0) || (nextSubId && nextSubQty > 0)) {
      setExpenses((prevExpenses) =>
        prevExpenses.map((exp) => {
          let qty = exp.quantity !== undefined ? exp.quantity : 1;
          let changed = false;

          if (prevSubId && exp.id === prevSubId && prevSubQty > 0) {
            qty = Number((qty + prevSubQty).toFixed(2));
            changed = true;
          }
          if (nextSubId && exp.id === nextSubId && nextSubQty > 0) {
            qty = Math.max(0, Number((qty - nextSubQty).toFixed(2)));
            changed = true;
          }

          if (!changed) return exp;
          return {
            ...exp,
            quantity: qty,
            inStock: qty > 0,
            depletedDate: qty === 0 ? today : undefined,
            depletionReason:
              qty === 0
                ? `${prevTank?.code || 'Akvaryum'} taban kurulumunda tüketildi`
                : undefined,
          };
        })
      );
    }
  };

  const handleUpdateTankParameters = (
    tankId: string,
    params: Tank['currentParameters']
  ) => {
    setTanks(
      tanks.map((t) => {
        if (t.id === tankId) {
          return {
            ...t,
            currentParameters: params,
          };
        }
        return t;
      })
    );
  };

  const handleRecordWaterChange = (tankId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setTanks(
      tanks.map((t) => {
        if (t.id === tankId) {
          return {
            ...t,
            lastWaterChange: today,
          };
        }
        return t;
      })
    );
  };

  const handleDeleteTank = (tankId: string) => {
    setTanks(tanks.filter((t) => t.id !== tankId));
  };

  // Breedings handlers
  const handleAddBreeding = (newSpawn: BreedingSpawn) => {
    setBreedings([newSpawn, ...breedings]);
    setTanks(
      tanks.map((t) => {
        if (t.id === newSpawn.tankId) {
          return {
            ...t,
            population: {
              ...t.population,
              berriedOrPairs: t.population.berriedOrPairs + 1,
            },
          };
        }
        return t;
      })
    );
  };

  const handleUpdateBreedingStatus = (
    id: string,
    status: BreedingSpawn['status'],
    actualHatch?: string
  ) => {
    setBreedings(
      breedings.map((b) => {
        if (b.id === id) {
          return {
            ...b,
            status,
            actualHatchDate: actualHatch || b.actualHatchDate,
          };
        }
        return b;
      })
    );
  };

  const handleDeleteBreeding = (id: string) => {
    setBreedings(breedings.filter((b) => b.id !== id));
  };

  // Expenses handlers
  const handleAddExpense = (newExp: Expense) => {
    setExpenses([newExp, ...expenses]);
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    setExpenses(expenses.map((e) => (e.id === updatedExpense.id ? updatedExpense : e)));
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  // Packages handlers
  const handleAddPackage = (pkg: SalePackageTemplate) => {
    setPackages([...packages, pkg]);
  };

  const handleDeletePackage = (id: string) => {
    setPackages(packages.filter((p) => p.id !== id));
  };

  // Quick Action selection routing
  const handleQuickAction = (
    action:
      | 'batch'
      | 'sale'
      | 'tank'
      | 'livestock_adjustment'
      | 'expense'
      | 'manual_item'
      | 'add_species'
  ) => {
    switch (action) {
      case 'manual_item':
        setIsManualItemModalOpen(true);
        break;
      case 'add_species':
        setIsAddSpeciesModalOpen(true);
        break;
      case 'livestock_adjustment':
        setIsLiveStockAdjustmentOpen(true);
        break;
      case 'batch':
        setIsAddBatchOpen(true);
        break;
      case 'sale':
        setSaleInitialBatch(undefined);
        setIsAddSaleOpen(true);
        break;
      case 'tank':
        setIsAddTankOpen(true);
        break;
      case 'expense':
        setIsAddExpenseOpen(true);
        break;
    }
  };

  // Doğrudan Manuel Stok Adedi Belirleme & Güncelleme Handlerları
  const handleUpdateBatchStock = (batchId: string, newStock: number) => {
    const validCount = Math.max(0, Math.floor(newStock));
    setBatches(
      batches.map((batch) => {
        if (batch.id !== batchId) return batch;
        return {
          ...batch,
          manualStockCount: validCount,
          markedForSale: validCount,
          status: validCount === 0 ? 'completed' : 'active_selection',
        };
      })
    );
  };

  const handleUpdateExpenseStock = (expenseId: string, newStock: number) => {
    const validCount = Math.max(0, Math.floor(newStock));
    const today = new Date().toISOString().split('T')[0];
    setExpenses(
      expenses.map((expense) => {
        if (expense.id !== expenseId) return expense;
        return {
          ...expense,
          quantity: validCount,
          inStock: validCount > 0,
          depletedDate: validCount === 0 ? today : undefined,
          depletionReason: validCount === 0 ? 'Tükendi / Stok Sıfırlandı' : undefined,
        };
      })
    );
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col lg:flex-row">
      {/* Vertical Sidebar on the Left (from top-left downwards) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onExportData={handleExportJSON}
        onImportJSON={handleImportJSONFile}
        onResetDemo={handleResetDemo}
        stats={{
          tankCount: tanks.length,
          salesCount: sales.length,
        }}
      />

      {/* Main Content Viewport Area offset for the sidebar */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Bar */}
        <TopBar
          currentTab={currentTab}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenQuickAdd={() => setIsQuickEntryOpen(true)}
          currentUser={currentUser}
          onSelectTab={setCurrentTab}
        />

        {/* Dynamic Viewport View */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 lg:pb-8">
          {currentTab === 'dashboard' && (
            <DashboardView
              batches={batches}
              tanks={tanks}
              sales={sales}
              breedings={breedings}
              expenses={expenses}
              activeBusiness={activeBusiness}
              onSelectTab={setCurrentTab}
              onOpenAddBatch={() => setIsAddBatchOpen(true)}
              onOpenAddSale={() => {
                setSaleInitialBatch(undefined);
                setIsAddSaleOpen(true);
              }}
              onOpenPurchasesBreakdown={() => setIsPurchasesBreakdownOpen(true)}
              onOpenBusinessValuation={() => setIsBusinessValuationOpen(true)}
              onOpenManualItemDefinition={() => setIsManualItemModalOpen(true)}
              onUpdateHeroImage={handleUpdateHeroImage}
              onInspectBatch={handleInspectBatch}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              batches={batches}
              sales={sales}
              expenses={expenses}
              tanks={tanks}
              onOpenManualItemDefinition={() => setIsManualItemModalOpen(true)}
              onUpdateBatch={handleUpdateBatch}
              onUpdateExpense={handleUpdateExpense}
              onDeleteBatch={handleDeleteBatch}
              onDeleteExpense={handleDeleteExpense}
              onUpdateBatchStock={handleUpdateBatchStock}
              onUpdateExpenseStock={handleUpdateExpenseStock}
            />
          )}

          {(currentTab === 'transactions' || currentTab === 'batches' || currentTab === 'sales' || currentTab === 'packages') && (
            <PurchasesAndSalesView
              batches={batches}
              sales={sales}
              expenses={expenses}
              tanks={tanks}
              onOpenAddBatch={() => setIsAddBatchOpen(true)}
              onOpenAddSale={() => {
                setSaleInitialBatch(undefined);
                setIsAddSaleOpen(true);
              }}
              onOpenAddExpense={() => setIsAddExpenseOpen(true)}
              onOpenCullModal={(batch) => setBatchToCull(batch)}
              onOpenSaleForBatch={(batch) => {
                setSaleInitialBatch(batch);
                setIsAddSaleOpen(true);
              }}
              onDeleteBatch={handleDeleteBatch}
              onDeleteSale={handleDeleteSale}
              onDeleteExpense={handleDeleteExpense}
              onTogglePaymentStatus={handleTogglePayment}
              initialSubTab={currentTab === 'sales' ? 'sales' : currentTab === 'batches' ? 'purchases' : 'all'}
            />
          )}

          {currentTab === 'tanks' && (
            <TanksView
              tanks={tanks}
              expenses={expenses}
              onOpenAddTank={() => setIsAddTankOpen(true)}
              onUpdateTankParameters={handleUpdateTankParameters}
              onUpdateTankSetup={handleUpdateTankSetup}
              onRecordWaterChange={handleRecordWaterChange}
              onDeleteTank={handleDeleteTank}
              batches={batches}
              onInspectBatch={handleInspectBatch}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpensesView
              expenses={expenses}
              onOpenAddExpense={() => setIsAddExpenseOpen(true)}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {currentTab === 'drive' && (
            <GoogleDriveView
              currentUser={currentUser}
              onUserChange={setCurrentUser}
              activeBusinessName={activeBusiness?.name}
              fullHatcheryState={{ batches, tanks, sales, breedings, expenses, packages }}
              onRestoreState={handleRestoreState}
              onImportExcelData={handleImportExcelData}
              onExportJSON={handleExportJSON}
              onImportJSON={handleImportJSONFile}
              onResetBusinessData={handleResetBusinessData}
              driveOptSettings={driveOptSettings}
              onUpdateDriveOptSettings={handleUpdateDriveOptSettings}
              autoBackupStatus={autoBackupStatus}
            />
          )}
        </main>

        {/* Clean Footer */}
        <footer className="hidden lg:block mt-auto border-t border-slate-200 bg-white py-4 text-xs text-slate-500 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              AquaBreeder Pro · Mini Canlı Üretimhane & Islah Yönetim Sistemi
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span>Caridina (RO / Aktif Toprak)</span>
              <span aria-hidden="true">·</span>
              <span>Neocaridina (Adet)</span>
              <span aria-hidden="true">·</span>
              <span>Apistogramma (Cüce Cichlid)</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Thumb-Zone Navigation */}
      <MobileBottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Modals */}
      {isQuickEntryOpen && (
        <QuickEntryModal
          onClose={() => setIsQuickEntryOpen(false)}
          onSelectAction={handleQuickAction}
        />
      )}

      {isAddBatchOpen && (
        <AddBatchModal
          tanks={tanks}
          onClose={() => setIsAddBatchOpen(false)}
          onAddBatch={handleAddBatch}
        />
      )}

      {isAddSaleOpen && (
        <AddSaleModal
          batches={batches}
          expenses={expenses}
          initialBatch={saleInitialBatch}
          onClose={() => {
            setIsAddSaleOpen(false);
            setSaleInitialBatch(undefined);
          }}
          onAddSale={handleAddSale}
        />
      )}

      {isAddTankOpen && (
        <AddTankModal
          expenses={expenses}
          onClose={() => setIsAddTankOpen(false)}
          onAddTank={handleAddTank}
          existingCount={tanks.length}
        />
      )}

      {isLiveStockAdjustmentOpen && (
        <DirectStockEditModal
          isOpen={isLiveStockAdjustmentOpen}
          batches={batches}
          expenses={expenses}
          onClose={() => setIsLiveStockAdjustmentOpen(false)}
          onUpdateBatchStock={handleUpdateBatchStock}
          onUpdateExpenseStock={handleUpdateExpenseStock}
        />
      )}

      {isAddExpenseOpen && (
        <AddExpenseModal
          onClose={() => setIsAddExpenseOpen(false)}
          onAddExpense={handleAddExpense}
        />
      )}

      {batchToCull && (
        <CullingModal
          batch={batchToCull}
          onClose={() => setBatchToCull(null)}
          onSave={handleUpdateBatch}
        />
      )}

      {isPurchasesBreakdownOpen && (
        <PurchasesBreakdownModal
          batches={batches}
          expenses={expenses}
          onClose={() => setIsPurchasesBreakdownOpen(false)}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          onOpenAddBatch={() => setIsAddBatchOpen(true)}
          onInspectBatch={handleInspectBatch}
        />
      )}

      {isBusinessValuationOpen && (
        <BusinessValuationModal
          batches={batches}
          sales={sales}
          expenses={expenses}
          onClose={() => setIsBusinessValuationOpen(false)}
          onUpdateBatch={handleUpdateBatch}
          onOpenAddBatch={() => setIsAddBatchOpen(true)}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          onInspectBatch={handleInspectBatch}
        />
      )}

      <ItemProfitLossDetailModal
        isOpen={!!inspectedItem}
        item={inspectedItem}
        onClose={() => setInspectedItem(null)}
      />

      {isManualItemModalOpen && (
        <ManualItemDefinitionModal
          tanks={tanks}
          onClose={() => setIsManualItemModalOpen(false)}
          onAddBatch={handleAddBatch}
          onAddExpense={handleAddExpense}
        />
      )}

      {pendingJsonImport && (
        <JsonImportModal
          fileName={pendingJsonImport.fileName}
          parsedBackup={pendingJsonImport.parsedBackup}
          errorMessage={pendingJsonImport.errorMessage}
          onClose={() => setPendingJsonImport(null)}
          onConfirmImport={handleConfirmJsonImport}
        />
      )}
    </div>
  );
}
