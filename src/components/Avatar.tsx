"use client";

import React, { ReactElement } from 'react';

export type AvatarType = 'default' | 
  'male1' | 'male2' | 'male3' | 'male4' | 'male5' | 'male6' | 'male7' | 'male8' | 'male9' | 'male10' |
  'male11' | 'male12' | 'male13' | 'male14' | 'male15' | 'male16' | 'male17' | 'male18' | 'male19' | 'male20' |
  'female1' | 'female2' | 'female3' | 'female4' | 'female5' | 'female6' | 'female7' | 'female8' | 'female9' | 'female10' |
  'female11' | 'female12' | 'female13' | 'female14' | 'female15' | 'female16' | 'female17' | 'female18' | 'female19' | 'female20';

interface AvatarProps {
  type?: AvatarType;
  className?: string;
}

export const AVATAR_OPTIONS: { value: AvatarType; label: string }[] = [
  { value: 'default', label: 'По умолчанию' },
  // Мужские
  { value: 'male1', label: '👨 Мужской 1' },
  { value: 'male2', label: '👨 Мужской 2' },
  { value: 'male3', label: '👨 Мужской 3' },
  { value: 'male4', label: '👨 Мужской 4' },
  { value: 'male5', label: '👨 Мужской 5' },
  { value: 'male6', label: '👨 Мужской 6' },
  { value: 'male7', label: '👨 Мужской 7' },
  { value: 'male8', label: '👨 Мужской 8' },
  { value: 'male9', label: '👨 Мужской 9' },
  { value: 'male10', label: '👨 Мужской 10' },
  { value: 'male11', label: '👨 Мужской 11' },
  { value: 'male12', label: '👨 Мужской 12' },
  { value: 'male13', label: '👨 Мужской 13' },
  { value: 'male14', label: '👨 Мужской 14' },
  { value: 'male15', label: '👨 Мужской 15' },
  { value: 'male16', label: '👨 Мужской 16' },
  { value: 'male17', label: '👨 Мужской 17' },
  { value: 'male18', label: '👨 Мужской 18' },
  { value: 'male19', label: '👨 Мужской 19' },
  { value: 'male20', label: '👨 Мужской 20' },
  // Женские
  { value: 'female1', label: '👩 Женский 1' },
  { value: 'female2', label: '👩 Женский 2' },
  { value: 'female3', label: '👩 Женский 3' },
  { value: 'female4', label: '👩 Женский 4' },
  { value: 'female5', label: '👩 Женский 5' },
  { value: 'female6', label: '👩 Женский 6' },
  { value: 'female7', label: '👩 Женский 7' },
  { value: 'female8', label: '👩 Женский 8' },
  { value: 'female9', label: '👩 Женский 9' },
  { value: 'female10', label: '👩 Женский 10' },
  { value: 'female11', label: '👩 Женский 11' },
  { value: 'female12', label: '👩 Женский 12' },
  { value: 'female13', label: '👩 Женский 13' },
  { value: 'female14', label: '👩 Женский 14' },
  { value: 'female15', label: '👩 Женский 15' },
  { value: 'female16', label: '👩 Женский 16' },
  { value: 'female17', label: '👩 Женский 17' },
  { value: 'female18', label: '👩 Женский 18' },
  { value: 'female19', label: '👩 Женский 19' },
  { value: 'female20', label: '👩 Женский 20' },
];

