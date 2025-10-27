export type User = {
  id: string;
  name: string;
  room?: string;
  isAdmin?: boolean;
};

export enum QueueStatus {
  QUEUED = 'queued',
  WASHING = 'washing',
  DONE = 'done',
}

export type QueueItem = {
  id: string;
  userId: string;
  userName: string;
  userRoom?: string;
  joinedAt: string;
  plannedStartAt?: string;
  expectedFinishAt?: string;
  note?: string;
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
