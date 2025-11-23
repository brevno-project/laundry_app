// ИСПРАВЛЕННЫЕ ТИПЫ для работы с RLS политиками

export type Student = {
  id: string;
  first_name: string;
  last_name?: string; // Фамилия необязательна
  middle_name?: string; // Отчество необязательно
  full_name: string;
  room: string | null;
  is_registered: boolean;
  registered_at?: string;
  telegram_chat_id?: string;
  created_at: string;
  is_banned?: boolean;
  banned_at?: string | null;
  ban_reason?: string | null;
  user_id?: string;
  is_admin?: boolean;
  is_super_admin?: boolean;
  can_view_students?: boolean; // Может ли студент видеть список студентов
  avatar?: string; // SVG аватар (default, male1, male2, female1, female2, etc.)
  avatar_type?: string; // Тип аватара
};

export type StudentAuth = {
  id: string;
  student_id: string;
  password_hash: string;
  created_at: string;
};

export type User = {
  id: string; // Это UUID из Supabase Auth (auth.users.id)
  student_id: string; // Это ID из таблицы students
  first_name: string;
  last_name?: string; // Фамилия необязательна
  middle_name?: string; // Отчество необязательно
  full_name: string;
  room?: string;
  is_admin?: boolean;
  telegram_chat_id?: string;
  is_super_admin?: boolean;
  can_view_students?: boolean; // Может ли студент видеть список студентов
  avatar?: string; // SVG аватар
  avatar_type?: string; // Тип аватара
};

export enum QueueStatus {
  WAITING = 'waiting',
  READY = 'ready',
  KEY_ISSUED = 'key_issued',
  WASHING = 'washing',
  WASHING_FINISHED = 'washing_finished', // Студент закончил стирать, ждет когда админ позовет вернуть ключ
  RETURNING_KEY = 'returning_key',
  DONE = 'done',
}

export type QueueItem = {
  id: string;
  user_id: string; // НОВОЕ: UUID из Supabase Auth для RLS
  student_id: string; // ID студента из таблицы students
  first_name: string;
  last_name: string;
  full_name: string;
  room?: string;
  wash_count: number;
  payment_type?: string;
  joined_at: string;
  planned_start_at?: string;
  expected_finish_at?: string;
  finished_at?: string;
  note?: string;
  admin_message?: string;
  return_key_alert?: boolean;
  admin_room?: string; // ✅ Комната админа который позвал
  // ✅ Таймеры для каждого этапа
  ready_at?: string; // Когда позвали за ключом
  key_issued_at?: string; // Когда выдали ключ
  washing_started_at?: string; // Когда начал стирать
  washing_finished_at?: string; // Когда закончил стирать
  return_requested_at?: string; // Когда попросили вернуть ключ
  status: QueueStatus;
  scheduled_for_date: string; // '2025-11-02'
  queue_date: string; // '2025-11-03'
  queue_position: number; // 1,2,3...
  avatar_type?: string; // Тип аватара
};

export enum MachineStatus {
  IDLE = 'idle',
  WASHING = 'washing',
}

export type MachineState = {
  status: MachineStatus;
  current_queue_item_id?: string;
  started_at?: string;
  expected_finish_at?: string;
};

export type HistoryItem = {
  id: string;
  user_id: string;
  full_name: string;
  room?: string;
  started_at: string;
  finished_at: string;
  // ✅ Таймеры
  ready_at?: string;
  key_issued_at?: string;
  washing_started_at?: string;
  return_requested_at?: string;
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

  full_name?: string;
  room?: string;
  wash_count?: number;
  payment_type?: string;
  queue_length?: number;
  expected_finish_at?: string;
  student_id?: string;
  admin_student_id?: string;
  queue_item_id?: string;
  message?: string;
};