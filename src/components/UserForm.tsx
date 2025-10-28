"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';

export default function UserForm() {
  const { user, setUser, joinQueue } = useLaundry();
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setRoom(user.room || '');
    }
  }, [user]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      await joinQueue(name.trim(), room.trim() || undefined);
    }
  };

  const handleResetUser = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Встать в очередь</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-bold mb-2 text-gray-700">
            Имя (обязательно)
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя"
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="room" className="block text-sm font-bold mb-2 text-gray-700">
            Комната (необязательно)
          </label>
          <input
            id="room"
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Номер комнаты"
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-md"
        >
          Встать в очередь
        </button>
        <button
          type="button"
          onClick={handleResetUser}
          className="w-full bg-gray-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors mt-2"
        >
          🔄 Сбросить приложение
        </button>
      </form>
    </div>
  );
}
