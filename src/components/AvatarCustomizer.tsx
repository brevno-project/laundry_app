"use client";

import React, { useState, useEffect } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import Avatar from '@/components/Avatar';
import { CheckIcon, CloseIcon } from '@/components/Icons';

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
];

interface AvatarCustomizerProps {
  onSave?: (style: string) => void;
}

export default function AvatarCustomizer({ onSave }: AvatarCustomizerProps) {
  const { user, updateStudent } = useLaundry();
  const [selectedStyle, setSelectedStyle] = useState<string>(user?.avatar_style || 'avataaars');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (user?.avatar_style) {
      setSelectedStyle(user.avatar_style);
    }
  }, [user?.avatar_style]);

  const handleSave = async () => {
    if (!user?.student_id) return;

    setIsSaving(true);
    try {
      await updateStudent(user.student_id, { avatar_style: selectedStyle } as any);
      setNotice({ type: 'success', message: 'Стиль аватара сохранён!' });
      onSave?.(selectedStyle);
      setTimeout(() => setNotice(null), 3000);
    } catch (error) {
      setNotice({ type: 'error', message: 'Ошибка при сохранении стиля' });
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

      {/* Превью текущего аватара */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
        <p className="text-sm text-gray-600 mb-3">Ваш аватар:</p>
        <div className="flex justify-center">
          <Avatar
            name={user?.full_name || 'default'}
            style={selectedStyle}
            className="w-24 h-24"
          />
        </div>
      </div>

      {/* Сетка стилей */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {AVATAR_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => setSelectedStyle(style.id)}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              selectedStyle === style.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-gray-900">{style.name}</span>
              {selectedStyle === style.id && (
                <CheckIcon className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <p className="text-xs text-gray-600">{style.description}</p>
            <div className="mt-2 flex justify-center">
              <Avatar
                name={user?.full_name || 'default'}
                style={style.id}
                className="w-10 h-10"
              />
            </div>
          </button>
        ))}
      </div>

      {/* Кнопка сохранения */}
      <button
        onClick={handleSave}
        disabled={isSaving || selectedStyle === user?.avatar_style}
        className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
          isSaving || selectedStyle === user?.avatar_style
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isSaving ? 'Сохранение...' : 'Сохранить стиль'}
      </button>
    </div>
  );
}
