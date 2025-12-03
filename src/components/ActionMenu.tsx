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
  isAdmin: boolean;
  isSuperAdmin: boolean;
  currentStudentId: string | null;
  onEdit: (s: Student) => void;
  onBan: (s: Student) => void;
  onUnban: (id: string) => void;
  onDelete: (s: Student) => void;
  onReset: (s: Student) => void;
  onAddToQueue: (s: Student) => void;
  onToggleAdmin: (id: string, makeAdmin: boolean) => void;
}

export default function ActionMenu(props: ActionMenuProps) {
  const {
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
  } = props;

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // расчёты ролей идут до JSX, это норм
  const isSelf = currentStudentId === student.id;
  const isTargetSuper = student.is_super_admin;
  const isRegular = !student.is_admin && !student.is_super_admin;

  // Хуки должны быть всегда — нельзя return null выше!!
  useEffect(() => {
    if (open && rootRef.current) {
      rootRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [open]);

  // Вариант: если обычный юзер — просто пустой div (хуки уже выполнены безопасно)
  const hiddenForUser = !isAdmin && !isSuperAdmin;

  // Правила доступа:
  const canResetRegistration = isSuperAdmin && !isTargetSuper && !isSelf;

  const canBan =
    (isSuperAdmin && !isSelf && !isTargetSuper) ||
    (!isSuperAdmin && isAdmin && isRegular && !student.is_banned);

  const canUnban =
    (isSuperAdmin && !isSelf && !isTargetSuper) ||
    (!isSuperAdmin && isAdmin && isRegular && student.is_banned);

  const canToggleAdmin = isSuperAdmin && !isSelf && !isTargetSuper;

  const canDelete =
    (isSuperAdmin && !isSelf && !isTargetSuper) ||
    (!isSuperAdmin && isAdmin && isRegular && !isSelf);

  return (
    <div ref={rootRef} className="relative">
      {/* Если скрыто — просто не рендерим кнопку */}
      {!hiddenForUser && (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition"
        >
          ⋮
        </button>
      )}

      {open && !hiddenForUser && (
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
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Очередь / Профиль */}
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

            {(canResetRegistration ||
              canBan ||
              canUnban ||
              canToggleAdmin) && (
              <div className="pt-2 border-t border-gray-100 space-y-1">
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
                    label={
                      student.is_admin
                        ? "Снять админа"
                        : "Сделать админом"
                    }
                    onClick={() => {
                      onToggleAdmin(student.id, !student.is_admin);
                      setOpen(false);
                    }}
                  />
                )}
              </div>
            )}

            {canDelete && (
              <div className="pt-2 border-t border-gray-100 space-y-1">
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
      <span className={danger ? "text-red-500" : "text-gray-500"}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
