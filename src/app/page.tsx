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
import CleanupResults from '@/components/CleanupResults';
import ClaimAccount from '@/components/ClaimAccount';
import GlobalAlert from '@/components/GlobalAlert';
import { HomeIcon, HistoryIcon, PeopleIcon, SettingsIcon, DoorIcon, ListIcon, LaundryIcon } from '@/components/Icons';
import TelegramBanner from '@/components/TelegramBanner';
import StudentActions from '@/components/StudentActions';
import PasswordChanger from '@/components/PasswordChanger';
import AvatarCustomizer from '@/components/AvatarCustomizer';

export default function Home() {
  const { user, isLoading, authReady, logoutStudent, isAdmin, isSuperAdmin, isCleanupAdmin, machineState, queue, isNewUser, setIsNewUser, students, needsClaim } = useLaundry();
  const canViewStudentsTab = isAdmin || isSuperAdmin || isCleanupAdmin || !!user?.can_view_students;
  
  // вњ… Р’РѕСЃСЃС‚Р°РЅР°РІР»РёРІР°РµРј activeTab РёР· localStorage
  const [activeTab, setActiveTab] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeTab') || 'main';
    }
    return 'main';
  });
  
  const [showScrollButton, setShowScrollButton] = React.useState(false);

  // вњ… РЎРѕС…СЂР°РЅСЏРµРј activeTab РІ localStorage РїСЂРё РёР·РјРµРЅРµРЅРёРё
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeTab', tab);
    }
  };

  // вњ… РўР« FIX: РЎР±СЂР°СЃС‹РІР°РµРј activeTab РЅР° 'main' РєРѕРіРґР° РЅРµС‚ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ
  React.useEffect(() => {
    if (!authReady) return;
    if (!user && activeTab !== 'main') {
      setActiveTab('main');
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeTab', 'main');
      }
    }
  }, [user, authReady, activeTab]);

  React.useEffect(() => {
    if (!authReady) return;
    if (activeTab === 'students' && !canViewStudentsTab) {
      handleTabChange('main');
      return;
    }
    if (activeTab === 'settings' && !user) {
      handleTabChange('main');
    }
  }, [activeTab, canViewStudentsTab, user, authReady]);



  // вњ… РћС‚СЃР»РµР¶РёРІР°РЅРёРµ СЃРєСЂРѕР»Р»Р° РґР»СЏ РєРЅРѕРїРєРё "Р’РІРµСЂС…" (С‚РѕР»СЊРєРѕ РґР»СЏ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РІ РѕС‡РµСЂРµРґРё)
  React.useEffect(() => {
    // РџСЂРѕРІРµСЂСЏРµРј, РµСЃС‚СЊ Р»Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РІ РѕС‡РµСЂРµРґРё
    const userInQueue = user && queue.some(item => item.student_id === user.student_id);
    
    if (!userInQueue) {
      setShowScrollButton(false);
      return;
    }

    const handleScroll = () => {
      // РџРѕРєР°Р·С‹РІР°РµРј РєРЅРѕРїРєСѓ РїСЂРё СЃРєСЂРѕР»Р»Рµ РІРЅРёР· Р±РѕР»РµРµ 300px
      if (window.scrollY > 300) {
        setShowScrollButton(true);
      } else {
        setShowScrollButton(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [user, queue]);

  // вњ… Р¤СѓРЅРєС†РёСЏ СЃРєСЂРѕР»Р»Р° РІРІРµСЂС…
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowScrollButton(false);
  };

  if (isLoading || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">


      {/* Р—Р°РіРѕР»РѕРІРѕРє */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 shadow-lg sticky top-0 z-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2"><LaundryIcon className="w-7 h-7" /> РћС‡РµСЂРµРґСЊ РЅР° СЃС‚РёСЂРєСѓ</h1>
          {user && (
            <p className="text-sm text-blue-100 mt-1">
              Р’С‹ РІРѕС€Р»Рё РєР°Рє: <span className="font-semibold">{user.full_name}</span>
              {user.room && <span className="ml-2">РљРѕРјРЅР°С‚Р° {user.room}</span>}
            </p>
          )}
        </div>
      </header>

      {/* РўР°Р±С‹ */}
      {user && (
        <nav className="bg-white border-b shadow-sm sticky top-14 z-10">
          <div className="mx-auto max-w-5xl">
            <div className="flex gap-1 overflow-x-auto px-2 md:justify-center md:gap-3 md:overflow-visible md:px-4">
            <button
              onClick={() => handleTabChange('main')}
              className={`flex-none shrink-0 min-w-[96px] py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'main'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <HomeIcon className="w-5 h-5 inline-block mr-2" />Р“Р»Р°РІРЅР°СЏ</button>
            <button
              onClick={() => handleTabChange('history')}
              className={`flex-none shrink-0 min-w-[96px] py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <HistoryIcon className="w-5 h-5 inline-block mr-2" />РСЃС‚РѕСЂРёСЏ</button>
            <button
              onClick={() => handleTabChange('cleanup')}
              className={`flex-none shrink-0 min-w-[96px] py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'cleanup'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListIcon className="w-5 h-5 inline-block mr-2" />РЈР±РѕСЂРєР°</button>
            {/* Р’РєР»Р°РґРєР° РЎС‚СѓРґРµРЅС‚С‹ РґРѕСЃС‚СѓРїРЅР° Р°РґРјРёРЅР°Рј Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРј СЃ С„Р»Р°РіРѕРј can_view_students */}
            {canViewStudentsTab && (
              <button
                onClick={() => handleTabChange('students')}
                className={`flex-none shrink-0 min-w-[96px] py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'students'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <PeopleIcon className="w-5 h-5 inline-block mr-2" />РЎС‚СѓРґРµРЅС‚С‹</button>
            )}
            <button
              onClick={() => handleTabChange('settings')}
              className={`flex-none shrink-0 min-w-[96px] py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <SettingsIcon className="w-5 h-5 inline-block mr-2" />РќР°СЃС‚СЂРѕР№РєРё</button>
          </div>
          </div>
        </nav>
      )}

      {/* РџРѕР»РЅРѕСЌРєСЂР°РЅРЅС‹Р№ Р±Р°РЅРЅРµСЂ РґР»СЏ РїРѕРґРєР»СЋС‡РµРЅРёСЏ Telegram */}
      <TelegramBanner onGoToSettings={() => handleTabChange('settings')} />
      
      {/* Р“Р»РѕР±Р°Р»СЊРЅС‹Р№ Р±Р°РЅРЅРµСЂ РґР»СЏ РІСЃРµС… СЃС‚СѓРґРµРЅС‚РѕРІ РІ РѕС‡РµСЂРµРґРё */}
      <GlobalAlert />
      
      {/* РљРЅРѕРїРєРё РґРµР№СЃС‚РІРёР№ РґР»СЏ СЃС‚СѓРґРµРЅС‚Р° */}
      <StudentActions />
      
      {/* РћСЃРЅРѕРІРЅРѕР№ РєРѕРЅС‚РµРЅС‚ */}
      <div className="w-full">
        {activeTab === 'main' && (
          <div className="w-full space-y-4">
            <TimeBanner />
            
            {/* РЎС‚Р°С‚СѓСЃ РјР°С€РёРЅС‹ */}
            <div className="mb-6 max-w-3xl mx-auto px-3">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">РЎС‚Р°С‚СѓСЃ РјР°С€РёРЅС‹</h3>
              {machineState.status === 'idle' ? (
                <div className="relative overflow-hidden rounded-xl shadow-lg min-h-[120px]">
                  {/* Р‘Р°Р·РѕРІС‹Р№ С„РѕРЅ */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600"></div>
                  
                  {/* РўРѕРЅРєР°СЏ СЃРµС‚РєР° (РїР°С‚С‚РµСЂРЅ) */}
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, white 2px, white 3px)',
                      backgroundSize: '30px 30px',
                    }}
                  ></div>
                  
                  {/* Р’РѕР»РЅР° СЃ Р±Р»РµСЃРєРѕРј */}
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
                    {/* РРєРѕРЅРєР° СЃС‚РёСЂР°Р»СЊРЅРѕР№ РјР°С€РёРЅС‹ */}
                    <svg className="w-16 h-16 text-white mb-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18 2.01L6 2c-1.11 0-2 .89-2 2v16c0 1.11.89 2 2 2h12c1.11 0 2-.89 2-2V4c0-1.11-.89-1.99-2-1.99zM18 20H6v-9.02h12V20zm0-11H6V4h12v5zM8 5h1.5v1.5H8V5zm3.5 0H13v1.5h-1.5V5z"/>
                      <circle cx="12" cy="15" r="3.5"/>
                    </svg>
                    <div className="text-2xl font-bold text-white">РЎРІРѕР±РѕРґРЅР°</div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl shadow-lg min-h-[120px]">
                  {/* Р‘Р°Р·РѕРІС‹Р№ С„РѕРЅ */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600"></div>
                  
                  {/* РўРѕРЅРєР°СЏ СЃРµС‚РєР° (РїР°С‚С‚РµСЂРЅ) */}
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, white 2px, white 3px)',
                      backgroundSize: '30px 30px',
                    }}
                  ></div>
                  
                  {/* Р’РѕР»РЅР° СЃ Р±Р»РµСЃРєРѕРј */}
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
                      {/* РРєРѕРЅРєР° СЃС‚РёСЂР°Р»СЊРЅРѕР№ РјР°С€РёРЅС‹ */}
                      <svg className="w-12 h-12 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 2.01L6 2c-1.11 0-2 .89-2 2v16c0 1.11.89 2 2 2h12c1.11 0 2-.89 2-2V4c0-1.11-.89-1.99-2-1.99zM18 20H6v-9.02h12V20zm0-11H6V4h12v5zM8 5h1.5v1.5H8V5zm3.5 0H13v1.5h-1.5V5z"/>
                        <circle cx="12" cy="15" r="3.5"/>
                      </svg>
                      <div className="text-2xl font-bold text-white">Р—Р°РЅСЏС‚Р°</div>
                    </div>
                    
                    {/* РџРѕР»СѓРїСЂРѕР·СЂР°С‡РЅР°СЏ РєР°СЂС‚РѕС‡РєР° СЃ РёРЅС„РѕСЂРјР°С†РёРµР№ */}
                    {(machineState.current_queue_item_id || machineState.expected_finish_at) && (
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 space-y-3">
                        {machineState.current_queue_item_id && (() => {
                          const currentItem = queue.find(item => item.id === machineState.current_queue_item_id);
                          if (currentItem) {
                            return (
                              <div>
                                <div className="text-xs text-white/70 font-medium uppercase tracking-wider mb-1">РЎС‚РёСЂР°РµС‚</div>
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
                            <div className="text-xs text-white/70 font-medium uppercase tracking-wider mb-1">РћРєРѕРЅС‡Р°РЅРёРµ</div>
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
            
            {/* Р›РѕРіРёРєР° РІС…РѕРґР° */}
            {!user ? (
              <>
                <StudentAuth />
              </>
            ) : (
              <>
                {/* РџРѕРєР°Р·С‹РІР°РµРј ClaimAccount РµСЃР»Рё РЅСѓР¶РЅРѕ РїСЂРёРІСЏР·Р°С‚СЊ Р°РєРєР°СѓРЅС‚ */}
                {needsClaim && <ClaimAccount />}
                
                {/* Р’СЃРµРіРґР° РїРѕРєР°Р·С‹РІР°РµРј РѕСЃРЅРѕРІРЅС‹Рµ РєРѕРјРїРѕРЅРµРЅС‚С‹ */}
                {isAdmin && <AdminPanel />}
                
                {/* РџРѕРєР°Р·С‹РІР°РµРј РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёРµ РєРѕРјРїРѕРЅРµРЅС‚С‹ РµСЃР»Рё РµСЃС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РР›Р Р°РґРјРёРЅ */}
                {(user || isAdmin) && (
                  <>
                    <div className="px-3"><UserForm /></div> {/* РђРґРјРёРЅС‹ С‚РѕР¶Рµ РјРѕРіСѓС‚ РІСЃС‚Р°РІР°С‚СЊ РІ РѕС‡РµСЂРµРґСЊ */}
                    <QueueList />
                  </>
                )}
              </>
            )}
          </div>
        )}
        
        {/* РСЃС‚РѕСЂРёСЏ */}
        {activeTab === 'history' && (
          <div className="w-full space-y-4">
            <HistoryList />
          </div>
        )}

        {/* РЈР±РѕСЂРєР° */}
        {activeTab === 'cleanup' && (
          <div className="w-full space-y-4">
            <CleanupResults embedded />
          </div>
        )}

        {/* РЎС‚СѓРґРµРЅС‚С‹ - РґРѕСЃС‚СѓРїРЅРѕ Р°РґРјРёРЅР°Рј Рё РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРј СЃ can_view_students */}
        {activeTab === 'students' && canViewStudentsTab && (
          <div className="w-full space-y-4">
            <StudentsList />
          </div>
        )}

        {/* РќР°СЃС‚СЂРѕР№РєРё */}
        {activeTab === 'settings' && user && (
          <div className="w-full space-y-4 px-3">
            <AvatarCustomizer />
            <PasswordChanger />
            {!user.can_view_students && <TelegramSetup />}
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="font-bold text-lg text-gray-800 mb-3">РђРєРєР°СѓРЅС‚</h3>
              <button
                onClick={() => {
                  logoutStudent();
                  handleTabChange('main');
                  setIsNewUser(false);
                  localStorage.removeItem('needsTelegramSetup');
                }}
                className="w-full btn btn-danger btn-lg"
              >
                <DoorIcon className="w-5 h-5" />Р’С‹Р№С‚Рё РёР· Р°РєРєР°СѓРЅС‚Р°
              </button>
            </div>
          </div>
        )}
      </div>

      {/* РљРЅРѕРїРєР° "Р’РІРµСЂС…" */}
      {showScrollButton && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 z-50 animate-pulse-slow"
          aria-label="РџСЂРѕРєСЂСѓС‚РёС‚СЊ РІРІРµСЂС…"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
}

