export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  room: string | null;
  isRegistered: boolean;
  registeredAt?: string;
  telegram_chat_id?: string; // Telegram Chat ID для персональных уведомлений
  createdAt: string;
};

export type StudentAuth = {
  id: string;
  studentId: string;
  passwordHash: string;
  createdAt: string;
};

export type User = {
  id: string;
  studentId: string;
  name: string;
  room?: string;
  isAdmin?: boolean;
  fullName?: string;
  telegram_chat_id?: string; // Telegram Chat ID для персональных уведомлений
};

export enum QueueStatus {
  WAITING = 'waiting',        // Ждет в очереди
  READY = 'ready',            // Следующий! (выделяется)
  KEY_ISSUED = 'key_issued',  // Ключ выдан
  WASHING = 'washing',        // Стирает
  DONE = 'done',              // Закончил
}

export type QueueItem = {
  id: string;
  userId: string;
  studentId: string;         // ID студента из таблицы students (для поиска telegram_chat_id)
  userName: string;
  userRoom?: string;
  washCount: number;          // Количество стирок
  paymentType?: string;       // 'money' или 'coupon'
  joinedAt: string;
  plannedStartAt?: string;
  expectedFinishAt?: string;  // Планируемое время окончания
  finishedAt?: string;        // Фактическое время окончания
  note?: string;
  adminMessage?: string;      // Сообщение от админа
  returnKeyAlert?: boolean;   // Полноэкранное уведомление "Принеси ключ"
  status: QueueStatus;
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
    | 'admin_return_key';

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
