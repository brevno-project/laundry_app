"use client";

import { useState, useRef, useEffect } from "react";
import {
  CalendarIcon,
  EditIcon,
  RefreshIcon,
  BanIcon,
  CheckIcon,
  DeleteIcon,
  PeopleIcon,
} from "@/components/Icons";
import { Student } from "@/types";

interface ActionMenuProps {
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
  }: ActionMenuProps) {
  
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Закрытие при клике вне меню
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Три точки */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-2 rounded hover:bg-gray-200 text-gray-700"
      >
        ⋮
      </button>

      {open && (
        <div className="absolute right-0 mt-2 bg-white shadow-lg rounded-lg border p-2 w-56 z-50 space-y-1">
          
          {/* Поставить в очередь */}
          <button className="menu-btn" onClick={() => { onAddToQueue(student); setOpen(false); }}>
            <CalendarIcon className="w-4 h-4 mr-2" />
            Поставить в очередь
          </button>

          {/* Редактировать */}
          <button className="menu-btn" onClick={() => { onEdit(student); setOpen(false); }}>
            <EditIcon className="w-4 h-4 mr-2" />
            Редактировать
          </button>

          {/* Сброс регистрации */}
          {isSuperAdmin && student.is_registered && !student.is_super_admin && (
            <button className="menu-btn" onClick={() => { onReset(student); setOpen(false); }}>
              <RefreshIcon className="w-4 h-4 mr-2" />
              Сбросить регистрацию
            </button>
          )}

          {/* Забанить */}
          {isSuperAdmin && !student.is_super_admin && !student.is_banned && (
            <button className="menu-btn" onClick={() => { onBan(student); setOpen(false); }}>
              <BanIcon className="w-4 h-4 mr-2" />
              Забанить
            </button>
          )}

          {/* Разбанить */}
          {isSuperAdmin && student.is_banned && (
            <button className="menu-btn" onClick={() => { onUnban(student.id); setOpen(false); }}>
              <CheckIcon className="w-4 h-4 mr-2" />
              Разбанить
            </button>
          )}

          {/* Сделать / снять админа */}
          {isSuperAdmin && !student.is_super_admin && (
            <button className="menu-btn" onClick={() => { onToggleAdmin(student.id, !student.is_admin); setOpen(false); }}>
              <PeopleIcon className="w-4 h-4 mr-2" />
              {student.is_admin ? "Снять админа" : "Сделать админом"}
            </button>
          )}

          {/* Удалить */}
          {isSuperAdmin && !student.is_super_admin && (
            <button className="menu-btn text-red-600" onClick={() => { onDelete(student); setOpen(false); }}>
              <DeleteIcon className="w-4 h-4 mr-2" />
              Удалить
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        .menu-btn {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 14px;
          color: #333;
        }
        .menu-btn:hover {
          background: #f0f0f0;
        }
      `}</style>
    </div>
  );
}
