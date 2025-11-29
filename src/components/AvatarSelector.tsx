"use client";

import React, { useState, useEffect } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import Avatar, { AVATAR_OPTIONS, AvatarType } from './Avatar';
import { supabase as supabaseClient } from '@/lib/supabase';

export default function AvatarSelector() {
  const { user, loadStudents, setUser, fetchQueue } = useLaundry();
  // ✅ Используем локальное состояние только для выбора, а отображаем из user
  const currentAvatar = (user?.avatar_type as AvatarType) || 'default';
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType>(currentAvatar);
  const [isSaving, setIsSaving] = useState(false);

  // ✅ Синхронизируем selectedAvatar с user.avatar_type при изменении
  useEffect(() => {
    if (user?.avatar_type) {
      const avatarType = user.avatar_type as AvatarType;
      console.log('👤 Syncing avatar from user:', avatarType);
      setSelectedAvatar(avatarType);
    }
  }, [user?.avatar_type]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      if (!supabaseClient) throw new Error('Supabase не настроен');
      
      // ✅ Обновляем аватар в таблице students
      const { error: studentError } = await supabaseClient
        .from('students')
        .update({ avatar_type: selectedAvatar })
        .eq('id', user.student_id);
      
      if (studentError) throw studentError;
      
      // ✅ Обновляем аватар во всех записях очереди этого пользователя
      const { error: queueError } = await supabaseClient
        .from('queue')
        .update({ avatar_type: selectedAvatar })
        .eq('student_id', user.student_id);
      
      if (queueError) {
        console.warn('Warning updating queue avatars:', queueError);
        // Не прерываем процесс, так как основное обновление успешно
      }
      
      // ✅ Обновляем user объект сразу
      const updatedUser = { ...user, avatar_type: selectedAvatar };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Обновляем список студентов и очередь
      await loadStudents();
      await fetchQueue();
      alert('✅ Аватар обновлен везде!');
    } catch (error) {
      console.error('Error updating avatar:', error);
      alert('❌ Ошибка обновления аватара');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h3 className="font-bold text-lg text-gray-800 mb-3">Выбор аватара</h3>
      
      {/* Текущий аватар */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
        <Avatar type={selectedAvatar} className="w-16 h-16" />
        <div>
          <p className="text-sm text-gray-600">Текущий аватар</p>
          <p className="font-semibold text-gray-900">{AVATAR_OPTIONS.find(opt => opt.value === selectedAvatar)?.label}</p>
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
