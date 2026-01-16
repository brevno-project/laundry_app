"use client";

import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  name?: string;
  style?: string;
  seed?: string | null;
  className?: string;
}

export default function Avatar({ name = 'default', style = 'avataaars', seed = null, className = 'w-12 h-12' }: AvatarProps) {
  const avatarStyle = style || 'avataaars';
  // Используем custom seed если он есть, иначе используем name
  const avatarSeed = seed || name || 'default';
  const avatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(avatarSeed)}`;
  
  // Debug log - remove after fixing
  console.log('🎨 Avatar render:', { name, style, seed, computed: { avatarStyle, avatarSeed } });
  
  return (
    <img
      src={avatarUrl}
      alt={name || 'Avatar'}
      className={className}
      style={{ objectFit: 'cover', borderRadius: 'inherit' }}
    />
  );
}
