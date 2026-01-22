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
import { HomeIcon, HistoryIcon, PeopleIcon, SettingsIcon, DoorIcon, ListIcon, LaundryIcon, SunIcon, MoonIcon, WashingSpinner } from '@/components/Icons';
import TelegramBanner from '@/components/TelegramBanner';
import StudentActions from '@/components/StudentActions';
import PasswordChanger from '@/components/PasswordChanger';
import AvatarCustomizer from '@/components/AvatarCustomizer';
import { useUi } from '@/contexts/UiContext';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const { user, isLoading, authReady, logoutStudent, isAdmin, isSuperAdmin, isCleanupAdmin, machineState, queue, isNewUser, setIsNewUser, students, needsClaim } = useLaundry();
  const { t, language, setLanguage, theme, setTheme } = useUi();
  const locale = language === "ru" ? "ru-RU" : language === "en" ? "en-US" : language === "ko" ? "ko-KR" : "ky-KG";
  const canViewStudentsTab = isAdmin || isSuperAdmin || isCleanupAdmin || !!user?.can_view_students;
  const [didSyncLanguageFromDb, setDidSyncLanguageFromDb] = React.useState(false);
  
  const [activeTab, setActiveTab] = React.useState("main");
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  
  const [showScrollButton, setShowScrollButton] = React.useState(false);
  const [scrollTarget, setScrollTarget] = React.useState<string | null>(null);

  // ✅ Сохраняем activeTab в localStorage при изменении
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeTab', tab);
    }
  };

  React.useEffect(() => {
    if (!authReady) return;
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("activeTab");
    if (!stored) return;
    setActiveTab(stored);
  }, [authReady]);

  React.useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setDidSyncLanguageFromDb(false);
    }
  }, [user, authReady]);

  React.useEffect(() => {
    if (!authReady) return;
    if (!user) return;
    if (didSyncLanguageFromDb) return;
    const dbLang = user.ui_language;
    if (dbLang === "ru" || dbLang === "en" || dbLang === "ko" || dbLang === "ky") {
      setLanguage(dbLang);
    }
    setDidSyncLanguageFromDb(true);
  }, [authReady, user, didSyncLanguageFromDb, setLanguage]);

  const handleLanguageChange = async (next: "ru" | "en" | "ko" | "ky") => {
    setLanguage(next);
    if (!user) return;
    if (!supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await fetch("/api/student/update-language", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ui_language: next }),
      });
    } catch {
      // ignore
    }
  };

  // ✅ ТЫ FIX: Сбрасываем activeTab на 'main' когда нет пользователя
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

  React.useEffect(() => {
    if (activeTab !== 'settings' || !scrollTarget) return;
    const targetId = scrollTarget;
    const scrollToTarget = () => {
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const focusTarget = element.querySelector<HTMLElement>('[data-focus-target="telegram"]');
        if (focusTarget) {
          focusTarget.focus({ preventScroll: true });
        }
        setScrollTarget(null);
      }
    };
    requestAnimationFrame(() => setTimeout(scrollToTarget, 80));
  }, [activeTab, scrollTarget]);


  // ✅ Отслеживание скролла для кнопки "Вверх" (только для пользователей в очереди)
  React.useEffect(() => {
    if (activeTab !== "history" && activeTab !== "main") {
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
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  // ✅ Функция скролла вверх
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowScrollButton(false);
  };

  if (isLoading || !authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-950">


      {/* Заголовок */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-slate-800 dark:to-slate-900 p-4 shadow-lg sticky top-0 z-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2"><LaundryIcon className="w-7 h-7" /> {t("app.title")}</h1>
          {user && (
            <p className="text-sm text-blue-100 mt-1">
              {t("header.signedInAs")}: <span className="font-semibold">{user.full_name}</span>
              {user.room && <span className="ml-2">{t("header.room")} {user.room}</span>}
              {isCleanupAdmin && (
                <span className="ml-2 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-800 dark:border-indigo-800/40 dark:bg-indigo-900/25 dark:text-indigo-200">
                  {t("header.leader")}
                </span>
              )}
            </p>
          )}
        </div>
      </header>

      {/* Табы */}
      {user && (
        <nav className="bg-white border-b shadow-sm sticky top-14 z-10 dark:bg-slate-900">
          <div className="mx-auto max-w-5xl">
            <div className="flex gap-1 overflow-x-auto px-2 md:justify-center md:gap-3 md:overflow-visible md:px-4">
            <button
              type="button"
              onClick={() => handleTabChange('main')}
              className={`flex-none shrink-0 min-w-[96px] py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'main'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <HomeIcon className="w-5 h-5 inline-block mr-2" />{t("nav.main")}</button>
            <button
              onClick={() => handleTabChange('history')}
              className={`flex-none shrink-0 min-w-[96px] py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <HistoryIcon className="w-5 h-5 inline-block mr-2" />{t("nav.history")}</button>
            <button
              onClick={() => handleTabChange('cleanup')}
              className={`flex-none shrink-0 min-w-[96px] py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'cleanup'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListIcon className="w-5 h-5 inline-block mr-2" />{t("nav.cleanup")}</button>
            {/* Вкладка Студенты доступна админам и пользователям с флагом can_view_students */}
            {canViewStudentsTab && (
              <button
                onClick={() => handleTabChange('students')}
                className={`flex-none shrink-0 min-w-[96px] py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'students'
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <PeopleIcon className="w-5 h-5 inline-block mr-2" />{t("nav.students")}</button>
            )}
            <button
              onClick={() => handleTabChange('settings')}
              className={`flex-none shrink-0 min-w-[96px] py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <SettingsIcon className="w-5 h-5 inline-block mr-2" />{t("nav.settings")}</button>
          </div>
          </div>
        </nav>
      )}

      {/* Полноэкранный баннер для подключения Telegram */}
      <TelegramBanner
        onGoToSettings={() => {
          handleTabChange('settings');
          setScrollTarget('telegram-setup');
        }}
      />
      
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
              <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-slate-200">{t("machine.status")}</h3>
              {machineState.status === 'idle' ? (
                <div className="relative overflow-hidden rounded-xl shadow-lg min-h-[120px]">
                  {/* Базовый фон */}
                  <div className="absolute inset-0 bg-emerald-600 dark:bg-emerald-700"></div>
                  <div className="absolute inset-0 dark:bg-black/10"></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/5 to-black/10 dark:from-white/10 dark:via-transparent dark:to-black/20"></div>
                  <div className="absolute -inset-6 rounded-2xl opacity-35 blur-2xl bg-emerald-300/40 dark:bg-emerald-400/10 animate-pulse-slow"></div>
                  
                  {/* Тонкая сетка (паттерн) */}
                  <div 
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, white 2px, white 3px)',
                      backgroundSize: '30px 30px',
                    }}
                  ></div>
                  
                  {/* Волна с блеском */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
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
                    <div className="text-2xl font-bold text-white">{t("machine.available")}</div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-xl shadow-lg min-h-[120px]">
                  {/* Базовый фон */}
                  <div className="absolute inset-0 bg-rose-600 dark:bg-rose-700"></div>
                  <div className="absolute inset-0 dark:bg-black/10"></div>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-white/5 to-black/10 dark:from-white/10 dark:via-transparent dark:to-black/20"></div>
                  <div className="absolute -inset-6 rounded-2xl opacity-35 blur-2xl bg-rose-300/35 dark:bg-rose-400/10 animate-pulse-slow"></div>
                  
                  {/* Тонкая сетка (паттерн) */}
                  <div 
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, white 2px, white 3px)',
                      backgroundSize: '30px 30px',
                    }}
                  ></div>
                  
                  {/* Волна с блеском */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
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
                      <div className="text-2xl font-bold text-white">{t("machine.busy")}</div>
                    </div>
                    
                    {/* Полупрозрачная карточка с информацией */}
                    {(machineState.current_queue_item_id || machineState.expected_finish_at) && (
                      <div className="rounded-lg p-4 space-y-3 border border-white/10 bg-black/15 shadow-sm">
                        {machineState.current_queue_item_id && (() => {
                          const currentItem = queue.find(item => item.id === machineState.current_queue_item_id);
                          if (currentItem) {
                            return (
                              <div>
                                <div className="text-xs text-white/70 font-medium uppercase tracking-wider mb-1">{t("machine.current")}</div>
                                <div className="text-2xl font-bold text-white">
                                  {currentItem.full_name}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {machineState.expected_finish_at && (
                          <div className="pt-3 border-t border-white/10">
                            <div className="text-xs text-white/70 font-medium uppercase tracking-wider mb-1">{t("machine.ends")}</div>
                            <div className="text-xl font-bold text-white">
                              {new Date(machineState.expected_finish_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
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

        {/* Уборка */}
        {activeTab === 'cleanup' && (
          <div className="w-full space-y-4">
            <CleanupResults embedded />
          </div>
        )}

        {/* Студенты - доступно админам и пользователям с can_view_students */}
        {activeTab === 'students' && canViewStudentsTab && (
          <div className="w-full space-y-4 p-3">
            <StudentsList />
          </div>
        )}

        {/* Настройки */}
        {activeTab === 'settings' && user && (
          <div className="w-full space-y-4 px-3">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <h3 className="font-bold text-lg text-gray-800 mb-3">{t("settings.language")}</h3>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => handleLanguageChange("ru")}
                  className={`btn ${language === "ru" ? "btn-primary" : "btn-secondary"}`}
                  aria-pressed={language === "ru"}
                >
                  {t("settings.language.ru")}
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange("en")}
                  className={`btn ${language === "en" ? "btn-primary" : "btn-secondary"}`}
                  aria-pressed={language === "en"}
                >
                  {t("settings.language.en")}
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange("ko")}
                  className={`btn ${language === "ko" ? "btn-primary" : "btn-secondary"}`}
                  aria-pressed={language === "ko"}
                >
                  {t("settings.language.ko")}
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange("ky")}
                  className={`btn ${language === "ky" ? "btn-primary" : "btn-secondary"}`}
                  aria-pressed={language === "ky"}
                >
                  {t("settings.language.ky")}
                </button>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <h3 className="font-bold text-lg text-gray-800 mb-3">{t("settings.theme")}</h3>
              <div className="inline-flex overflow-hidden rounded-full border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-900/40">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  aria-pressed={theme === "light"}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    theme === "light"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "bg-transparent text-gray-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <SunIcon className="w-5 h-5" />
                  <span>{t("settings.theme.light")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  aria-pressed={theme === "dark"}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    theme === "dark"
                      ? "bg-slate-900 text-white shadow-sm dark:bg-slate-700"
                      : "bg-transparent text-gray-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <MoonIcon className="w-5 h-5" />
                  <span>{t("settings.theme.dark")}</span>
                </button>
              </div>
            </div>
            <AvatarCustomizer />
            <PasswordChanger />
            <TelegramSetup />
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <h3 className="font-bold text-lg text-gray-800 mb-3">{t("settings.account")}</h3>
              <button
                onClick={async () => {
                  if (isLoggingOut) return;
                  setIsLoggingOut(true);
                  try {
                    await logoutStudent();
                    handleTabChange('main');
                    setIsNewUser(false);
                    localStorage.removeItem('needsTelegramSetup');
                  } finally {
                    setIsLoggingOut(false);
                  }
                }}
                disabled={isLoggingOut}
                className="w-full btn btn-danger btn-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <>
                    <WashingSpinner className="w-5 h-5" />
                    <span>{t("settings.logout")}...</span>
                  </>
                ) : (
                  <>
                    <DoorIcon className="w-5 h-5" />{t("settings.logout")}
                  </>
                )}
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
          aria-label={t("common.scrollTop")}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
}
