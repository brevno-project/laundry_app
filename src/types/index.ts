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
  ui_language?: "ru" | "en" | "ko" | "ky";
  stay_type?: "unknown" | "5days" | "weekends";
  created_at: string;
  is_banned?: boolean;
  banned_at?: string | null;
  ban_reason?: string | null;
  user_id?: string;
  is_admin?: boolean;
  is_super_admin?: boolean;
  is_cleanup_admin?: boolean;
  can_view_students?: boolean; // Может ли студент видеть список студентов
  key_issued?: boolean; // ключ выдан
  key_lost?: boolean; // ключ потерян
  apartment_id?: string | null;
  avatar_style?: string; // DiceBear avatar style (avataaars, lorelei, pixel-art, etc.)
  avatar_seed?: string | null; // Custom seed for avatar generation
};

// Тип для списка студентов на экране логина (только базовые поля)
export type StudentLoginList = {
  id: string;
  full_name: string;
  room: string | null;
  is_registered: boolean;
  stay_type?: "unknown" | "5days" | "weekends";
  is_banned?: boolean;
  ban_reason?: string | null;
  key_issued?: boolean;
  key_lost?: boolean;
  avatar_style?: string;
  avatar_seed?: string | null;
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
  ui_language?: "ru" | "en" | "ko" | "ky";
  stay_type?: "unknown" | "5days" | "weekends";
  is_super_admin?: boolean;
  is_cleanup_admin?: boolean;
  can_view_students?: boolean; // Может ли студент видеть список студентов
  apartment_id?: string | null;
  avatar_style?: string; // DiceBear avatar style
  avatar_seed?: string | null; // Custom seed for avatar generation
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
  coupons_used?: number;
  payment_type?: string;
  joined_at: string;
  planned_start_at?: string;
  expected_finish_at?: string;
  finished_at?: string;
  note?: string;
  admin_message?: string;
  return_key_alert?: boolean;
  admin_room?: string | null; // ✅ Комната админа который позвал
  avatar_style?: string; // DiceBear avatar style
  avatar_seed?: string | null; // Custom seed for avatar generation
  // ✅ Таймеры для каждого этапа
  ready_at?: string | null; // Когда позвали за ключом
  key_issued_at?: string | null; // Когда выдали ключ
  washing_started_at?: string | null; // Когда начал стирать
  washing_finished_at?: string | null; // Когда закончил стирать
  return_requested_at?: string | null; // Когда попросили вернуть ключ
  status: QueueStatus;
  scheduled_for_date: string; // '2025-11-02'
  queue_date: string; // '2025-11-03'
  queue_position: number; // 1,2,3...
};

export enum MachineStatus {
  IDLE = 'idle',
  WASHING = 'washing',
}

export type MachineState = {
  id?: number;
  status: MachineStatus;
  current_queue_item_id?: string;
  started_at?: string;
  expected_finish_at?: string;
};

export type HistoryItem = {
  id: string;
  user_id: string | null;
  student_id: string | null;
  full_name: string;
  room?: string;
  started_at: string;
  finished_at: string;
  wash_count?: number;
  coupons_used?: number;
  payment_type?: string;
  avatar_style?: string;
  avatar_seed?: string | null;
  // ✅ Таймеры
  ready_at?: string;
  key_issued_at?: string;
  washing_started_at?: string;
  washing_finished_at?: string;
  return_requested_at?: string;
};

export type TelegramNotification = {
  type:
    | 'joined'                    // Студент встал в очередь → ВСЕМ админам
    | 'left'                      // Студент покинул очередь → ВСЕМ админам
    | 'washing_started_by_student' // Студент начал стирать → ВСЕМ админам
    | 'washing_finished_by_student'// Студент закончил стирать → ВСЕМ админам
    | 'washing_done'              // Запись завершена → ВСЕМ админам
    | 'admin_call_for_key'        // Админ зовет за ключом → конкретному студенту
    | 'admin_key_issued'          // Админ выдал ключ → конкретному студенту
    | 'admin_return_key'          // Админ просит вернуть ключ → конкретному студенту
    | 'washing_started'          // Стирка началась → конкретному студенту
    | 'washing_finished'          // Стирка завершена → конкретному студенту
    | 'return_key_reminder';      // Напоминание вернуть ключ → конкретному студенту

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

export type Apartment = {
  id: string;
  code: string;
  block?: string | null;
};

export type CleanupResult = {
  id: string;
  week_start: string;
  block: string;
  winning_apartment_id: string;
  announcement_text: string;
  announcement_mode?: string;
  template_key?: string | null;
  announced_by?: string | null;
  created_by?: string | null;
  published_at?: string | null;
  coupons_issued_at?: string | null;
  created_at?: string;
};

export type CleanupSchedule = {
  block: "A" | "B";
  check_date: string;
  check_time?: string | null;
  reminder_time?: string | null;
  set_by?: string | null;
  updated_at?: string | null;
  reminder_sent_at?: string | null;
};

export type Coupon = {
  id: string;
  owner_student_id: string;
  source_type: string;
  source_id?: string | null;
  issued_by?: string | null;
  issued_at: string;
  valid_from: string;
  expires_at: string;
  reserved_queue_id?: string | null;
  reserved_at?: string | null;
  used_in_queue_id?: string | null;
  used_at?: string | null;
  note?: string | null;
};

export type CouponTransfer = {
  id: string;
  coupon_id: string;
  from_student_id: string;
  to_student_id: string;
  performed_by?: string | null;
  created_at: string;
  note?: string | null;
};
