"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';

export default function UserForm() {
  const { user, joinQueue, logoutStudent } = useLaundry();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (user?.name) {
      console.log('Joining queue with:', user.name, user.room);
      await joinQueue(user.name, user.room);
    }
  };

  const handleLogout = () => {
    logoutStudent();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Встать в очередь</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-bold mb-2 text-gray-700">
            Имя
          </label>
          <input
            id="name"
            type="text"
            value={user?.name || ''}
            readOnly
            className="mt-1 block w-full rounded-md border-2 border-gray-200 bg-gray-50 shadow-sm p-3 text-gray-700 cursor-not-allowed"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="room" className="block text-sm font-bold mb-2 text-gray-700">
            Комната
          </label>
          <input
            id="room"
            type="text"
            value={user?.room || 'Не указана'}
            readOnly
            className="mt-1 block w-full rounded-md border-2 border-gray-200 bg-gray-50 shadow-sm p-3 text-gray-700 cursor-not-allowed"
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
          onClick={handleLogout}
          className="w-full bg-red-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-600 transition-colors mt-2"
        >
          🚪 Выйти
        </button>
      </form>
    </div>
  );
}
