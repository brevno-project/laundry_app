'use client';

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { WashingSpinner } from '@/components/Icons';
import { supabase } from '@/lib/supabase';

export default function ClaimAccount() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, refreshMyRole, fetchQueue, setNeedsClaim } = useLaundry();

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pin.trim()) {
      setError('Введите PIN');
      return;
    }

    if (!user?.student_id) {
      setError('Ошибка: нет student_id');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Проверяем, что supabase доступен
      if (!supabase) {
        setError('Ошибка подключения к базе');
        return;
      }

      // Получаем JWT токен
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Ошибка авторизации');
        return;
      }

      // Вызываем API для привязки аккаунта
      const response = await fetch('/api/student/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          student_id: user.student_id,
          pin: pin.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Ошибка привязки');
        return;
      }

      // Успешно привязали - перезагружаем страницу для обновления данных
      await refreshMyRole();
      setNeedsClaim(false);
      await fetchQueue();

    } catch (err: any) {
      setError(err.message || 'Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold text-yellow-800 mb-4 text-center">
        🎫 Привязка аккаунта
      </h2>
      
      <div className="mb-4 text-sm text-yellow-700">
        <p className="mb-2">
          Администратор создал для вас запись в очереди и выдал PIN-код.
        </p>
        <p>
          Введите PIN, чтобы привязать свой аккаунт к этой записи.
        </p>
      </div>

      <form onSubmit={handleClaim} className="space-y-4">
        <div>
          <label
            htmlFor="pin"
            className="block text-sm font-medium text-yellow-800 mb-1"
          >
            PIN-код (6 цифр)
          </label>
          <input
            id="pin"
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            className="w-full rounded-md border-2 border-yellow-300 bg-white px-3 py-2 text-yellow-900 placeholder-yellow-400 focus:border-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-200"
            disabled={loading}
            maxLength={6}
          />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn btn-warning"
        >
          {loading ? (
            <>
              <WashingSpinner className="w-4 h-4" />
              <span>Привязка...</span>
            </>
          ) : (
            <>🔓 Привязать аккаунт</>
          )}
        </button>
      </form>

      <div className="mt-4 text-xs text-yellow-600 text-center">
        PIN действителен 24 часа
      </div>
    </div>
  );
}
