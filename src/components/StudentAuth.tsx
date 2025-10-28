"use client";

import { useState, useEffect } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  room: string | null;
  isRegistered: boolean;
}

export default function StudentAuth() {
  const { user, registerStudent, loginStudent } = useLaundry();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Load students from Supabase
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      // Здесь будет загрузка из Supabase
      setLoading(false);
    } catch (err) {
      console.error('Error loading students:', err);
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!selectedStudent || !password) {
      setError('Выберите студента и введите пароль');
      return;
    }

    const student = students.find(s => s.id === selectedStudent);
    if (!student) return;

    if (student.isRegistered) {
      setError('Этот студент уже зарегистрирован');
      return;
    }

    try {
      await registerStudent(student.id, password);
      setError('');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
    }
  };

  const handleLogin = async () => {
    if (!selectedStudent || !password) {
      setError('Выберите студента и введите пароль');
      return;
    }

    try {
      await loginStudent(selectedStudent, password);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Неверный пароль');
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border border-gray-200">
        <p className="text-gray-600">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg mb-6 border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        {isRegistering ? '📝 Регистрация' : '🔐 Вход'}
      </h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="student" className="block text-sm font-bold mb-2 text-gray-700">
            Выберите себя из списка
          </label>
          <select
            id="student"
            value={selectedStudent}
            onChange={(e) => {
              setSelectedStudent(e.target.value);
              setError('');
            }}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">-- Выберите студента --</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.fullName} {student.room && `(Комната ${student.room})`}
                {student.isRegistered && ' ✓'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-bold mb-2 text-gray-700">
            {isRegistering ? 'Придумайте пароль' : 'Введите пароль'}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyPress={(e) => e.key === 'Enter' && (isRegistering ? handleRegister() : handleLogin())}
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Введите пароль"
          />
        </div>

        {error && (
          <p className="text-red-600 text-sm font-semibold">{error}</p>
        )}

        <button
          onClick={isRegistering ? handleRegister : handleLogin}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-md"
        >
          {isRegistering ? '📝 Зарегистрироваться' : '🔐 Войти'}
        </button>

        <button
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError('');
            setPassword('');
          }}
          className="w-full text-blue-600 hover:text-blue-800 font-semibold py-2"
        >
          {isRegistering ? 'Уже зарегистрированы? Войти' : 'Первый раз? Зарегистрироваться'}
        </button>
      </div>
    </div>
  );
}
