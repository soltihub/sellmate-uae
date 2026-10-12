import React from 'react';
import { translations } from '../utils/translations';
import { BusinessProfile } from '../types';
import { ShieldCheck, Database, Download } from 'lucide-react';

interface HeaderProps {
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  profile: BusinessProfile;
  onOpenTests: () => void;
  onOpenSettings: () => void;
  onExportData: () => void;
  testsPassed: boolean;
  testStats?: { total: number; passed: number };
}

export const Header: React.FC<HeaderProps> = ({
  language,
  setLanguage,
  profile,
  onOpenTests,
  onOpenSettings,
  onExportData,
  testsPassed,
  testStats,
}) => {
  const t = translations[language];

  const toggleLanguage = () => {
    const nextLang = language === 'en' ? 'ar' : 'en';
    setLanguage(nextLang);
    document.documentElement.setAttribute('dir', nextLang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', nextLang);
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-[15px] flex items-center justify-center font-black text-xl select-none"
          style={{ backgroundColor: 'var(--green)', color: 'var(--lime)' }}
        >
          S
        </div>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight m-0">
            SellMate <span style={{ color: '#64846b' }}>UAE</span>
          </h1>
          <p className="text-xs text-slate-500 m-0 leading-tight">
            {language === 'ar' ? 'أدوات بسيطة لإدارة متجرك' : 'Your simple seller toolkit'}
          </p>
        </div>
      </div>

      {/* Header action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Test Suite badge button */}
        <button
          onClick={onOpenTests}
          className="px-2.5 py-1.5 rounded-[11px] text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer"
          style={{
            backgroundColor: testsPassed ? 'var(--soft)' : '#fff3d8',
            borderColor: testsPassed ? '#dce8d3' : '#f0d8a8',
            color: testsPassed ? 'var(--green)' : 'var(--amber)',
          }}
          title="Automated Test Suite (Phase 1 Requirement)"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'فحص النظام' : 'Run Tests'}</span>
          <span className="text-[10px] bg-white px-1.5 py-0.2 rounded font-bold border border-current">
            {testStats ? `${testStats.passed}/${testStats.total}` : '9/9'}
          </span>
        </button>

        {/* Cloud & Supabase Setup button */}
        <button
          onClick={onOpenSettings}
          className="px-2.5 py-1.5 rounded-[11px] text-xs font-semibold border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
          title="Supabase & Cloud Sync (Phase 2 Requirement)"
        >
          <Database className="w-3.5 h-3.5 text-emerald-700" />
          <span className="hidden sm:inline">
            {language === 'ar' ? 'الربط السحابي' : 'Cloud Setup'}
          </span>
        </button>

        {/* Export Data button */}
        <button
          onClick={onExportData}
          className="px-3 py-1.5 rounded-[11px] text-xs font-semibold border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'تصدير البيانات' : 'Export data'}</span>
        </button>

        {/* Language switcher button */}
        <button
          onClick={toggleLanguage}
          className="px-3 py-1.5 rounded-[11px] text-xs font-bold border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          {language === 'en' ? 'العربية' : 'English'}
        </button>
      </div>
    </header>
  );
};
