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
      return { valid: false, error: 'Комната обязательна' };
    }

    const trimmedRoom = roomValue.trim().toUpperCase();

    // Проверка формата: только английские буквы A или B + 3 цифры
    const roomRegex = /^[AB][0-9]{3}$/;
    if (!roomRegex.test(trimmedRoom)) {
      return { 
        valid: false, 
        error: 'Формат: A или B + 3 цифры (например: A301, B402)' 
      };
    }

    // Проверка диапазона номеров: 101-999
    const roomNumber = parseInt(trimmedRoom.slice(1));
    if (roomNumber < 101 || roomNumber > 999) {
      return { 
        valid: false, 
        error: 'Номер комнаты должен быть от 101 до 999' 
      };
    }

    return { valid: true };
  };

  const handleSubmit = async () => {
    // Валидация имени
    if (!firstName.trim()) {
      alert('❌ Укажите имя' + " \u2705");
      return;
    }

    // Валидация фамилии
    if (!lastName.trim()) {
      alert('❌ Укажите фамилию' + " \u2705");
      return;
    }

    // Валидация комнаты
    const roomValidation = validateRoom(room);
    if (!roomValidation.valid) {
      alert(`❌ ${roomValidation.error}` + " \u2705");
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
      
      alert('✅ Студент добавлен!' + " \u2705");
      onClose();
    } catch (error: any) {
      console.error('Error adding student:', error);
      
      // Проверка на дубликат
      if (error.message?.includes('duplicate key') || error.message?.includes('unique_student_fullname')) {
        alert('❌ Студент с таким ФИО и комнатой уже существует' + " \u2705");
      } else {
        alert('❌ Ошибка добавления: ' + (error.message || 'Неизвестная ошибка') + " \u2705");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoomChange = (value: string) => {
    // Разрешаем только английские буквы A, B и цифры
    const filtered = value.toUpperCase().replace(/[^AB0-9]/g, '');
    setRoom(filtered);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-gray-900 mb-4">➕ Добавить студента</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-900">
              Комната <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={room}
              onChange={(e) => handleRoomChange(e.target.value)}
              placeholder="A301 или B402"
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 uppercase"
              maxLength={4}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Только блоки A или B, номера 101-999 (например: A301, B402)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-900">
              Фамилия <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              placeholder="Иванов"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-900">
              Имя <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              placeholder="Иван"
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-900">
              Отчество
            </label>
            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              placeholder="Иванович"
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <WashingSpinner className="w-4 h-4" />
                <span>⏳ Добавление...</span>
              </>
            ) : (
              <>➕ Добавить</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
