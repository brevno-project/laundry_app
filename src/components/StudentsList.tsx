"use client";

import React, { useState } from "react";
import { useLaundry } from "@/contexts/LaundryContext";
import { Student } from "@/types";
import {
  ListIcon,
  RoomIcon,
  DoorIcon,
  TelegramIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  EyeIcon,
  DeleteIcon,
} from "@/components/Icons";
import Avatar, { AvatarType } from "@/components/Avatar";
import AddStudentModal from "@/components/AddStudentModal";

export default function StudentsList() {
  const { students, isAdmin, isSuperAdmin, user, updateStudent, deleteStudent } = useLaundry();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editRoom, setEditRoom] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editMiddleName, setEditMiddleName] = useState("");
  const [editCanViewStudents, setEditCanViewStudents] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const canManageStudent = (student: Student) =>
    isAdmin && (!student.is_super_admin || student.id === user?.student_id);

  if (!students || students.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          <ListIcon className="w-8 h-8" />Список студентов
        </h2>
        <p className="text-gray-700 text-lg">Студенты пока не найдены.</p>
      </div>
    );
  }

  const sortedStudents = [...students].sort((a, b) => {
    const blockA = a.room?.charAt(0) || "Z";
    const blockB = b.room?.charAt(0) || "Z";
    if (blockA !== blockB) {
      return blockA.localeCompare(blockB);
    }

    const roomA = parseInt(a.room?.slice(1) || "9999", 10);
    const roomB = parseInt(b.room?.slice(1) || "9999", 10);
    if (roomA !== roomB) {
      return roomA - roomB;
    }

    const lastNameA = a.last_name?.toLowerCase() || "";
    const lastNameB = b.last_name?.toLowerCase() || "";
    return lastNameA.localeCompare(lastNameB);
  });

  const blockA = sortedStudents.filter((s) => s.room?.startsWith("A"));
  const blockB = sortedStudents.filter((s) => s.room?.startsWith("B"));

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditRoom(student.room || "");
    setEditFirstName(student.first_name || "");
    setEditLastName(student.last_name || "");
    setEditMiddleName(student.middle_name || "");
    setEditCanViewStudents(!!student.can_view_students);
    setNotice(null);
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
      setNotice({ type: "success", message: "Студент обновлен." });
    } catch (error) {
      setNotice({ type: "error", message: "Ошибка обновления студента." });
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!canManageStudent(student)) return;

    if (!confirm(`Удалить студента ${student.full_name}?`)) return;

    try {
      await deleteStudent(student.id);
      setNotice({ type: "success", message: "Студент удален." });
    } catch (error) {
      setNotice({ type: "error", message: "Ошибка удаления студента." });
    }
  };

  const hasTelegram = (student: Student) => {
    const chat = typeof student.telegram_chat_id === "string" ? student.telegram_chat_id.trim() : "";
    return !!chat && !student.is_banned;
  };

  const renderStudentRow = (student: Student, index: number, list: Student[]) => {
    const prevStudent = index > 0 ? list[index - 1] : null;
    const showDivider = prevStudent && prevStudent.room !== student.room;
    const displayName =
      [student.first_name, student.last_name, student.middle_name].filter(Boolean).join(" ") ||
      student.full_name ||
      "-";

    return (
      <React.Fragment key={student.id}>
        {showDivider && (
          <tr className="bg-gradient-to-r from-transparent via-gray-300 to-transparent">
            <td colSpan={5} className="h-1"></td>
          </tr>
        )}
        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
          <td className="p-3 text-gray-700">{index + 1}</td>
          <td className="p-3 text-gray-900">
            <div className="flex items-center gap-3">
              <Avatar type={(student.avatar_type as AvatarType) || "default"} className="w-10 h-10" />
              <span>{displayName}</span>
            </div>
          </td>
          <td className="p-3 text-center text-gray-900">
            {student.room ? (
              <span className="bg-blue-100 text-blue-900 px-2 py-1 rounded font-semibold">{student.room}</span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </td>
          <td className="p-3 text-center">
            {hasTelegram(student) ? (
              <span className="text-green-600 font-semibold flex items-center justify-center gap-1">
                <CheckIcon className="w-4 h-4" />Подключен
              </span>
            ) : (
              <span className="text-gray-400 flex items-center justify-center gap-1">
                <CloseIcon className="w-4 h-4" />Не подключен
              </span>
            )}
          </td>
          <td className="p-3">
            {canManageStudent(student) && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => openEditModal(student)}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                >
                  <EditIcon className="w-4 h-4 inline-block mr-1" />Редактировать
                </button>
                <button
                  onClick={() => handleDeleteStudent(student)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  <DeleteIcon className="w-4 h-4 inline-block mr-1" />Удалить
                </button>
              </div>
            )}
          </td>
        </tr>
      </React.Fragment>
    );
  };

  const renderMobileRow = (student: Student, index: number, list: Student[], tone: "blue" | "green") => {
    const prevStudent = index > 0 ? list[index - 1] : null;
    const showDivider = prevStudent && prevStudent.room !== student.room;
    const rowBorder = tone === "blue" ? "border-blue-200 hover:bg-blue-50" : "border-green-200 hover:bg-green-50";
    const displayName =
      [student.first_name, student.last_name, student.middle_name].filter(Boolean).join(" ") ||
      student.full_name ||
      "-";

    return (
      <React.Fragment key={student.id}>
        {showDivider && (
          <tr
            className={
              tone === "blue"
                ? "bg-gradient-to-r from-transparent via-blue-300 to-transparent"
                : "bg-gradient-to-r from-transparent via-green-300 to-transparent"
            }
          >
            <td colSpan={isAdmin ? 5 : 4} className="h-0.5"></td>
          </tr>
        )}
        <tr className={`border-b ${rowBorder}`}>
          <td className="p-1 text-gray-900 font-semibold">{index + 1}</td>
          <td className="p-1 text-gray-900">
            <div className="flex items-center gap-2">
              <Avatar type={(student.avatar_type as AvatarType) || "default"} className="w-8 h-8" />
              <span className="text-xs">{displayName}</span>
            </div>
          </td>
          <td className="p-1 text-center text-gray-700 whitespace-nowrap">{student.room || "-"}</td>
          <td className="p-1 text-center">
            {hasTelegram(student) ? (
              <TelegramIcon className="w-5 h-5 text-blue-500" />
            ) : (
              <CloseIcon className="w-5 h-5 text-gray-400" />
            )}
          </td>
          {isAdmin && (
            <td className="p-1">
              {canManageStudent(student) && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(student)}
                    className={`${tone === "blue" ? "bg-blue-500 hover:bg-blue-600" : "bg-green-500 hover:bg-green-600"} text-white px-2 py-1 rounded text-xs`}
                  >
                    <EditIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteStudent(student)}
                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                  >
                    <DeleteIcon className="w-3 h-3" />
                  </button>
                </div>
              )}
            </td>
          )}
        </tr>
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4 px-4 pt-4 pb-2">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ListIcon className="w-8 h-8" />Список студентов ({students.length})
          </h2>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600"
            >
              + Добавить студента
            </button>
          )}
        </div>

        {notice && (
          <div
            className={`mx-4 mb-4 rounded-lg border px-3 py-2 text-sm ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {notice.message}
          </div>
        )}

        <div className="mb-6 px-4">
          <h3 className="text-xl font-bold mb-3 text-blue-700 flex items-center gap-2 px-4">
            <RoomIcon className="w-5 h-5" />Блок A ({blockA.length})
          </h3>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <colgroup>
                <col className="w-16" />
                <col className="w-auto" />
                <col className="w-28" />
                <col className="w-36" />
                {isAdmin && <col className="w-72" />}
              </colgroup>
              <thead>
                <tr className="bg-blue-100 border-b-2 border-blue-300">
                  <th className="text-left p-3 font-bold text-gray-900">#</th>
                  <th className="text-left p-3 font-bold text-gray-900">Имя</th>
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

          <div className="md:hidden overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-blue-100 border-b-2 border-blue-300">
                  <th className="text-left p-1 font-bold text-gray-900">#</th>
                  <th className="text-left p-1 font-bold text-gray-900">Имя</th>
                  <th className="text-center p-1 font-bold text-gray-900">
                    <DoorIcon className="w-5 h-5 inline-block" />
                  </th>
                  <th className="text-center p-1 font-bold text-gray-900">
                    <TelegramIcon className="w-5 h-5 inline-block" />
                  </th>
                  {isAdmin && <th className="text-left p-1 font-bold text-gray-900">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {blockA.map((student, index) => renderMobileRow(student, index, blockA, "blue"))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pb-4 px-4">
          <h3 className="text-xl font-bold mb-3 text-green-700 flex items-center gap-2 px-4">
            <RoomIcon className="w-5 h-5" />Блок B ({blockB.length})
          </h3>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <colgroup>
                <col className="w-16" />
                <col className="w-auto" />
                <col className="w-28" />
                <col className="w-36" />
                {isAdmin && <col className="w-72" />}
              </colgroup>
              <thead>
                <tr className="bg-green-100 border-b-2 border-green-300">
                  <th className="text-left p-3 font-bold text-gray-900">#</th>
                  <th className="text-left p-3 font-bold text-gray-900">Имя</th>
                  <th className="text-center p-3 font-bold text-gray-900">Комната</th>
                  <th className="text-center p-3 font-bold text-gray-900">Telegram</th>
                  {isAdmin && <th className="text-center p-3 font-bold text-gray-900">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {blockB.map((student, index) => renderStudentRow(student, index, blockB))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-green-100 border-b-2 border-green-300">
                  <th className="text-left p-1 font-bold text-gray-900">#</th>
                  <th className="text-left p-1 font-bold text-gray-900">Имя</th>
                  <th className="text-center p-1 font-bold text-gray-900">
                    <DoorIcon className="w-5 h-5 inline-block" />
                  </th>
                  <th className="text-center p-1 font-bold text-gray-900">
                    <TelegramIcon className="w-5 h-5 inline-block" />
                  </th>
                  {isAdmin && <th className="text-left p-1 font-bold text-gray-900">Действия</th>}
                </tr>
              </thead>
              <tbody>
                {blockB.map((student, index) => renderMobileRow(student, index, blockB, "green"))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <EditIcon className="w-5 h-5" />Редактирование студента
            </h3>

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
                <label className="block text-sm font-bold mb-2 text-gray-900">Отчество (опционально)</label>
                <input
                  type="text"
                  value={editMiddleName}
                  onChange={(e) => setEditMiddleName(e.target.value)}
                  placeholder="Иванович"
                  className="w-full border-2 border-gray-300 rounded-lg p-2 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-gray-900">Комната</label>
                <input
                  type="text"
                  value={editRoom}
                  onChange={(e) => setEditRoom(e.target.value)}
                  placeholder="A301, B402"
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
                  <label
                    htmlFor="canViewStudents"
                    className="text-sm font-semibold text-gray-900 cursor-pointer flex items-center gap-1"
                  >
                    <EyeIcon className="w-4 h-4" />Может видеть вкладку студентов
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
                className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && <AddStudentModal onClose={() => setShowAddModal(false)} />}
    </>
  );
}
