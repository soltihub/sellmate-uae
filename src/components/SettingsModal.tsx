import React, { useState } from 'react';
import { translations } from '../utils/translations';
import { BusinessProfile, Emirate } from '../types';
import { ALL_EMIRATES } from '../utils/calculations';
import { inventoryManager } from '../utils/inventoryManager';
import {
  Settings,
  Database,
  Download,
  Copy,
  Check,
  RotateCcw,
  X,
  ExternalLink,
  ShieldCheck,
  Save,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'ar';
  profile: BusinessProfile;
  onSaveProfile: (profile: Partial<BusinessProfile>) => void;
  onResetDemoData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  profile,
  onSaveProfile,
  onResetDemoData,
}) => {
  const t = translations[language];

  const [businessName, setBusinessName] = useState(profile.business_name);
  const [businessPhone, setBusinessPhone] = useState(profile.business_phone);
  const [trnNumber, setTrnNumber] = useState(profile.trn_number || '');
  const [defaultEmirate, setDefaultEmirate] = useState<Emirate>(profile.default_emirate);
  const [vatRegistered, setVatRegistered] = useState(profile.vat_registered);

  // Cloud Config State
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('sellmate_supabase_url') || ''
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem('sellmate_supabase_key') || ''
  );

  // SQL Export Modal / Viewer
  const [sqlExportText, setSqlExportText] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (sqlExportText) {
          setSqlExportText(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, sqlExportText]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      business_name: businessName.trim(),
      business_phone: businessPhone.trim(),
      trn_number: trnNumber.trim(),
      default_emirate: defaultEmirate,
      vat_registered: vatRegistered,
    });

    localStorage.setItem('sellmate_supabase_url', supabaseUrl.trim());
    localStorage.setItem('sellmate_supabase_key', supabaseKey.trim());

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportSql = () => {
    const sql = inventoryManager.exportSupabaseDataSql();
    setSqlExportText(sql);
  };

  const handleCopySql = () => {
    if (!sqlExportText) return;
    navigator.clipboard.writeText(sqlExportText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleExportJson = () => {
    const data = {
      profile,
      products: inventoryManager.getProducts(),
      orders: inventoryManager.getOrders(),
      movements: inventoryManager.getMovements(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sellmate_uae_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-800">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 id="settings-modal-title" className="font-bold text-slate-900 text-sm sm:text-base">
                {t.settingsTitle}
              </h3>
              <p className="text-[11px] text-slate-500">
                {language === 'ar' ? 'بيانات المتجر والربط مع Supabase' : 'Store profile & Supabase Cloud integration'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label={t.close}
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-5 space-y-5 text-xs">
          {saveSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold">Settings saved successfully!</span>
            </div>
          )}

          {/* Business Profile Section */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span>{t.businessInfo}</span>
            </h4>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                {t.storeName}
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  {t.phone} (WhatsApp Contact)
                </label>
                <input
                  type="text"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  {t.defaultEmirateLabel}
                </label>
                <select
                  value={defaultEmirate}
                  onChange={(e) => setDefaultEmirate(e.target.value as Emirate)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 cursor-pointer"
                >
                  {ALL_EMIRATES.map((em) => (
                    <option key={em} value={em}>
                      {em}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                {t.trnLabel}
              </label>
              <input
                type="text"
                placeholder="100482937200003"
                value={trnNumber}
                onChange={(e) => setTrnNumber(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-slate-800">
                {t.vatRegisteredToggle}
              </span>
              <button
                type="button"
                onClick={() => setVatRegistered(!vatRegistered)}
                className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 ${
                  vatRegistered ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                    vatRegistered ? 'translate-x-4.5 rtl:-translate-x-4.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Phase 2: Supabase PostgreSQL Cloud Section */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>{t.supabaseSection}</span>
              </h4>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                AED 0 Free Tier
              </span>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              {t.supabaseDesc}
            </p>

            <div className="space-y-2">
              <div>
                <label className="block text-slate-700 font-medium mb-1 text-[11px]">
                  {t.supabaseUrl}
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1 text-[11px]">
                  {t.supabaseKey}
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-[11px]"
                />
              </div>
            </div>

            {/* Migration Plan Tools */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleExportSql}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.exportSqlButton}</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.exportJsonButton}</span>
              </button>
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-800 block">
                {language === 'ar' ? 'إعادة ضبط بيانات العرض' : 'Reset Demo Prototype'}
              </span>
              <span className="text-[11px] text-slate-500">
                {language === 'ar' ? 'إعادة المنتجات والطلبات النموذجية' : 'Restores initial UAE demo products & orders'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset prototype data to initial demo state?')) {
                  onResetDemoData();
                  onClose();
                }
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-100"
            >
              {t.close}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{t.saveChanges}</span>
            </button>
          </div>
        </form>

        {/* SQL Viewer Modal */}
        {sqlExportText && (
          <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-5 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {t.sqlExportModalTitle}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Run this SQL script in your Supabase SQL Editor to migrate all local products & orders.
                  </p>
                </div>
                <button
                  onClick={() => setSqlExportText(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <textarea
                readOnly
                rows={12}
                value={sqlExportText}
                className="w-full bg-slate-900 text-emerald-400 font-mono text-[11px] p-3 rounded-xl focus:outline-none"
              />

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-slate-500">
                  Schema location: <code className="font-mono">supabase/migrations/</code>
                </span>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSqlExportText(null)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold"
                  >
                    {t.close}
                  </button>
                  <button
                    onClick={handleCopySql}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? t.copiedNotice : t.copySql}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
