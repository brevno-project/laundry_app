"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import TimeBanner from '@/components/TimeBanner';
import StudentAuth from '@/components/StudentAuth';
import UserForm from '@/components/UserForm';
import MachineStatus from '@/components/MachineStatus';
import QueueList from '@/components/QueueList';
import AdminPanel from '@/components/AdminPanel';
import HistoryList from '@/components/HistoryList';

export default function Home() {
  const { user, isLoading } = useLaundry();
  const isSupabaseConfigured = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

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

      {/* Основной контент */}
      <div className="w-full space-y-4 p-3">
        <TimeBanner />
        
        {/* Объявление про 22:00 */}
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-red-900 text-sm">ВАЖНО! ВЕЩИ ЗАБРАТЬ ДО 22:00</p>
              <p className="text-red-700 text-xs mt-1">После 22:00 доступ к стиральной комнате закрыт</p>
            </div>
          </div>
        </div>
        
        {/* Форма входа/регистрации */}
        {!user ? (
          <StudentAuth />
        ) : (
          <UserForm />
        )}
        
        {/* Статус машинки */}
        <MachineStatus />
        
        {/* Очередь */}
        <QueueList />
        
        {/* Админ панель */}
        <AdminPanel />
        
        {/* История (скрыта по умолчанию) */}
        {/* <HistoryList /> */}
      </div>
    </div>
  );
}
