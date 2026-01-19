"use client";

import React, { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { WashingSpinner } from '@/components/Icons';

interface AddStudentModalProps {
  onClose: () => void;
}

export default function AddStudentModal({ onClose }: AddStudentModalProps) {
  const { addStudent } = useLaundry();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [room, setRoom] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateRoom = (roomValue: string): { valid: boolean; error?: string } => {
    if (!roomValue.trim()) {
      return { valid: false, error: 'РљРѕРјРЅР°С‚Р° РѕР±СЏР·Р°С‚РµР»СЊРЅР°' };
    }

    const trimmedRoom = roomValue.trim().toUpperCase();

    // РџСЂРѕРІРµСЂРєР° С„РѕСЂРјР°С‚Р°: С‚РѕР»СЊРєРѕ Р°РЅРіР»РёР№СЃРєРёРµ Р±СѓРєРІС‹ A РёР»Рё B + 3 С†РёС„СЂС‹
    const roomRegex = /^[AB][0-9]{3}$/;
    if (!roomRegex.test(trimmedRoom)) {
      return { 
        valid: false, 
        error: 'Р¤РѕСЂРјР°С‚: A РёР»Рё B + 3 С†РёС„СЂС‹ (РЅР°РїСЂРёРјРµСЂ: A301, B402)' 
      };
    }

    // РџСЂРѕРІРµСЂРєР° РґРёР°РїР°Р·РѕРЅР° РЅРѕРјРµСЂРѕРІ: 101-999
    const roomNumber = parseInt(trimmedRoom.slice(1));
    if (roomNumber < 101 || roomNumber > 999) {
      return { 
        valid: false, 
        error: 'РќРѕРјРµСЂ РєРѕРјРЅР°С‚С‹ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ РѕС‚ 101 РґРѕ 999' 
      };
    }

    return { valid: true };
  };

  const handleSubmit = async () => {
    // Р’Р°Р»РёРґР°С†РёСЏ РёРјРµРЅРё
    if (!firstName.trim()) {
      alert('вќЊ РЈРєР°Р¶РёС‚Рµ РёРјСЏ' + " \u2705");
      return;
    }

    // Р’Р°Р»РёРґР°С†РёСЏ С„Р°РјРёР»РёРё
    if (!lastName.trim()) {
      alert('вќЊ РЈРєР°Р¶РёС‚Рµ С„Р°РјРёР»РёСЋ' + " \u2705");
      return;
    }

    // Р’Р°Р»РёРґР°С†РёСЏ РєРѕРјРЅР°С‚С‹
    const roomValidation = validateRoom(room);
    if (!roomValidation.valid) {
      alert(`вќЊ ${roomValidation.error}` + " \u2705");
      return;
    }

    const validatedRoom = room.trim().toUpperCase();

    setIsSubmitting(true);
    try {
      await addStudent(
        firstName.trim(),
        lastName.trim(),
        validatedRoom,
        middleName.trim() || ""
      );
      
      alert('вњ… РЎС‚СѓРґРµРЅС‚ РґРѕР±Р°РІР»РµРЅ!' + " \u2705");
      onClose();
    } catch (error: any) {
      console.error('Error adding student:', error);
      
      // РџСЂРѕРІРµСЂРєР° РЅР° РґСѓР±Р»РёРєР°С‚
      if (error.message?.includes('duplicate key') || error.message?.includes('unique_student_fullname')) {
        alert('вќЊ РЎС‚СѓРґРµРЅС‚ СЃ С‚Р°РєРёРј Р¤РРћ Рё РєРѕРјРЅР°С‚РѕР№ СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚' + " \u2705");
      } else {
        alert('вќЊ РћС€РёР±РєР° РґРѕР±Р°РІР»РµРЅРёСЏ: ' + (error.message || 'РќРµРёР·РІРµСЃС‚РЅР°СЏ РѕС€РёР±РєР°') + " \u2705");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoomChange = (value: string) => {
    // Р Р°Р·СЂРµС€Р°РµРј С‚РѕР»СЊРєРѕ Р°РЅРіР»РёР№СЃРєРёРµ Р±СѓРєРІС‹ A, B Рё С†РёС„СЂС‹
    const filtered = value.toUpperCase().replace(/[^AB0-9]/g, '');
    setRoom(filtered);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-gray-900 mb-4">вћ• Р”РѕР±Р°РІРёС‚СЊ СЃС‚СѓРґРµРЅС‚Р°</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-900">
              РљРѕРјРЅР°С‚Р° <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => handleRoomChange(e.target.value)}
              placeholder="A301 РёР»Рё B402"
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 uppercase"
              maxLength={4}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              РўРѕР»СЊРєРѕ Р±Р»РѕРєРё A РёР»Рё B, РЅРѕРјРµСЂР° 101-999 (РЅР°РїСЂРёРјРµСЂ: A301, B402)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-900">
              Р¤Р°РјРёР»РёСЏ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              placeholder="РРІР°РЅРѕРІ"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-900">
              РРјСЏ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              placeholder="РРІР°РЅ"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-900">
              РћС‚С‡РµСЃС‚РІРѕ
            </label>
            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              placeholder="РРІР°РЅРѕРІРёС‡"
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 btn btn-neutral"
          >
            РћС‚РјРµРЅР°
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 btn btn-primary btn-glow"
          >
            {isSubmitting ? (
              <>
                <WashingSpinner className="w-4 h-4" />
                <span>вЏі Р”РѕР±Р°РІР»РµРЅРёРµ...</span>
              </>
            ) : (
              <>вћ• Р”РѕР±Р°РІРёС‚СЊ</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
