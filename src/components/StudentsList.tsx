"use client";

import React from 'react';
import { useLaundry } from '@/contexts/LaundryContext';
import { useState } from 'react';
import { Student } from '@/types';
import { ListIcon, RoomIcon, DoorIcon, TelegramIcon, CheckIcon, CloseIcon, EditIcon, DeleteIcon } from '@/components/Icons';
import Avatar from '@/components/Avatar';

export default function StudentsList() {
  const { students, isAdmin, user, updateStudent, addStudent, deleteStudent, loadStudents } = useLaundry();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editRoom, setEditRoom] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editMiddleName, setEditMiddleName] = useState('');
  const [editCanViewStudents, setEditCanViewStudents] = useState(false);
  
  // Состояния для добавления студента
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newRoom, setNewRoom] = useState('');
  
  // Состояние для удаления
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  
  // Проверяем что пользователь - суперадмин
  const isSuperAdmin = user && students.find(s => s.id === user.student_id)?.is_super_admin;

  if (!students || students.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2"><ListIcon className="w-8 h-8" />Список студентов</h2>
        <p className="text-gray-700 text-lg">Студентов нет.</p>
      </div>
    );
  }

  // ✅ Сортируем по блокам A/B, затем по комнатам, затем по фамилии
  const sortedStudents = [...students].sort((a, b) => {
    // 1. Сначала по блоку (A перед B)
    const blockA = a.room?.charAt(0) || 'Z';
    const blockB = b.room?.charAt(0) || 'Z';
    if (blockA !== blockB) {
      return blockA.localeCompare(blockB);
    }
    
    // 2. Затем по номеру комнаты
    const roomA = parseInt(a.room?.slice(1) || '9999');
    const roomB = parseInt(b.room?.slice(1) || '9999');
    if (roomA !== roomB) {
      return roomA - roomB;
    }
    
    // 3. Затем по фамилии
    const lastNameA = a.last_name?.toLowerCase() || '';
    const lastNameB = b.last_name?.toLowerCase() || '';
    return lastNameA.localeCompare(lastNameB);
  });
  
  // Группируем по блокам
  const blockA = sortedStudents.filter(s => s.room?.startsWith('A'));
  const blockB = sortedStudents.filter(s => s.room?.startsWith('B'));
  
  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditRoom(student.room || '');
    setEditFirstName(student.first_name || '');
    setEditLastName(student.last_name || '');
    setEditMiddleName(student.middle_name || '');
    setEditCanViewStudents(student.can_view_students || false);
  };
  
  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    
    try {
      await updateStudent(editingStudent.id, {
        room: editRoom,
        first_name: editFirstName,
        last_name: editLastName || undefined,
        middle_name: editMiddleName || undefined,
        can_view_students: isSuperAdmin ? editCanViewStudents : undefined,
      });
      
      setEditingStudent(null);
      alert('✅ Студент обновлен!');
    } catch (error) {
      console.error('❌ Error updating student:', error);
      alert('❌ Ошибка обновления');
    }
  };
  
  const handleAddStudent = async () => {
    if (!newFirstName.trim()) {
      alert('❌ Укажите имя');
      return;
    }
    
    if (!newRoom) {
      alert('❌ Укажите комнату');
      return;
    }
    
    // ✅ Проверяем формат комнаты: только A или B + номер
    const roomPattern = /^[AB]\d{3}$/i;
    if (!roomPattern.test(newRoom)) {
      alert('❌ Неверный формат комнаты!\nПримеры: A301, B402\nТолько блоки A и B');
      return;
    }
    
    // ✅ Приводим к верхнему регистру
    const formattedRoom = newRoom.toUpperCase();
    
    try {
      await addStudent(newFirstName, newLastName, formattedRoom);
      
      setShowAddModal(false);
      setNewFirstName('');
      setNewLastName('');
      setNewRoom('');
      alert('✅ Студент добавлен!');
    } catch (error) {
      console.error('❌ Error adding student:', error);
      alert('❌ Ошибка добавления');
    }
  };
  
  const handleDeleteStudent = async () => {
    if (!deletingStudent) return;
    
    try {
      await deleteStudent(deletingStudent.id);
      setDeletingStudent(null);
      alert('✅ Студент удален!');
    } catch (error) {
      console.error('❌ Error deleting student:', error);
      alert('❌ Ошибка удаления');
    }
  };
  
  const renderStudentRow = (student: Student, index: number, students: Student[]) => {
    // Проверяем нужен ли разделитель (комната изменилась)
    const prevStudent = index > 0 ? students[index - 1] : null;
    const showDivider = prevStudent && prevStudent.room !== student.room;
    
    return (
      <React.Fragment key={student.id}>
        {showDivider && (
          <tr className="bg-gradient-to-r from-transparent via-gray-300 to-transparent">
            <td colSpan={6} className="h-1"></td>
          </tr>
        )}
        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
          <td className="p-3 text-gray-700">{index + 1}</td>
          <td className="p-3 text-gray-900">
            {[student.first_name, student.last_name, student.middle_name].filter(Boolean).join(' ') || '—'}
          </td>
          <td className="p-3 text-center text-gray-900">
            {student.room ? (
              <span className="bg-blue-100 text-blue-900 px-2 py-1 rounded font-semibold">
                {student.room}
              </span>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </td>
          <td className="p-3 text-center">
            {student.telegram_chat_id ? (
              <span className="text-green-600 font-semibold flex items-center gap-1"><CheckIcon className="w-4 h-4" />Подключен</span>
            ) : (
              <span className="text-gray-400 flex items-center gap-1"><CloseIcon className="w-4 h-4" />Не подключен</span>
            )}
          </td>

          <td className="p-3">
            <div className="flex gap-2">
              {isAdmin && !student.is_super_admin && (
                <button
                  onClick={() => openEditModal(student)}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  <EditIcon className="w-4 h-4 inline-block mr-1" />Редактировать
                </button>
              )}
              {isAdmin && !student.is_super_admin && (
                <button
                  onClick={() => setDeletingStudent(student)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  <DeleteIcon className="w-4 h-4 inline-block mr-1" />Удалить
                </button>
              )}
            </div>
          </td>
        </tr>
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><ListIcon className="w-8 h-8" />Список студентов ({students.length})</h2>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600"
            >
              + Добавить студента
            </button>
          )}
        </div>
        
        {/* Блок A */}
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-3 text-blue-700 flex items-center gap-2"><RoomIcon className="w-5 h-5" />Блок A ({blockA.length})</h3>
          
          {/* Десктоп: обычная таблица */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col className="w-16" />
                <col className="w-auto" />
                <col className="w-28" />
                <col className="w-36" />
                {isAdmin && <col className="w-56" />}
              </colgroup>
              <thead>
                <tr className="bg-blue-100 border-b-2 border-blue-300">
                  <th className="text-left p-3 font-bold text-gray-900">#</th>
                  <th className="text-left p-3 font-bold text-gray-900">ФИО</th>
                  <th className="text-center p-3 font-bold text-gray-900">Комната</th>
                  <th className="text-center p-3 font-bold text-gray-900">Telegram</th>
                  {isAdmin && <th className="text-center p-3 font-bold text-gray-900">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {blockA.map((student, index) => renderStudentRow(student, index, blockA))}
              </tbody>
            </table>
          </div>
          
          {/* Мобильные: компактная таблица */}
          <div className="md:hidden overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-blue-100 border-b-2 border-blue-300">
                  <th className="text-left p-1 font-bold text-gray-900">#</th>
                  <th className="text-left p-1 font-bold text-gray-900">ФИО</th>
                  <th className="text-center p-1 font-bold text-gray-900"><DoorIcon className="w-5 h-5 inline-block" /></th>
                  <th className="text-center p-1 font-bold text-gray-900"><TelegramIcon className="w-5 h-5 inline-block" /></th>
                  {isAdmin && <th className="text-left p-1 font-bold text-gray-900">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {blockA.map((student, index) => {
                  const prevStudent = index > 0 ? blockA[index - 1] : null;
                  const showDivider = prevStudent && prevStudent.room !== student.room;
                  
                  return (
                    <React.Fragment key={student.id}>
                      {showDivider && (
                        <tr className="bg-gradient-to-r from-transparent via-blue-300 to-transparent">
                          <td colSpan={isAdmin ? 5 : 4} className="h-0.5"></td>
                        </tr>
                      )}
                      <tr className="border-b border-blue-200 hover:bg-blue-50">
                        <td className="p-1 text-gray-900 font-semibold">{index + 1}</td>
                        <td className="p-1 text-gray-900">
                          {[student.first_name, student.last_name, student.middle_name].filter(Boolean).join(' ') || '-'}
                        </td>
                        <td className="p-1 text-center text-gray-700 whitespace-nowrap">{student.room || '-'}</td>
                        <td className="p-1 text-center">
                          {student.telegram_chat_id ? (
                            <TelegramIcon className="w-5 h-5 text-blue-500" />
                          ) : (
                            <CloseIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </td>
                        {isAdmin && (
                          <td className="p-1">
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEditModal(student)}
                                className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                              >
                                <EditIcon className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setDeletingStudent(student)}
                                className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                              >
                                <DeleteIcon className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Блок B */}
        <div>
          <h3 className="text-xl font-bold mb-3 text-green-700 flex items-center gap-2"><RoomIcon className="w-5 h-5" />Блок B ({blockB.length})</h3>
          
          {/* Десктоп: обычная таблица */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-green-100 border-b-2 border-green-300">
                  <th className="text-left p-3 font-bold text-gray-900">#</th>
                  <th className="text-left p-3 font-bold text-gray-900">Имя</th>
                  <th className="text-left p-3 font-bold text-gray-900">Фамилия</th>
                  <th className="text-left p-3 font-bold text-gray-900">Комната</th>
                  <th className="text-left p-3 font-bold text-gray-900">Telegram</th>
                  {isSuperAdmin && <th className="text-left p-3 font-bold text-gray-900">Может видеть список</th>}
                  {isAdmin && <th className="text-left p-3 font-bold text-gray-900">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {blockB.map((student, index) => renderStudentRow(student, index, blockB))}
              </tbody>
            </table>
          </div>
          
          {/* Мобильные: компактная таблица */}
          <div className="md:hidden overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-green-100 border-b-2 border-green-300">
                  <th className="text-left p-1 font-bold text-gray-900">#</th>
                  <th className="text-left p-1 font-bold text-gray-900">ФИО</th>
                  <th className="text-center p-1 font-bold text-gray-900"><DoorIcon className="w-5 h-5 inline-block" /></th>
                  <th className="text-center p-1 font-bold text-gray-900"><TelegramIcon className="w-5 h-5 inline-block" /></th>
                  {isAdmin && <th className="text-left p-1 font-bold text-gray-900">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {blockB.map((student, index) => {
                  const prevStudent = index > 0 ? blockB[index - 1] : null;
                  const showDivider = prevStudent && prevStudent.room !== student.room;
                  
                  return (
                    <React.Fragment key={student.id}>
                      {showDivider && (
                        <tr className="bg-gradient-to-r from-transparent via-green-300 to-transparent">
                          <td colSpan={isAdmin ? 5 : 4} className="h-0.5"></td>
                        </tr>
                      )}
                      <tr className="border-b border-green-200 hover:bg-green-50">
                        <td className="p-1 text-gray-900 font-semibold">{index + 1}</td>
                        <td className="p-1 text-gray-900">
                          {[student.first_name, student.last_name, student.middle_name].filter(Boolean).join(' ') || '-'}
                        </td>
                        <td className="p-1 text-center text-gray-700 whitespace-nowrap">{student.room || '-'}</td>
                        <td className="p-1 text-center">
                          {student.telegram_chat_id ? (
                            <TelegramIcon className="w-5 h-5 text-blue-500" />
                          ) : (
                            <CloseIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </td>
                        {isAdmin && (
                          <td className="p-1">
                            <div className="flex gap-1">
                              <button
                                onClick={() => openEditModal(student)}
                                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                              >
                                <EditIcon className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setDeletingStudent(student)}
                                className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                              >
                                <DeleteIcon className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Модальное окно редактирования */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">✏️ Редактировать студента</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Фамилия</label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Имя *</label>
                <input
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Отчество (необязательно)</label>
                <input
                  type="text"
                  value={editMiddleName}
                  onChange={(e) => setEditMiddleName(e.target.value)}
                  placeholder="Можно оставить пустым"
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Комната</label>
                <input
                  type="text"
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  placeholder="A301, B402, итд"
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
                />
              </div>
              
              {isSuperAdmin && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="canViewStudents"
                    checked={editCanViewStudents}
                    onChange={(e) => setEditCanViewStudents(e.target.checked)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <label htmlFor="canViewStudents" className="text-sm font-semibold text-gray-900 cursor-pointer">
                    👁️ Может видеть список студентов
                  </label>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditingStudent(null)}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                ✅ Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно добавления студента */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">➕ Добавить студента</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Комната *</label>
                <input
                  type="text"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value.toUpperCase())}
                  placeholder="A301 или B402"
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
                  maxLength={4}
                />
                <p className="text-xs text-gray-500 mt-1">Только блоки A или B (например: A301, B402)</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Фамилия *</label>
                <input
                  type="text"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
                  placeholder="Иванов"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Имя *</label>
                <input
                  type="text"
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
                  placeholder="Иван"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewFirstName('');
                  setNewLastName('');
                  setNewRoom('');
                }}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleAddStudent}
                className="flex-1 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700"
              >
                ➕ Добавить
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно удаления студента */}
      {deletingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-700 mb-4">🗑️ Удалить студента?</h3>
            
            <p className="text-gray-700 mb-6">
              Вы уверены что хотите удалить <span className="font-bold">{deletingStudent.full_name}</span>?
              <br />
              <span className="text-red-600 font-semibold">Это действие нельзя отменить!</span>
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingStudent(null)}
                className="flex-1 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteStudent}
                className="flex-1 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700"
              >
                🗑️ Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
