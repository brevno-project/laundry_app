"use client";

import { useState } from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { Student } from '@/types';
import { CalendarIcon, DoorIcon, DeleteIcon, CheckIcon, CloseIcon, EditIcon, BellIcon, UserIcon } from '@/components/Icons';

export default function AdminPanel() {
  const { 
    user,
    isAdmin, 
    setIsAdmin, 
    adminLogin,
    queue,
    students,
    markDone, 
    startNext, 
    clearQueue,
    clearOldQueues,
    clearStuckQueues,
    resetStudentRegistration,
    banStudent,
    unbanStudent,
    addStudent,
    updateStudent,
    deleteStudent,
    adminAddToQueue,
    toggleAdminStatus,
    isSuperAdmin,
    setIsSuperAdmin
  } = useLaundry();
  
  const [adminKey, setAdminKey] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  const [error, setError] = useState('');
  
  // Модальные окна
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [showBanStudent, setShowBanStudent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAddToQueue, setShowAddToQueue] = useState(false);
  
  // Параметры записи в очередь (включая дату)
  const [queueWashCount, setQueueWashCount] = useState(1);
  const [queuePaymentType, setQueuePaymentType] = useState('money');

  const [queueDate, setQueueDate] = useState(''); // НОВОЕ ПОЛЕ
  
  // Форма добавления студента
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRoom, setNewRoom] = useState('');
  
  // Форма редактирования студента
  const [editFirstname, setEditFirstname] = useState('');
  const [editLastname, setEditLastname] = useState('');
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

  // Генерация доступных дат (сегодня + 7 дней)
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().slice(0, 10);
      
      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const dayName = dayNames[date.getDay()];
      const day = date.getDate();
      const month = date.getMonth() + 1;
      
      let label = `${dayName}, ${day}.${month.toString().padStart(2, '0')}`;
      if (i === 0) label += ' (Сегодня)';
      if (i === 1) label += ' (Завтра)';
      
      dates.push({ value: dateStr, label });
    }
    
    return dates;
  };

  // Фильтрация студентов
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (student.room && student.room.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = 
      filterStatus === 'all' ? true :
      filterStatus === 'registered' ? student.is_registered :
      filterStatus === 'unregistered' ? !student.is_registered :
      filterStatus === 'banned' ? student.is_banned : true;
    
    return matchesSearch && matchesFilter;
  });

  // Обработчики
  const handleAdminLogin = async () => {
    if (adminKey.trim() === '') {
      setError('Введите ключ администратора');
      return;
    }

    try {
      // Залогинить админа в Supabase Auth для работы RLS политик
      await adminLogin(adminKey.trim());
      setError('');
      setAdminKey('');
    } catch (err: any) {
      console.error('❌ Admin login failed:', err);
      setError('Ошибка авторизации: ' + err.message);
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminKey('');
  };

  const handleClearQueueConfirm = async () => {
    try {
      await clearQueue();
      setShowConfirmClear(false);
      alert('✅ Очередь очищена!');
    } catch (err: any) {
      alert('❌ Ошибка: ' + err.message);
    }
  };

  const openResetConfirm = (student: Student) => {
    setSelectedStudent(student);
    setShowResetConfirm(true);
  };

  const handleResetStudent = async () => {
    if (!selectedStudent) return;
    
    try {
      await resetStudentRegistration(selectedStudent.id);
      setShowResetConfirm(false);
      setSelectedStudent(null);
      alert('✅ Регистрация сброшена!');
    } catch (err: any) {
      console.error('Error resetting student:', err);
      alert('❌ Ошибка сброса регистрации');
    }
  };

  const handleAddStudent = async () => {
    if (!newFirstName) {  // ✅ ТОЛЬКО имя обязательно
      alert('Введите имя');
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
        first_name: editFirstname || undefined,
        last_name: editLastname || undefined,
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

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setEditFirstname(student.first_name);
    setEditLastname(student.last_name || '');
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

  // ОБНОВЛЕННАЯ функция добавления в очередь С ВЫБОРОМ ДАТЫ
  const handleAddToQueue = async () => {
    if (!selectedStudent) return;
    
    try {
      await adminAddToQueue(
        selectedStudent.room || undefined,
        queueWashCount,
        queuePaymentType,
        undefined, // expectedFinishAt больше не используется
        queueDate,
        selectedStudent.id,
      );
      
      setShowAddToQueue(false);
      alert('✅ Студент добавлен в очередь!');
    } catch (err: any) {
      alert('❌ Ошибка: ' + err.message);
    }
  };

  const handleToggleAdmin = async (studentId: string, makeAdmin: boolean) => {
    console.log(' Toggle admin:', studentId, makeAdmin);
    console.log(' Current user:', user);
    console.log(' Is super admin:', isSuperAdmin);
    
    try {
      await toggleAdminStatus(studentId, makeAdmin);
      alert(makeAdmin ? '✅ Студент стал админом!' : '✅ Админские права сняты!');
    } catch (error: any) {
      console.error(' Error toggling admin:', error);
      alert('❌ Ошибка: ' + error.message);
    }
  };



  const openAddToQueueModal = (student: Student) => {
    setSelectedStudent(student);
    setQueueWashCount(1);
    setQueuePaymentType('money');
    const today = new Date().toISOString().slice(0, 10);
    setQueueDate(today); // Устанавливаем сегодняшнюю дату по умолчанию
    setShowAddToQueue(true);
  };

  if (!user) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg shadow-lg border border-yellow-200">
        <h2 className="text-2xl font-bold mb-4 text-yellow-800">⚠️ Требуется вход</h2>
        <p className="text-yellow-700 mb-4">
          Для использования админ функций <strong>сначала войдите как студент</strong> с правами администратора, затем введите админ ключ.
        </p>
        <p className="text-sm text-yellow-600 mb-4">
          Это необходимо для корректной работы с базой данных.
        </p>
        <p className="text-sm text-yellow-600">
          После входа как студент вернитесь сюда и введите админ ключ.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800"> Администратор</h2>
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
        <h2 className="text-2xl font-bold text-white"> Панель админа</h2>
        <button
          onClick={handleAdminLogout}
          className="bg-purple-800 hover:bg-purple-900 text-white text-sm font-semibold px-3 py-2 rounded transition-colors flex items-center gap-2"
        >
          <DoorIcon className="w-4 h-4" />Выйти
        </button>
      </div>
      
      <div className="space-y-4">
        
        {/* Управление очередью */}
        {!showConfirmClear ? (
          <button
            onClick={() => setShowConfirmClear(true)}
            className="w-full bg-red-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-red-700 transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <DeleteIcon className="w-5 h-5" />Очистить очередь
          </button>
        ) : (
          <div className="bg-white p-4 rounded-md border-2 border-red-400">
            <p className="text-red-700 font-bold text-base mb-3"> Вы уверены, что хотите очистить всю очередь?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                <CloseIcon className="w-4 h-4" />Отмена
              </button>
              
              <button
                onClick={handleClearQueueConfirm}
                className="flex-1 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <CheckIcon className="w-4 h-4" />Да, очистить
              </button>
              
            </div>
            {/* ✅ ТЕСТОВОЕ УВЕДОМЛЕНИЕ - ВСЕГДА ВИДНО */}
            {isAdmin && (
              <button
                onClick={async () => {
                  try {
                    const { sendTestNotification } = await import('@/lib/telegram');
                    const success = await sendTestNotification(user?.student_id);
                    alert(success 
                      ? '✅ Тестовое уведомление отправлено!' 
                      : '❌ Ошибка отправки. Проверь консоль.'
                    );
                  } catch (err: any) {
                    console.error('Test notification error:', err);
                    alert('❌ Ошибка: ' + err.message);
                  }
                }}
                className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-md"
              >
                📱 Отправить тестовое уведомление
              </button>
            )}
          </div>
        )}
        
        {/* Управление студентами */}
        <button
          onClick={() => setShowStudents(!showStudents)}
          className="w-full bg-purple-800 text-white font-semibold py-3 px-4 rounded-md hover:bg-purple-900 transition-colors shadow-md"
        >
          {showStudents ? 'Скрыть студентов' : 'Управление студентами'}
        </button>

        {showStudents && (
          <div className="bg-white p-4 rounded-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Список студентов ({filteredStudents.length})</h3>
              <button
                onClick={() => setShowAddStudent(true)}
                className="bg-green-600 text-white text-sm font-semibold px-3 py-2 rounded hover:bg-green-700"
              >
                Добавить
              </button>
            </div>

            {/* Поиск и фильтры */}
            <div className="space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder=" Поиск..."
                className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
              />
              
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`py-2 px-2 rounded text-xs font-semibold ${filterStatus === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Все
                </button>
                <button
                  onClick={() => setFilterStatus('registered')}
                  className={`py-2 px-2 rounded text-xs font-semibold ${filterStatus === 'registered' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Зарег.
                </button>
                <button
                  onClick={() => setFilterStatus('unregistered')}
                  className={`py-2 px-2 rounded text-xs font-semibold ${filterStatus === 'unregistered' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Не зар.
                </button>
                <button
                  onClick={() => setFilterStatus('banned')}
                  className={`py-2 px-2 rounded text-xs font-semibold ${filterStatus === 'banned' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                  Баны
                </button>
              </div>
            </div>

            {/* Список студентов */}
            <div className="max-h-96 overflow-y-auto space-y-3">
              {filteredStudents.map((student) => (
                <div key={student.id} className="border-2 border-gray-200 rounded-lg bg-gray-50 p-3 space-y-2">
                  {/* Имя и значки */}
                  <div>
                    <p className="font-bold text-gray-900 text-base">
                      {student.full_name}
                      {student.room && <span className="text-gray-600 text-sm ml-2">({student.room})</span>}
                    </p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {student.is_registered && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-semibold"> Зарег.</span>
                      )}
                      {student.is_banned && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold"> Бан</span>
                      )}
                      {student.telegram_chat_id && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold"> TG</span>
                      )}
                    </div>
                  </div>
                  
                  {/* ========== УПРАВЛЕНИЕ АДМИНАМИ ========== */}
                  {isSuperAdmin && (
                    <button onClick={() => handleToggleAdmin(student.id, !student.is_admin)}
                    className={`w-full px-4 py-2 text-sm font-bold text-white mb-2 rounded-none ${
                      student.is_admin 
                        ? 'bg-red-500 hover:bg-red-600'  
                        : 'bg-yellow-500 hover:bg-yellow-600'  
                    }`}
                  >
                    {student.is_admin ? ' Снять админа' : ' Сделать админом'}
                  </button>
                  )}
                  <div className="border-t border-gray-300 pt-2 mt-2">                   
                  </div>

                  {/* ========== БЕЗОПАСНЫЕ ДЕЙСТВИЯ ========== */}
                  {/* Супер-админ: всех кроме супер-админов | Обычный админ: себя или обычных студентов */}
                  {(isSuperAdmin ? !student.is_super_admin : (student.id === user?.student_id || (!student.is_admin && !student.is_super_admin))) && (
                    <button onClick={() => openAddToQueueModal(student)}
                      className="bg-purple-500 text-white text-sm font-semibold py-2 px-3 rounded hover:bg-purple-600 flex items-center justify-center gap-2 w-full">
                      <CalendarIcon className="w-4 h-4" />Поставить в очередь
                    </button>
                  )}

                  {(isSuperAdmin ? !student.is_super_admin : (student.id === user?.student_id || (!student.is_admin && !student.is_super_admin))) && (
                    <button
                      onClick={() => openEditModal(student)}
                      className="bg-blue-500 text-white text-sm font-semibold py-2 px-3 rounded hover:bg-blue-600 w-full flex items-center justify-center gap-1"
                      title="Редактировать"
                    >
                      <EditIcon className="w-4 h-4" />Редактировать
                    </button>
                  )}

                  {/* ========== ОПАСНЫЕ ДЕЙСТВИЯ ========== */}
                  <div className="border-t border-red-300 pt-2 mt-2">
                  {/* ✅ Сбросить регистрацию - ТОЛЬКО СУПЕРАДМИН */}
                  {isSuperAdmin && student.is_registered && !student.is_super_admin && (
                      <button
                        onClick={() => openResetConfirm(student)}
                        className="bg-orange-500 text-white text-sm font-semibold py-2 px-3 rounded hover:bg-orange-600 w-full mb-1"
                        title="Сбросить регистрацию"
                      >
                        🔄 Сбросить регистрацию
                      </button>
                    )}

                    {/* ✅ Разбанить - ТОЛЬКО СУПЕРАДМИН */}
                    {isSuperAdmin && !student.is_super_admin && student.is_banned && (
                      <button
                        onClick={() => handleUnbanStudent(student.id)}
                        className="w-full px-4 py-2 rounded-lg text-sm font-bold bg-green-500 hover:bg-green-600 text-white mb-1"
                      >
                        ✅ Разбанить студента
                      </button>
                    )}

                    {/* ✅ Забанить - ТОЛЬКО СУПЕРАДМИН */}
                    {isSuperAdmin && !student.is_super_admin && !student.is_banned && (
                      <button
                        onClick={() => openBanModal(student)}
                        className="bg-red-500 text-white text-sm font-semibold py-2 px-3 rounded hover:bg-red-600 w-full mb-1"
                        title="Забанить"
                      >
                        🚫 Забанить студента
                      </button>
                    )}

                    {/* ✅ Удалить - ТОЛЬКО СУПЕРАДМИН */}
                    {isSuperAdmin && !student.is_super_admin && (
                      <button
                        onClick={() => openDeleteModal(student)}
                        className="bg-gray-700 text-white text-sm font-semibold py-2 px-3 rounded hover:bg-gray-800 w-full"
                        title="Удалить студента"
                      >
                        🗑️ Удалить студента
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>



      {/* ========== ВСЕ МОДАЛЬНЫЕ ОКНА ========== */}

      {/* Модальное окно: Добавить студента */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4"> Добавить студента</h3>
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
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2"><EditIcon className="w-5 h-5" />Редактировать студента</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={editFirstname}
                onChange={(e) => setEditFirstname(e.target.value)}
                placeholder="Имя"
                className="w-full border-2 border-gray-300 rounded-lg p-3 text-gray-900"
              />
              <input
                type="text"
                value={editLastname}
                onChange={(e) => setEditLastname(e.target.value)}
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

      {/* Модальное окно: Подтверждение сброса */}
      {showResetConfirm && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-orange-700 mb-4"> Сбросить регистрацию?</h3>
            <p className="text-gray-700 mb-4">
              Сбросить регистрацию для <span className="font-bold">{selectedStudent.full_name}</span>?
            </p>
            <p className="text-orange-600 text-sm font-semibold mb-4">
              Студент сможет заново зарегистрироваться.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleResetStudent}
                className="flex-1 bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-orange-700"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно: Забанить студента */}
      {showBanStudent && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4"> Забанить студента</h3>
            <p className="text-gray-700 mb-3">
              Забанить <span className="font-bold">{selectedStudent.full_name}</span>?
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
            <h3 className="text-xl font-bold text-red-700 mb-4"> Удалить студента?</h3>
            <p className="text-gray-700 mb-4">
              Вы уверены, что хотите удалить <span className="font-bold">{selectedStudent.full_name}</span>?
            </p>
            <p className="text-red-600 text-sm font-semibold mb-4">
              Это действие нельзя отменить! Будут удалены все данные студента.
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
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      
      {/* ГЛАВНОЕ МОДАЛЬНОЕ ОКНО: Поставить в очередь С ВЫБОРОМ ДАТЫ */}
      {showAddToQueue && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4"> Поставить в очередь</h3>
            <p className="text-gray-700 mb-3">
              Студент: <span className="font-bold">{selectedStudent.full_name}</span>
            </p>
            
            <div className="space-y-3">
              {/* НОВОЕ ПОЛЕ: Выбор даты стирки */}
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900"> Дата стирки</label>
                <select
                  value={queueDate}
                  onChange={(e) => setQueueDate(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
                >
                  {getAvailableDates().map(date => (
                    <option key={date.value} value={date.value}>
                      {date.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Количество стирок</label>
                <select
                  value={queueWashCount}
                  onChange={(e) => setQueueWashCount(Number(e.target.value))}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900 font-semibold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Способ оплаты</label>
                <select
                  value={queuePaymentType}
                  onChange={(e) => setQueuePaymentType(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
                >
                  <option value="money"> Деньги</option>
                  <option value="coupon"> Купон</option>
                  <option value="both"> Деньги+Купон</option>
                </select>
              </div>
              

            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddToQueue(false)}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleAddToQueue}
                className="flex-1 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}