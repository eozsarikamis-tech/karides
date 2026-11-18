import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Droplets,
  Receipt,
  Download,
  Upload,
  RefreshCw,
  X,
  Cloud,
  ArrowLeftRight,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onExportData: () => void;
  onImportJSON?: (file: File) => void;
  onResetDemo: () => void;
  stats?: {
    tankCount: number;
    salesCount: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onExportData,
  onImportJSON,
  onResetDemo,
  stats,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Genel Bakış',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'inventory',
      label: 'Envanter',
      icon: Boxes,
      badge: 'Stok',
    },
    {
      id: 'transactions',
      label: 'Alımlar & Satışlar',
      icon: ArrowLeftRight,
      badge: stats ? `${stats.salesCount} Satış` : null,
    },
    {
      id: 'tanks',
      label: 'Akvaryumlar',
      icon: Droplets,
      badge: stats ? `${stats.tankCount} Tank` : null,
    },
    {
      id: 'expenses',
      label: 'Giderler',
      icon: Receipt,
      badge: null,
    },
    {
      id: 'drive',
      label: 'Google Drive Bulut',
      icon: Cloud,
      badge: 'Drive',
    },
  ];

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Lockup Header */}
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm shrink-0">
              AQ
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold tracking-tight text-slate-900 block leading-none truncate">
                AquaBreeder Pro
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide block mt-1 truncate">
                Mini Üretimhane & Islah
              </span>
            </div>
          </button>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Menüyü Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1.5">
          <div className="px-2 pb-2 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
            Yönetim Modülleri
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 min-h-[44px] lg:min-h-0 py-2.5 rounded-lg text-sm lg:text-xs font-medium transition-colors cursor-pointer group ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-emerald-600'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono tabular-nums shrink-0 ${
                      isActive
                        ? 'bg-emerald-700 text-emerald-50'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 space-y-3 shrink-0 text-xs">
          <div className="px-2.5 py-2 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block">
              Odak Türler
            </span>
            <div className="flex items-center justify-between text-slate-700">
              <span>Caridina</span>
              <span className="text-[10px] text-slate-400 font-mono">RO / Soil</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>Neocaridina</span>
              <span className="text-[10px] text-slate-400 font-mono">Adet Satış</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>Apistogramma</span>
              <span className="text-[10px] text-slate-400 font-mono">Çift / Küp</span>
            </div>
          </div>

          <div className="space-y-2 pb-safe">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onExportData}
                title="Tüm veritabanını JSON dosyası olarak indir"
                className="flex items-center justify-center gap-1.5 min-h-[42px] lg:min-h-0 py-2 px-2 text-xs lg:text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Yedek Al</span>
              </button>

              {onImportJSON ? (
                <label
                  title="JSON yedek dosyasını içe aktar"
                  className="flex items-center justify-center gap-1.5 min-h-[42px] lg:min-h-0 py-2 px-2 text-xs lg:text-[11px] font-medium text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>JSON Yükle</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file) {
                        onImportJSON(file);
                        onCloseMobile();
                      }
                    }}
                    className="hidden"
                  />
                </label>
              ) : (
                <button
                  onClick={onResetDemo}
                  title="Örnek verileri sıfırla"
                  className="flex items-center justify-center gap-1.5 min-h-[42px] lg:min-h-0 py-2 px-2 text-xs lg:text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sıfırla</span>
                </button>
              )}
            </div>

            {onImportJSON && (
              <button
                onClick={onResetDemo}
                title="Örnek verileri sıfırla veya veri yönetimine git"
                className="w-full flex items-center justify-center gap-1.5 min-h-[42px] lg:min-h-0 py-2 px-2 text-xs lg:text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sıfırla</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
