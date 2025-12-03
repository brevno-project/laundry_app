"use client";

import { useState, useEffect } from "react";
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
  isSuperAdmin,
  isAdmin,
  onEdit,
  onBan,
  onUnban,
  onDelete,
  onReset,
  onAddToQueue,
  onToggleAdmin,
}: Props) {
  const [open, setOpen] = useState(false);

  // Закрытие по ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className="relative">
      {/* Три точки */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded-lg hover:bg-gray-200 text-gray-700 transition"
      >
        ⋮
      </button>

      {/* ВЫПАДАЮЩЕЕ МЕНЮ */}
      {open && (
        <div
          className="
            absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border
            animate-fadeIn z-50 overflow-hidden
          "
        >
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
            label="Редактировать"
            onClick={() => {
              onEdit(student);
              setOpen(false);
            }}
          />

          {isSuperAdmin && student.is_registered && !student.is_super_admin && (
            <MenuButton
              icon={<RefreshIcon className="w-4 h-4" />}
              label="Сбросить регистрацию"
              onClick={() => {
                onReset(student);
                setOpen(false);
              }}
            />
          )}

          {isSuperAdmin && !student.is_super_admin && !student.is_banned && (
            <MenuButton
              icon={<BanIcon className="w-4 h-4" />}
              label="Забанить"
              onClick={() => {
                onBan(student);
                setOpen(false);
              }}
            />
          )}

          {isSuperAdmin && student.is_banned && (
            <MenuButton
              icon={<CheckIcon className="w-4 h-4" />}
              label="Разбанить"
              onClick={() => {
                onUnban(student.id);
                setOpen(false);
              }}
            />
          )}

          {isSuperAdmin && !student.is_super_admin && (
            <MenuButton
              icon={<PeopleIcon className="w-4 h-4" />}
              label={student.is_admin ? "Снять админа" : "Сделать админом"}
              onClick={() => {
                onToggleAdmin(student.id, !student.is_admin);
                setOpen(false);
              }}
            />
          )}

          {isSuperAdmin && !student.is_super_admin && (
            <MenuButton
              icon={<DeleteIcon className="w-4 h-4" />}
              label="Удалить"
              className="text-red-600 hover:bg-red-50"
              onClick={() => {
                onDelete(student);
                setOpen(false);
              }}
            />
          )}
        </div>
      )}

      <style jsx global>{`
        .animate-fadeIn {
          animation: fadeIn 0.12s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

/* Кнопка меню */
function MenuButton({
  icon,
  label,
  onClick,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-2 w-full text-left
        text-gray-800 hover:bg-gray-100 transition
        ${className}
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}
