"use client";

import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  name?: string;
  style?: string;
  className?: string;
}

export default function Avatar({ name = 'default', style = 'avataaars', className = 'w-12 h-12' }: AvatarProps) {
  const seed = name || 'default';
  const avatarStyle = style || 'avataaars';
  const avatarUrl = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(seed)}`;
  
  return (
    <img
      src={avatarUrl}
      alt={name || 'Avatar'}
      className={className}
      style={{ objectFit: 'cover', borderRadius: 'inherit' }}
    />
  );
}
