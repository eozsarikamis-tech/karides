import React from 'react';
import {
  Menu,
  Plus,
  Droplets,
  Receipt,
  LayoutDashboard,
  Cloud,
  ArrowLeftRight,
  Boxes,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface TopBarProps {
  currentTab: string;
  onOpenMobileMenu: () => void;
  onOpenQuickAdd: () => void;
  currentUser?: User | null;
  onSelectTab?: (tab: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onOpenMobileMenu,
  onOpenQuickAdd,
  currentUser,
  onSelectTab,
}) => {
  const getTabDetails = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return {
          title: 'Genel Bakış & Üretimhane Paneli',
          mobileTitle: 'Genel Bakış',
          subtitle: 'Finansal durum, amortisman oranı, aktif damızlıklar ve akvaryum sağlığı',
          icon: LayoutDashboard,
        };
      case 'inventory':
        return {
          title: 'Üretimhane Envanter & Stok Yönetimi',
          mobileTitle: 'Envanter & Stok',
          subtitle: 'Mevcut canlı, demirbaş ve sarf stokları ile tükenen malzemelerin anlık takibi',
          icon: Boxes,
        };
      case 'transactions':
      case 'batches':
      case 'sales':
      case 'packages':
        return {
          title: 'Alımlar & Satışlar Yönetim Merkezi',
          mobileTitle: 'Alımlar & Satışlar',
          subtitle: 'Canlı alım partileri ve adet bazlı hobici satışlarının tek merkezden takibi',
          icon: ArrowLeftRight,
        };
      case 'tanks':
        return {
          title: 'Akvaryumlar & Su Parametreleri',
          mobileTitle: 'Akvaryumlar',
          subtitle: 'Caridina (RO/TDS), Neocaridina ve Apistogramma tank değerleri ve su değişimleri',
          icon: Droplets,
        };
      case 'expenses':
        return {
          title: 'İşletme Giderleri & Demirbaş Bütçesi',
          mobileTitle: 'Giderler',
          subtitle: 'Demirbaşlar (hava motoru, LED), RO mineralleri ve strafor kargo kutuları',
          icon: Receipt,
        };
      case 'drive':
        return {
          title: 'Google Drive Bulut Yedekleme & Dosya Yönetimi',
          mobileTitle: 'Bulut & Yedekleme',
          subtitle: 'Canlı stokları, akvaryum parametreleri ve finansal bilançoyu Drive\'da güvenle saklayın',
          icon: Cloud,
        };
      default:
        return {
          title: 'AquaBreeder Pro',
          mobileTitle: 'AquaBreeder Pro',
          subtitle: 'Mini Canlı Üretimhane Sistemi',
          icon: LayoutDashboard,
        };
    }
  };

  const details = getTabDetails(currentTab);
  const Icon = details.icon;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 h-14 sm:h-16 flex items-center px-3 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between w-full gap-2 sm:gap-4 min-w-0">
        {/* Left: Mobile Menu Button & Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="min-w-[44px] min-h-[44px] -ml-1.5 flex items-center justify-center text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 lg:hidden cursor-pointer shrink-0"
            aria-label="Menüyü Aç"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-emerald-600 hidden sm:block shrink-0" />
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate sm:hidden">
                {details.mobileTitle}
              </h1>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate hidden sm:block">
                {details.title}
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 truncate hidden md:block">
              {details.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Google Drive indicator & Quick Action Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onSelectTab && (
            <button
              onClick={() => onSelectTab('drive')}
              className={`inline-flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px] sm:min-h-0 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                currentUser
                  ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={currentUser ? `Google Drive Bağlı: ${currentUser.email}` : 'Google Drive\'a Bağlan'}
              aria-label="Bulut ve Yedekleme"
            >
              <Cloud className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${currentUser ? 'text-blue-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">
                {currentUser ? 'Drive Bulut' : 'Drive Bağla'}
              </span>
            </button>
          )}

          <button
            onClick={onOpenQuickAdd}
            className="inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-0 px-3 sm:px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Ekle</span>
            <span className="hidden sm:inline">Yeni İşlem Ekle</span>
          </button>
        </div>
      </div>
    </header>
  );
};
