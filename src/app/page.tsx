"use client";

import React from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import TimeBanner from '@/components/TimeBanner';
import StudentAuth from '@/components/StudentAuth';
import UserForm from '@/components/UserForm';
import MachineStatus from '@/components/MachineStatus';
import QueueList from '@/components/QueueList';
import AdminPanel from '@/components/AdminPanel';
import TelegramSetup from '@/components/TelegramSetup';
import HistoryList from '@/components/HistoryList';

export default function Home() {
  const { user, isLoading, logoutStudent } = useLaundry();
  const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [activeTab, setActiveTab] = React.useState('main'); // main, admin, history, notifications

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Заголовок */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 shadow-lg sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-white text-center">🧺 Очередь на стирку</h1>
      </header>

      {/* Боковое меню */}
      <nav className="bg-white border-b shadow-sm sticky top-14 z-10">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('main')}
            className={`flex-1 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'main'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            🏠 Главная
          </button>
          {user && (
            <>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex-1 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'admin'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                ⚙️ Админ
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                📜 История
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex-1 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'settings'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                ⚙️ Настройки
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Основной контент */}
      <div className="w-full p-3">
        {activeTab === 'main' && (
          <div className="space-y-4">
            <TimeBanner />
            
            {/* Форма входа/регистрации */}
            {!user ? (
              <StudentAuth />
            ) : (
              <UserForm />
            )}
            
            {/* Статус машинки */}
            <MachineStatus />
          </div>
        )}

        {activeTab === 'admin' && user && (
          <div className="space-y-4">
            {/* Очередь */}
            <QueueList />
            
            {/* Админ панель */}
            <AdminPanel />
          </div>
        )}

        {activeTab === 'history' && user && (
          <div className="space-y-4">
            <HistoryList />
          </div>
        )}

        {activeTab === 'settings' && user && (
          <div className="space-y-4">
            {/* Telegram */}
            <TelegramSetup />
            
            {/* Выход */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg text-gray-800 mb-3">Аккаунт</h3>
              <button
                onClick={logoutStudent}
                className="w-full bg-red-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-red-600 shadow-sm"
              >
                🚪 Выйти из аккаунта
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
