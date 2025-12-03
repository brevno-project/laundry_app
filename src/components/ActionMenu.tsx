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
    onEdit,
    onBan,
    onUnban,
    onDelete,
    onReset,
    onAddToQueue,
    onToggleAdmin,
  } = props;

  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Закрытие по ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Swipe down to close bottom-sheet
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    const diff = currentY.current - startY.current;

    if (diff > 70) {
      setOpen(false);
    } else {
      if (sheetRef.current) sheetRef.current.style.transform = "translateY(0)";
    }
  };

  return (
    <>
      {/* КНОПКА ОТКРЫТИЯ */}
      <button
        onClick={() => setOpen(true)}
        className="
          bg-purple-600 hover:bg-purple-700
          text-white px-3 py-1.5
          text-sm rounded-lg shadow 
          font-semibold flex items-center gap-2
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 6v.01M12 12v.01M12 18v.01"
          />
        </svg>
        Управление
      </button>

      {/* ФОН */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[90]"
          onClick={() => setOpen(false)}
        ></div>
      )}

      {/* BOTTOM SHEET */}
      {open && (
        <div
          ref={sheetRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="
            fixed bottom-0 left-0 right-0 z-[100]
            bg-white rounded-t-2xl shadow-xl
            p-4 pb-6
            animate-slideUp
          "
        >
          {/* Хвостик для свайпа */}
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>

          {/* Список действий */}

          <SheetButton
            icon={<CalendarIcon className="w-5 h-5" />}
            label="Поставить в очередь"
            onClick={() => {
              onAddToQueue(student);
              setOpen(false);
            }}
          />

          <SheetButton
            icon={<EditIcon className="w-5 h-5" />}
            label="Редактировать"
            onClick={() => {
              onEdit(student);
              setOpen(false);
            }}
          />

          {isSuperAdmin && student.is_registered && !student.is_super_admin && (
            <SheetButton
              icon={<RefreshIcon className="w-5 h-5" />}
              label="Сбросить регистрацию"
              onClick={() => {
                onReset(student);
                setOpen(false);
              }}
            />
          )}

          {isSuperAdmin && !student.is_super_admin && !student.is_banned && (
            <SheetButton
              icon={<BanIcon className="w-5 h-5" />}
              label="Забанить"
              onClick={() => {
                onBan(student);
                setOpen(false);
              }}
            />
          )}

          {isSuperAdmin && student.is_banned && (
            <SheetButton
              icon={<CheckIcon className="w-5 h-5" />}
              label="Разбанить"
              onClick={() => {
                onUnban(student.id);
                setOpen(false);
              }}
            />
          )}

          {isSuperAdmin && !student.is_super_admin && (
            <SheetButton
              icon={<PeopleIcon className="w-5 h-5" />}
              label={student.is_admin ? "Снять админа" : "Сделать админом"}
              onClick={() => {
                onToggleAdmin(student.id, !student.is_admin);
                setOpen(false);
              }}
            />
          )}

          {isSuperAdmin && !student.is_super_admin && (
            <SheetButton
              icon={<DeleteIcon className="w-5 h-5 text-red-600" />}
              label="Удалить"
              onClick={() => {
                onDelete(student);
                setOpen(false);
              }}
              danger
            />
          )}
        </div>
      )}

      {/* Анимации */}
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

/* ОДНА КНОПКА ВНИЗУ */
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
      className={`
        w-full flex items-center gap-3
        px-4 py-3 mb-1 rounded-lg
        text-left text-gray-800
        ${danger ? "text-red-600 hover:bg-red-50" : "hover:bg-gray-100"}
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}
