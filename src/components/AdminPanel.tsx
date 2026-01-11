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
  EyeIcon,
} from "@/components/Icons";
import ActionMenu from "@/components/ActionMenu";
import Avatar, { AvatarType } from "@/components/Avatar";
import AddStudentModal from "@/components/AddStudentModal";
export default function AdminPanel() {
  const {
    user,
    isAdmin,
    setIsAdmin,
    queue,
    students,
    markDone,
    startNext,
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
  const [showStudents, setShowStudents] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // РњРѕРґР°Р»СЊРЅС‹Рµ РѕРєРЅР°
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [showBanStudent, setShowBanStudent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAddToQueue, setShowAddToQueue] = useState(false);

  // РџР°СЂР°РјРµС‚СЂС‹ Р·Р°РїРёСЃРё РІ РѕС‡РµСЂРµРґСЊ (РІРєР»СЋС‡Р°СЏ РґР°С‚Сѓ)
  const [queueWashCount, setQueueWashCount] = useState(1);
  const [queuePaymentType, setQueuePaymentType] = useState("money");
  const [queueDate, setQueueDate] = useState("");


  // Р¤РѕСЂРјР° СЂРµРґР°РєС‚РёСЂРѕРІР°РЅРёСЏ СЃС‚СѓРґРµРЅС‚Р°
  const [editFirstname, setEditFirstname] = useState("");
  const [editLastname, setEditLastname] = useState("");
  const [editRoom, setEditRoom] = useState("");

  // Р¤РѕСЂРјР° Р±Р°РЅР°
  const [banReason, setBanReason] = useState("");

  // РџРѕРёСЃРє СЃС‚СѓРґРµРЅС‚РѕРІ
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "registered" | "unregistered" | "banned"
  >("all");

  const washingItem = queue.find((item) => item.status === "washing");

  // Р“РµРЅРµСЂР°С†РёСЏ РґРѕСЃС‚СѓРїРЅС‹С… РґР°С‚ (СЃРµРіРѕРґРЅСЏ + 7 РґРЅРµР№)
  const getAvailableDates = () => {
    const dates: { value: string; label: string }[] = [];
    const today = new Date();

    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const value = date.toISOString().slice(0, 10);

      const dayNames = ["Р’СЃ", "РџРЅ", "Р’С‚", "РЎСЂ", "Р§С‚", "РџС‚", "РЎР±"];
      const dayName = dayNames[date.getDay()];
      const day = date.getDate();
      const month = date.getMonth() + 1;

      let label = `${dayName}, ${day}.${month.toString().padStart(2, "0")}`;
      if (i === 0) label += " (СЃРµРіРѕРґРЅСЏ)";
      if (i === 1) label += " (Р·Р°РІС‚СЂР°)";

      dates.push({ value, label });
    }

    return dates;
  };

  const hasTelegram = (student: Student) => {
    const chat = typeof student.telegram_chat_id === "string" ? student.telegram_chat_id.trim() : "";
    return !!chat && !!student.is_registered && !student.is_banned;
  };

  // Р¤РёР»СЊС‚СЂР°С†РёСЏ СЃС‚СѓРґРµРЅС‚РѕРІ
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

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminKey("");
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
      alert("Р РµРіРёСЃС‚СЂР°С†РёСЏ СЃР±СЂРѕС€РµРЅР°" + " \u2705");
    } catch (err: any) {
      alert("РћС€РёР±РєР° СЃР±СЂРѕСЃР° СЂРµРіРёСЃС‚СЂР°С†РёРё" + " \u2705");
    }
  };


  const handleEditStudent = async () => {
    if (!selectedStudent) return;

    try {
      await updateStudent(selectedStudent.id, {
        first_name: editFirstname || undefined,
        last_name: editLastname || undefined,
        room: editRoom || undefined,
        can_view_students: isSuperAdmin ? editCanViewStudents : undefined,
      });
      setShowEditStudent(false);
      setSelectedStudent(null);
      setNotice({ type: "success", message: "Студент обновлен." });
    } catch (err: any) {
      setNotice({ type: "error", message: "Ошибка обновления студента." });
    }
  };

  const handleBanStudent = async () => { = async () => {
    if (!selectedStudent) return;

    try {
      await banStudent(selectedStudent.id, banReason || "РќРµ СѓРєР°Р·Р°РЅРѕ");
      setShowBanStudent(false);
      setSelectedStudent(null);
      setBanReason("");
      alert("РЎС‚СѓРґРµРЅС‚ Р·Р°Р±Р°РЅРµРЅ" + " \u2705");
    } catch (err: any) {
      alert("РћС€РёР±РєР°: " + err.message + " \u2705");
    }
  };

  const handleUnbanStudent = async (studentId: string) => {
    try {
      await unbanStudent(studentId);
      alert("РЎС‚СѓРґРµРЅС‚ СЂР°Р·Р±Р°РЅРµРЅ" + " \u2705");
    } catch (err: any) {
      alert("РћС€РёР±РєР°: " + err.message + " \u2705");
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;

    try {
      await deleteStudent(selectedStudent.id);
      setShowDeleteConfirm(false);
      setSelectedStudent(null);
      alert("РЎС‚СѓРґРµРЅС‚ СѓРґР°Р»С‘РЅ" + " \u2705");
    } catch (err: any) {
      alert("РћС€РёР±РєР°: " + err.message + " \u2705");
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
      alert("РЎС‚СѓРґРµРЅС‚ РґРѕР±Р°РІР»РµРЅ РІ РѕС‡РµСЂРµРґСЊ" + " \u2705");
    } catch (err: any) {
      alert("РћС€РёР±РєР°: " + err.message + " \u2705");
    }
  };

  const handleToggleAdmin = async (studentId: string, makeAdmin: boolean) => {
    try {
      await toggleAdminStatus(studentId, makeAdmin);
      alert((makeAdmin ? "Студент стал админом" : "Админские права сняты") + " \u2705");
    } catch (error: any) {
      alert("Ошибка: " + error.message + " \u2705");
    }
  };

  const openAddToQueueModal = (student: Student) => { = (student: Student) => {
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
        <h2 className="mb-3 text-2xl font-bold text-yellow-800">РўСЂРµР±СѓРµС‚СЃСЏ РІС…РѕРґ</h2>
        <p className="mb-2 text-sm text-yellow-800">
          РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРёС‚Рµ РєР°Рє СЃС‚СѓРґРµРЅС‚ СЃ РїСЂР°РІР°РјРё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°, Р·Р°С‚РµРј РІРІРµРґРёС‚Рµ Р°РґРјРёРЅ-РєР»СЋС‡.
        </p>
        <p className="text-xs text-yellow-700">
          Р­С‚Рѕ РЅСѓР¶РЅРѕ РґР»СЏ РєРѕСЂСЂРµРєС‚РЅРѕР№ СЂР°Р±РѕС‚С‹ СЃ Р±Р°Р·РѕР№ Рё РїРѕР»РёС‚РёРєР°РјРё Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё.
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">РђРґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂ</h2>
        <p className="text-sm text-gray-600">
          Р’РѕР№РґРёС‚Рµ РєР°Рє СЃС‚СѓРґРµРЅС‚ СЃ РїСЂР°РІР°РјРё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РґР»СЏ РґРѕСЃС‚СѓРїР° Рє РїР°РЅРµР»Рё.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-purple-800 bg-purple-700 p-6 shadow-lg">
      {/* РЁРђРџРљРђ РџРђРќР•Р›Р� */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">РџР°РЅРµР»СЊ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°</h2>
          <p className="mt-1 text-base text-purple-100">
            {isSuperAdmin ? "Р РµР¶РёРј СЃСѓРїРµСЂР°РґРјРёРЅР°" : "Р РµР¶РёРј Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°"}
          </p>
        </div>
        
      </div>

      <div className="space-y-4">

        {/* РљРќРћРџРљРђ РЈРџР РђР’Р›Р•РќР�РЇ РЎРўРЈР”Р•РќРўРђРњР� */}
        <button
          type="button"
          onClick={() => setShowStudents((v) => !v)}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700"
        >
          <PeopleIcon className="h-5 w-5" />
          {showStudents ? "РЎРєСЂС‹С‚СЊ СЃС‚СѓРґРµРЅС‚РѕРІ" : "РЈРїСЂР°РІР»РµРЅРёРµ СЃС‚СѓРґРµРЅС‚Р°РјРё"}
        </button>

        {/* РЎРџР�РЎРћРљ РЎРўРЈР”Р•РќРўРћР’ */}
        {showStudents && (
          <div className="space-y-4 rounded-lg bg-white p-5 shadow-sm">
            {notice && (
              <div className={`rounded-lg border px-3 py-2 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                {notice.message}
              </div>
            )}
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                РЎС‚СѓРґРµРЅС‚С‹ ({filteredStudents.length})
              </h3>

              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(true)}
                  className="flex flex-1 items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Р”РѕР±Р°РІРёС‚СЊ СЃС‚СѓРґРµРЅС‚Р°
                </button>
              </div>
            </div>

            {/* РџРѕРёСЃРє + С„РёР»СЊС‚СЂС‹ */}
            <div className="space-y-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="РџРѕРёСЃРє РїРѕ РёРјРµРЅРё РёР»Рё РєРѕРјРЅР°С‚Рµ"
                className="w-full rounded-md border-2 border-gray-300 p-2 text-sm text-gray-900"
              />

              <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
                <FilterButton
                  active={filterStatus === "all"}
                  onClick={() => setFilterStatus("all")}
                  label="Р’СЃРµ"
                />
                <FilterButton
                  active={filterStatus === "registered"}
                  onClick={() => setFilterStatus("registered")}
                  label="Р—Р°СЂРµРі."
                />
                <FilterButton
                  active={filterStatus === "unregistered"}
                  onClick={() => setFilterStatus("unregistered")}
                  label="РќРµ Р·Р°СЂ."
                />
                <FilterButton
                  active={filterStatus === "banned"}
                  onClick={() => setFilterStatus("banned")}
                  label="Р‘Р°РЅС‹"
                />
              </div>
            </div>

            {/* РљР°СЂС‚РѕС‡РєРё СЃС‚СѓРґРµРЅС‚РѕРІ */}
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  {/* Р’РµСЂС…РЅСЏСЏ С‡Р°СЃС‚СЊ: Р°РІР°С‚Р°СЂ + РёРјСЏ */}
                  <div className="flex items-start gap-3">
                    <Avatar
                      type={(student.avatar_type as AvatarType) || "default"}
                      className="w-12 h-12 flex-shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold text-gray-900 break-words">
                        {student.full_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {student.room || "вЂ”"}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                        {student.is_registered && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                            Р—Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅ
                          </span>
                        )}

                        {!student.is_registered && (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 font-medium text-gray-700">
                            РќРµ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°РЅ
                          </span>
                        )}

                        {student.is_banned && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-700">
                            Р—Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ
                          </span>
                        )}

                        {hasTelegram(student) && (
                          <span className="rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-700">
                            Telegram
                          </span>
                        )}

                        {student.is_admin && !student.is_super_admin && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 font-medium text-purple-700">
                            РђРґРјРёРЅ
                          </span>
                        )}

                        {student.is_super_admin && (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 font-semibold text-yellow-800">
                            РЎСѓРїРµСЂР°РґРјРёРЅ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* РќРёР¶РЅСЏСЏ С‡Р°СЃС‚СЊ: РєРЅРѕРїРєР° СѓРїСЂР°РІР»РµРЅРёСЏ РЅР° РІСЃСЋ С€РёСЂРёРЅСѓ */}
                  <div className="pt-2">
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

      {/* РњРћР”РђР›РљР� */}

      {/* Р”РѕР±Р°РІРёС‚СЊ СЃС‚СѓРґРµРЅС‚Р° */}
      {showAddStudent && (
        <AddStudentModal onClose={() => setShowAddStudent(false)} />
      )}

      {/* Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ СЃС‚СѓРґРµРЅС‚Р° */}
      {showEditStudent && selectedStudent && (
        <Modal onClose={() => setShowEditStudent(false)}>
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900">
            <EditIcon className="h-5 w-5" />
            Р РµРґР°РєС‚РёСЂРѕРІР°С‚СЊ СЃС‚СѓРґРµРЅС‚Р°
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={editFirstname}
              onChange={(e) => setEditFirstname(e.target.value)}
              placeholder="Р�РјСЏ"
              className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900"
            />
            <input
              type="text"
              value={editLastname}
              onChange={(e) => setEditLastname(e.target.value)}
              placeholder="Р¤Р°РјРёР»РёСЏ"
              className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900"
            />
            <input
              type="text"
              value={editRoom}
              onChange={(e) => setEditRoom(e.target.value)}
              placeholder="РљРѕРјРЅР°С‚Р°"
              className="w-full rounded-lg border-2 border-gray-300 p-3 text-gray-900"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowEditStudent(false)}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
            >
              РћС‚РјРµРЅР°
            </button>
            <button
              type="button"
              onClick={handleEditStudent}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              РЎРѕС…СЂР°РЅРёС‚СЊ
            </button>
          </div>
        </Modal>
      )}

      {/* РЎР±СЂРѕСЃ СЂРµРіРёСЃС‚СЂР°С†РёРё */}
      {showResetConfirm && selectedStudent && (
        <Modal onClose={() => setShowResetConfirm(false)}>
          <h3 className="mb-3 text-xl font-bold text-orange-700">
            РЎР±СЂРѕСЃРёС‚СЊ СЂРµРіРёСЃС‚СЂР°С†РёСЋ?
          </h3>
          <p className="mb-3 text-sm text-gray-800">
            РЎР±СЂРѕСЃРёС‚СЊ СЂРµРіРёСЃС‚СЂР°С†РёСЋ РґР»СЏ{" "}
            <span className="font-semibold">{selectedStudent.full_name}</span>?
          </p>
          <p className="mb-4 text-xs font-semibold text-orange-600">
            РЎС‚СѓРґРµРЅС‚ СЃРјРѕР¶РµС‚ Р·Р°СЂРµРіРёСЃС‚СЂРёСЂРѕРІР°С‚СЊСЃСЏ Р·Р°РЅРѕРІРѕ.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
            >
              РћС‚РјРµРЅР°
            </button>
            <button
              type="button"
              onClick={handleResetStudent}
              className="flex-1 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              РЎР±СЂРѕСЃРёС‚СЊ
            </button>
          </div>
        </Modal>
      )}

      {/* Р‘Р°РЅ */}
      {showBanStudent && selectedStudent && (
        <Modal onClose={() => setShowBanStudent(false)}>
          <h3 className="mb-4 text-xl font-bold text-gray-900">
            Р—Р°Р±Р°РЅРёС‚СЊ СЃС‚СѓРґРµРЅС‚Р°
          </h3>
          <p className="mb-3 text-sm text-gray-800">
            Р—Р°Р±Р°РЅРёС‚СЊ{" "}
            <span className="font-semibold">{selectedStudent.full_name}</span>?
          </p>
          <textarea
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="РџСЂРёС‡РёРЅР° Р±Р°РЅР° (РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ)"
            className="h-24 w-full rounded-lg border-2 border-gray-300 p-3 text-sm text-gray-900"
          />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowBanStudent(false)}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
            >
              РћС‚РјРµРЅР°
            </button>
            <button
              type="button"
              onClick={handleBanStudent}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Р—Р°Р±Р°РЅРёС‚СЊ
            </button>
          </div>
        </Modal>
      )}

      {/* РЈРґР°Р»РµРЅРёРµ */}
      {showDeleteConfirm && selectedStudent && (
        <Modal onClose={() => setShowDeleteConfirm(false)}>
          <h3 className="mb-3 text-xl font-bold text-red-700">
            РЈРґР°Р»РёС‚СЊ СЃС‚СѓРґРµРЅС‚Р°?
          </h3>
          <p className="mb-3 text-sm text-gray-800">
            Р’С‹ СѓРІРµСЂРµРЅС‹, С‡С‚Рѕ С…РѕС‚РёС‚Рµ СѓРґР°Р»РёС‚СЊ{" "}
            <span className="font-semibold">{selectedStudent.full_name}</span>?
          </p>
          <p className="mb-4 text-xs font-semibold text-red-600">
            Р­С‚Рѕ РґРµР№СЃС‚РІРёРµ РЅРµР»СЊР·СЏ РѕС‚РјРµРЅРёС‚СЊ. Р‘СѓРґСѓС‚ СѓРґР°Р»РµРЅС‹ РІСЃРµ РґР°РЅРЅС‹Рµ СЃС‚СѓРґРµРЅС‚Р°.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
            >
              РћС‚РјРµРЅР°
            </button>
            <button
              type="button"
              onClick={handleDeleteStudent}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              РЈРґР°Р»РёС‚СЊ
            </button>
          </div>
        </Modal>
      )}

      {/* РџРѕСЃС‚Р°РІРёС‚СЊ РІ РѕС‡РµСЂРµРґСЊ (СЃ РґР°С‚РѕР№) */}
      {showAddToQueue && selectedStudent && (
        <Modal onClose={() => setShowAddToQueue(false)}>
          <h3 className="mb-3 text-xl font-bold text-gray-900">
            РџРѕСЃС‚Р°РІРёС‚СЊ РІ РѕС‡РµСЂРµРґСЊ
          </h3>
          <p className="mb-3 text-sm text-gray-800">
            РЎС‚СѓРґРµРЅС‚:{" "}
            <span className="font-semibold">{selectedStudent.full_name}</span>
          </p>

          <div className="space-y-3 text-sm">
            <div>
              <label className="mb-1 block font-semibold text-gray-900">
                Р”Р°С‚Р° СЃС‚РёСЂРєРё
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
                РљРѕР»РёС‡РµСЃС‚РІРѕ СЃС‚РёСЂРѕРє
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
                РЎРїРѕСЃРѕР± РѕРїР»Р°С‚С‹
              </label>
              <select
                value={queuePaymentType}
                onChange={(e) => setQueuePaymentType(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 p-2 text-gray-900"
              >
                <option value="money">Р”РµРЅСЊРіРё</option>
                <option value="coupon">РљСѓРїРѕРЅ</option>
                <option value="both">Р”РµРЅСЊРіРё + РєСѓРїРѕРЅ</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setShowAddToQueue(false)}
              className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
            >
              РћС‚РјРµРЅР°
            </button>
            <button
              type="button"
              onClick={handleAddToQueue}
              className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Р”РѕР±Р°РІРёС‚СЊ
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* Р’РЎРџРћРњРћР“РђРўР•Р›Р¬РќР«Р• РљРћРњРџРћРќР•РќРўР« */

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
          Р—Р°РєСЂС‹С‚СЊ
        </button>
      </div>
    </div>
  );
}
