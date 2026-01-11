"use client";

import React, { useState, useEffect } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import Avatar, { AVATAR_OPTIONS, AvatarType } from './Avatar';
import { supabase as supabaseClient } from '@/lib/supabase';

export default function AvatarSelector() {
  const { user, loadStudents, setUser, fetchQueue, fetchHistory } = useLaundry();
  const [isSaving, setIsSaving] = useState(false);
  
  // ✅ Всегда используем аватар напрямую из user, без локального состояния
  const currentAvatar = (user?.avatar_type as AvatarType) || 'default';
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType>(currentAvatar);

  // ✅ Синхронизируем selectedAvatar с user.avatar_type при каждом изменении
  useEffect(() => {
    const avatarType = (user?.avatar_type as AvatarType) || 'default';
    if (avatarType !== selectedAvatar) {
      setSelectedAvatar(avatarType);
    }
  }, [user?.avatar_type]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      if (!supabaseClient) throw new Error('Supabase не настроен');
      
      // ✅ Используем RPC функцию для безопасного обновления аватара
      const { error: rpcError } = await supabaseClient
        .rpc('update_my_avatar', { p_avatar_type: selectedAvatar });
      
      if (rpcError) throw rpcError;
      
      // ✅ Обновляем аватар во всех записях очереди этого пользователя
      const { error: queueError } = await supabaseClient
        .from('queue')
        .update({ avatar_type: selectedAvatar })
        .eq('student_id', user.student_id);
      
      if (queueError) {
        // Не прерываем процесс, так как основное обновление успешно
      }
      
      // ✅ Обновляем user объект сразу
      const updatedUser = { ...user, avatar_type: selectedAvatar };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Обновляем список студентов, очередь и историю
      await loadStudents();
      await fetchQueue();
      await fetchHistory();
      alert('✅ Аватар обновлен' + " \u2705");
    } catch (error) {
      alert('❌ Ошибка обновления аватара' + " \u2705");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="font-bold text-lg text-gray-800 mb-3">Выбор аватара</h3>
      
      {/* Текущий аватар */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        <Avatar type={currentAvatar} className="w-16 h-16" />
        <div>
          <p className="text-sm text-gray-600">Текущий аватар</p>
          <p className="font-semibold text-gray-900">{AVATAR_OPTIONS.find(opt => opt.value === currentAvatar)?.label}</p>
        </div>
      </div>

      {/* Сетка аватаров */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-4 max-h-96 overflow-y-auto p-2 border rounded-lg">
        {AVATAR_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedAvatar(option.value)}
            className={`p-2 rounded-lg transition-all ${
              selectedAvatar === option.value
                ? 'bg-blue-100 border-2 border-blue-500 scale-110'
                : 'bg-gray-50 border-2 border-transparent hover:border-gray-300 hover:scale-105'
            }`}
            title={option.label}
          >
            <Avatar type={option.value} className="w-12 h-12" />
          </button>
        ))}
      </div>

      {/* Кнопка сохранения */}
      <button
        onClick={handleSave}
        disabled={isSaving || selectedAvatar === user?.avatar_type}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
          isSaving || selectedAvatar === user?.avatar_type
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isSaving ? 'Сохранение...' : 'Сохранить аватар'}
      </button>
    </div>
  );
}
