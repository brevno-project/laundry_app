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
  userName: string;
  userRoom?: string;
  washCount: number;          // Количество стирок
  paymentType?: string;       // 'money' или 'coupon'
  joinedAt: string;
  plannedStartAt?: string;
  expectedFinishAt?: string;
  note?: string;
  adminMessage?: string;      // Сообщение от админа
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
