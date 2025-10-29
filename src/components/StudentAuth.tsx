"use client";

import { useState, useEffect } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { Student } from '@/types';

export default function StudentAuth() {
  const { students, registerStudent, loginStudent } = useLaundry();
  
  const [step, setStep] = useState<'select' | 'auth'>('select');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Фильтрация студентов по поиску
  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(query) ||
      (s.room && s.room.toLowerCase().includes(query))
    );
  });

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setStep('auth');
    setError('');
  };

  const handleAuth = async () => {
    if (!selectedStudent || !password) {
      setError('Введите пароль');
      return;
    }

    if (!selectedStudent.isRegistered && password.length < 4) {
      setError('Пароль должен быть минимум 4 символа');
      return;
    }

    setLoading(true);
    try {
      if (selectedStudent.isRegistered) {
        await loginStudent(selectedStudent.id, password);
      } else {
        await registerStudent(selectedStudent.id, password);
      }
      setError('');
    } catch (err: any) {
      setError(err.message || (
        selectedStudent.isRegistered ? 'Неверный пароль' : 'Ошибка регистрации'
      ));
    } finally {
      setLoading(false);
    }
  };

  // Шаг 1: Выбор студента
  if (step === 'select') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow-xl border-2 border-blue-200">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Очередь на стирку</h2>
          <h3 className="text-lg font-bold mb-4 text-gray-900">Выберите себя из списка</h3>
        </div>

        {/* Поиск */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Поиск по имени или комнате..."
          className="w-full p-4 rounded-lg border-2 border-blue-300 text-xl font-semibold mb-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />

        {/* Список студентов */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p className="text-xl">🔍 Ничего не найдено</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => handleStudentSelect(student)}
                className="w-full bg-white hover:bg-blue-100 border-3 border-gray-400 hover:border-blue-600 rounded-lg p-4 text-left transition-all shadow-md hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-black text-xl text-gray-900">{student.fullName}</div>
                    {student.room && (
                      <div className="text-base text-gray-700 font-bold">🚪 Комната {student.room}</div>
                    )}
                  </div>
                  <div>
                    {student.isRegistered ? (
                      <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-black shadow-md">
                        ✅ Зарегистрирован
                      </span>
                    ) : (
                      <span className="bg-yellow-500 text-white px-4 py-2 rounded-full text-sm font-black shadow-md">
                        🆕 Новый
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Шаг 2: Ввод пароля
  return (
    <div className="bg-white p-6 rounded-lg shadow-xl border-2 border-gray-200">
      {/* Кнопка назад */}
      <button
        onClick={() => {
          setStep('select');
          setPassword('');
          setError('');
        }}
        className="text-blue-600 hover:text-blue-800 font-bold mb-4 flex items-center gap-2"
      >
        ← Назад
      </button>

      {/* Инфо о студенте */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <div className="font-black text-xl text-gray-900">{selectedStudent?.fullName}</div>
            {selectedStudent?.room && (
              <div className="text-sm text-gray-600 font-medium">🚪 Комната {selectedStudent.room}</div>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-black mb-2 text-gray-900">
        {selectedStudent?.isRegistered ? '🔐 Вход' : '🆕 Первый раз?'}
      </h2>
      <p className="text-gray-600 mb-6">
        {selectedStudent?.isRegistered 
          ? 'Введите ваш пароль' 
          : 'Придумайте пароль для регистрации'}
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-bold mb-2 text-gray-700">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
            className="w-full rounded-lg border-2 border-gray-300 p-4 text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Введите пароль"
            autoFocus
          />
          {!selectedStudent?.isRegistered && (
            <p className="text-xs text-gray-500 mt-1">Минимум 4 символа</p>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        <button
          onClick={handleAuth}
          disabled={loading || !password}
          className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {loading ? '⏳ Загрузка...' : (
            selectedStudent?.isRegistered ? '🔐 Войти' : '🆕 Зарегистрироваться'
          )}
        </button>
      </div>
    </div>
  );
}
