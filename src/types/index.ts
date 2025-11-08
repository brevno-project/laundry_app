// ✅ ИСПРАВЛЕННЫЕ ТИПЫ для работы с RLS политиками

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  room: string | null;
  isRegistered: boolean;
  registeredAt?: string;
  telegram_chat_id?: string;
  createdAt: string;
  is_banned?: boolean;
  banned_at?: string | null;
  ban_reason?: string | null;
  user_id?: string; // 
  is_admin?: boolean;
  is_super_admin?: boolean;
};

export type StudentAuth = {
  id: string;
  studentId: string;
  passwordHash: string;
  createdAt: string;
};

export type User = {
  id: string; // ✅ Это UUID из Supabase Auth (auth.users.id)
  studentId: string; // ✅ Это ID из таблицы students
  name: string;
  room?: string;
  isAdmin?: boolean;
  fullName?: string;
  telegram_chat_id?: string;
  is_super_admin?: boolean;
};

export enum QueueStatus {
  WAITING = 'waiting',
  READY = 'ready',
  KEY_ISSUED = 'key_issued',
  WASHING = 'washing',
  DONE = 'done',
}

export type QueueItem = {
  id: string;
  userId: string; // ⚠️ УСТАРЕВШЕЕ: старый формат (admin_176...)
  user_id: string; // ✅ НОВОЕ: UUID из Supabase Auth для RLS
  studentId: string; // ID студента из таблицы students
  userName: string;
  userRoom?: string;
  washCount: number;
  paymentType?: string;
  joinedAt: string;
  plannedStartAt?: string;
  expectedFinishAt?: string;
  finishedAt?: string;
  note?: string;
  adminMessage?: string;
  returnKeyAlert?: boolean;
  status: QueueStatus;
  scheduledForDate: string; // '2025-11-02'
  currentDate: string; // '2025-11-03'
  position: number; // 1,2,3...
};

export enum MachineStatus {
  IDLE = 'idle',
  WASHING = 'washing',
}

export type MachineState = {
  status: MachineStatus;
  currentQueueItemId?: string;
  startedAt?: string;
  expectedFinishAt?: string;
};

export type HistoryItem = {
  id: string;
  userId: string;
  userName: string;
  userRoom?: string;
  startedAt: string;
  finishedAt: string;
};

export type TelegramNotification = {
  type:
    | 'joined'
    | 'left'
    | 'washing_started'
    | 'washing_done'
    | 'admin_call_for_key'
    | 'admin_key_issued'
    | 'admin_return_key'
    | 'updated';

  userName?: string;
  userRoom?: string;
  washCount?: number;
  paymentType?: string;
  queueLength?: number;
  expectedFinishAt?: string;
  studentId?: string;
  queueItemId?: string;
  message?: string;
};