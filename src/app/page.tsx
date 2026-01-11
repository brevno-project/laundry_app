"use client";

import React from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import TimeBanner from '@/components/TimeBanner';
import StudentAuth from '@/components/StudentAuth';
import UserForm from '@/components/UserForm';
import QueueList from '@/components/QueueList';
import AdminPanel from '@/components/AdminPanel';
import TelegramSetup from '@/components/TelegramSetup';
import HistoryList from '@/components/HistoryList';
import StudentsList from '@/components/StudentsList';
import ClaimAccount from '@/components/ClaimAccount';
import GlobalAlert from '@/components/GlobalAlert';
import { HomeIcon, HistoryIcon, PeopleIcon, SettingsIcon, WashingIcon, DoorIcon, ListIcon, LaundryIcon } from '@/components/Icons';
import TelegramBanner from '@/components/TelegramBanner';
import StudentActions from '@/components/StudentActions';
import AvatarSelector from '@/components/AvatarSelector';
import PasswordChanger from '@/components/PasswordChanger';

export default function Home() {
  const { user, isLoading, logoutStudent, isAdmin, machineState, queue, isNewUser, setIsNewUser, students, needsClaim } = useLaundry();
  
  // ✅ Восстанавливаем activeTab из localStorage
  const [activeTab, setActiveTab] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeTab') || 'main';
    }
    return 'main';
  });
  
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  // ✅ Сохраняем activeTab в localStorage при изменении
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeTab', tab);
    }
  };

  // ✅ ТЫ FIX: Сбрасываем activeTab на 'main' когда нет пользователя
  React.useEffect(() => {
    if (!user && activeTab !== 'main') {
      setActiveTab('main');
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeTab', 'main');
      }
    }
  }, [user, activeTab]);



  // ✅ Отслеживание скролла для кнопки "Вверх" (только для пользователей в очереди)
  React.useEffect(() => {
    // Проверяем, есть ли пользователь в очереди
    const userInQueue = user && queue.some(item => item.student_id === user.student_id);
    
    if (!userInQueue) {
      setShowScrollButton(false);
      return;
    }

    const handleScroll = () => {
      // Показываем кнопку при скролле вниз более 300px
      if (window.scrollY > 300) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user, queue]);

  // ✅ Функция скролла вверх
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowScrollButton(false);
  };

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
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2"><LaundryIcon className="w-7 h-7" />Очередь на стирку</h1>
          {user && (
            <p className="text-sm text-blue-100 mt-1">
              Вы вошли как: <span className="font-semibold">{user.full_name}</span>
              {user.room && <span className="ml-2">• Комната {user.room}</span>}
            </p>
          )}
        </div>
      </header>

      {/* Табы */}
      {user && (
        <nav className="bg-white border-b shadow-sm sticky top-14 z-10">
          <div className="flex">
            <button
              onClick={() => handleTabChange('main')}
              className={`flex-1 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'main'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <HomeIcon className="w-5 h-5 inline-block mr-2" />Главная
            </button>
              <button
                onClick={() => handleTabChange('history')}
                className={`flex-1 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <HistoryIcon className="w-5 h-5 inline-block mr-2" />История
              </button>
            {/* Вкладка Студенты доступна админам и пользователям с флагом can_view_students */}
            {(isAdmin || (user && students.find(s => s.id === user.student_id)?.can_view_students)) && (
              <button
                onClick={() => handleTabChange('students')}
                className={`flex-1 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'students'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <PeopleIcon className="w-5 h-5 inline-block mr-2" />Студенты
              </button>
            )}
            <button
              onClick={() => handleTabChange('settings')}
              className={`flex-1 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <SettingsIcon className="w-5 h-5 inline-block mr-2" />Настройки
            </button>
          </div>
        </nav>
      )}

      {/* Полноэкранный баннер для подключения Telegram */}
      <TelegramBanner onGoToSettings={() => setActiveTab('settings')} />
      
      {/* Глобальный баннер для всех студентов в очереди */}
      <GlobalAlert />
      
      {/* Кнопки действий для студента */}
      <StudentActions />
      
      {/* Основной контент */}
      <div className="w-full">
        {activeTab === 'main' && (
          <div className="w-full space-y-4">
            <TimeBanner />
            
            {/* Статус машины */}
            <div className="mb-6 max-w-3xl mx-auto px-3">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Статус машины</h3>
              {machineState.status === 'idle' ? (
                <div className="relative overflow-hidden rounded-xl shadow-lg min-h-[120px]">
                  {/* Базовый фон */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600"></div>
                  
                  {/* Тонкая сетка (паттерн) */}
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, white 2px, white 3px)',
                      backgroundSize: '30px 30px',
                    }}
                  ></div>
                  
                  {/* Волна с блеском */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    style={{
                      animation: 'wave 6s ease-in-out infinite',
                      width: '200%',
                    }}
                  ></div>
                  <style jsx>{`
                    @keyframes wave {
                      0% { transform: translateX(-100%); }
                      100% { transform: translateX(50%); }
                    }
                  `}</style>
                  
                  <div className="relative p-6 flex flex-col items-center justify-center">
                    {/* Иконка стиральной машины */}
                    <svg className="w-16 h-16 text-white mb-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 2.01L6 2c-1.11 0-2 .89-2 2v16c0 1.11.89 2 2 2h12c1.11 0 2-.89 2-2V4c0-1.11-.89-1.99-2-1.99zM18 20H6v-9.02h12V20zm0-11H6V4h12v5zM8 5h1.5v1.5H8V5zm3.5 0H13v1.5h-1.5V5z"/>
                      <circle cx="12" cy="15" r="3.5"/>
                    </svg>
                    <div className="text-2xl font-bold text-white">Свободна</div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl shadow-lg min-h-[120px]">
                  {/* Базовый фон */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600"></div>
                  
                  {/* Тонкая сетка (паттерн) */}
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, white 2px, white 3px)',
                      backgroundSize: '30px 30px',
                    }}
                  ></div>
                  
                  {/* Волна с блеском */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    style={{
                      animation: 'wave 6s ease-in-out infinite',
                      width: '200%',
                    }}
                  ></div>
                  <style jsx>{`
                    @keyframes wave {
                      0% { transform: translateX(-100%); }
                      100% { transform: translateX(50%); }
                    }
                  `}</style>
                  
                  <div className="relative p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      {/* Иконка стиральной машины */}
                      <svg className="w-12 h-12 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 2.01L6 2c-1.11 0-2 .89-2 2v16c0 1.11.89 2 2 2h12c1.11 0 2-.89 2-2V4c0-1.11-.89-1.99-2-1.99zM18 20H6v-9.02h12V20zm0-11H6V4h12v5zM8 5h1.5v1.5H8V5zm3.5 0H13v1.5h-1.5V5z"/>
                        <circle cx="12" cy="15" r="3.5"/>
                      </svg>
                      <div className="text-2xl font-bold text-white">Занята</div>
                    </div>
                    
                    {/* Полупрозрачная карточка с информацией */}
                    {(machineState.current_queue_item_id || machineState.expected_finish_at) && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 space-y-3">
                        {machineState.current_queue_item_id && (() => {
                          const currentItem = queue.find(item => item.id === machineState.current_queue_item_id);
                          if (currentItem) {
                            return (
                              <div>
                                <div className="text-xs text-white/70 font-medium uppercase tracking-wider mb-1">Стирает</div>
                                <div className="text-2xl font-bold text-white">
                                  {currentItem.full_name}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {machineState.expected_finish_at && (
                          <div className="pt-3 border-t border-white/20">
                            <div className="text-xs text-white/70 font-medium uppercase tracking-wider mb-1">Окончание</div>
                            <div className="text-xl font-bold text-white">
                              {new Date(machineState.expected_finish_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Логика входа */}
            {!user ? (
              <>
                <StudentAuth />
              </>
            ) : (
              <>
                {/* Показываем ClaimAccount если нужно привязать аккаунт */}
                {needsClaim && <ClaimAccount />}
                
                {/* Всегда показываем основные компоненты */}
                {isAdmin && <AdminPanel />}
                
                {/* Показываем пользовательские компоненты если есть пользователь ИЛИ админ */}
                {(user || isAdmin) && (
                  <>
                    <div className="px-3"><UserForm /></div> {/* Админы тоже могут вставать в очередь */}
                    <QueueList />
                  </>
                )}
              </>
            )}
          </div>
        )}
        
        {/* История */}
        {activeTab === 'history' && (
          <div className="w-full space-y-4">
            <HistoryList />
          </div>
        )}

        {/* Студенты - доступно админам и пользователям с can_view_students */}
        {activeTab === 'students' && (isAdmin || (user && students.find(s => s.id === user.student_id)?.can_view_students)) && (
          <div className="w-full space-y-4">
            <StudentsList />
          </div>
        )}

        {/* Настройки */}
        {activeTab === 'settings' && user && (
          <div className="w-full space-y-4 px-3">
            <AvatarSelector />
            <PasswordChanger />
            {!user.can_view_students && <TelegramSetup />}
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg text-gray-800 mb-3">Аккаунт</h3>
              <button
                onClick={() => {
                  logoutStudent();
                  setActiveTab('main');
                  setIsNewUser(false);
                  localStorage.removeItem('needsTelegramSetup');
                }}
                className="w-full bg-red-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-red-600 shadow-sm flex items-center justify-center gap-2"
              >
                <DoorIcon className="w-5 h-5" />Выйти из аккаунта
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Кнопка "Вверх" */}
      {showScrollButton && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-50 animate-pulse-slow"
          aria-label="Прокрутить вверх"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
}
