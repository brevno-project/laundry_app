"use client";

import { useLaundry } from '@/contexts/LaundryContext';
import UserForm from '@/components/UserForm';
import MachineStatus from '@/components/MachineStatus';
import QueueList from '@/components/QueueList';
import AdminPanel from '@/components/AdminPanel';
import HistoryList from '@/components/HistoryList';

export default function Home() {
  const { user, isLoading } = useLaundry();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 text-center bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold text-white mb-2">🧺 Dorm Laundry Queue</h1>
        <p className="text-blue-100 text-lg">Manage your laundry schedule efficiently</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <MachineStatus />
          <QueueList />
          <HistoryList />
        </div>
        
        <div className="space-y-6">
          {!user?.name && <UserForm />}
          <AdminPanel />
        </div>
      </div>
      
      <footer className="mt-12 text-center text-gray-600 text-sm bg-white p-4 rounded-lg shadow">
        <p className="font-medium">Dorm Laundry Queue App &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
