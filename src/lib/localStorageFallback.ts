"use client";

import { QueueItem, MachineState, HistoryItem, QueueStatus, MachineStatus } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Local Storage Keys
const QUEUE_KEY = 'laundry-app-queue';
const MACHINE_STATE_KEY = 'laundry-app-machine-state';
const HISTORY_KEY = 'laundry-app-history';
const CACHE_META_KEY = 'laundry-app-cache-meta';

const CACHE_VERSION = 2;
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_QUEUE_ITEMS = 500;
const MAX_HISTORY_ITEMS = 300;
const MAX_ENTRY_BYTES = 450 * 1024;

let cacheValidated = false;

const canUseStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const utf8Size = (value: string): number => {
  try {
    return new TextEncoder().encode(value).length;
  } catch {
    return value.length * 2;
  }
};

const clearCacheKeys = () => {
  if (!canUseStorage()) return;
  localStorage.removeItem(QUEUE_KEY);
  localStorage.removeItem(MACHINE_STATE_KEY);
  localStorage.removeItem(HISTORY_KEY);
};

const touchCacheMeta = () => {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(
      CACHE_META_KEY,
      JSON.stringify({ version: CACHE_VERSION, updatedAt: Date.now() }),
    );
  } catch {}
};

const ensureFreshCache = () => {
  if (!canUseStorage() || cacheValidated) return;
  cacheValidated = true;

  try {
    const rawMeta = localStorage.getItem(CACHE_META_KEY);
    if (!rawMeta) {
      touchCacheMeta();
      return;
    }

    const parsed = JSON.parse(rawMeta) as { version?: number; updatedAt?: number } | null;
    const isVersionStale = parsed?.version !== CACHE_VERSION;
    const isExpired =
      typeof parsed?.updatedAt !== 'number' || Date.now() - parsed.updatedAt > CACHE_TTL_MS;

    if (isVersionStale || isExpired) {
      clearCacheKeys();
    }
  } catch {
    clearCacheKeys();
  }

  touchCacheMeta();
};

const readJson = <T>(key: string, fallback: T): T => {
  if (!canUseStorage()) return fallback;
  ensureFreshCache();

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    if (utf8Size(raw) > MAX_ENTRY_BYTES) {
      localStorage.removeItem(key);
      return fallback;
    }
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T) => {
  if (!canUseStorage()) return;
  ensureFreshCache();

  try {
    const raw = JSON.stringify(value);
    if (utf8Size(raw) > MAX_ENTRY_BYTES) {
      localStorage.removeItem(key);
      return;
    }
    if (localStorage.getItem(key) !== raw) {
      localStorage.setItem(key, raw);
    }
    touchCacheMeta();
  } catch {
    localStorage.removeItem(key);
  }
};

const normalizeQueue = (value: unknown): QueueItem[] => {
  if (!Array.isArray(value)) return [];
  return (value as QueueItem[]).slice(0, MAX_QUEUE_ITEMS);
};

const normalizeMachineState = (value: unknown): MachineState => {
  if (!value || typeof value !== 'object') {
    return { status: MachineStatus.IDLE };
  }
  const state = value as MachineState;
  if (state.status !== MachineStatus.IDLE && state.status !== MachineStatus.WASHING) {
    return { status: MachineStatus.IDLE };
  }
  return state;
};

const normalizeHistory = (value: unknown): HistoryItem[] => {
  if (!Array.isArray(value)) return [];
  const items = (value as HistoryItem[]).filter((item) => !!item && typeof item.id === 'string');
  items.sort((a, b) => {
    const aTime = Date.parse(a.finished_at || '') || 0;
    const bTime = Date.parse(b.finished_at || '') || 0;
    return bTime - aTime;
  });
  return items.slice(0, MAX_HISTORY_ITEMS);
};

// Get data from local storage
export const get_local_queue = (): QueueItem[] => {
  return normalizeQueue(readJson<unknown>(QUEUE_KEY, []));
};

export const get_local_machine_state = (): MachineState => {
  return normalizeMachineState(readJson<unknown>(MACHINE_STATE_KEY, { status: MachineStatus.IDLE }));
};

export const get_local_history = (): HistoryItem[] => {
  return normalizeHistory(readJson<unknown>(HISTORY_KEY, []));
};

// Save data to local storage
export const save_local_queue = (queue: QueueItem[]) => {
  writeJson(QUEUE_KEY, normalizeQueue(queue));
};

export const save_local_machine_state = (state: MachineState) => {
  writeJson(MACHINE_STATE_KEY, normalizeMachineState(state));
};

export const save_local_history = (history: HistoryItem[]) => {
  writeJson(HISTORY_KEY, normalizeHistory(history));
};

export const clear_local_cache = () => {
  clearCacheKeys();
  if (canUseStorage()) {
    localStorage.removeItem(CACHE_META_KEY);
  }
  cacheValidated = false;
};

export const add_to_local_queue = (
  user: { id: string; full_name: string; room?: string; student_id?: string },
): QueueItem => {
  const queue = get_local_queue();
  
  // Check if user is already in queue
  const existingItem = queue.find(
    item => item.user_id === user.id && (item.status === QueueStatus.WAITING || item.status === QueueStatus.READY || item.status === QueueStatus.WASHING)
  );
  
  if (existingItem) {
    return existingItem;
  }
  
  // Parse full_name to first_name and last_name
  const nameParts = user.full_name.split(' ');
  const first_name = nameParts[0] || '';
  const last_name = nameParts.slice(1).join(' ') || '';
  
  const newItem: QueueItem = {
    id: uuidv4(),
    user_id: user.id,
    student_id: user.student_id || user.id,
    first_name,
    last_name,
    full_name: user.full_name,
    room: user.room,
    wash_count: 1,
    coupons_used: 0,
    payment_type: 'money',
    joined_at: new Date().toISOString(),
    expected_finish_at: undefined,
    status: QueueStatus.WAITING,
    scheduled_for_date: new Date().toISOString().slice(0, 10),
    queue_date: new Date().toISOString().slice(0, 10),
    queue_position: queue.length + 1,
  };
  
  queue.push(newItem);
  save_local_queue(queue);
  return newItem;
};

