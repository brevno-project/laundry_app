"use client";

import { useState } from "react";
import { Student } from "@/types";
import {
  CalendarIcon,
  EditIcon,
  RefreshIcon,
  BanIcon,
  CheckIcon,
  DeleteIcon,
  PeopleIcon,
  CloseIcon,
} from "@/components/Icons";

interface Props {
  student: Student;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  currentUserId?: string; // <-- теперь не обязательно
  onEdit: (s: Student) => void;
  onBan: (s: Student) => void;
  onUnban: (id: string) => void;
  onDelete: (s: Student) => void;
  onReset: (s: Student) => void;
  onAddToQueue: (s: Student) => void;
  onToggleAdmin: (id: string, makeAdmin: boolean) => void;
}


type ActionKey =
  | "queue"
  | "edit"
  | "reset"
  | "ban"
  | "delete"
  | "toggleAdmin";

export default function ActionMenu({
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
}: Props) {
  const [open, setOpen] = useState(false);

  // Если вообще не админ — не показываем ничего
  if (!isAdmin && !isSuperAdmin) return null;

  const isSelf = currentUserId ? student.id === currentUserId : false;
  const targetIsAdmin = !!student.is_admin;
  const targetIsSuperAdmin = !!student.is_super_admin;
  const targetIsBanned = !!student.is_banned;
  const telegramChatId =
    typeof student.telegram_chat_id === "string"
      ? student.telegram_chat_id.trim()
      : "";
  const hasTelegram = !!telegramChatId && !student.is_banned;

  if (targetIsSuperAdmin && !isSelf) return null;

  function can(action: ActionKey): boolean {
    // Суперадмин
    if (isSuperAdmin) {
      // Сам над собой
      if (isSelf && targetIsSuperAdmin) {
        const selfMatrix: Record<ActionKey, boolean> = {
          queue: true,
          edit: true,
          reset: true,
          ban: false, // ни бан, ни разбан над собой
          delete: false,
          toggleAdmin: false,
        };
        return selfMatrix[action];
      }

      // Нельзя удалять суперадмина ни при каких условиях
      if (action === "delete" && targetIsSuperAdmin) {
        return false;
      }

      // Над другим админом (не супер)
      if (targetIsAdmin && !targetIsSuperAdmin) {
        const overAdmin: Record<ActionKey, boolean> = {
          queue: true,
          edit: true,
          reset: true,
          ban: true,
          delete: false, // намеренно запрещено
          toggleAdmin: true,
        };
        return overAdmin[action];
      }

      // Над другим суперадмином (если такое вообще будет) — всё, кроме delete
      if (targetIsSuperAdmin && !isSelf) {
        const overSuper: Record<ActionKey, boolean> = {
          queue: true,
          edit: true,
          reset: true,
          ban: true,
          delete: false,
          toggleAdmin: true,
        };
        return overSuper[action];
      }

      // Над обычным студентом
      const overStudent: Record<ActionKey, boolean> = {
        queue: true,
        edit: true,
        reset: true,
        ban: true,
        delete: true,
        toggleAdmin: true,
      };
      return overStudent[action];
    }

    // Обычный админ
    if (isAdmin) {
      // Над собой
      if (isSelf) {
        const selfAdmin: Record<ActionKey, boolean> = {
          queue: true,
          edit: true,
          reset: false,
          ban: false,
          delete: false,
          toggleAdmin: false,
        };
        return selfAdmin[action];
      }

      // Над суперадмином или другим админом — только безопасное
      if (targetIsSuperAdmin || targetIsAdmin) {
        const overAdminOrSuper: Record<ActionKey, boolean> = {
          queue: true,
          edit: true,
          reset: false,
          ban: false,
          delete: false,
          toggleAdmin: false,
        };
        return overAdminOrSuper[action];
      }

      // Над обычным студентом
      const overStudent: Record<ActionKey, boolean> = {
        queue: true,
        edit: true,
        reset: true,
        ban: true,
        delete: true,
        toggleAdmin: false,
      };
      return overStudent[action];
    }

    return false;
  }

  const hasAnyAction =
    can("queue") ||
    can("edit") ||
    can("reset") ||
    can("ban") ||
    can("delete") ||
    can("toggleAdmin");

  if (!hasAnyAction) return null;

  const fullName =
    student.full_name ||
    [student.first_name, student.last_name].filter(Boolean).join(" ");

  return (
    <>
      {/* КНОПКА УПРАВЛЕНИЯ НА ВСЮ ШИРИНУ */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 active:bg-gray-100"
      >
        <PeopleIcon className="w-4 h-4" />
        <span>Управление</span>
      </button>

      {/* ЗАТЕМНЕНИЕ */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* BOTTOM SHEET */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[100] rounded-t-2xl border-t border-gray-200 bg-white px-4 pt-3 pb-5 shadow-2xl">
          {/* ХЭДЕР */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <PeopleIcon className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {fullName || "Без имени"}
                </div>
                <div className="text-xs text-gray-500">
                  {student.room ? `Комната ${student.room}` : "Комната не указана"}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {student.is_super_admin && (
                    <Badge color="purple">Суперадмин</Badge>
                  )}
                  {!student.is_super_admin && student.is_admin && (
                    <Badge color="indigo">Админ</Badge>
                  )}
                    {student.is_cleanup_admin && (
                      <Badge color="blue">Лидер</Badge>
                    )}
                  {student.is_registered && <Badge color="green">Зарегистрирован</Badge>}
                  {student.is_banned && <Badge color="red">Забанен</Badge>}
                  {hasTelegram && <Badge color="blue">Telegram</Badge>}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="h-px bg-gray-200 mb-3" />

          <div className="space-y-4 text-sm">
            {/* ОЧЕРЕДЬ */}
            {can("queue") && (
              <Section title="Очередь">
                <SheetButton
                  icon={<CalendarIcon className="w-4 h-4" />}
                  label="Поставить в очередь"
                  onClick={() => {
                    onAddToQueue(student);
                    setOpen(false);
                  }}
                />
              </Section>
            )}

            {/* УЧЁТНАЯ ЗАПИСЬ */}
            {(can("edit") || can("reset") || can("ban")) && (
              <Section title="Учётная запись">
                {can("edit") && (
                  <SheetButton
                    icon={<EditIcon className="w-4 h-4" />}
                    label="Редактировать профиль"
                    onClick={() => {
                      onEdit(student);
                      setOpen(false);
                    }}
                  />
                )}

                {can("reset") && (
                  <SheetButton
                    icon={<RefreshIcon className="w-4 h-4" />}
                    label="Сбросить регистрацию"
                    onClick={() => {
                      onReset(student);
                      setOpen(false);
                    }}
                  />
                )}

                {can("ban") && !targetIsBanned && (
                  <SheetButton
                    icon={<BanIcon className="w-4 h-4" />}
                    label="Забанить"
                    onClick={() => {
                      onBan(student);
                      setOpen(false);
                    }}
                  />
                )}

                {can("ban") && targetIsBanned && (
                  <SheetButton
                    icon={<CheckIcon className="w-4 h-4" />}
                    label="Разбанить"
                    onClick={() => {
                      onUnban(student.id);
                      setOpen(false);
                    }}
                  />
                )}
              </Section>
            )}

            {/* ПРАВА (ТОЛЬКО ДЛЯ СУПЕРАДМИНА) */}
            {isSuperAdmin && can("toggleAdmin") && !targetIsSuperAdmin && (
              <Section title="Права доступа">
                <SheetButton
                  icon={<PeopleIcon className="w-4 h-4" />}
                  label={student.is_admin ? "Снять права админа" : "Сделать админом"}
                  onClick={() => {
                    onToggleAdmin(student.id, !student.is_admin);
                    setOpen(false);
                  }}
                />
              </Section>
            )}

            {/* ОПАСНАЯ ЗОНА */}
            {can("delete") && (
              <Section title="Опасная зона">
                <SheetButton
                  icon={<DeleteIcon className="w-4 h-4" />}
                  label="Удалить студента"
                  danger
                  onClick={() => {
                    onDelete(student);
                    setOpen(false);
                  }}
                />
              </Section>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {children}
      </div>
    </div>
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
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
        danger
          ? "bg-white text-red-600 hover:bg-red-50"
          : "bg-white text-gray-800 hover:bg-gray-50"
      } border-b border-gray-200 last:border-b-0`}
    >
      <span className={danger ? "text-red-500" : "text-gray-500"}>{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "purple" | "indigo" | "green" | "red" | "blue";
}) {
  const map: Record<typeof color, string> = {
    purple: "bg-purple-100 text-purple-800",
    indigo: "bg-indigo-100 text-indigo-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${map[color]}`}
    >
      {children}
    </span>
  );
}
