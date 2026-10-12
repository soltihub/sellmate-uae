import React from 'react';
import { translations } from '../utils/translations';
import { Package, Calculator, Sparkles, ShieldCheck, Database } from 'lucide-react';

export type NavTab = 'orders' | 'profit' | 'replies' | 'tests' | 'cloud';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  language: 'en' | 'ar';
  openOrdersCount?: number;
  testStats?: { total: number; passed: number };
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  language,
  openOrdersCount = 0,
  testStats,
}) => {
  const tabs = [
    {
      id: 'orders' as NavTab,
      labelEn: 'Orders & stock',
      labelAr: 'الطلبات والمخزون',
      icon: Package,
      badge: openOrdersCount,
    },
    {
      id: 'profit' as NavTab,
      labelEn: 'Profit calculator',
      labelAr: 'حاسبة الأرباح',
      icon: Calculator,
    },
    {
      id: 'replies' as NavTab,
      labelEn: 'AI reply writer',
      labelAr: 'كاتب ردود العملاء',
      icon: Sparkles,
    },
    {
      id: 'tests' as NavTab,
      labelEn: 'System Tests',
      labelAr: 'فحص النظام',
      icon: ShieldCheck,
      badgeText: testStats ? `${testStats.passed}/${testStats.total}` : '9/9',
    },
    {
      id: 'cloud' as NavTab,
      labelEn: 'Cloud & Supabase',
      labelAr: 'الربط السحابي',
      icon: Database,
    },
  ];

  return (
    <nav
      role="tablist"
      aria-label={language === 'ar' ? 'تبويبات التنقل الرئيسية' : 'Main navigation tabs'}
      className="flex items-center gap-2 overflow-x-auto pb-3 mb-2 no-scrollbar"
    >
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`whitespace-nowrap rounded-[11px] px-3.5 py-2.5 text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-800 ${
              isActive
                ? 'text-white border-transparent shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            style={{
              backgroundColor: isActive ? 'var(--green)' : '#fff',
              borderColor: isActive ? 'var(--green)' : 'var(--line)',
              color: isActive ? '#fff' : '#58645c',
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? tab.labelAr : tab.labelEn}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className="px-1.5 py-0.2 text-[10px] rounded-full font-bold"
                style={{
                  backgroundColor: isActive ? 'var(--lime)' : 'var(--soft)',
                  color: 'var(--green)',
                }}
              >
                {tab.badge}
              </span>
            )}
            {tab.badgeText && (
              <span
                className="px-1.5 py-0.2 text-[10px] rounded font-mono font-bold"
                style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--soft)',
                  color: isActive ? '#fff' : 'var(--green)',
                }}
              >
                {tab.badgeText}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
