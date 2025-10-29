"use client";

import React from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import TimeBanner from '@/components/TimeBanner';
import StudentAuth from '@/components/StudentAuth';
import AdminLogin from '@/components/AdminLogin';
import UserForm from '@/components/UserForm';
import QueueList from '@/components/QueueList';
import AdminPanel from '@/components/AdminPanel';
import TelegramSetup from '@/components/TelegramSetup';
import HistoryList from '@/components/HistoryList';

export default function Home() {
  const { user, isLoading, logoutStudent, isAdmin, machineState, queue } = useLaundry();
  const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [activeTab, setActiveTab] = React.useState('main'); // main, settings

  console.log('🎰 Machine State for all users:', machineState);

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

      {/* Табы */}
      {user && (
        <nav className="bg-white border-b shadow-sm sticky top-14 z-10">
          <div className="flex">
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
            {isAdmin && (
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
            )}
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
          </div>
        </nav>
      )}

      {/* Основной контент */}
      <div className="w-full p-3">
        {activeTab === 'main' && (
          <div className="space-y-4">
            <TimeBanner />
            
            {/* Статус машины - виден всем */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
              <h3 className="text-lg font-bold mb-3 text-gray-800">📍 Статус машины</h3>
              {machineState.status === 'idle' ? (
                <div className="bg-green-50 border-2 border-green-500 rounded-lg p-3 text-center">
                  <div className="text-3xl mb-1">✅</div>
                  <div className="text-lg font-bold text-green-900">Машина свободна</div>
                </div>
              ) : (
                <div className="bg-red-50 border-2 border-red-500 rounded-lg p-3 text-center">
                  <div className="text-3xl mb-1">🔴</div>
                  <div className="text-lg font-bold text-red-900">Машина занята</div>
                  {machineState.currentQueueItemId && (() => {
                    const currentItem = queue.find(item => item.id === machineState.currentQueueItemId);
                    if (currentItem) {
                      return (
                        <div className="text-sm text-red-700 mt-1 font-bold">
                          🧑 Стирает: {currentItem.userName}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  {machineState.expectedFinishAt && (
                    <div className="text-sm text-red-700 mt-1">
                      Закончит: {new Date(machineState.expectedFinishAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Форма входа/регистрации */}
            {!user ? (
              <>
                <StudentAuth />
                <AdminLogin />
              </>
            ) : (
              <>
                {/* Форма для обычных пользователей */}
                {!isAdmin && <UserForm />}
              </>
            )}
            
            {/* Очередь (со встроенным статусом машины) - только для вошедших */}
            {user && <QueueList />}
            
            {/* Админ панель - только для админа */}
            {isAdmin && <AdminPanel />}
          </div>
        )}

        {activeTab === 'history' && isAdmin && (
          <div className="space-y-4">
            <HistoryList />
          </div>
        )}

        {activeTab === 'settings' && user && (
          <div className="space-y-4">
            {/* Telegram - только для обычных пользователей */}
            {!isAdmin && <TelegramSetup />}
            
            {/* Выход */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg text-gray-800 mb-3">Аккаунт</h3>
              <button
                onClick={() => {
                  logoutStudent();
                  setActiveTab('main'); // Сброс на главную
                }}
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
