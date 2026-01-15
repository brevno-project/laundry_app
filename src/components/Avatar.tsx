"use client";

import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  name?: string;
  className?: string;
}

export default function Avatar({ name = 'default', className = 'w-12 h-12' }: AvatarProps) {
  const seed = name || 'default';
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
  
  return (
    <img
      src={avatarUrl}
      alt={name || 'Avatar'}
      className={className}
      style={{ objectFit: 'cover', borderRadius: 'inherit' }}
    />
  );
}
