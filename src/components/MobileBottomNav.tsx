import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  Droplets,
  Receipt,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Genel', icon: LayoutDashboard },
    { id: 'inventory', label: 'Envanter', icon: Boxes },
    { id: 'transactions', label: 'İşlemler', icon: ArrowLeftRight },
    { id: 'tanks', label: 'Tanklar', icon: Droplets },
    { id: 'expenses', label: 'Giderler', icon: Receipt },
  ];

  const isTransactionsActive =
    currentTab === 'transactions' ||
    currentTab === 'batches' ||
    currentTab === 'sales' ||
    currentTab === 'packages';

  return (
    <nav
      aria-label="Mobil Alt Menü"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-4px_16px_rgba(15,23,42,0.05)]"
    >
      <div className="grid grid-cols-5 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.id === 'transactions' ? isTransactionsActive : currentTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center min-h-[56px] py-1.5 px-1 transition-colors cursor-pointer select-none ${
                isActive ? 'text-emerald-600' : 'text-slate-500 active:text-slate-900'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-emerald-600"
                />
              )}
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-600' : ''}`} />
              <span className="text-[11px] font-semibold mt-1 leading-none truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
