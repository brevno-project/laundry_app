"use client";

import React, { useState, useEffect } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import Avatar from '@/components/Avatar';
import { CheckIcon, CloseIcon } from '@/components/Icons';
import { supabase } from '@/lib/supabase';

const AVATAR_STYLES = [
  { id: 'avataaars', name: 'Avataaars', description: 'Классический с волосами и одеждой' },
  { id: 'lorelei', name: 'Lorelei', description: 'Женские аватары' },
  { id: 'pixel-art', name: 'Pixel Art', description: 'Пиксельный стиль' },
  { id: 'adventurer', name: 'Adventurer', description: 'Приключенческий стиль' },
  { id: 'big-ears', name: 'Big Ears', description: 'С большими ушами' },
  { id: 'bottts', name: 'Bottts', description: 'Роботы' },
  { id: 'croodles', name: 'Croodles', description: 'Рисованные' },
  { id: 'micah', name: 'Micah', description: 'Минималистичные' },
  { id: 'miniavs', name: 'Mini Avatars', description: 'Мини аватары' },
  { id: 'notionists', name: 'Notionists', description: 'Абстрактные' },
  { id: 'personas', name: 'Personas', description: 'Персонажи' },
  { id: 'thumbs', name: 'Thumbs', description: 'Большие пальцы' },
  { id: 'fun-emoji', name: 'Fun Emoji', description: 'Забавные эмодзи' },
  { id: 'identicon', name: 'Identicon', description: 'Геометрические паттерны' },
  { id: 'shapes', name: 'Shapes', description: 'Абстрактные фигуры' },
  { id: 'initials', name: 'Initials', description: 'Инициалы в кругах' },
];

interface AvatarCustomizerProps {
  onSave?: (style: string, seed: string) => void;
}

export default function AvatarCustomizer({ onSave }: AvatarCustomizerProps) {
  const { user, refreshMyRole } = useLaundry();
  const [selectedStyle, setSelectedStyle] = useState<string>(user?.avatar_style || 'avataaars');
  const [avatarSeed, setAvatarSeed] = useState<string>(user?.avatar_seed || '');
  const [previewSeed, setPreviewSeed] = useState<string>(user?.avatar_seed || '');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (user?.avatar_style) {
      setSelectedStyle(user.avatar_style);
    }
    if (user?.avatar_seed) {
      setAvatarSeed(user.avatar_seed);
      setPreviewSeed(user.avatar_seed);
    }
  }, [user?.avatar_style, user?.avatar_seed]);

  const generateRandomSeed = () => {
    const randomSeed = Math.random().toString(36).substring(2, 15);
    setAvatarSeed(randomSeed);
    setPreviewSeed(randomSeed);
  };

  const handleSave = async () => {
    if (!user?.id || !supabase) return;

    setIsSaving(true);
    try {
      // ✅ Получаем свежий JWT
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('/api/student/update-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          avatar_style: selectedStyle,
          avatar_seed: avatarSeed || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save avatar');
      }

      const result = await response.json();

      // ✅ Перезагружаем данные пользователя из БД
      if (refreshMyRole) {
        await refreshMyRole();
      }

      setNotice({ type: 'success', message: 'Аватар сохранён!' });
      onSave?.(selectedStyle, avatarSeed);
      setTimeout(() => setNotice(null), 3000);
    } catch (error) {
      console.error('Error saving avatar:', error);
      setNotice({ type: 'error', message: 'Ошибка при сохранении аватара' });
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="font-bold text-lg text-gray-900 mb-4">Выбор стиля аватара</h3>

      {notice && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckIcon className="w-5 h-5" />
          ) : (
            <CloseIcon className="w-5 h-5" />
          )}
          {notice.message}
        </div>
      )}

      {/* Превью аватара + кнопка сохранения */}
      <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg text-center border border-blue-200">
        <p className="text-sm text-gray-700 font-semibold mb-3">Превью вашего аватара:</p>
        <div className="flex justify-center mb-4">
          <Avatar
            name={previewSeed || user?.full_name || 'default'}
            style={selectedStyle}
            className="w-32 h-32"
          />
        </div>
        <p className="text-xs text-gray-600 mb-4">Стиль: <span className="font-semibold">{AVATAR_STYLES.find(s => s.id === selectedStyle)?.name}</span></p>
        
        {/* Кнопка сохранения */}
        <button
          onClick={handleSave}
          disabled={isSaving || (selectedStyle === user?.avatar_style && avatarSeed === user?.avatar_seed)}
          className={`w-full py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
            isSaving || (selectedStyle === user?.avatar_style && avatarSeed === user?.avatar_seed)
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSaving ? 'Сохранение...' : '✓ Сохранить'}
        </button>
      </div>

      {/* Выбор стиля */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-3">Выберите стиль:</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {AVATAR_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`p-2 rounded-lg border-2 transition-all text-left text-xs ${
                selectedStyle === style.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900">{style.name}</span>
                {selectedStyle === style.id && (
                  <CheckIcon className="w-3 h-3 text-blue-600" />
                )}
              </div>
              <p className="text-gray-600 text-xs">{style.description}</p>
              <div className="mt-1 flex justify-center">
                <Avatar
                  name={previewSeed || user?.full_name || 'default'}
                  style={style.id}
                  className="w-8 h-8"
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Кнопка рандома */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <button
          onClick={generateRandomSeed}
          className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
        >
          🎲 Выбрать случайный аватар
        </button>
      </div>
    </div>
  );
}
