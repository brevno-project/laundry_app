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
      setError('Р’РІРµРґРёС‚Рµ PIN');
      return;
    }

    if (!user?.student_id) {
      setError('РћС€РёР±РєР°: РЅРµС‚ student_id');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // РџСЂРѕРІРµСЂСЏРµРј, С‡С‚Рѕ supabase РґРѕСЃС‚СѓРїРµРЅ
      if (!supabase) {
        setError('РћС€РёР±РєР° РїРѕРґРєР»СЋС‡РµРЅРёСЏ Рє Р±Р°Р·Рµ');
        return;
      }

      // РџРѕР»СѓС‡Р°РµРј JWT С‚РѕРєРµРЅ
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('РћС€РёР±РєР° Р°РІС‚РѕСЂРёР·Р°С†РёРё');
        return;
      }

      // Р’С‹Р·С‹РІР°РµРј API РґР»СЏ РїСЂРёРІСЏР·РєРё Р°РєРєР°СѓРЅС‚Р°
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
        setError(result.error || 'РћС€РёР±РєР° РїСЂРёРІСЏР·РєРё');
        return;
      }

      // РЈСЃРїРµС€РЅРѕ РїСЂРёРІСЏР·Р°Р»Рё - РїРµСЂРµР·Р°РіСЂСѓР¶Р°РµРј СЃС‚СЂР°РЅРёС†Сѓ РґР»СЏ РѕР±РЅРѕРІР»РµРЅРёСЏ РґР°РЅРЅС‹С…
      await refreshMyRole();
      setNeedsClaim(false);
      await fetchQueue();

    } catch (err: any) {
      setError(err.message || 'РћС€РёР±РєР° СЃРµС‚Рё');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-lg shadow-lg max-w-md mx-auto">
      <h2 className="text-xl font-bold text-yellow-800 mb-4 text-center">
        рџЋ« РџСЂРёРІСЏР·РєР° Р°РєРєР°СѓРЅС‚Р°
      </h2>
      
      <div className="mb-4 text-sm text-yellow-700">
        <p className="mb-2">
          РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ СЃРѕР·РґР°Р» РґР»СЏ РІР°СЃ Р·Р°РїРёСЃСЊ РІ РѕС‡РµСЂРµРґРё Рё РІС‹РґР°Р» PIN-РєРѕРґ.
        </p>
        <p>
          Р’РІРµРґРёС‚Рµ PIN, С‡С‚РѕР±С‹ РїСЂРёРІСЏР·Р°С‚СЊ СЃРІРѕР№ Р°РєРєР°СѓРЅС‚ Рє СЌС‚РѕР№ Р·Р°РїРёСЃРё.
        </p>
      </div>

      <form onSubmit={handleClaim} className="space-y-4">
        <div>
          <label
            htmlFor="pin"
            className="block text-sm font-medium text-yellow-800 mb-1"
          >
            PIN-РєРѕРґ (6 С†РёС„СЂ)
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
              <span>РџСЂРёРІСЏР·РєР°...</span>
            </>
          ) : (
            <>рџ”“ РџСЂРёРІСЏР·Р°С‚СЊ Р°РєРєР°СѓРЅС‚</>
          )}
        </button>
      </form>

      <div className="mt-4 text-xs text-yellow-600 text-center">
        PIN РґРµР№СЃС‚РІРёС‚РµР»РµРЅ 24 С‡Р°СЃР°
      </div>
    </div>
  );
}
