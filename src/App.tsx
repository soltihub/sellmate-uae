import React, { useState, useEffect } from 'react';
import { NavTab, BottomNav } from './components/BottomNav';
import { Header } from './components/Header';
import { HeroStats } from './components/HeroStats';
import { OrdersView } from './components/OrdersView';
import { ProfitCalcView } from './components/ProfitCalcView';
import { CustomerReplyView } from './components/CustomerReplyView';
import { TestRunnerModal } from './components/TestRunnerModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { inventoryManager } from './utils/inventoryManager';
import { Order, Product, InventoryMovement, BusinessProfile, OrderStatus, CreateOrderParams } from './types';
import { runAllSystemTests } from './utils/testSuite';
import { getAuthUser, supabase } from './utils/supabaseClient';

export default function App() {
  const [language, setLanguage] = useState<'en' | 'ar'>(() => {
    return (localStorage.getItem('sellmate_uae_lang') as 'en' | 'ar') || 'en';
  });

  const [currentTab, setCurrentTab] = useState<NavTab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [profile, setProfile] = useState<BusinessProfile>(inventoryManager.getProfile());
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals
  const [isTestRunnerOpen, setIsTestRunnerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedOrderForReply, setSelectedOrderForReply] = useState<Order | null>(null);
  const [testsPassed, setTestsPassed] = useState(true);
  const [testStats, setTestStats] = useState<{ total: number; passed: number }>({ total: 9, passed: 9 });

  // Sync RTL / LTR on language changes
  useEffect(() => {
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', language);
    localStorage.setItem('sellmate_uae_lang', language);
  }, [language]);

  // Refresh data from repository
  const refreshData = () => {
    setOrders(inventoryManager.getOrders());
    setProducts(inventoryManager.getProducts());
    setMovements(inventoryManager.getMovements());
    setProfile(inventoryManager.getProfile());
  };

  // Initial load & system self-test verification
  useEffect(() => {
    getAuthUser().then((user) => {
      setCurrentUser(user);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
      inventoryManager.init().then(() => {
        refreshData();
      });
    });

    inventoryManager.init().then(() => {
      refreshData();
    });

    runAllSystemTests()
      .then((results) => {
        const passedCount = results.filter((r) => r.passed).length;
        setTestStats({ total: results.length, passed: passedCount });
        setTestsPassed(passedCount === results.length);
      })
      .catch((e) => console.warn('Background test run notice:', e));

    return () => {
      authSub.subscription.unsubscribe();
    };
  }, []);

  // Handlers
  const handleSaveOrder = async (orderData: CreateOrderParams) => {
    await inventoryManager.createOrderAtomic(orderData);
    refreshData();
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    await inventoryManager.updateOrderStatusAtomic(orderId, newStatus);
    refreshData();
  };

  const handleDeleteOrder = async (orderId: string) => {
    await inventoryManager.deleteOrder(orderId);
    refreshData();
  };

  const handleClearAllOrders = async () => {
    await inventoryManager.clearAllOrders();
    refreshData();
  };

  const handleAdjustStock = async (productId: string, delta: number, reason: string) => {
    await inventoryManager.adjustStock(productId, delta, reason);
    refreshData();
  };

  const handleSelectOrderForReply = (order: Order) => {
    setSelectedOrderForReply(order);
    setCurrentTab('replies');
  };

  const handleSaveProfile = async (updates: Partial<BusinessProfile>) => {
    const updated = await inventoryManager.updateProfile(updates);
    setProfile(updated);
  };

  const handleResetDemoData = async () => {
    await inventoryManager.resetToDemoData();
    refreshData();
  };

  const handleExportData = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      profile,
      orders,
      products,
      movements,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sellmate-uae-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openOrdersCount = orders.filter(
    (o) => !['Delivered', 'Cancelled'].includes(o.status)
  ).length;

  return (
    <div className="max-w-[1180px] mx-auto p-3 sm:p-4 md:p-[18px] min-h-screen flex flex-col justify-between">
      <div>
        {/* Top Header */}
        <Header
          language={language}
          setLanguage={setLanguage}
          profile={profile}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenTests={() => setIsTestRunnerOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onExportData={handleExportData}
          testsPassed={testsPassed}
          testStats={testStats}
        />

        {/* Hero & 4 Stats Cards */}
        <HeroStats orders={orders} products={products} language={language} />

        {/* Navigation Tabs */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'tests') {
              setIsTestRunnerOpen(true);
            } else if (tab === 'cloud') {
              setIsSettingsOpen(true);
            } else {
              setCurrentTab(tab);
            }
          }}
          language={language}
          openOrdersCount={openOrdersCount}
          testStats={testStats}
        />

        {/* Tab Content Views */}
        <main className="mt-2">
          {currentTab === 'orders' && (
            <OrdersView
              orders={orders}
              products={products}
              movements={movements}
              language={language}
              onSaveOrder={handleSaveOrder}
              onUpdateStatus={handleUpdateStatus}
              onDeleteOrder={handleDeleteOrder}
              onClearAllOrders={handleClearAllOrders}
              onSelectOrderForReply={handleSelectOrderForReply}
              onAdjustStock={handleAdjustStock}
            />
          )}

          {currentTab === 'profit' && (
            <ProfitCalcView language={language} />
          )}

          {currentTab === 'replies' && (
            <CustomerReplyView
              orders={orders}
              selectedOrder={selectedOrderForReply}
              language={language}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-500 mt-6 border-t border-slate-200/60">
        SellMate UAE · Production Starter · Local browser storage & Supabase Cloud support · Server-side Gemini 3.8 Flash AI
      </footer>

      {/* Modals */}
      <TestRunnerModal
        isOpen={isTestRunnerOpen}
        onClose={() => setIsTestRunnerOpen(false)}
        language={language}
        onTestsCompleted={(passed, stats) => {
          setTestsPassed(passed);
          if (stats) setTestStats(stats);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
        profile={profile}
        onSaveProfile={handleSaveProfile}
        onResetDemoData={handleResetDemoData}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        language={language}
        currentUser={currentUser}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          inventoryManager.init().then(() => refreshData());
        }}
        onSignOut={() => {
          setCurrentUser(null);
          inventoryManager.init().then(() => refreshData());
        }}
      />
    </div>
  );
}
