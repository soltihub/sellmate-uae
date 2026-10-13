import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { User, LogIn, UserPlus, ShieldAlert, CheckCircle2, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'ar';
  currentUser: any;
  onAuthSuccess: (user: any) => void;
  onSignOut: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  language,
  currentUser,
  onAuthSuccess,
  onSignOut,
}) => {
  const isAr = language === 'ar';
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('My UAE Store');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setErrorMsg(isAr ? 'لم يتم ضبط إعدادات Supabase' : 'Supabase is not configured');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              business_name: businessName.trim(),
            },
          },
        });

        if (error) {
          console.error('[Supabase Auth Sign Up Failed]', {
            status: error.status,
            name: error.name,
            message: error.message,
          });
          setErrorMsg(error.message);
        } else if (data.user) {
          if (data.session) {
            setSuccessMsg(isAr ? 'تم إنشاء الحساب وتسجيل الدخول بنجاح!' : 'Account created and signed in successfully!');
            onAuthSuccess(data.user);
            setTimeout(() => onClose(), 1200);
          } else {
            setSuccessMsg(
              isAr
                ? 'تم إنشاء الحساب بنجاح. يرجى تأكيد بريدك الإلكتروني.'
                : 'Account created! Please check your email to confirm your account.'
            );
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          console.error('[Supabase Auth Sign In Failed]', {
            status: error.status,
            name: error.name,
            message: error.message,
          });
          setErrorMsg(error.message);
        } else if (data.user) {
          setSuccessMsg(isAr ? 'تم تسجيل الدخول بنجاح!' : 'Signed in successfully!');
          onAuthSuccess(data.user);
          setTimeout(() => onClose(), 1000);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutClick = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      onSignOut();
      setSuccessMsg(isAr ? 'تم تسجيل الخروج بنجاح.' : 'Signed out successfully.');
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                {currentUser
                  ? (isAr ? 'حساب التاجر في Supabase' : 'Supabase Merchant Account')
                  : mode === 'signin'
                  ? (isAr ? 'تسجيل دخول التاجر' : 'Merchant Sign In')
                  : (isAr ? 'إنشاء حساب تاجر جديد' : 'New Merchant Account')}
              </h3>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'إدارة المصادقة السحابية وربط الهوية' : 'Cloud authentication & business tenancy'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'المصادقة نشطة ومقترنة' : 'Authenticated & Connected'}</span>
                </div>
                <div className="text-[11px] text-emerald-800 break-all">
                  <span className="font-semibold">{isAr ? 'البريد: ' : 'Email: '}</span>
                  {currentUser.email}
                </div>
                <div className="text-[10px] text-emerald-700 font-mono break-all">
                  <span className="font-semibold">auth.uid() / business_id: </span>
                  {currentUser.id}
                </div>
              </div>

              <p className="text-slate-600 text-[11px] leading-relaxed">
                {isAr
                  ? 'يتم حفظ جميع الطلبات والمنتجات وحركات المخزون مباشرة في Supabase تحت معرفك الخاص.'
                  : 'All orders, catalog products, and inventory ledger records are saved directly to your authenticated Supabase tenant.'}
              </p>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSignOutClick}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  {loading ? '...' : (isAr ? 'تسجيل الخروج' : 'Sign Out')}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">{isAr ? 'فشلت المصادقة' : 'Authentication Error'}</div>
                    <div className="text-[11px] leading-tight mt-0.5">{errorMsg}</div>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-[11px]">{successMsg}</span>
                </div>
              )}

              {mode === 'signup' && (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    {isAr ? 'اسم المتجر أو النشاط التجاري' : 'Store / Business Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Dubai Luxury Boutique"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isAr ? 'البريد الإلكتروني للتاجر' : 'Merchant Email'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="merchant@yourstore.ae"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 font-mono text-[11px]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  {mode === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>
                    {loading
                      ? (isAr ? 'جاري المعالجة...' : 'Processing...')
                      : mode === 'signin'
                      ? (isAr ? 'تسجيل الدخول إلى Supabase' : 'Sign In to Supabase')
                      : (isAr ? 'إنشاء حساب جديد' : 'Create Merchant Account')}
                  </span>
                </button>
              </div>

              <div className="text-center pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs cursor-pointer"
                >
                  {mode === 'signin'
                    ? (isAr ? 'ليس لديك حساب؟ أنشئ حساب جديد' : "Don't have an account? Create one")
                    : (isAr ? 'لديك حساب بالفعل؟ تسجيل الدخول' : 'Already have an account? Sign In')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