export default function Avatar({ type = 'default', className = 'w-12 h-12' }: AvatarProps) {
  const avatars: Record<AvatarType, ReactElement> = {
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
    male4: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4.3"/>
        <path d="M12 14c-5.5 0-7.5 2.5-7.5 4.5V20h15v-1.5c0-2-2-4.5-7.5-4.5z"/>
        <rect x="9.5" y="6.5" width="5" height="0.8" rx="0.4" fill="white" opacity="0.3"/>
        <circle cx="10" cy="7.8" r="0.4" fill="white"/>
        <circle cx="14" cy="7.8" r="0.4" fill="white"/>
      </svg>
    ),
    male5: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4c-2.5 0-4.5 2-4.5 4.5S9.5 13 12 13s4.5-2 4.5-4.5S14.5 4 12 4z"/>
        <path d="M12 14c-6 0-8 3-8 5.5V21h16v-1.5c0-2.5-2-5.5-8-5.5z"/>
        <path d="M8.5 5.5c0.5-0.8 1.5-1.5 3.5-1.5s3 0.7 3.5 1.5" stroke="white" strokeWidth="0.5" fill="none" opacity="0.4"/>
        <rect x="10.5" y="7" width="3" height="0.6" fill="white" opacity="0.5"/>
      </svg>
    ),
    male6: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4.1"/><path d="M12 14c-5.8 0-7.8 2.8-7.8 4.8V20h15.6v-1.2c0-2-2-4.8-7.8-4.8z"/><rect x="10" y="6.2" width="4" height="0.9" fill="white" opacity="0.35"/></svg>),
    male7: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8.1" rx="4.2" ry="4"/><path d="M12 14c-5.5 0-7.5 2.7-7.5 4.7V20h15v-1.3c0-2-2-4.7-7.5-4.7z"/><circle cx="10.3" cy="7.7" r="0.45" fill="white"/><circle cx="13.7" cy="7.7" r="0.45" fill="white"/></svg>),
    male8: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7.9" r="4.4"/><path d="M12 14c-6.1 0-8.1 3.1-8.1 5.1V21h16.2v-1.9c0-2-2-5.1-8.1-5.1z"/><path d="M9 5.8h6v1.1H9z" fill="white" opacity="0.38"/></svg>),
    male9: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8" rx="4.3" ry="4.6"/><path d="M12 14c-5.9 0-7.9 2.9-7.9 4.9V20h15.8v-1.1c0-2-2-4.9-7.9-4.9z"/><rect x="9.8" y="6.4" width="4.4" height="0.85" rx="0.3" fill="white" opacity="0.32"/></svg>),
    male10: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8.2" r="4.35"/><path d="M12 14c-5.7 0-7.7 2.6-7.7 4.6V20h15.4v-1.4c0-2-2-4.6-7.7-4.6z"/><circle cx="10.4" cy="7.9" r="0.48" fill="white"/><circle cx="13.6" cy="7.9" r="0.48" fill="white"/><path d="M9.2 6h5.6v0.7H9.2z" fill="white" opacity="0.36"/></svg>),
    male11: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.8c-2.6 0-4.6 2.1-4.6 4.6S9.4 13 12 13s4.6-2.1 4.6-4.6S14.6 3.8 12 3.8z"/><path d="M12 14c-6.15 0-8.15 3.15-8.15 5.15V21h16.3v-1.85c0-2-2-5.15-8.15-5.15z"/><rect x="10.2" y="6.8" width="3.6" height="0.75" fill="white" opacity="0.42"/></svg>),
    male12: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8.15" rx="4.15" ry="4.3"/><path d="M12 14c-5.65 0-7.65 2.75-7.65 4.75V20h15.3v-1.25c0-2-2-4.75-7.65-4.75z"/><circle cx="10.35" cy="7.85" r="0.52" fill="white"/><circle cx="13.65" cy="7.85" r="0.52" fill="white"/></svg>),
    male13: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8.05" r="4.25"/><path d="M12 14c-5.85 0-7.85 2.85-7.85 4.85V20h15.7v-1.15c0-2-2-4.85-7.85-4.85z"/><path d="M8.9 5.9c0.6-0.9 1.6-1.6 3.1-1.6s2.5 0.7 3.1 1.6" stroke="white" strokeWidth="0.55" fill="none" opacity="0.45"/></svg>),
    male14: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8" rx="4.05" ry="4.55"/><path d="M12 14c-5.75 0-7.75 2.65-7.75 4.65V20h15.5v-1.35c0-2-2-4.65-7.75-4.65z"/><rect x="10.1" y="6.6" width="3.8" height="0.8" rx="0.35" fill="white" opacity="0.34"/></svg>),
    male15: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="7.95" r="4.38"/><path d="M12 14c-6.05 0-8.05 3.05-8.05 5.05V21h16.1v-1.95c0-2-2-5.05-8.05-5.05z"/><circle cx="10.25" cy="7.75" r="0.5" fill="white"/><circle cx="13.75" cy="7.75" r="0.5" fill="white"/><path d="M9.5 6.1h5v0.75h-5z" fill="white" opacity="0.39"/></svg>),
    male16: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.9c-2.55 0-4.55 2.05-4.55 4.55S9.45 13 12 13s4.55-2.05 4.55-4.55S14.55 3.9 12 3.9z"/><path d="M12 14c-6.2 0-8.2 3.2-8.2 5.2V21h16.4v-1.8c0-2-2-5.2-8.2-5.2z"/><ellipse cx="10.2" cy="7.6" rx="0.85" ry="1.05" fill="white" opacity="0.65"/><ellipse cx="13.8" cy="7.6" rx="0.85" ry="1.05" fill="white" opacity="0.65"/></svg>),
    male17: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8.1" rx="4.25" ry="4.1"/><path d="M12 14c-5.95 0-7.95 2.95-7.95 4.95V20h15.9v-1.05c0-2-2-4.95-7.95-4.95z"/><path d="M8.8 5.7c0.65-0.85 1.65-1.55 3.2-1.55s2.55 0.7 3.2 1.55" stroke="white" strokeWidth="0.6" fill="none" opacity="0.43"/><rect x="10.3" y="7.1" width="3.4" height="0.7" fill="white" opacity="0.48"/></svg>),
    male18: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8.08" r="4.32"/><path d="M12 14c-5.88 0-7.88 2.88-7.88 4.88V20h15.76v-1.12c0-2-2-4.88-7.88-4.88z"/><circle cx="10.32" cy="7.82" r="0.46" fill="white"/><circle cx="13.68" cy="7.82" r="0.46" fill="white"/></svg>),
    male19: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8" rx="4.18" ry="4.48"/><path d="M12 14c-6.08 0-8.08 3.08-8.08 5.08V21h16.16v-1.92c0-2-2-5.08-8.08-5.08z"/><path d="M9.1 6.2h5.8v0.9H9.1z" fill="white" opacity="0.37"/></svg>),
    male20: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8.12" r="4.28"/><path d="M12 14c-5.82 0-7.82 2.82-7.82 4.82V20h15.64v-1.18c0-2-2-4.82-7.82-4.82z"/><rect x="10.15" y="6.7" width="3.7" height="0.82" rx="0.38" fill="white" opacity="0.33"/><circle cx="10.38" cy="7.88" r="0.44" fill="white"/><circle cx="13.62" cy="7.88" r="0.44" fill="white"/></svg>),
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
    female4: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4.5"/>
        <path d="M12 14c-5.8 0-7.8 2.8-7.8 4.8V20h15.6v-1.2c0-2-2-4.8-7.8-4.8z"/>
        <ellipse cx="10.2" cy="7.5" rx="0.9" ry="1.2" fill="white" opacity="0.7"/>
        <ellipse cx="13.8" cy="7.5" rx="0.9" ry="1.2" fill="white" opacity="0.7"/>
        <path d="M7.5 4.5c1-1.2 2.5-1.5 4.5-1.5s3.5 0.3 4.5 1.5" stroke="white" strokeWidth="0.7" fill="none" opacity="0.5"/>
        <path d="M10 9.5c0.5 0.3 1.2 0.5 2 0.5s1.5-0.2 2-0.5" stroke="white" strokeWidth="0.4" fill="none" opacity="0.6"/>
      </svg>
    ),
    female5: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <ellipse cx="12" cy="8.2" rx="4.8" ry="4.2"/>
        <path d="M12 14c-6.2 0-8.2 3-8.2 5.2V21h16.4v-1.8c0-2.2-2-5.2-8.2-5.2z"/>
        <circle cx="10.3" cy="7.9" r="0.7" fill="white" opacity="0.8"/>
        <circle cx="13.7" cy="7.9" r="0.7" fill="white" opacity="0.8"/>
        <path d="M6.8 4.8c1.2-1.5 3-2 5.2-2s4 0.5 5.2 2" stroke="white" strokeWidth="0.8" fill="none" opacity="0.5"/>
        <ellipse cx="12" cy="10" rx="1.5" ry="0.5" fill="white" opacity="0.4"/>
      </svg>
    ),
    female6: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8.1" r="4.15"/><path d="M12 14c-5.9 0-7.9 2.9-7.9 4.9V20h15.8v-1.1c0-2-2-4.9-7.9-4.9z"/><ellipse cx="10.25" cy="7.65" rx="0.82" ry="1.08" fill="white" opacity="0.68"/><ellipse cx="13.75" cy="7.65" rx="0.82" ry="1.08" fill="white" opacity="0.68"/><path d="M7.8 5.2c1.05-1.25 2.6-1.7 4.2-1.7s3.15 0.45 4.2 1.7" stroke="white" strokeWidth="0.65" fill="none" opacity="0.52"/></svg>),
    female7: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8.15" rx="4.65" ry="4.15"/><path d="M12 14c-6.05 0-8.05 3.05-8.05 5.05V21h16.1v-1.95c0-2.05-2-5.05-8.05-5.05z"/><circle cx="10.35" cy="7.95" r="0.68" fill="white" opacity="0.78"/><circle cx="13.65" cy="7.95" r="0.68" fill="white" opacity="0.78"/><ellipse cx="12" cy="9.8" rx="1.4" ry="0.48" fill="white" opacity="0.42"/></svg>),
    female8: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8.05" r="4.35"/><path d="M12 14c-5.85 0-7.85 2.85-7.85 4.85V20h15.7v-1.15c0-2-2-4.85-7.85-4.85z"/><path d="M7.9 5.8c0.95-1.15 2.45-1.6 4.1-1.6s3.15 0.45 4.1 1.6" stroke="white" strokeWidth="0.7" fill="none" opacity="0.48"/><ellipse cx="10.3" cy="7.7" rx="0.88" ry="1.12" fill="white" opacity="0.72"/><ellipse cx="13.7" cy="7.7" rx="0.88" ry="1.12" fill="white" opacity="0.72"/></svg>),
    female9: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8.18" rx="4.72" ry="4.08"/><path d="M12 14c-6.12 0-8.12 3.12-8.12 5.12V21h16.24v-1.88c0-2-2-5.12-8.12-5.12z"/><circle cx="10.32" cy="7.92" r="0.72" fill="white" opacity="0.82"/><circle cx="13.68" cy="7.92" r="0.72" fill="white" opacity="0.82"/><path d="M6.9 4.9c1.18-1.45 2.95-1.95 5.1-1.95s3.92 0.5 5.1 1.95" stroke="white" strokeWidth="0.75" fill="none" opacity="0.54"/></svg>),
    female10: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8.12" r="4.28"/><path d="M12 14c-5.95 0-7.95 2.95-7.95 4.95V20h15.9v-1.05c0-2-2-4.95-7.95-4.95z"/><ellipse cx="10.28" cy="7.68" rx="0.85" ry="1.1" fill="white" opacity="0.7"/><ellipse cx="13.72" cy="7.68" rx="0.85" ry="1.1" fill="white" opacity="0.7"/><path d="M9.8 9.3c0.55 0.32 1.25 0.52 2.2 0.52s1.65-0.2 2.2-0.52" stroke="white" strokeWidth="0.42" fill="none" opacity="0.62"/></svg>),
    female11: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8.08" rx="4.55" ry="4.25"/><path d="M12 14c-6.02 0-8.02 3.02-8.02 5.02V21h16.04v-1.98c0-2-2-5.02-8.02-5.02z"/><circle cx="10.38" cy="7.88" r="0.65" fill="white" opacity="0.75"/><circle cx="13.62" cy="7.88" r="0.65" fill="white" opacity="0.75"/><ellipse cx="12" cy="9.9" rx="1.45" ry="0.46" fill="white" opacity="0.38"/></svg>),
    female12: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4.42"/><path d="M12 14c-5.88 0-7.88 2.88-7.88 4.88V20h15.76v-1.12c0-2-2-4.88-7.88-4.88z"/><path d="M7.7 5.5c1.08-1.3 2.7-1.8 4.3-1.8s3.22 0.5 4.3 1.8" stroke="white" strokeWidth="0.72" fill="none" opacity="0.5"/><ellipse cx="10.32" cy="7.72" rx="0.9" ry="1.15" fill="white" opacity="0.74"/><ellipse cx="13.68" cy="7.72" rx="0.9" ry="1.15" fill="white" opacity="0.74"/></svg>),
    female13: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8.22" rx="4.78" ry="4.18"/><path d="M12 14c-6.18 0-8.18 3.18-8.18 5.18V21h16.36v-1.82c0-2-2-5.18-8.18-5.18z"/><circle cx="10.28" cy="7.98" r="0.74" fill="white" opacity="0.84"/><circle cx="13.72" cy="7.98" r="0.74" fill="white" opacity="0.84"/><path d="M6.7 4.7c1.25-1.55 3.05-2.05 5.3-2.05s4.05 0.5 5.3 2.05" stroke="white" strokeWidth="0.82" fill="none" opacity="0.56"/></svg>),
    female14: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8.15" r="4.32"/><path d="M12 14c-5.82 0-7.82 2.82-7.82 4.82V20h15.64v-1.18c0-2-2-4.82-7.82-4.82z"/><ellipse cx="10.25" cy="7.62" rx="0.78" ry="1.05" fill="white" opacity="0.66"/><ellipse cx="13.75" cy="7.62" rx="0.78" ry="1.05" fill="white" opacity="0.66"/><path d="M9.9 9.4c0.52 0.28 1.18 0.48 2.1 0.48s1.58-0.2 2.1-0.48" stroke="white" strokeWidth="0.38" fill="none" opacity="0.58"/></svg>),
    female15: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8.05" rx="4.6" ry="4.3"/><path d="M12 14c-6.08 0-8.08 3.08-8.08 5.08V21h16.16v-1.92c0-2-2-5.08-8.08-5.08z"/><circle cx="10.35" cy="7.85" r="0.7" fill="white" opacity="0.8"/><circle cx="13.65" cy="7.85" r="0.7" fill="white" opacity="0.8"/><ellipse cx="12" cy="9.95" rx="1.52" ry="0.5" fill="white" opacity="0.44"/></svg>),
    female16: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8.18" r="4.38"/><path d="M12 14c-5.92 0-7.92 2.92-7.92 4.92V20h15.84v-1.08c0-2-2-4.92-7.92-4.92z"/><path d="M7.6 5.3c1.12-1.35 2.8-1.85 4.4-1.85s3.28 0.5 4.4 1.85" stroke="white" strokeWidth="0.68" fill="none" opacity="0.46"/><ellipse cx="10.28" cy="7.75" rx="0.86" ry="1.08" fill="white" opacity="0.71"/><ellipse cx="13.72" cy="7.75" rx="0.86" ry="1.08" fill="white" opacity="0.71"/></svg>),
    female17: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8.12" rx="4.68" ry="4.22"/><path d="M12 14c-6.15 0-8.15 3.15-8.15 5.15V21h16.3v-1.85c0-2-2-5.15-8.15-5.15z"/><circle cx="10.32" cy="7.92" r="0.68" fill="white" opacity="0.78"/><circle cx="13.68" cy="7.92" r="0.68" fill="white" opacity="0.78"/><path d="M6.85 4.85c1.22-1.5 2.98-2 5.15-2s3.93 0.5 5.15 2" stroke="white" strokeWidth="0.78" fill="none" opacity="0.53"/></svg>),
    female18: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8.08" r="4.45"/><path d="M12 14c-5.98 0-7.98 2.98-7.98 4.98V20h15.96v-1.02c0-2-2-4.98-7.98-4.98z"/><ellipse cx="10.3" cy="7.68" rx="0.88" ry="1.12" fill="white" opacity="0.73"/><ellipse cx="13.7" cy="7.68" rx="0.88" ry="1.12" fill="white" opacity="0.73"/><path d="M9.85 9.35c0.58 0.3 1.28 0.5 2.15 0.5s1.57-0.2 2.15-0.5" stroke="white" strokeWidth="0.4" fill="none" opacity="0.6"/></svg>),
    female19: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="8.2" rx="4.75" ry="4.12"/><path d="M12 14c-6.22 0-8.22 3.22-8.22 5.22V21h16.44v-1.78c0-2-2-5.22-8.22-5.22z"/><circle cx="10.25" cy="7.95" r="0.72" fill="white" opacity="0.82"/><circle cx="13.75" cy="7.95" r="0.72" fill="white" opacity="0.82"/><path d="M6.75 4.75c1.28-1.58 3.08-2.08 5.25-2.08s3.97 0.5 5.25 2.08" stroke="white" strokeWidth="0.85" fill="none" opacity="0.58"/><ellipse cx="12" cy="10.05" rx="1.55" ry="0.52" fill="white" opacity="0.46"/></svg>),
    female20: (<svg className={className} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8.22" r="4.48"/><path d="M12 14c-5.88 0-7.88 2.88-7.88 4.88V20h15.76v-1.12c0-2-2-4.88-7.88-4.88z"/><path d="M7.5 5.1c1.15-1.4 2.85-1.9 4.5-1.9s3.35 0.5 4.5 1.9" stroke="white" strokeWidth="0.75" fill="none" opacity="0.51"/><ellipse cx="10.3" cy="7.78" rx="0.92" ry="1.18" fill="white" opacity="0.76"/><ellipse cx="13.7" cy="7.78" rx="0.92" ry="1.18" fill="white" opacity="0.76"/><path d="M9.75 9.45c0.6 0.35 1.35 0.55 2.25 0.55s1.65-0.2 2.25-0.55" stroke="white" strokeWidth="0.45" fill="none" opacity="0.64"/></svg>),
  };

  return avatars[type] || avatars.default;
}
