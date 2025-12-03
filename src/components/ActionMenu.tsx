"use client";

import { useState, useEffect, useRef } from "react";
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

interface Props {
  student: Student;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  currentUserId: string;
  onEdit: (s: Student) => void;
  onBan: (s: Student) => void;
  onUnban: (id: string) => void;
  onDelete: (s: Student) => void;
  onReset: (s: Student) => void;
  onAddToQueue: (s: Student) => void;
  onToggleAdmin: (id: string, makeAdmin: boolean) => void;
}

export default function ActionMenu(props: Props) {
  const {
    student,
    isAdmin,
    isSuperAdmin,
    currentUserId,
    onEdit,
    onBan,
    onUnban,
    onDelete,
    onReset,
    onAddToQueue,
    onToggleAdmin,
  } = props;

  const [open, setOpen] = useState(false);
  const touchStart = useRef(0);
  const touchEnd = useRef(0);

  // → Touch events
  const onStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientY;
  };
  const onMove = (e: React.TouchEvent) => {
    touchEnd.current = e.touches[0].clientY;
  };
  const onEnd = () => {
    if (touchEnd.current - touchStart.current > 70) setOpen(false);
  };

  // → ESC closes
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);

  // → Rights logic
  const isSelf = student.id === currentUserId;
  const isTargetAdmin = student.is_admin;
  const isTargetSuperAdmin = student.is_super_admin;

  function can(action: string) {
    if (isSuperAdmin) {
      if (isSelf) {
        return {
          edit: true,
          addQueue: false,
          reset: false,
          ban: false,
          unban: false,
          adminToggle: false,
          delete: false,
        }[action];
      }

      return {
        edit: true,
        addQueue: true,
        reset: !isTargetSuperAdmin,
        ban: !isTargetSuperAdmin,
        unban: !isTargetSuperAdmin,
        adminToggle: !isTargetSuperAdmin,
        delete: !isTargetSuperAdmin,
      }[action];
    }

    if (isAdmin) {
      if (isTargetSuperAdmin) return false;

      if (isSelf) {
        return {
          edit: true,
          addQueue: true,
          reset: false,
          ban: false,
          unban: false,
          adminToggle: false,
          delete: false,
        }[action];
      }

      return {
        edit: true,
        addQueue: true,
        reset: true,
        ban: true,
        unban: true,
        adminToggle: false,
        delete: true,
      }[action];
    }

    return false;
  }

  return (
    <>
      {/* Центральная кнопка */}
      <button
        onClick={() => setOpen(true)}
        className="mx-auto block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow font-semibold text-sm"
      >
        Управление
      </button>

      {/* затемнение */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[90]"
          onClick={() => setOpen(false)}
        ></div>
      )}

      {/* нижний блок */}
      {open && (
        <div
          onTouchStart={onStart}
          onTouchMove={onMove}
          onTouchEnd={onEnd}
          className="fixed bottom-0 left-0 right-0 z-[100] bg-white rounded-t-2xl shadow-xl p-4 pb-6 animate-slideUp"
        >
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>

          {can("addQueue") && (
            <SheetButton
              icon={<CalendarIcon className="w-5 h-5" />}
              label="Поставить в очередь"
              onClick={() => {
                onAddToQueue(student);
                setOpen(false);
              }}
            />
          )}

          {can("edit") && (
            <SheetButton
              icon={<EditIcon className="w-5 h-5" />}
              label="Редактировать"
              onClick={() => {
                onEdit(student);
                setOpen(false);
              }}
            />
          )}

          {can("reset") && (
            <SheetButton
              icon={<RefreshIcon className="w-5 h-5" />}
              label="Сбросить регистрацию"
              onClick={() => {
                onReset(student);
                setOpen(false);
              }}
            />
          )}

          {can("ban") && !student.is_banned && (
            <SheetButton
              icon={<BanIcon className="w-5 h-5" />}
              label="Забанить"
              onClick={() => {
                onBan(student);
                setOpen(false);
              }}
            />
          )}

          {can("unban") && student.is_banned && (
            <SheetButton
              icon={<CheckIcon className="w-5 h-5" />}
              label="Разбанить"
              onClick={() => {
                onUnban(student.id);
                setOpen(false);
              }}
            />
          )}

          {can("adminToggle") && (
            <SheetButton
              icon={<PeopleIcon className="w-5 h-5" />}
              label={student.is_admin ? "Снять админа" : "Сделать админом"}
              onClick={() => {
                onToggleAdmin(student.id, !student.is_admin);
                setOpen(false);
              }}
            />
          )}

          {can("delete") && (
            <SheetButton
              icon={<DeleteIcon className="w-5 h-5 text-red-600" />}
              label="Удалить"
              danger
              onClick={() => {
                onDelete(student);
                setOpen(false);
              }}
            />
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.25s ease-out;
        }
      `}</style>
    </>
  );
}

function SheetButton({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-lg text-left ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-800 hover:bg-gray-100"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}
