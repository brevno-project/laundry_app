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
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 text-center bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold text-white">🧺 Очередь на стирку</h1>
      </header>

      <TimeBanner />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <MachineStatus />
          <QueueList />
          <HistoryList />
        </div>
        
        <div className="space-y-6">
          {!user ? (
            <StudentAuth />
          ) : (
            <UserForm />
          )}
          <AdminPanel />
        </div>
      </div>
      
      <footer className="mt-12 text-center text-gray-600 text-sm bg-white p-4 rounded-lg shadow">
        <p className="font-medium">Приложение очереди на стирку &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
