"use client";

import React from 'react';

export type AvatarType = 'default' | 'male1' | 'male2' | 'male3' | 'female1' | 'female2' | 'female3';

interface AvatarProps {
  type?: AvatarType;
  className?: string;
}

export const AVATAR_OPTIONS: { value: AvatarType; label: string }[] = [
  { value: 'default', label: 'По умолчанию' },
  { value: 'male1', label: 'Мужской 1' },
  { value: 'male2', label: 'Мужской 2' },
  { value: 'male3', label: 'Мужской 3' },
  { value: 'female1', label: 'Женский 1' },
  { value: 'female2', label: 'Женский 2' },
  { value: 'female3', label: 'Женский 3' },
];

export default function Avatar({ type = 'default', className = 'w-12 h-12' }: AvatarProps) {
  const avatars: Record<AvatarType, JSX.Element> = {
    default: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    ),
    male1: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4"/>
        <path d="M12 14c-6 0-8 3-8 5v1h16v-1c0-2-2-5-8-5z"/>
        <rect x="10" y="6" width="4" height="1" fill="white" opacity="0.3"/>
      </svg>
    ),
    male2: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4.5"/>
        <path d="M12 14c-5 0-7 2.5-7 4.5V20h14v-1.5c0-2-2-4.5-7-4.5z"/>
        <circle cx="10.5" cy="7.5" r="0.5" fill="white"/>
        <circle cx="13.5" cy="7.5" r="0.5" fill="white"/>
      </svg>
    ),
    male3: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <ellipse cx="12" cy="8" rx="4" ry="4.5"/>
        <path d="M12 14c-6 0-8 3-8 5v2h16v-2c0-2-2-5-8-5z"/>
        <path d="M9 6h6v1H9z" fill="white" opacity="0.4"/>
      </svg>
    ),
    female1: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4"/>
        <path d="M12 14c-6 0-8 3-8 5v1h16v-1c0-2-2-5-8-5z"/>
        <ellipse cx="10" cy="7.5" rx="0.8" ry="1" fill="white" opacity="0.6"/>
        <ellipse cx="14" cy="7.5" rx="0.8" ry="1" fill="white" opacity="0.6"/>
      </svg>
    ),
    female2: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4.2"/>
        <path d="M12 14c-5.5 0-7.5 2.8-7.5 4.8V20h15v-1.2c0-2-2-4.8-7.5-4.8z"/>
        <path d="M8 6c0-2 1.5-3 4-3s4 1 4 3" stroke="white" strokeWidth="0.5" fill="none" opacity="0.5"/>
      </svg>
    ),
    female3: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <ellipse cx="12" cy="8" rx="4.5" ry="4"/>
        <path d="M12 14c-6 0-8 3-8 5v2h16v-2c0-2-2-5-8-5z"/>
        <circle cx="10.5" cy="7.8" r="0.6" fill="white"/>
        <circle cx="13.5" cy="7.8" r="0.6" fill="white"/>
        <path d="M7 5c1-1.5 2.5-2 5-2s4 0.5 5 2" stroke="white" strokeWidth="0.6" fill="none" opacity="0.4"/>
      </svg>
    ),
  };

  return avatars[type] || avatars.default;
}
