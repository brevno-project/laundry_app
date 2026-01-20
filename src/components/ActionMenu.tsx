"use client";

import { useState, type ReactNode } from "react";
import { useUi } from "@/contexts/UiContext";
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
  currentUserId?: string;
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
  const { t } = useUi();

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
    if (isSuperAdmin) {
      if (isSelf && targetIsSuperAdmin) {
        const selfMatrix: Record<ActionKey, boolean> = {
          queue: true,
          edit: true,
          reset: true,
          ban: false,
          delete: false,
          toggleAdmin: false,
        };
        return selfMatrix[action];
      }

      if (action === "delete" && targetIsSuperAdmin) {
        return false;
      }

      if (targetIsAdmin && !targetIsSuperAdmin) {
        const overAdmin: Record<ActionKey, boolean> = {
          queue: true,
          edit: true,
          reset: true,
          ban: true,
          delete: false,
          toggleAdmin: true,
        };
        return overAdmin[action];
      }

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

    if (isAdmin) {
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
  const roomLabel = student.room
    ? t("admin.actions.roomLabel", { room: student.room })
    : t("admin.actions.roomMissing");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-600 active:bg-gray-100 dark:active:bg-slate-500"
      >
        <PeopleIcon className="h-4 w-4" />
        <span>{t("admin.actions.manage")}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[100] rounded-t-2xl border-t border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 pb-5 pt-3 shadow-2xl">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <PeopleIcon className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {fullName || t("admin.actions.noName")}
                </div>
                <div className="text-xs text-gray-500">{roomLabel}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {student.is_super_admin && (
                    <Badge color="purple">{t("admin.badge.superAdmin")}</Badge>
                  )}
                  {!student.is_super_admin && student.is_admin && (
                    <Badge color="indigo">{t("admin.badge.admin")}</Badge>
                  )}
                  {student.is_cleanup_admin && (
                    <Badge color="blue">{t("admin.badge.leader")}</Badge>
                  )}
                  {student.is_registered && (
                    <Badge color="green">{t("admin.badge.registered")}</Badge>
                  )}
                  {student.is_banned && (
                    <Badge color="red">{t("admin.badge.banned")}</Badge>
                  )}
                  {hasTelegram && <Badge color="blue">Telegram</Badge>}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-3 h-px bg-gray-200" />

          <div className="space-y-4 text-sm">
            {can("queue") && (
              <Section title={t("admin.section.queue")}>
                <SheetButton
                  icon={<CalendarIcon className="h-4 w-4" />}
                  label={t("admin.action.queueAdd")}
                  onClick={() => {
                    onAddToQueue(student);
                    setOpen(false);
                  }}
                />
              </Section>
            )}

            {(can("edit") || can("reset") || can("ban")) && (
              <Section title={t("admin.section.account")}>
                {can("edit") && (
                  <SheetButton
                    icon={<EditIcon className="h-4 w-4" />}
                    label={t("admin.action.editProfile")}
                    onClick={() => {
                      onEdit(student);
                      setOpen(false);
                    }}
                  />
                )}

                {can("reset") && (
                  <SheetButton
                    icon={<RefreshIcon className="h-4 w-4" />}
                    label={t("admin.action.resetRegistration")}
                    onClick={() => {
                      onReset(student);
                      setOpen(false);
                    }}
                  />
                )}

                {can("ban") && !targetIsBanned && (
                  <SheetButton
                    icon={<BanIcon className="h-4 w-4" />}
                    label={t("admin.action.ban")}
                    onClick={() => {
                      onBan(student);
                      setOpen(false);
                    }}
                  />
                )}

                {can("ban") && targetIsBanned && (
                  <SheetButton
                    icon={<CheckIcon className="h-4 w-4" />}
                    label={t("admin.action.unban")}
                    onClick={() => {
                      onUnban(student.id);
                      setOpen(false);
                    }}
                  />
                )}
              </Section>
            )}

            {isSuperAdmin && can("toggleAdmin") && !targetIsSuperAdmin && (
              <Section title={t("admin.section.rights")}>
                <SheetButton
                  icon={<PeopleIcon className="h-4 w-4" />}
                  label={
                    student.is_admin
                      ? t("admin.action.removeAdmin")
                      : t("admin.action.makeAdmin")
                  }
                  onClick={() => {
                    onToggleAdmin(student.id, !student.is_admin);
                    setOpen(false);
                  }}
                />
              </Section>
            )}

            {can("delete") && (
              <Section title={t("admin.section.danger")}>
                <SheetButton
                  icon={<DeleteIcon className="h-4 w-4" />}
                  label={t("admin.action.deleteStudent")}
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
  children: ReactNode;
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
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 border-b border-gray-200 px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 ${
        danger
          ? "bg-white text-red-600 hover:bg-red-50"
          : "bg-white text-gray-800 hover:bg-gray-50"
      }`}
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
  children: ReactNode;
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
