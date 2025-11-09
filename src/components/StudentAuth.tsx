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

  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(query) ||
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

    if (!selectedStudent.is_registered && password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      return;
    }

    setLoading(true);
    try {
      if (selectedStudent.is_registered) {
        await loginStudent(selectedStudent.id, password);
      } else {
        await registerStudent(selectedStudent.id, password);
      }
      setError('');
    } catch (err: any) {
      setError(err.message || (
        selectedStudent.is_registered ? 'Неверный пароль' : 'Ошибка регистрации'
      ));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'select') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow-xl border-2 border-blue-200">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Очередь на стирку</h2>
          <h3 className="text-lg font-bold mb-4 text-gray-900">Выберите себя из списка</h3>
        </div>

        {/* ✅ Поиск с темным текстом и placeholder */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Поиск по имени или комнате..."
          className="w-full p-4 rounded-lg border-2 border-blue-400 bg-white text-gray-900 text-xl font-semibold mb-4 focus:border-blue-600 focus:ring-2 focus:ring-blue-300 placeholder:text-gray-600"
        />

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-900">
              <p className="text-xl font-bold">🔍 Ничего не найдено</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => handleStudentSelect(student)}
                className="w-full bg-white hover:bg-blue-100 border-3 border-gray-400 hover:border-blue-600 rounded-lg p-4 text-left transition-all shadow-md hover:shadow-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-xl text-gray-900">{student.full_name}</div>
                    {student.room && (
                      <div className="text-base text-gray-700 font-bold">🚪 Комната {student.room}</div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {student.is_registered ? (
                      <span className="bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md whitespace-nowrap">
                        ✅
                      </span>
                    ) : (
                      <span className="bg-yellow-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-md whitespace-nowrap">
                        🆕
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

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl border-2 border-gray-200">
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

      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl">
            👤
          </div>
          <div>
            <div className="font-black text-xl text-gray-900">{selectedStudent?.full_name}</div>
            {selectedStudent?.room && (
              <div className="text-sm text-gray-900 font-medium">🚪 Комната {selectedStudent.room}</div>
            )}
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-black mb-2 text-gray-900">
        {selectedStudent?.is_registered ? '🔐 Вход' : '🆕 Первый раз?'}
      </h2>
      <p className="text-gray-900 mb-6 font-medium">
        {selectedStudent?.is_registered 
          ? 'Введите ваш пароль' 
          : 'Придумайте пароль для регистрации'}
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-bold mb-2 text-gray-900">
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
            className="w-full rounded-lg border-2 border-gray-400 bg-white text-gray-900 p-4 text-lg font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-600"
            placeholder="Введите пароль"
            autoFocus
          />
          {!selectedStudent?.is_registered && (
            <p className="text-xs text-gray-700 mt-1 font-medium">От 6 символов</p>
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
            selectedStudent?.is_registered ? '🔐 Войти' : '🆕 Зарегистрироваться'
          )}
        </button>
      </div>
    </div>
  );
}