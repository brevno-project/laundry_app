"use client";

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { MachineStatus } from '@/types';

export default function AdminPanel() {
  const { 
    isAdmin, 
    setIsAdmin, 
    verifyAdminKey, 
    machineState,
    queue,
    students,
    markDone, 
    startNext, 
    clearQueue,
    resetStudentRegistration 
  } = useLaundry();
  
  const [adminKey, setAdminKey] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  const [resetingStudentId, setResetingStudentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  // Find current washing item from queue
  const washingItem = queue.find(item => item.status === 'washing');

  // Handle admin login
  const handleAdminLogin = () => {
    if (adminKey.trim() === '') {
      setError('Please enter the admin key');
      return;
    }
    
    const isValid = verifyAdminKey(adminKey.trim());
    if (!isValid) {
      setError('Invalid admin key');
    } else {
      setError('');
    }
  };

  // Handle admin logout
  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminKey('');
  };

  // Handle clear queue confirmation
  const handleClearQueueConfirm = () => {
    clearQueue();
    setShowConfirmClear(false);
  };

  // Handle student registration reset
  const handleResetStudent = async (studentId: string) => {
    setResetingStudentId(studentId);
    try {
      await resetStudentRegistration(studentId);
    } catch (err: any) {
      console.error('Error resetting student:', err);
    } finally {
      setResetingStudentId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">🔒 Администратор</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="adminKey" className="block text-sm font-bold mb-2 text-gray-700">
              Ключ администратора
            </label>
            <input
              id="adminKey"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm p-3 text-gray-900 placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              placeholder="Введите ключ"
            />
            {error && <p className="mt-2 text-red-600 text-sm font-semibold">{error}</p>}
          </div>
          <button
            onClick={handleAdminLogin}
            className="w-full bg-purple-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-purple-700 transition-colors shadow-md"
          >
            Войти как админ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-purple-700 p-6 rounded-lg shadow-lg border-2 border-purple-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-white">👑 Панель админа</h2>
        <button
          onClick={handleAdminLogout}
          className="bg-purple-800 hover:bg-purple-900 text-white text-sm font-semibold px-3 py-2 rounded transition-colors"
        >
          🚪 Выйти
        </button>
      </div>
      
      <div className="space-y-4">
        {washingItem && (
          <button
            onClick={() => markDone(washingItem.id)}
            className="w-full bg-green-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-green-700 transition-colors shadow-md"
          >
            ✅ Отметить стирку завершенной
          </button>
        )}
        
        <button
          onClick={startNext}
          className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-md"
        >
          ▶️ Запустить следующего
        </button>
        
        {!showConfirmClear ? (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="w-full bg-red-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-red-700 transition-colors shadow-md"
          >
            🗑️ Очистить очередь
          </button>
        ) : (
          <div className="bg-white p-4 rounded-md border-2 border-red-400">
            <p className="text-red-700 font-bold text-base mb-3">⚠️ Вы уверены, что хотите очистить всю очередь?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
              >
                ❌ Отмена
              </button>
              <button
                onClick={handleClearQueueConfirm}
                className="flex-1 bg-red-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
              >
                ✅ Да, очистить
              </button>
            </div>
          </div>
        )}

        {/* Students Management */}
        <button
          onClick={() => setShowStudents(!showStudents)}
          className="w-full bg-purple-800 text-white font-semibold py-3 px-4 rounded-md hover:bg-purple-900 transition-colors shadow-md"
        >
          👥 {showStudents ? 'Скрыть студентов' : 'Управление студентами'}
        </button>

        {showStudents && (
          <div className="bg-white p-4 rounded-md max-h-96 overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Список студентов</h3>
            <div className="space-y-2">
              {students.map((student) => (
                <div key={student.id} className="flex justify-between items-center p-2 border-b">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {student.fullName} 
                      {student.room && <span className="text-gray-500 text-sm"> ({student.room})</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {student.isRegistered ? (
                        <span className="text-green-600">✅ Зарегистрирован</span>
                      ) : (
                        <span className="text-gray-400">❌ Не зарегистрирован</span>
                      )}
                    </p>
                  </div>
                  {student.isRegistered && (
                    <button
                      onClick={() => handleResetStudent(student.id)}
                      disabled={resetingStudentId === student.id}
                      className="bg-orange-600 text-white text-xs font-semibold py-1 px-3 rounded hover:bg-orange-700 disabled:opacity-50"
                    >
                      {resetingStudentId === student.id ? '⏳' : '🔄 Сбросить'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
