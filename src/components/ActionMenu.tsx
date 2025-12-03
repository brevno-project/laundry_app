"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { Student } from "@/types";
import {
  CalendarIcon,
  EditIcon,
  RefreshIcon,
  BanIcon,
  CheckIcon,
  DeleteIcon,
  PeopleIcon,
} from "@/components/Icons";

interface ActionMenuProps {
  student: Student;
  isAdmin: boolean;          // текущий пользователь — админ (включая супер)
  isSuperAdmin: boolean;     // текущий пользователь — суперАдмин
  currentStudentId: string | null; // id студента текущего пользователя (user.student_id)
  onEdit: (s: Student) => void;
  onBan: (s: Student) => void;
  onUnban: (id: string) => void;
  onDelete: (s: Student) => void;
  onReset: (s: Student) => void;
  onAddToQueue: (s: Student) => void;
  onToggleAdmin: (id: string, makeAdmin: boolean) => void;
}

export default function ActionMenu({
  student,
  isAdmin,
  isSuperAdmin,
  currentStudentId,
  onEdit,
  onBan,
  onUnban,
  onDelete,
  onReset,
  onAddToQueue,
  onToggleAdmin,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // если не админ вообще — ничего не показываем (но по идее сюда обычный юзер не попадёт)
  if (!isAdmin && !isSuperAdmin) return null;

  const isSelf = currentStudentId === student.id;
  const isTargetSuper = student.is_super_admin;
  const isTargetAdmin = student.is_admin && !student.is_super_admin;
  const isRegular = !student.is_admin && !student.is_super_admin;

  // когда открываем sheet — скроллим карточку студента в центр
  useEffect(() => {
    if (open && rootRef.current) {
      rootRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [open]);

  // Правила доступа
  const canResetRegistration =
    isSuperAdmin && !isTargetSuper && !isSelf;

  const canBan =
    (isSuperAdmin && !isSelf && !isTargetSuper) ||
    (!isSuperAdmin && isAdmin && isRegular && !student.is_banned);

  const canUnban =
    (isSuperAdmin && !isSelf && !isTargetSuper) ||
    (!isSuperAdmin && isAdmin && isRegular && student.is_banned);

  const canToggleAdmin =
    isSuperAdmin && !isSelf && !isTargetSuper; // только супер над обычными

  const canDelete =
    (isSuperAdmin && !isSelf && !isTargetSuper) ||
    (!isSuperAdmin && isAdmin && isRegular && !isSelf); // админ удаляет только обычных

  return (
    <div ref={rootRef} className="relative">
      {/* Три точки-триггер */}
      <button
        onClick={() => setOpen(true)}
        className="rounded-full p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition"
        title="Действия"
      >
        ⋮
      </button>

      {/* Bottom sheet */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-white shadow-2xl border-t border-gray-200 p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                Действия со студентом
                <div className="text-sm font-semibold text-gray-900">
                  {student.full_name}
                  {student.room && (
                    <span className="ml-1 text-gray-500 text-xs">
                      ({student.room})
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {student.is_super_admin && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-100 text-purple-700 font-semibold">
                      SUPERADMIN
                    </span>
                  )}
                  {student.is_admin && !student.is_super_admin && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                      ADMIN
                    </span>
                  )}
                  {student.is_registered && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-100 text-green-700 font-semibold">
                      Зарег.
                    </span>
                  )}
                  {student.is_banned && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-100 text-red-700 font-semibold">
                      Бан
                    </span>
                  )}
                  {student.telegram_chat_id && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700 font-semibold">
                      TG
                    </span>
                  )}
                  {isSelf && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600 font-semibold">
                      Это вы
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Блок: Очередь / профиль */}
            <div className="space-y-1 border-t border-gray-100 pt-2">
              <MenuButton
                icon={<CalendarIcon className="w-4 h-4" />}
                label="Поставить в очередь"
                onClick={() => {
                  onAddToQueue(student);
                  setOpen(false);
                }}
              />
              <MenuButton
                icon={<EditIcon className="w-4 h-4" />}
                label="Редактировать данные"
                onClick={() => {
                  onEdit(student);
                  setOpen(false);
                }}
              />
            </div>

            {/* Блок: Управление доступом */}
            {(canResetRegistration || canBan || canUnban || canToggleAdmin) && (
              <div className="space-y-1 border-t border-gray-100 pt-2">
                {canResetRegistration && (
                  <MenuButton
                    icon={<RefreshIcon className="w-4 h-4" />}
                    label="Сбросить регистрацию"
                    onClick={() => {
                      onReset(student);
                      setOpen(false);
                    }}
                  />
                )}

                {canBan && !student.is_banned && (
                  <MenuButton
                    icon={<BanIcon className="w-4 h-4" />}
                    label="Забанить"
                    onClick={() => {
                      onBan(student);
                      setOpen(false);
                    }}
                  />
                )}

                {canUnban && student.is_banned && (
                  <MenuButton
                    icon={<CheckIcon className="w-4 h-4" />}
                    label="Разбанить"
                    onClick={() => {
                      onUnban(student.id);
                      setOpen(false);
                    }}
                  />
                )}

                {canToggleAdmin && (
                  <MenuButton
                    icon={<PeopleIcon className="w-4 h-4" />}
                    label={student.is_admin ? "Снять админа" : "Сделать админом"}
                    onClick={() => {
                      onToggleAdmin(student.id, !student.is_admin);
                      setOpen(false);
                    }}
                  />
                )}
              </div>
            )}

            {/* Блок: Опасная зона */}
            {canDelete && (
              <div className="space-y-1 border-t border-gray-100 pt-2">
                <MenuButton
                  icon={<DeleteIcon className="w-4 h-4" />}
                  label="Удалить студента"
                  danger
                  onClick={() => {
                    onDelete(student);
                    setOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-left transition",
        danger
          ? "text-red-600 hover:bg-red-50 font-semibold"
          : "text-gray-800 hover:bg-gray-100",
      ].join(" ")}
    >
      <span className={danger ? "text-red-500" : "text-gray-500"}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