export const remove_from_local_queue = (queueItemId: string, userId: string): boolean => {
  const queue = get_local_queue();
  const index = queue.findIndex(item => item.id === queueItemId && item.user_id === userId);
  
  if (index !== -1) {
    queue.splice(index, 1);
    save_local_queue(queue);
    return true;
  }
  
  return false;
};

export const update_local_queue_item = (
  queueItemId: string,
  userId: string,
  updates: Partial<QueueItem>
): boolean => {
  const queue = get_local_queue();
  const item = queue.find(item => item.id === queueItemId && item.user_id === userId);
  
  if (item) {
    Object.assign(item, updates);
    save_local_queue(queue);
    return true;
  }
  
  return false;
};

// Machine state operations
export const start_local_washing = (queueItemId: string): boolean => {
  const queue = get_local_queue();
  const item = queue.find(item => item.id === queueItemId);
  
  if (!item) return false;
  
  // Update queue item status
  item.status = QueueStatus.WASHING;
  save_local_queue(queue);
  
  // Update machine state
  const machineState: MachineState = {
    status: MachineStatus.WASHING,
    current_queue_item_id: queueItemId,
    started_at: new Date().toISOString(),
    expected_finish_at: item.expected_finish_at,
  };
  
  save_local_machine_state(machineState);
  return true;
};

export const add_to_local_history = (queueItemId: string): boolean => {
  const queue = get_local_queue();
  const machineState = get_local_machine_state();
  
  const currentItem = queue.find(item => item.id === queueItemId);
  if (!currentItem) return false;
  
  // Add to history
  const historyItem: HistoryItem = {
    id: uuidv4(),
    user_id: currentItem.user_id ?? null,
    student_id: currentItem.student_id ?? null,
    full_name: currentItem.full_name,
    room: currentItem.room,
    started_at: machineState.started_at || new Date().toISOString(),
    finished_at: new Date().toISOString(),
    wash_count: currentItem.wash_count,
    coupons_used: currentItem.coupons_used || 0,
    payment_type: currentItem.payment_type,
    washing_started_at: machineState.started_at || new Date().toISOString(),
    washing_finished_at: new Date().toISOString(),
    return_requested_at: new Date().toISOString(),
  };
  
  const history = get_local_history();
  history.push(historyItem);
  save_local_history(history);
  
  // Reset machine state
  const idleMachineState: MachineState = {
    status: MachineStatus.IDLE,
    current_queue_item_id: undefined,
    started_at: undefined,
    expected_finish_at: undefined,
  };
  save_local_machine_state(idleMachineState);
  
  // Remove from queue
  const index = queue.findIndex(item => item.id === queueItemId);
  if (index !== -1) {
    queue.splice(index, 1);
    save_local_queue(queue);
  }
  
  return true;
};

export const mark_local_done = (): HistoryItem | null => {
  const machineState = get_local_machine_state();
  const queue = get_local_queue();
  
  if (machineState.status !== MachineStatus.WASHING || !machineState.current_queue_item_id) {
    return null;
  }
  
  const currentItem = queue.find(item => item.id === machineState.current_queue_item_id);
  if (!currentItem) {
    return null;
  }
  
  // Add to history
  const historyItem: HistoryItem = {
    id: uuidv4(),
    user_id: currentItem.user_id ?? null,
    student_id: currentItem.student_id ?? null,
    full_name: currentItem.full_name,
    room: currentItem.room,
    started_at: machineState.started_at || new Date().toISOString(),
    finished_at: new Date().toISOString(),
    wash_count: currentItem.wash_count,
    coupons_used: currentItem.coupons_used || 0,
    payment_type: currentItem.payment_type,
    washing_started_at: machineState.started_at || new Date().toISOString(),
    washing_finished_at: new Date().toISOString(),
    return_requested_at: new Date().toISOString(),
  };
  
  const history = get_local_history();
  history.unshift(historyItem); // Add to beginning
  if (history.length > 10) {
    history.pop(); // Limit history size
  }
  save_local_history(history);
  
  // Update queue item status to 'done' instead of removing
  currentItem.status = QueueStatus.DONE;
  save_local_queue(queue);
  
  // Reset machine state
  save_local_machine_state({ status: MachineStatus.IDLE });
  
  return historyItem;
};

export const start_local_next = (): boolean => {
  const queue = get_local_queue();
  const nextItem = queue.find(item => item.status === QueueStatus.WAITING || item.status === QueueStatus.READY);
  
  if (nextItem) {
    start_local_washing(nextItem.id);
    return true;
  }
  
  return false;
};

export const clear_local_queue = (): void => {
  // Reset machine state
  save_local_machine_state({ status: MachineStatus.IDLE });
  
  // Clear queue except currently washing
  const queue = get_local_queue();
  const updatedQueue = queue.filter(item => item.status === QueueStatus.WASHING);
  save_local_queue(updatedQueue);
};
