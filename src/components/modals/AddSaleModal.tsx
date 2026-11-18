import React, { useState } from 'react';
import { X, AlertCircle, Sparkles, Wrench, Package } from 'lucide-react';
import { Sale, BatchPurchase, Expense } from '../../types';
import { useSpeciesList, formatSpeciesLabel } from '../../utils/speciesStorage';
import {
  getInStockStyrofoamExpenses,
  getInStockHeatPackExpenses,
  getExpenseUnitCost,
} from '../../utils/packagingOptions';

interface AddSaleModalProps {
  batches: BatchPurchase[];
  expenses?: Expense[];
  initialBatch?: BatchPurchase;
  onClose: () => void;
  onAddSale: (sale: Sale) => void;
}

export const AddSaleModal: React.FC<AddSaleModalProps> = ({
  batches,
  expenses = [],
  initialBatch,
  onClose,
  onAddSale,
}) => {
  const speciesList = useSpeciesList();
  const [saleCategory, setSaleCategory] = useState<'livestock' | 'equipment' | 'supply'>('livestock');

  // Available stocks by category
  const availableBatches = batches.filter(
    (b) => b.markedForSale > 0 && b.status !== 'completed'
  );

  const availableEquipment = expenses.filter(
    (e) => e.category === 'equipment' && e.inStock !== false
  );

  const availableSupplies = expenses.filter(
    (e) => e.category !== 'equipment' && e.inStock !== false
  );

  const defaultBatch =
    initialBatch && initialBatch.markedForSale > 0 && initialBatch.status !== 'completed'
      ? initialBatch
      : availableBatches.length > 0
      ? availableBatches[0]
      : null;

  const defaultEquipment = availableEquipment.length > 0 ? availableEquipment[0] : null;
  const defaultSupply = availableSupplies.length > 0 ? availableSupplies[0] : null;

  // Selected item state
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    defaultBatch ? defaultBatch.id : ''
  );
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>(
    defaultEquipment ? defaultEquipment.id : ''
  );
  const [selectedSupplyId, setSelectedSupplyId] = useState<string>(
    defaultSupply ? defaultSupply.id : ''
  );

  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [city, setCity] = useState('İstanbul');

  // Quantity and total price (no unitSalePrice input)
  const [quantity, setQuantity] = useState<number>(() => {
    if (defaultBatch) return Math.min(10, defaultBatch.markedForSale);
    return 1;
  });

  const [totalPrice, setTotalPrice] = useState<number>(() => {
    const qty = defaultBatch ? Math.min(10, defaultBatch.markedForSale) : 1;
    const price = defaultBatch?.targetSalePricePerUnit || 35;
    return price * qty;
  });

  const styrofoamOptions = getInStockStyrofoamExpenses(expenses);
  const heatPackOptions = getInStockHeatPackExpenses(expenses);

  const [deliveryMethod, setDeliveryMethod] = useState<Sale['deliveryMethod']>('hand_delivery');
  const [shippingCharged, setShippingCharged] = useState<number>(0);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [selectedStyrofoamId, setSelectedStyrofoamId] = useState<string>(
    () => styrofoamOptions[0]?.id || ''
  );
  const [selectedHeatPackId, setSelectedHeatPackId] = useState<string>(
    () => heatPackOptions[0]?.id || ''
  );
  const [paymentStatus, setPaymentStatus] = useState<Sale['paymentStatus']>('paid');
  const [trackingOrNotes, setTrackingOrNotes] = useState('');

  // Switch category handler
  const handleCategoryChange = (cat: 'livestock' | 'equipment' | 'supply') => {
    setSaleCategory(cat);
    if (cat === 'livestock') {
      const b = availableBatches.find((item) => item.id === selectedBatchId) || availableBatches[0];
      if (b) {
        setSelectedBatchId(b.id);
        const qty = Math.min(10, b.markedForSale);
        const price = b.targetSalePricePerUnit || (b.unitCost > 0 ? Math.round(b.unitCost * 1.4) : 35);
        setQuantity(qty);
        setTotalPrice(qty * price);
      }
    } else if (cat === 'equipment') {
      const eq = availableEquipment.find((item) => item.id === selectedEquipmentId) || availableEquipment[0];
      if (eq) {
        setSelectedEquipmentId(eq.id);
        setQuantity(1);
        setTotalPrice(Math.round(eq.amount * 1.15));
      }
    } else if (cat === 'supply') {
      const sup = availableSupplies.find((item) => item.id === selectedSupplyId) || availableSupplies[0];
      if (sup) {
        setSelectedSupplyId(sup.id);
        setQuantity(1);
        setTotalPrice(Math.round(sup.amount * 1.2));
      }
    }
  };

  // Livestock change
  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    const b = availableBatches.find((item) => item.id === batchId);
    if (b) {
      const initialQty = Math.min(quantity || 1, b.markedForSale);
      setQuantity(initialQty);
      const price = b.targetSalePricePerUnit || (b.unitCost > 0 ? Math.round(b.unitCost * 1.4) : 35);
      setTotalPrice(price * initialQty);
    }
  };

  // Equipment change
  const handleEquipmentChange = (eqId: string) => {
    setSelectedEquipmentId(eqId);
    const eq = availableEquipment.find((e) => e.id === eqId);
    if (eq) {
      setQuantity(1);
      setTotalPrice(Math.round(eq.amount * 1.15));
    }
  };

  // Supply change
  const handleSupplyChange = (supId: string) => {
    setSelectedSupplyId(supId);
    const sup = availableSupplies.find((s) => s.id === supId);
    if (sup) {
      setQuantity(1);
      setTotalPrice(Math.round(sup.amount * 1.2));
    }
  };

  const currentBatch = availableBatches.find((b) => b.id === selectedBatchId);
  const currentEquipment = availableEquipment.find((e) => e.id === selectedEquipmentId);
  const currentSupply = availableSupplies.find((s) => s.id === selectedSupplyId);

  const currentItemUnitCost =
    saleCategory === 'livestock'
      ? currentBatch?.unitCost || 0
      : saleCategory === 'equipment'
      ? currentEquipment?.amount || 0
      : currentSupply?.amount || 0;

  const productCostTotal = Number((currentItemUnitCost * quantity).toFixed(2));
  const needsStyrofoam =
    deliveryMethod === 'styrofoam_box' || deliveryMethod === 'cargo_styrofoam';
  const needsHeatPack = deliveryMethod === 'cargo_styrofoam';
  const isHandDelivery = deliveryMethod === 'hand_delivery';

  const resolvedStyrofoamExp = needsStyrofoam
    ? expenses.find((e) => e.id === (selectedStyrofoamId || styrofoamOptions[0]?.id))
    : undefined;
  const resolvedHeatPackExp = needsHeatPack
    ? expenses.find((e) => e.id === (selectedHeatPackId || heatPackOptions[0]?.id))
    : undefined;

  const styrofoamUnitCost = needsStyrofoam ? getExpenseUnitCost(resolvedStyrofoamExp) : 0;
  const heatPackUnitCost = needsHeatPack ? getExpenseUnitCost(resolvedHeatPackExp) : 0;
  const effectiveShippingCharged = isHandDelivery ? 0 : shippingCharged;
  const effectiveShippingCost = isHandDelivery ? 0 : shippingCost;

  const shippingAndPackagingNet = isHandDelivery
    ? 0
    : Number(
        (
          effectiveShippingCharged -
          effectiveShippingCost -
          styrofoamUnitCost -
          heatPackUnitCost
        ).toFixed(2)
      );

  const calculatedNetProfit = Number(
    (totalPrice - productCostTotal + shippingAndPackagingNet).toFixed(2)
  );

  const isLivestockOutOfStock = availableBatches.length === 0;
  const isEquipmentOutOfStock = availableEquipment.length === 0;
  const isSupplyOutOfStock = availableSupplies.length === 0;

  const isCurrentCategoryOutOfStock =
    saleCategory === 'livestock'
      ? isLivestockOutOfStock
      : saleCategory === 'equipment'
      ? isEquipmentOutOfStock
      : isSupplyOutOfStock;

  const maxStock =
    saleCategory === 'livestock'
      ? currentBatch ? currentBatch.markedForSale : 0
      : 1;

  const isQuantityExceeded = quantity > maxStock;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || isQuantityExceeded || isCurrentCategoryOutOfStock || quantity <= 0) {
      return;
    }

    let unitCost = 0;
    let itemDescription = '';
    let batchId: string | undefined = undefined;
    let expenseId: string | undefined = undefined;
    let species = undefined;

    if (saleCategory === 'livestock') {
      if (!currentBatch) return;
      unitCost = currentBatch.unitCost;
      itemDescription = currentBatch.strain || currentBatch.batchName;
      batchId = currentBatch.id;
      species = currentBatch.category;
    } else if (saleCategory === 'equipment') {
      if (!currentEquipment) return;
      unitCost = currentEquipment.amount;
      itemDescription = currentEquipment.title;
      expenseId = currentEquipment.id;
    } else if (saleCategory === 'supply') {
      if (!currentSupply) return;
      unitCost = currentSupply.amount;
      itemDescription = currentSupply.title;
      expenseId = currentSupply.id;
    }

    const computedUnitSalePrice =
      quantity > 0 ? Number((totalPrice / quantity).toFixed(2)) : 0;

    const resolvedStyrofoamId = needsStyrofoam ? resolvedStyrofoamExp?.id : undefined;
    const resolvedHeatPackId = needsHeatPack ? resolvedHeatPackExp?.id : undefined;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      batchId,
      expenseId,
      date: new Date().toISOString().split('T')[0],
      customerName,
      customerContact,
      city,
      species,
      itemDescription,
      quantity,
      unitSalePrice: computedUnitSalePrice,
      totalPrice,
      estimatedUnitCost: unitCost,
      netProfit: calculatedNetProfit,
      paymentStatus,
      deliveryMethod,
      trackingOrNotes,
      itemType: saleCategory,
      ...(resolvedStyrofoamId ? { styrofoamExpenseId: resolvedStyrofoamId } : {}),
      ...(resolvedHeatPackId ? { heatPackExpenseId: resolvedHeatPackId } : {}),
      ...(!isHandDelivery
        ? {
            shippingCharged: effectiveShippingCharged,
            shippingCost: effectiveShippingCost,
          }
        : {}),
      ...(styrofoamUnitCost > 0 ? { styrofoamUnitCost } : {}),
      ...(heatPackUnitCost > 0 ? { heatPackUnitCost } : {}),
    };

    onAddSale(newSale);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-safe shadow-2xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-slate-200 gap-2">
          <div className="min-w-0">
            <span className="text-[11px] text-emerald-600 font-semibold tracking-wide uppercase block">
              Stoktan Satış & Sipariş Kaydı
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Yeni Satış Yap (Canlı · Demirbaş · Sarf)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Switcher Tabs */}
        <div className="mt-4 p-1 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => handleCategoryChange('livestock')}
            className={`flex items-center justify-center gap-1 py-2.5 px-2 min-h-[44px] text-xs font-semibold rounded-lg transition-all cursor-pointer truncate ${
              saleCategory === 'livestock'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="truncate">Canlı Satışı</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('equipment')}
            className={`flex items-center justify-center gap-1 py-2.5 px-2 min-h-[44px] text-xs font-semibold rounded-lg transition-all cursor-pointer truncate ${
              saleCategory === 'equipment'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="truncate">Demirbaş</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryChange('supply')}
            className={`flex items-center justify-center gap-1 py-2.5 px-2 min-h-[44px] text-xs font-semibold rounded-lg transition-all cursor-pointer truncate ${
              saleCategory === 'supply'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span className="truncate">Sarf Satışı</span>
          </button>
        </div>

        {/* Warning if selected category is out of stock */}
        {isCurrentCategoryOutOfStock ? (
          <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200 text-slate-700 text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900 font-semibold block text-sm">
                  Satışa İzin Verilmiyor (Stokta Ürün Yok)
                </strong>
                <p className="text-slate-500 mt-1 leading-relaxed">
                  Stoğa girmeyen hiçbir ürünün satışına izin verilmez. Seçilen{' '}
                  <span className="text-slate-900 font-semibold capitalize">
                    {saleCategory === 'livestock' ? 'canlı' : saleCategory === 'equipment' ? 'demirbaş' : 'sarf'}
                  </span>{' '}
                  kategorisinde mevcut envanterde aktif stok bulunmamaktadır.
                </p>
                <p className="text-red-700 font-medium mt-2">
                  Lütfen önce Alımlar kısmından yeni giriş yapınız veya Envanter sayfasından malzeme tanımlayınız.
                </p>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            {/* Dynamic Selector based on Category */}
            {saleCategory === 'livestock' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold block">
                    Satılacak Stoktaki Canlı *
                  </label>
                  {currentBatch && (
                    <span className="text-[11px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Mevcut Stok: {currentBatch.markedForSale} adet
                    </span>
                  )}
                </div>
                <select
                  required
                  value={selectedBatchId}
                  onChange={(e) => handleBatchChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                >
                  {availableBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.strain || b.batchName} ({formatSpeciesLabel(b.category, speciesList)} · Stok: {b.markedForSale} adet)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {saleCategory === 'equipment' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold block">
                    Satılacak Stoktaki Demirbaş *
                  </label>
                  {currentEquipment && (
                    <span className="text-[11px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Alım Maliyeti: {currentEquipment.amount} ₺
                    </span>
                  )}
                </div>
                <select
                  required
                  value={selectedEquipmentId}
                  onChange={(e) => handleEquipmentChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                >
                  {availableEquipment.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.title} (Alış: {eq.amount} ₺ · {eq.date})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Satış tamamlandığında bu demirbaş envanterde otomatik olarak satıldı/tükendi durumuna alınır.
                </p>
              </div>
            )}

            {saleCategory === 'supply' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-semibold block">
                    Satılacak Stoktaki Sarf Malzemesi *
                  </label>
                  {currentSupply && (
                    <span className="text-[11px] font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Alım Maliyeti: {currentSupply.amount} ₺
                    </span>
                  )}
                </div>
                <select
                  required
                  value={selectedSupplyId}
                  onChange={(e) => handleSupplyChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                >
                  {availableSupplies.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.title} (Alış: {sup.amount} ₺ · {sup.date})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Satış yapıldığında bu sarf kalemi envanterde otomatik olarak güncellenir.
                </p>
              </div>
            )}

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 block mb-1">Alıcı Adı & Soyadı *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Mehmet Can"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">İletişim (Tel / Nick)</label>
                <input
                  type="text"
                  placeholder="0532 ... / @mehmet_aqua"
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Şehir / İlçe *</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ankara / Çankaya"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Kategori Türü</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono capitalize">
                  {saleCategory === 'livestock'
                    ? `Canlı (${currentBatch?.category || 'Genel'})`
                    : saleCategory === 'equipment'
                    ? 'Demirbaş & Ekipman'
                    : 'Sarf Malzeme'}
                </div>
              </div>
            </div>

            {/* Quantity and Total Sale Price (No unitSalePrice input) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 block mb-1">
                  Satılan Adet {saleCategory === 'livestock' ? `(Max: ${maxStock})` : ''} *
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxStock}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-900 font-mono font-bold ${
                    isQuantityExceeded ? 'border-red-500 text-red-700' : 'border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">
                  Ürün Satış Tutarı / Toplam Hasılat (₺) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-emerald-300 rounded-lg px-3 py-2 text-emerald-600 font-mono font-bold text-sm"
                />
              </div>
            </div>

            {/* Delivery & Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 block mb-1">Teslimat Yöntemi</label>
                <select
                  value={deliveryMethod}
                  onChange={(e) => {
                    const nextMethod = e.target.value as Sale['deliveryMethod'];
                    setDeliveryMethod(nextMethod);
                    if (nextMethod === 'hand_delivery') {
                      setShippingCharged(0);
                      setShippingCost(0);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                >
                  <option value="hand_delivery">
                    Elden Teslim (Üretimhane / Buluşma)
                  </option>
                  <option value="no_styrofoam">Straforsuz Gönderim</option>
                  <option value="styrofoam_box">Strafor Kutu</option>
                  <option value="cargo_styrofoam">Strafor Kutu + Isıtıcı Ped</option>
                  <option value="bus_freight">Otobüs Emanet</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1">Tahsilat / Ödeme Durumu</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                >
                  <option value="paid">Tahsil Edildi (Ödendi)</option>
                  <option value="pending">Ödeme Bekliyor</option>
                </select>
              </div>
            </div>

            {/* Separate Shipping Charged & Shipping Cost inputs (Hidden on hand_delivery) */}
            {isHandDelivery ? (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                Elden satış seçildi: Ek kargo geliri, kargo gideri, strafor kutu ve
                ısıtıcı ped maliyeti işlenmez.
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-emerald-700 font-medium block mb-1">
                      Kargo İçin Alınan Tutar (₺)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={shippingCharged || ''}
                      onChange={(e) =>
                        setShippingCharged(Math.max(0, Number(e.target.value)))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-red-700 font-medium block mb-1">
                      Kargo Tutarı / Ödenen Gider (₺)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={shippingCost || ''}
                      onChange={(e) =>
                        setShippingCost(Math.max(0, Number(e.target.value)))
                      }
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-semibold"
                    />
                  </div>
                </div>

                {deliveryMethod === 'no_styrofoam' || deliveryMethod === 'bus_freight' ? (
                  <p className="text-[11px] text-slate-500">
                    {deliveryMethod === 'no_styrofoam'
                      ? 'Straforsuz gönderim: Strafor kutu ve ısıtıcı ped gideri işlenmez, stoktan düşülmez.'
                      : 'Otobüs emanet gönderimi: Strafor kutu ve ısıtıcı ped stoğundan düşülmez.'}
                  </p>
                ) : (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 space-y-2">
                    <div className="text-[11px] font-semibold text-amber-700">
                      {deliveryMethod === 'styrofoam_box'
                        ? 'Paketleme Düşümü: 1 adet Strafor Kutu stoktan ve kârdan düşülür (Isıtıcı ped düşülmez).'
                        : 'Paketleme Düşümü: 1 adet Strafor Kutu + 1 adet Isıtıcı Ped stoktan ve kârdan düşülür.'}
                    </div>

                    {/* Strafor Kutu selector */}
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">
                        Stoktan Düşülecek Strafor Kutu (-1 adet):
                      </label>
                      {styrofoamOptions.length > 0 ? (
                        <select
                          value={selectedStyrofoamId || styrofoamOptions[0].id}
                          onChange={(e) => setSelectedStyrofoamId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
                        >
                          {styrofoamOptions.map((exp) => (
                            <option key={exp.id} value={exp.id}>
                              {exp.title} (Mevcut: {exp.quantity ?? 1}{' '}
                              {exp.unit || 'adet'} · Birim: {getExpenseUnitCost(exp)} ₺)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">
                          Envanterde stokta strafor kutu bulunamadı (birim maliyet: 0 ₺).
                        </p>
                      )}
                    </div>

                    {/* Isıtıcı Ped selector */}
                    {deliveryMethod === 'cargo_styrofoam' && (
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1">
                          Stoktan Düşülecek Isıtıcı Ped (-1 adet):
                        </label>
                        {heatPackOptions.length > 0 ? (
                          <select
                            value={selectedHeatPackId || heatPackOptions[0].id}
                            onChange={(e) => setSelectedHeatPackId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs"
                          >
                            {heatPackOptions.map((exp) => (
                              <option key={exp.id} value={exp.id}>
                                {exp.title} (Mevcut: {exp.quantity ?? 1}{' '}
                                {exp.unit || 'adet'} · Birim: {getExpenseUnitCost(exp)} ₺)
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5">
                            Envanterde stokta ısıtıcı ped bulunamadı (birim maliyet: 0 ₺).
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Profit summary badge with full shipping & packaging breakdown */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Ürün Satışı / Tahmini Ürün Maliyeti:</span>
                <span className="font-mono">
                  +{totalPrice.toLocaleString('tr-TR')} ₺ / -
                  {Math.round(productCostTotal).toLocaleString('tr-TR')} ₺
                </span>
              </div>

              {!isHandDelivery && (
                <>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Kargo Alınan - Kargo Gideri:</span>
                    <span className="font-mono">
                      +{effectiveShippingCharged.toLocaleString('tr-TR')} ₺ -{' '}
                      {effectiveShippingCost.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  {needsStyrofoam && (
                    <div className="flex items-center justify-between text-amber-700/90">
                      <span>Strafor Kutu Birim Maliyeti:</span>
                      <span className="font-mono">
                        -{styrofoamUnitCost.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  )}
                  {needsHeatPack && (
                    <div className="flex items-center justify-between text-amber-700/90">
                      <span>Isıtıcı Ped Birim Maliyeti:</span>
                      <span className="font-mono">
                        -{heatPackUnitCost.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-700 border-t border-slate-200 pt-1">
                    <span>Kargo &amp; Paketleme Farkı:</span>
                    <span
                      className={`font-mono font-semibold ${
                        shippingAndPackagingNet >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {shippingAndPackagingNet >= 0 ? '+' : ''}
                      {shippingAndPackagingNet.toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
                <span className="font-semibold text-slate-900">Net Kâr:</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    calculatedNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {calculatedNetProfit >= 0 ? '+' : ''}
                  {calculatedNetProfit.toLocaleString('tr-TR')} ₺
                </span>
              </div>
            </div>

            <div>
              <label className="text-slate-500 block mb-1">Açıklama / Kargo Takip / Not</label>
              <textarea
                rows={2}
                value={trackingOrNotes}
                onChange={(e) => setTrackingOrNotes(e.target.value)}
                placeholder="Örn: Yurtiçi Kargo takip no: 294819231 veya hobiciye bakım tavsiyesi iletildi."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={isQuantityExceeded}
                className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm cursor-pointer transition-colors"
              >
                Satışı Tamamla ve Stoktan Düş
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
