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
  const { user, isLoading, logoutStudent, isAdmin, machineState, queue, isNewUser, setIsNewUser } = useLaundry();
  const [activeTab, setActiveTab] = React.useState('main');
  const [showTelegramModal, setShowTelegramModal] = React.useState(false);

  // ✅ Проверка: нужно ли показать модалку Telegram
  React.useEffect(() => {
    console.log('🔍 Checking telegram setup:', { 
      user: !!user, 
      userName: user?.name,
      isAdmin, 
      telegram_chat_id: user?.telegram_chat_id,
      isNewUser
    });
    
    if (user && !isAdmin && isNewUser && !user.telegram_chat_id) {
      console.log('✅ Showing Telegram modal for new user!');
      setShowTelegramModal(true);
    }
  }, [user, isAdmin, isNewUser]);

  // ✅ Функция закрытия модалки (переход в настройки)
  const handleTelegramSetup = () => {
    console.log('📱 Redirecting to settings...');
    setShowTelegramModal(false);
    setActiveTab('settings');
  };

  console.log('🎰 Machine State:', machineState);
  console.log('🚨 showTelegramModal:', showTelegramModal);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* ✅ МОДАЛЬНОЕ ОКНО - Подключите Telegram */}
      {showTelegramModal && user && !user.telegram_chat_id && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-2xl max-w-lg w-full p-8 border-4 border-yellow-400 animate-pulse">
            <div className="text-center mb-6">
              <div className="text-8xl mb-4 animate-bounce">📱</div>
              <h2 className="text-3xl font-black text-gray-900 mb-3">
                Подключите уведомления!
              </h2>
              <p className="text-lg text-gray-700 font-semibold">
                Чтобы получать уведомления когда вас позовут, нужно подключить Telegram
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleTelegramSetup}
                className="w-full bg-green-600 text-white font-black py-4 px-6 rounded-xl hover:bg-green-700 transition-all shadow-lg text-xl"
              >
                ✅ Подключить сейчас
              </button>
              
              <button
                onClick={() => {
                  console.log('⏭️ Skipping telegram setup...');
                  setShowTelegramModal(false);
                  setIsNewUser(false);
                  localStorage.setItem('needsTelegramSetup', 'false');
                }}
                className="w-full bg-gray-400 text-white font-bold py-3 px-6 rounded-xl hover:bg-gray-500 transition-all"
              >
                Пропустить (не рекомендуется)
              </button>
            </div>

            <p className="text-sm text-gray-600 mt-4 text-center">
              💡 Вы всегда можете подключить позже в настройках
            </p>
          </div>
        </div>
      )}

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
          </div>
        </nav>
      )}

      {/* Основной контент */}
      <div className="w-full p-3">
        {activeTab === 'main' && (
          <div className="space-y-4">
            <TimeBanner />
            
            {/* Статус машины */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
              <h3 className="text-lg font-bold mb-3 text-gray-800">Статус машины</h3>
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
            
            {/* Логика входа */}
            {!user && !isAdmin ? (
              <>
                <StudentAuth />
                <AdminLogin />
              </>
            ) : (
              <>
                {/* Всегда показываем основные компоненты */}
                {isAdmin && <AdminPanel />}
                
                {/* Показываем пользовательские компоненты если есть пользователь ИЛИ админ */}
                {(user || isAdmin) && (
        <>
        {!isAdmin && <UserForm />} {/* UserForm только для обычных пользователей */}
        <QueueList />
      </>
    )}
  </>
)}
          </div>
        )}
        
        {/* История */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <HistoryList />
          </div>
        )}

        {/* Настройки */}
        {activeTab === 'settings' && user && (
          <div className="space-y-4">
            {!isAdmin && <TelegramSetup />}
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg text-gray-800 mb-3">Аккаунт</h3>
              <button
                onClick={() => {
                  logoutStudent();
                  setActiveTab('main');
                  setIsNewUser(false);
                  localStorage.removeItem('needsTelegramSetup');
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