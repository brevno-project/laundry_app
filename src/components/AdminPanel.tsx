"use client";

import { useState } from "react";
import { useLaundry } from "@/contexts/LaundryContext";
import { Student } from "@/types";
import {
  DeleteIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  PeopleIcon,
} from "@/components/Icons";
import ActionMenu from "@/components/ActionMenu";
import Avatar, { AvatarType } from "@/components/Avatar";
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
  } = useLaundry();

  const [adminKey, setAdminKey] = useState("");
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  const [error, setError] = useState("");

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
  const [queuePaymentType, setQueuePaymentType] = useState("money");
  const [queueDate, setQueueDate] = useState("");

  // Форма добавления студента
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newRoom, setNewRoom] = useState("");

  // Форма редактирования студента
  const [editFirstname, setEditFirstname] = useState("");
  const [editLastname, setEditLastname] = useState("");
  const [editRoom, setEditRoom] = useState("");

  // Форма бана
  const [banReason, setBanReason] = useState("");

  // Поиск студентов
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "registered" | "unregistered" | "banned"
  >("all");

  const washingItem = queue.find((item) => item.status === "washing");

  // Генерация доступных дат (сегодня + 7 дней)
  const getAvailableDates = () => {
    const dates: { value: string; label: string }[] = [];
    const today = new Date();

    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const value = date.toISOString().slice(0, 10);

      const dayNames = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      const dayName = dayNames[date.getDay()];
      const day = date.getDate();
      const month = date.getMonth() + 1;

      let label = `${dayName}, ${day}.${month.toString().padStart(2, "0")}`;
      if (i === 0) label += " (сегодня)";
      if (i === 1) label += " (завтра)";

      dates.push({ value, label });
    }

    return dates;
  };

  // Фильтрация студентов
  const filteredStudents = students.filter((student) => {
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      student.full_name.toLowerCase().includes(q) ||
      (student.room && student.room.toLowerCase().includes(q));

    const matchesFilter =
      filterStatus === "all"
        ? true
        : filterStatus === "registered"
        ? student.is_registered
        : filterStatus === "unregistered"
        ? !student.is_registered
        : filterStatus === "banned"
        ? student.is_banned
        : true;

    return matchesSearch && matchesFilter;
  });

  const handleAdminLogin = async () => {
    if (!adminKey.trim()) {
      setError("Введите ключ администратора");
      return;
    }

    try {
      await adminLogin(adminKey.trim());
      setError("");
      setAdminKey("");
    } catch (err: any) {
      setError("Ошибка авторизации: " + err.message);
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminKey("");
  };

  const handleClearQueueConfirm = async () => {
    try {
      await clearQueue();
      setShowConfirmClear(false);
      alert("Очередь очищена");
    } catch (err: any) {
      alert("Ошибка: " + err.message);
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
      alert("Регистрация сброшена");
    } catch (err: any) {
      alert("Ошибка сброса регистрации");
    }
  };

  const handleAddStudent = async () => {
    if (!newFirstName.trim()) {
      alert("Введите имя");
      return;
    }

    try {
      await addStudent(
        newFirstName.trim(),
        newLastName.trim() ?? "",
        newRoom.trim() ?? ""
      );
      
      alert("Студент добавлен");
    } catch (err: any) {
      alert("Ошибка: " + err.message);
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
      alert("Данные обновлены");
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    }
  };

  const handleBanStudent = async () => {
    if (!selectedStudent) return;

    try {
      await banStudent(selectedStudent.id, banReason || "Не указано");
      setShowBanStudent(false);
      setSelectedStudent(null);
      setBanReason("");
      alert("Студент забанен");
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    }
  };

  const handleUnbanStudent = async (studentId: string) => {
    try {
      await unbanStudent(studentId);
      alert("Студент разбанен");
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;

    try {
      await deleteStudent(selectedStudent.id);
      setShowDeleteConfirm(false);
      setSelectedStudent(null);
      alert("Студент удалён");
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    }
  };

  const handleAddToQueue = async () => {
    if (!selectedStudent) return;

    try {
      await adminAddToQueue(
        selectedStudent.room || undefined,
        queueWashCount,
        queuePaymentType,
        undefined,
        queueDate,
        selectedStudent.id
      );

      setShowAddToQueue(false);
      alert("Студент добавлен в очередь");
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    }
  };

  const handleToggleAdmin = async (studentId: string, makeAdmin: boolean) => {
    try {
      await toggleAdminStatus(studentId, makeAdmin);
      alert(makeAdmin ? "Студент стал админом" : "Админские права сняты");
    } catch (error: any) {
      alert("Ошибка: " + error.message);
    }
  };

  const openAddToQueueModal = (student: Student) => {
    setSelectedStudent(student);
    setQueueWashCount(1);
    setQueuePaymentType("money");
    const today = new Date().toISOString().slice(0, 10);
    setQueueDate(today);
    setShowAddToQueue(true);
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setEditFirstname(student.first_name || "");
    setEditLastname(student.last_name || "");
    setEditRoom(student.room || "");
    setShowEditStudent(true);
  };

  const openBanModal = (student: Student) => {
    setSelectedStudent(student);
    setBanReason("");
    setShowBanStudent(true);
  };

  const openDeleteModal = (student: Student) => {
    setSelectedStudent(student);
    setShowDeleteConfirm(true);
  };

  if (!user) {
    return (
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
        <h2 className="mb-3 text-2xl font-bold text-yellow-800">Требуется вход</h2>
        <p className="mb-2 text-sm text-yellow-800">
          Сначала войдите как студент с правами администратора, затем введите админ-ключ.
        </p>
        <p className="text-xs text-yellow-700">
          Это нужно для корректной работы с базой и политиками безопасности.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Администратор</h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="adminKey"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Ключ администратора
            </label>
            <input
              id="adminKey"
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
              className="block w-full rounded-md border-2 border-gray-300 p-3 text-gray-900 shadow-sm placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              placeholder="Введите ключ"
            />
            {error && (
              <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleAdminLogin}
            className="w-full rounded-md bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700"
          >
            Войти как админ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-purple-800 bg-purple-700 p-6 shadow-lg">
      {/* ШАПКА ПАНЕЛИ */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Панель администратора</h2>
          <p className="mt-1 text-base text-purple-100">
            {isSuperAdmin ? "Режим суперадмина" : "Режим администратора"}
          </p>
        </div>
        
      </div>

      <div className="space-y-4">

        {/* СПИСОК СТУДЕНТОВ */}
        {showStudents && (
          <div className="space-y-4 rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Студенты ({filteredStudents.length})
              </h3>

              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmClear(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
                  >
                    <DeleteIcon className="h-4 w-4" />
                    Очистить очередь
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowAddStudent(true)}
                  className="flex flex-1 items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Добавить студента
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowStudents((v) => !v)}
              className="flex flex-1 items-center justify-center rounded-md bg-purple-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-900"
            >
              {showStudents ? "Скрыть студентов" : "Управление студентами"}
            </button>

            {/* Поиск + фильтры */}
            <div className="space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по имени или комнате"
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
              />

              <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                <FilterButton
                  active={filterStatus === "all"}
                  onClick={() => setFilterStatus("all")}
                  label="Все"
                />
                <FilterButton
                  active={filterStatus === "registered"}
                  onClick={() => setFilterStatus("registered")}
                  label="Зарег."
                />
                <FilterButton
                  active={filterStatus === "unregistered"}
                  onClick={() => setFilterStatus("unregistered")}
                  label="Не зар."
                />
                <FilterButton
                  active={filterStatus === "banned"}
                  onClick={() => setFilterStatus("banned")}
                  label="Баны"
                />
              </div>
            </div>

            {/* Карточки студентов */}
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar
                        type={(student.avatar_type as AvatarType) || "default"}
                        className="w-12 h-12"
                      />

                      <div>
                        <div className="text-base font-semibold text-gray-900">
                          {student.full_name}{" "}
                          <span className="text-sm font-normal text-gray-500">
                            ({student.room || "—"})
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                          {student.is_registered && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                              Зарегистрирован
                            </span>
                          )}

                          {!student.is_registered && (
                            <span className="rounded-full bg-gray-200 px-2 py-0.5 font-medium text-gray-700">
                              Не зарегистрирован
                            </span>
                          )}

                          {student.is_banned && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                              Заблокирован
                            </span>
                          )}

                          {student.telegram_chat_id && !student.is_banned && (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-700">
                              Telegram
                            </span>
                          )}

                          {student.is_admin && !student.is_super_admin && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-700">
                              Админ
                            </span>
                          )}

                          {student.is_super_admin && (
                            <span className="rounded-full bg-yellow-100 px-2 py-0.5 font-semibold text-yellow-800">
                              Суперадмин
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <ActionMenu
                      student={student}
                      isAdmin={isAdmin}
                      isSuperAdmin={isSuperAdmin}
                      currentUserId={user?.id}
                      onEdit={openEditModal}
                      onBan={openBanModal}
                      onUnban={handleUnbanStudent}
                      onDelete={openDeleteModal}
                      onReset={openResetConfirm}
                      onAddToQueue={openAddToQueueModal}
                      onToggleAdmin={handleToggleAdmin}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* МОДАЛКИ */}

      {/* Добавить студента */}
      {showAddStudent && (
        <Modal onClose={() => setShowAddStudent(false)}>
          <h3 className="mb-4 text-xl font-bold text-gray-900">
            Добавить студента
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newFirstName}
              onChange={(e) => setNewFirstName(e.target.value)}
              placeholder="Имя"
              className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900"
            />
            <input
              type="text"
              value={newLastName}
              onChange={(e) => setNewLastName(e.target.value)}
              placeholder="Фамилия (опционально)"
              className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900"
            />
            <input
              type="text"
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder="Комната (опционально)"
              className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddStudent(false)}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleAddStudent}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Добавить
            </button>
          </div>
        </Modal>
      )}

      {/* Редактировать студента */}
      {showEditStudent && selectedStudent && (
        <Modal onClose={() => setShowEditStudent(false)}>
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
            <EditIcon className="h-5 w-5" />
            Редактировать студента
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={editFirstname}
              onChange={(e) => setEditFirstname(e.target.value)}
              placeholder="Имя"
              className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900"
            />
            <input
              type="text"
              value={editLastname}
              onChange={(e) => setEditLastname(e.target.value)}
              placeholder="Фамилия"
              className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900"
            />
            <input
              type="text"
              value={editRoom}
              onChange={(e) => setEditRoom(e.target.value)}
              placeholder="Комната"
              className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowEditStudent(false)}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleEditStudent}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Сохранить
            </button>
          </div>
        </Modal>
      )}

      {/* Сброс регистрации */}
      {showResetConfirm && selectedStudent && (
        <Modal onClose={() => setShowResetConfirm(false)}>
          <h3 className="mb-3 text-xl font-bold text-orange-700">
            Сбросить регистрацию?
          </h3>
          <p className="mb-3 text-sm text-gray-800">
            Сбросить регистрацию для{" "}
            <span className="font-semibold">{selectedStudent.full_name}</span>?
          </p>
          <p className="mb-4 text-xs font-semibold text-orange-600">
            Студент сможет зарегистрироваться заново.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleResetStudent}
              className="flex-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Сбросить
            </button>
          </div>
        </Modal>
      )}

      {/* Бан */}
      {showBanStudent && selectedStudent && (
        <Modal onClose={() => setShowBanStudent(false)}>
          <h3 className="mb-4 text-xl font-bold text-gray-900">
            Забанить студента
          </h3>
          <p className="mb-3 text-sm text-gray-800">
            Забанить{" "}
            <span className="font-semibold">{selectedStudent.full_name}</span>?
          </p>
          <textarea
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Причина бана (опционально)"
            className="h-24 w-full rounded-lg border-2 border-gray-300 p-3 text-sm text-gray-900"
          />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowBanStudent(false)}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleBanStudent}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Забанить
            </button>
          </div>
        </Modal>
      )}

      {/* Удаление */}
      {showDeleteConfirm && selectedStudent && (
        <Modal onClose={() => setShowDeleteConfirm(false)}>
          <h3 className="mb-3 text-xl font-bold text-red-700">
            Удалить студента?
          </h3>
          <p className="mb-3 text-sm text-gray-800">
            Вы уверены, что хотите удалить{" "}
            <span className="font-semibold">{selectedStudent.full_name}</span>?
          </p>
          <p className="mb-4 text-xs font-semibold text-red-600">
            Это действие нельзя отменить. Будут удалены все данные студента.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleDeleteStudent}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Удалить
            </button>
          </div>
        </Modal>
      )}

      {/* Поставить в очередь (с датой) */}
      {showAddToQueue && selectedStudent && (
        <Modal onClose={() => setShowAddToQueue(false)}>
          <h3 className="mb-3 text-xl font-bold text-gray-900">
            Поставить в очередь
          </h3>
          <p className="mb-3 text-sm text-gray-800">
            Студент:{" "}
            <span className="font-semibold">{selectedStudent.full_name}</span>
          </p>

          <div className="space-y-3 text-sm">
            <div>
              <label className="mb-1 block font-semibold text-gray-900">
                Дата стирки
              </label>
              <select
                value={queueDate}
                onChange={(e) => setQueueDate(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-2 text-gray-900"
              >
                {getAvailableDates().map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-gray-900">
                Количество стирок
              </label>
              <select
                value={queueWashCount}
                onChange={(e) => setQueueWashCount(Number(e.target.value))}
                className="w-full rounded-lg border-2 border-gray-300 p-2 text-gray-900"
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-gray-900">
                Способ оплаты
              </label>
              <select
                value={queuePaymentType}
                onChange={(e) => setQueuePaymentType(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-2 text-gray-900"
              >
                <option value="money">Деньги</option>
                <option value="coupon">Купон</option>
                <option value="both">Деньги + купон</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddToQueue(false)}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleAddToQueue}
              className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Добавить
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ */

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-2 text-center ${
        active
          ? "bg-purple-600 text-white"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      {label}
    </button>
  );
}

function Tag({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "green" | "red" | "blue" | "purple" | "indigo";
}) {
  const map: Record<typeof color, string> = {
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
    indigo: "bg-indigo-100 text-indigo-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 ${map[color]}`}
    >
      {children}
    </span>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {children}
        <button
          type="button"
          onClick={onClose}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800"
        >
          <CloseIcon className="h-4 w-4" />
          Закрыть
        </button>
      </div>
    </div>
  );
}
