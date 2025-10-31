"use client";

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { Student } from '@/types';

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
    clearCompletedQueue,
    resetStudentRegistration,
    banStudent,
    unbanStudent,
    addStudent,
    updateStudent,
    deleteStudent,
    updateAdminKey,
  } = useLaundry();
  
  const [adminKey, setAdminKey] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  const [resetingStudentId, setResetingStudentId] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  // Модальные окна
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [showBanStudent, setShowBanStudent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUpdateKey, setShowUpdateKey] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Форма добавления студента
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRoom, setNewRoom] = useState('');
  
  // Форма редактирования студента
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editRoom, setEditRoom] = useState('');
  
  // Форма бана
  const [banReason, setBanReason] = useState('');
  
  // Форма смены ключа
  const [newAdminKey, setNewAdminKey] = useState('');
  const [confirmAdminKey, setConfirmAdminKey] = useState('');
  
  // Поиск студентов
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'unregistered' | 'banned'>('all');
  
  const washingItem = queue.find(item => item.status === 'washing');

  // Фильтрация студентов
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (student.room && student.room.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = 
      filterStatus === 'all' ? true :
      filterStatus === 'registered' ? student.isRegistered :
      filterStatus === 'unregistered' ? !student.isRegistered :
      filterStatus === 'banned' ? student.is_banned : true;
    
    return matchesSearch && matchesFilter;
  });

  // Обработчики
  const handleAdminLogin = () => {
    if (adminKey.trim() === '') {
      setError('Введите ключ администратора');
      return;
    }
    
    const isValid = verifyAdminKey(adminKey.trim());
    if (!isValid) {
      setError('Неверный ключ');
    } else {
      setError('');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminKey('');
  };

  const handleClearQueueConfirm = () => {
    clearQueue();
    setShowConfirmClear(false);
  };

  const handleResetStudent = async (studentId: string) => {
    setResetingStudentId(studentId);
    try {
      await resetStudentRegistration(studentId);
    } catch (err: any) {
      console.error('Error resetting student:', err);
      alert('Ошибка сброса регистрации');
    } finally {
      setResetingStudentId(null);
    }
  };

  const handleAddStudent = async () => {
    if (!newFirstName || !newLastName) {
      alert('Введите имя и фамилию');
      return;
    }
    
    try {
      await addStudent(newFirstName, newLastName, newRoom || undefined);
      setShowAddStudent(false);
      setNewFirstName('');
      setNewLastName('');
      setNewRoom('');
      alert('✅ Студент добавлен!');
    } catch (err: any) {
      alert('❌ Ошибка: ' + err.message);
    }
  };

  const handleEditStudent = async () => {
    if (!selectedStudent) return;
    
    try {
      await updateStudent(selectedStudent.id, {
        firstName: editFirstName || undefined,
        lastName: editLastName || undefined,
        room: editRoom || undefined,
      });
      setShowEditStudent(false);
      setSelectedStudent(null);
      alert('✅ Данные обновлены!');
    } catch (err: any) {
      alert('❌ Ошибка: ' + err.message);
    }
  };

  const handleBanStudent = async () => {
    if (!selectedStudent) return;
    
    try {
      await banStudent(selectedStudent.id, banReason || 'Не указано');
      setShowBanStudent(false);
      setSelectedStudent(null);
      setBanReason('');
      alert('✅ Студент забанен!');
    } catch (err: any) {
      alert('❌ Ошибка: ' + err.message);
    }
  };

  const handleUnbanStudent = async (studentId: string) => {
    try {
      await unbanStudent(studentId);
      alert('✅ Студент разбанен!');
    } catch (err: any) {
      alert('❌ Ошибка: ' + err.message);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    
    try {
      await deleteStudent(selectedStudent.id);
      setShowDeleteConfirm(false);
      setSelectedStudent(null);
      alert('✅ Студент удалён!');
    } catch (err: any) {
      alert('❌ Ошибка: ' + err.message);
    }
  };

  const handleUpdateAdminKey = async () => {
    if (newAdminKey.length < 6) {
      alert('Ключ должен быть минимум 6 символов');
      return;
    }
    
    if (newAdminKey !== confirmAdminKey) {
      alert('Ключи не совпадают');
      return;
    }
    
    try {
      await updateAdminKey(newAdminKey);
      setShowUpdateKey(false);
      setNewAdminKey('');
      setConfirmAdminKey('');
    } catch (err: any) {
      alert('❌ Ошибка: ' + err.message);
    }
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setEditFirstName(student.firstName);
    setEditLastName(student.lastName);
    setEditRoom(student.room || '');
    setShowEditStudent(true);
  };

  const openBanModal = (student: Student) => {
    setSelectedStudent(student);
    setBanReason('');
    setShowBanStudent(true);
  };

  const openDeleteModal = (student: Student) => {
    setSelectedStudent(student);
    setShowDeleteConfirm(true);
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
        {/* Управление очередью */}
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

        <button
          onClick={() => clearCompletedQueue()}
          className="w-full bg-orange-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-orange-700 transition-colors shadow-md"
        >
          🧹 Удалить завершенных
        </button>

        {/* Управление студентами */}
        <button
          onClick={() => setShowStudents(!showStudents)}
          className="w-full bg-purple-800 text-white font-semibold py-3 px-4 rounded-md hover:bg-purple-900 transition-colors shadow-md"
        >
          👥 {showStudents ? 'Скрыть студентов' : 'Управление студентами'}
        </button>

        {showStudents && (
          <div className="bg-white p-4 rounded-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Список студентов ({filteredStudents.length})</h3>
              <button
                onClick={() => setShowAddStudent(true)}
                className="bg-green-600 text-white text-sm font-semibold py-2 px-4 rounded hover:bg-green-700"
              >
                ➕ Добавить студента
              </button>
            </div>

            {/* Поиск и фильтры */}
            <div className="space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Поиск по имени или комнате..."
                className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
              />
              
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`flex-1 py-2 px-3 rounded text-sm font-semibold ${filterStatus === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Все
                </button>
                <button
                  onClick={() => setFilterStatus('registered')}
                  className={`flex-1 py-2 px-3 rounded text-sm font-semibold ${filterStatus === 'registered' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Зарег.
                </button>
                <button
                  onClick={() => setFilterStatus('unregistered')}
                  className={`flex-1 py-2 px-3 rounded text-sm font-semibold ${filterStatus === 'unregistered' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Не зарег.
                </button>
                <button
                  onClick={() => setFilterStatus('banned')}
                  className={`flex-1 py-2 px-3 rounded text-sm font-semibold ${filterStatus === 'banned' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Баны
                </button>
              </div>
            </div>

            {/* Список студентов */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredStudents.map((student) => (
                <div key={student.id} className="flex justify-between items-center p-3 border-2 border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">
                      {student.fullName}
                      {student.room && <span className="text-gray-600 text-sm ml-2">({student.room})</span>}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {student.isRegistered && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-semibold">✅ Зарегистрирован</span>
                      )}
                      {student.is_banned && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-semibold">🚫 Забанен</span>
                      )}
                      {student.telegram_chat_id && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">📱 Telegram</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(student)}
                      className="bg-blue-500 text-white text-xs font-semibold py-1 px-2 rounded hover:bg-blue-600"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    
                    {student.isRegistered && (
                      <button
                        onClick={() => handleResetStudent(student.id)}
                        disabled={resetingStudentId === student.id}
                        className="bg-orange-500 text-white text-xs font-semibold py-1 px-2 rounded hover:bg-orange-600 disabled:opacity-50"
                        title="Сбросить регистрацию"
                      >
                        {resetingStudentId === student.id ? '⏳' : '🔄'}
                      </button>
                    )}
                    
                    {student.is_banned ? (
                      <button
                        onClick={() => handleUnbanStudent(student.id)}
                        className="bg-green-500 text-white text-xs font-semibold py-1 px-2 rounded hover:bg-green-600"
                        title="Разбанить"
                      >
                        ✅
                      </button>
                    ) : (
                      <button
                        onClick={() => openBanModal(student)}
                        className="bg-red-500 text-white text-xs font-semibold py-1 px-2 rounded hover:bg-red-600"
                        title="Забанить"
                      >
                        🚫
                      </button>
                    )}
                    
                    <button
                      onClick={() => openDeleteModal(student)}
                      className="bg-gray-700 text-white text-xs font-semibold py-1 px-2 rounded hover:bg-gray-800"
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Кнопка смены админ-ключа */}
        <button
          onClick={() => setShowUpdateKey(true)}
          className="w-full bg-yellow-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-yellow-700 transition-colors shadow-md"
        >
          🔑 Сменить админ-ключ
        </button>
      </div>

      {/* Модальное окно: Добавить студента */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">➕ Добавить студента</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
                placeholder="Имя"
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              />
              <input
                type="text"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
                placeholder="Фамилия"
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              />
              <input
                type="text"
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                placeholder="Комната (необязательно)"
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddStudent(false)}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleAddStudent}
                className="flex-1 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Редактировать студента */}
      {showEditStudent && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">✏️ Редактировать студента</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                placeholder="Имя"
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              />
              <input
                type="text"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                placeholder="Фамилия"
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              />
              <input
                type="text"
                value={editRoom}
                onChange={(e) => setEditRoom(e.target.value)}
                placeholder="Комната"
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowEditStudent(false)}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleEditStudent}
                className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Забанить студента */}
      {showBanStudent && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🚫 Забанить студента</h3>
            <p className="text-gray-700 mb-3">
              Забанить <span className="font-bold">{selectedStudent.fullName}</span>?
            </p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Причина бана (необязательно)"
              className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900 h-24"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowBanStudent(false)}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleBanStudent}
                className="flex-1 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700"
              >
                Забанить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Удалить студента */}
      {showDeleteConfirm && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-700 mb-4">⚠️ Удалить студента?</h3>
            <p className="text-gray-700 mb-4">
              Вы уверены, что хотите удалить <span className="font-bold">{selectedStudent.fullName}</span>?
            </p>
            <p className="text-red-600 text-sm font-semibold mb-4">
              ⚠️ Это действие нельзя отменить! Будут удалены все данные студента.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteStudent}
                className="flex-1 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700"
              >
                Да, удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Сменить админ-ключ */}
      {showUpdateKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🔑 Сменить админ-ключ</h3>
            <div className="space-y-3">
              <input
                type="password"
                value={newAdminKey}
                onChange={(e) => setNewAdminKey(e.target.value)}
                placeholder="Новый ключ (мин. 6 символов)"
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              />
              <input
                type="password"
                value={confirmAdminKey}
                onChange={(e) => setConfirmAdminKey(e.target.value)}
                placeholder="Подтвердите ключ"
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              />
            </div>
            <p className="text-red-600 text-sm mt-2">⚠️ После смены потребуется перезагрузка</p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowUpdateKey(false)}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleUpdateAdminKey}
                className="flex-1 bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-yellow-700"
              >
                Сменить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}