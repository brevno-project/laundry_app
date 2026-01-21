"use client";

import React, { useState, useEffect } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { useUi } from '@/contexts/UiContext';
import Avatar from '@/components/Avatar';
import { CheckIcon, CloseIcon, WashingSpinner } from '@/components/Icons';
import { supabase } from '@/lib/supabase';

const AVATAR_STYLES = [
  { id: 'avataaars', name: 'Avataaars', descKey: 'avatar.style.avataaars.desc' },
  { id: 'lorelei', name: 'Lorelei', descKey: 'avatar.style.lorelei.desc' },
  { id: 'pixel-art', name: 'Pixel Art', descKey: 'avatar.style.pixel-art.desc' },
  { id: 'adventurer', name: 'Adventurer', descKey: 'avatar.style.adventurer.desc' },
  { id: 'big-ears', name: 'Big Ears', descKey: 'avatar.style.big-ears.desc' },
  { id: 'bottts', name: 'Bottts', descKey: 'avatar.style.bottts.desc' },
  { id: 'croodles', name: 'Croodles', descKey: 'avatar.style.croodles.desc' },
  { id: 'micah', name: 'Micah', descKey: 'avatar.style.micah.desc' },
  { id: 'miniavs', name: 'Mini Avatars', descKey: 'avatar.style.miniavs.desc' },
  { id: 'notionists', name: 'Notionists', descKey: 'avatar.style.notionists.desc' },
  { id: 'personas', name: 'Personas', descKey: 'avatar.style.personas.desc' },
  { id: 'thumbs', name: 'Thumbs', descKey: 'avatar.style.thumbs.desc' },
  { id: 'fun-emoji', name: 'Fun Emoji', descKey: 'avatar.style.fun-emoji.desc' },
];

interface AvatarCustomizerProps {
  onSave?: (style: string, seed: string) => void;
}

export default function AvatarCustomizer({ onSave }: AvatarCustomizerProps) {
  const { user, refreshMyRole, fetchQueue, loadStudents } = useLaundry();
  const { t } = useUi();
  const [selectedStyle, setSelectedStyle] = useState<string>(user?.avatar_style || 'bottts');
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
      const { data: { session }, error } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (error || !accessToken) {
        throw new Error(t('errors.noActiveSession'));
      }

      const response = await fetch('/api/student/update-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          avatar_style: selectedStyle,
          avatar_seed: avatarSeed || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('avatar.saveError'));
      }

      if (refreshMyRole) {
        await refreshMyRole();
      }
      if (loadStudents) {
        await loadStudents();
      }
      if (fetchQueue) {
        await fetchQueue();
      }

      setNotice({ type: 'success', message: t('avatar.saved') });
      onSave?.(selectedStyle, avatarSeed);
      setTimeout(() => setNotice(null), 3000);
    } catch (error) {
      setNotice({ type: 'error', message: (error as Error).message || t('avatar.saveError') });
      setTimeout(() => setNotice(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white/70 backdrop-blur-sm dark:bg-slate-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-slate-700">
      <h3 className="font-bold text-lg text-gray-900 mb-4">{t('avatar.title')}</h3>

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

      <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-lg text-center border border-blue-200 dark:border-slate-700">
        <p className="text-sm text-gray-700 font-semibold mb-3 dark:text-slate-200">{t('avatar.previewLabel')}</p>
        <div className="flex justify-center mb-4">
          <Avatar
            name={previewSeed || user?.full_name || 'default'}
            style={selectedStyle}
            className="w-32 h-32"
          />
        </div>
        <p className="text-xs text-gray-600 mb-4 dark:text-slate-300">
          {t('avatar.currentStyleLabel')}{' '}
          <span className="font-semibold">{AVATAR_STYLES.find(s => s.id === selectedStyle)?.name}</span>
        </p>

        <button
          onClick={handleSave}
          disabled={isSaving || (selectedStyle === user?.avatar_style && avatarSeed === user?.avatar_seed)}
          className="w-full btn btn-primary btn-glow mb-3"
        >
          {isSaving ? (
            <>
              <WashingSpinner className="w-4 h-4" />
              <span>{t('avatar.saving')}</span>
            </>
          ) : (
            <>{t('avatar.save')}</>
          )}
        </button>

        <button
          onClick={generateRandomSeed}
          className="w-full btn btn-secondary"
        >
          {t('avatar.random')}
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-3">{t('avatar.chooseStyle')}</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {AVATAR_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={`p-2 rounded-lg border-2 transition-all text-left text-xs ${
                selectedStyle === style.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500'
                  : 'border-gray-200 dark:border-slate-600 bg-white/70 backdrop-blur-sm dark:bg-slate-700 hover:border-blue-300 dark:hover:border-blue-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900">{style.name}</span>
                {selectedStyle === style.id && (
                  <CheckIcon className="w-3 h-3 text-blue-600" />
                )}
              </div>
              <p className="text-gray-600 text-xs">{t(style.descKey)}</p>
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
    </div>
  );
}
