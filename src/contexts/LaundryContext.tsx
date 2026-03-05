"use client";



import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { supabase } from '@/lib/supabase';

import { User, Student, StudentLoginList, QueueItem, MachineStatus, QueueStatus, MachineState, HistoryItem } from '@/types';

import { sendTelegramNotification } from '@/lib/telegram';

import { parseISO, format } from 'date-fns';

import { ru } from 'date-fns/locale';

import { formatInTimeZone } from 'date-fns-tz';

import {

  get_local_queue,

  get_local_machine_state,

  get_local_history,

  save_local_queue,

  save_local_machine_state,

  save_local_history,

  remove_from_local_queue,

  update_local_queue_item,

  start_local_washing,

  mark_local_done,

  start_local_next,

  clear_local_queue,

  

} from '@/lib/localStorageFallback';

  





const TIMEZONE = 'Asia/Bishkek';

const HISTORY_PAGE_SIZE = 50;
const AUTH_CALL_TIMEOUT_MS = 8000;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;



// Check if Supabase is configured

const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_KEY && !!supabase;

function withTimeout<T>(promiseLike: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const promise = Promise.resolve(promiseLike);
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
  });
}

const isTimeoutError = (error: unknown): boolean =>
  error instanceof Error && /timed out/i.test(error.message);



// ========================================



// ========================================

async function waitForSession(): Promise<boolean> {

  if (!supabase) return false;

  



  for (let i = 0; i < 5; i++) {
    try {
      const { data } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_CALL_TIMEOUT_MS,
        'auth.getSession(waitForSession)'
      );

      if (data.session?.access_token) {
        return true;
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn('waitForSession failed:', error);
      }
      return false;
    }

    await new Promise((r) => setTimeout(r, 200));

  }

  

  if (process.env.NODE_ENV !== "production") {
  }

  return false;

}






async function waitForStudentLink(
  userId: string,
  attempts = 10,
  delayMs = 300
): Promise<any | null> {
  if (!supabase) return null;

  for (let i = 0; i < attempts; i++) {
    let data: any = null;
    try {
      const result = await withTimeout(
        supabase
          .from("students")
          .select(
            "id, first_name, last_name, full_name, room, telegram_chat_id, ui_language, is_admin, is_super_admin, is_cleanup_admin, can_view_students, is_banned, ban_reason, avatar_style, avatar_seed"
          )
          .eq("user_id", userId)
          .maybeSingle(),
        AUTH_CALL_TIMEOUT_MS,
        'students.select(waitForStudentLink)'
      );
      data = result.data;
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn('waitForStudentLink failed:', error);
      }
      return null;
    }

    if (data) {
      return data;
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  return null;
}

// Format date to local timezone

export const formatDate = (dateString: string) => {

  return formatInTimeZone(parseISO(dateString), TIMEZONE, 'HH:mm, dd MMMM yyyy', { locale: ru });

};



type LaundryContextType = {

  user: User | null;

  setUser: React.Dispatch<React.SetStateAction<User | null>>;

  students: Student[];

  queue: QueueItem[];

  machineState: MachineState;

  history: HistoryItem[];
  historyTotalCount: number;
  historyHasMore: boolean;
  loadMoreHistory: () => Promise<void>;

  refreshMyRole: () => Promise<void>;

  transferSelectedToToday: (selectedIds: string[]) => Promise<void>;

  transferSelectedToDate: (selectedIds: string[], targetDateStr: string) => Promise<void>;

  changeQueuePosition: (queueId: string, direction: 'up' | 'down') => Promise<void>;

  registerStudent: (studentId: string, password: string) => Promise<User | null>;

  loginStudent: (studentId: string, password: string) => Promise<User | null>;

  // Clear local session after logout options are applied.

  logoutStudent: (options?: { keepBanNotice?: boolean }) => Promise<void>;

  resetStudentRegistration: (studentId: string) => Promise<void>;

  linkTelegram: (telegramCode: string) => Promise<{ success: boolean; error?: string }>;

  joinQueue: (
    name: string,
    room?: string,
    washCount?: number,
    couponsUsed?: number,
    expectedFinishAt?: string,
    chosenDate?: string,
    couponIds?: string[]
  ) => Promise<void>;

  leaveQueue: (queueItemId: string) => Promise<void>;

  updateQueueItem: (
    queueItemId: string,
    updates: Partial<QueueItem>,
    options?: { skipFetch?: boolean }
  ) => Promise<void>;

  sendAdminMessage: (queueItemId: string, message: string) => Promise<void>;

  setQueueStatus: (queueItemId: string, status: QueueStatus, options?: { skipFetch?: boolean }) => Promise<void>;

  setReturnKeyAlert: (queueItemId: string, alert: boolean) => Promise<void>;

  startWashing: (queueItemId: string) => Promise<void>;

  cancelWashing: (queueItemId: string) => Promise<void>;

  markDone: (queueItemId: string) => Promise<void>;

  startNext: () => Promise<void>;

  clearQueue: () => Promise<void>;

  removeFromQueue: (queueItemId: string) => Promise<void>;

  clearCompletedQueue: () => Promise<void>;

  clearOldQueues: () => Promise<void>;

  clearStuckQueues: () => Promise<void>;

  banStudent: (studentId: string, reason?: string) => Promise<void>;

  unbanStudent: (studentId: string) => Promise<void>;

  isAdmin: boolean;

  isSuperAdmin: boolean;
  isCleanupAdmin: boolean;

  needsClaim: boolean;

  setIsAdmin: (isAdmin: boolean) => void;

  setIsSuperAdmin: (isSuperAdmin: boolean) => void;
  setIsCleanupAdmin: (isCleanupAdmin: boolean) => void;

  setIsJoining: (value: boolean) => void;

  setNeedsClaim: (value: boolean) => void;

  getUserQueueItem: () => QueueItem | undefined;

  isLoading: boolean;
  authReady: boolean;

  isNewUser: boolean; // 

  setIsNewUser: (isNewUser: boolean) => void; // 

  addStudent: (firstName: string, lastName: string, room?: string, middleName?: string) => Promise<void>;

  updateStudent: (

    studentId: string,

    updates: {

      first_name?: string;

      last_name?: string;

      middle_name?: string;

      room?: string;

      can_view_students?: boolean;
      is_cleanup_admin?: boolean;

      stay_type?: "unknown" | "5days" | "weekends";

      key_issued?: boolean;

      key_lost?: boolean;

    }

  ) => Promise<void>;

  deleteStudent: (studentId: string) => Promise<void>;

  adminAddToQueue: (studentRoom?: string, washCount?: number, couponsUsed?: number, expectedFinishAt?: string, chosenDate?: string, studentId?: string) => Promise<void>;

  updateQueueItemDetails: (queueId: string, updates: { wash_count?: number; coupons_used?: number; payment_type?: string; expected_finish_at?: string; chosen_date?: string }) => Promise<void>;

  updateQueueEndTime: (queueId: string, endTime: string) => Promise<void>;

  toggleAdminStatus: (studentId: string, makeAdmin: boolean) => Promise<void>;

  toggleSuperAdminStatus: (studentId: string, makeSuperAdmin: boolean) => Promise<void>;

  loadStudents: () => void;

  optimisticUpdateQueueItem: (queueItemId: string, updates: Partial<QueueItem>) => void;

  fetchQueue: () => Promise<void>;

  fetchHistory: () => Promise<void>;

};



const LaundryContext = createContext<LaundryContextType | undefined>(undefined);



export function LaundryProvider({ children }: { children: ReactNode }) {

  // Clear local session after logout options are applied.



  const [user, setUser] = useState<User | null>(null);

  

  // Clear local session after logout options are applied.

  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [isCleanupAdmin, setIsCleanupAdmin] = useState<boolean>(false);

  const [students, setStudents] = useState<Student[]>([]);

  const [queue, setQueue] = useState<QueueItem[]>([]);

  const [machineState, setMachineState] = useState<MachineState>({

    status: MachineStatus.IDLE,

  });

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const [isNewUser, setIsNewUser] = useState<boolean>(() => {

    if (typeof window !== 'undefined') {

      return localStorage.getItem('laundryIsNewUser') === 'true';

    }

    return false;

  });

  const [isJoining, setIsJoining] = useState(false);

  const [needsClaim, setNeedsClaim] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('laundryIsAdmin');
      localStorage.removeItem('laundryIsSuperAdmin');
      localStorage.removeItem('laundryIsCleanupAdmin');
    } catch {}
  }, []);

  const queueFetchStateRef = useRef({ inFlight: false, lastRunAt: 0 });
  const machineFetchStateRef = useRef({ inFlight: false, lastRunAt: 0 });
  const historyFetchStateRef = useRef({ inFlight: false, lastRunAt: 0 });

  const historyLimitRef = useRef(HISTORY_PAGE_SIZE);

  const cleanupStateRef = useRef({

    lastRunDate: null as string | null,

    lastExpiredRunAt: 0,

    inFlight: false,

    disableUntil: 0,

    lastErrorAt: 0,

  });
  const statusCheckRef = useRef({ inFlight: false, lastRunAt: 0, missingLinkHits: 0 });
  const tokenRefreshRef = useRef<Promise<string> | null>(null);
  const registeringRef = useRef(false);

  const clearLocalSession = (options?: { keepBanNotice?: boolean }) => {
    const keepBanNotice = options?.keepBanNotice;
    setUser(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsCleanupAdmin(false);
    setIsNewUser(false);
    setNeedsClaim(false);
    setQueue([]);
    setHistory([]);
    setHistoryHasMore(false);
    setStudents([]);
    setMachineState(get_local_machine_state());
    setIsLoading(false);

    try {
      localStorage.removeItem("laundryUser");
      localStorage.removeItem("laundryIsNewUser");
      if (!keepBanNotice) {
        localStorage.removeItem("banReason");
        localStorage.removeItem("banNotice");
      }
    } catch (error) {
    }
  };

  const resetStuckAuthSession = async (reason: string) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[auth] ${reason}. Resetting local session.`);
    }

    if (supabase) {
      try {
        await withTimeout(
          supabase.auth.signOut({ scope: 'local' }),
          AUTH_CALL_TIMEOUT_MS,
          'auth.signOut(local)'
        );
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn('Local signOut failed:', error);
        }
      }
    }

    clearLocalSession();
    setAuthReady(true);
  };



  // Clear local session after logout options are applied.

  useEffect(() => {

    refreshMyRole();

  }, []);



  // Clear local session after logout options are applied.

  useEffect(() => {

    if (!isSupabaseConfigured || !supabase) return;



    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearLocalSession();
        setAuthReady(true);
        return;
      }

      // Avoid aggressive profile re-fetch on hourly token refresh in Safari.
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED") {
        void refreshMyRole();
      }
    });



    return () => {

      authListener.subscription.unsubscribe();

    };

  }, [isSupabaseConfigured, supabase]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const refreshVisible = (options?: { includeHeavy?: boolean }) => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }
      fetchQueue();
      fetchMachineState();
      if (options?.includeHeavy) {
        fetchHistory();
        loadStudents();
      }
    };

    const refreshFull = () => refreshVisible({ includeHeavy: true });
    const handleVisibility = () => refreshFull();
    const handleFocus = () => refreshFull();
    const handleOnline = () => refreshFull();
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        refreshFull();
      }
    };

    const pollId = window.setInterval(() => refreshVisible(), 15000);

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    window.addEventListener("pageshow", handlePageShow);
    refreshFull();

    return () => {
      window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [isSupabaseConfigured, supabase, isAdmin, isSuperAdmin, isCleanupAdmin, user?.can_view_students]);



  const optimisticUpdateQueueItem = (queueItemId: string, updates: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((item) => (item.id === queueItemId ? { ...item, ...updates } : item)));
    try {
      const localQueue = get_local_queue();
      const idx = localQueue.findIndex((item) => item.id === queueItemId);
      if (idx !== -1) {
        localQueue[idx] = { ...localQueue[idx], ...updates };
        save_local_queue(localQueue);
      }
    } catch {}
  };



  const getUserQueueItem = () => {
    if (!user?.student_id) return undefined;
    return queue.find((item) => item.student_id === user.student_id);
  };



  const setReturnKeyAlert = async (queueItemId: string, alert: boolean) => {
    if (!isAdmin && !isSuperAdmin) return;
    if (!supabase || !isSupabaseConfigured) return;

    const token = await getFreshToken();
    const response = await fetch('/api/admin/queue/set-return-key-alert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ queue_item_id: queueItemId, alert }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Ошибка обновления алерта возврата ключа');
    }

    await fetchQueue();
  };



  const removeFromQueue = async (queueItemId: string) => {
    if (!isAdmin && !isSuperAdmin) return;
    if (!supabase || !isSupabaseConfigured) return;

    const token = await getFreshToken();
    const response = await fetch('/api/admin/queue/remove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ queue_item_id: queueItemId }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Ошибка удаления из очереди');
    }
    await fetchQueue();
    await fetchMachineState();
  };



  const clearQueueByMode = async (mode: 'all' | 'completed' | 'old' | 'stuck') => {
    if (!isAdmin && !isSuperAdmin) return;
    if (!supabase || !isSupabaseConfigured) {
      if (mode === 'all') {
        clear_local_queue();
        fetchQueue();
        fetchMachineState();
      }
      return;
    }

    const token = await getFreshToken();
    const response = await fetch('/api/admin/queue/clear', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ mode }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Ошибка очистки очереди');
    }
    await fetchQueue();
    await fetchMachineState();
  };

  const clearQueue = async () => clearQueueByMode('all');
  const clearCompletedQueue = async () => clearQueueByMode('completed');
  const clearOldQueues = async () => clearQueueByMode('old');
  const clearStuckQueues = async () => clearQueueByMode('stuck');



  const startNext = async () => {
    if (!isAdmin && !isSuperAdmin) return;
    if (!isSupabaseConfigured || !supabase) {
      start_local_next();
      fetchQueue();
      fetchMachineState();
      return;
    }

    const next = queue
      .filter((item) => item.status === QueueStatus.WAITING || item.status === QueueStatus.READY)
      .sort((a, b) => a.queue_position - b.queue_position)[0];
    if (!next) return;
    await startWashing(next.id);
  };



  const addStudent = async (firstName: string, lastName: string, room?: string, middleName?: string) => {
    if (!isAdmin && !isSuperAdmin && !isCleanupAdmin) return;
    if (!supabase || !isSupabaseConfigured) return;

    const token = await getFreshToken();
    const response = await fetch('/api/admin/add-student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, middle_name: middleName, room }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Ошибка добавления студента');
    }
    await loadStudents();
  };

  const updateStudent = async (studentId: string, updates: any) => {
    if (!isAdmin && !isSuperAdmin && !isCleanupAdmin) {
      throw new Error("Insufficient permissions");
    }
    if (!supabase || !isSupabaseConfigured) {
      throw new Error("Supabase is not configured");
    }

    const token = await getFreshToken();
    const response = await fetch('/api/admin/update-student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ student_id: studentId, updates }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Ошибка обновления студента');
    }
    if (!result?.success) {
      throw new Error(result?.error || "Update failed");
    }
    await loadStudents();
  };

  const deleteStudent = async (studentId: string) => {
    if (!isAdmin && !isSuperAdmin && !isCleanupAdmin) return;
    if (!supabase || !isSupabaseConfigured) return;
    if (!user?.student_id) return;

    const token = await getFreshToken();
    const response = await fetch('/api/admin/delete-student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ studentId }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Ошибка удаления студента');
    }
    await loadStudents();
    await fetchQueue();
    await fetchHistory();
  };

  const adminAddToQueue = async (
    studentRoom?: string,
    washCount?: number,
    couponsUsed?: number,
    expectedFinishAt?: string,
    chosenDate?: string,
    studentId?: string
  ) => {
    if (!isAdmin && !isSuperAdmin) return;
    if (!supabase || !isSupabaseConfigured) return;
    if (!user?.student_id) return;
    if (!studentId || !chosenDate) return;

    const token = await getFreshToken();
    const response = await fetch('/api/admin/add-to-queue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        student_id: studentId,
        wash_count: washCount,
        coupons_used: couponsUsed,
        expected_finish_at: expectedFinishAt,
        scheduled_for_date: chosenDate,
        student_room: studentRoom,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Ошибка добавления в очередь');
    }
    await fetchQueue();
  };

  const banStudent = async (studentId: string, reason?: string) => {
    if (!isAdmin && !isSuperAdmin) return;
    if (!supabase || !isSupabaseConfigured) return;

    const token = await getFreshToken();
    const response = await fetch('/api/admin/ban-student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ student_id: studentId, reason, ban: true }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Ошибка бана');
    }
    await loadStudents();
    await fetchQueue();
  };

  const unbanStudent = async (studentId: string) => {
    if (!isAdmin && !isSuperAdmin) return;
    if (!supabase || !isSupabaseConfigured) return;

    const token = await getFreshToken();
    const response = await fetch('/api/admin/ban-student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ student_id: studentId, ban: false }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Ошибка разбана');
    }
    await loadStudents();
  };




  const leaveQueue = async (queueItemId: string) => {
    if (!supabase) return;

    if (!isSupabaseConfigured) {
      if (user?.id) {
        remove_from_local_queue(queueItemId, user.id);
      } else {
        const localQueue = get_local_queue();
        const nextQueue = localQueue.filter((item) => item.id !== queueItemId);
        save_local_queue(nextQueue);
      }
      fetchQueue();
      return;
    }

    try {
      const { error } = await supabase.from('queue').delete().eq('id', queueItemId);
      if (error) throw error;

      await fetchQueue();
    } catch (err) {
      await fetchQueue();
      throw err;
    }
  };



  // Admin: Start washing for a queue item
  const startWashing = async (queueItemId: string) => {
    if (!isAdmin) return;

    if (!isSupabaseConfigured || !supabase) {
      start_local_washing(queueItemId);
      fetchQueue();
      fetchMachineState();
      return;
    }

    try {
      const token = await getFreshToken();
      const response = await fetch('/api/admin/queue/start-washing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ queue_item_id: queueItemId }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result?.removed) {
          await fetchQueue();
          await fetchMachineState();
        }
        throw new Error(result.error || 'Ошибка запуска стирки');
      }

      await fetchQueue();
      await fetchMachineState();
    } catch (error) {
      await fetchQueue();
      await fetchMachineState();
      throw error;
    }
  };



  // Admin: Cancel washing (return to queue)
  const cancelWashing = async (queueItemId: string) => {
    if (!isAdmin) return;

    const queueItem = queue.find((item) => item.id === queueItemId);
    if (!queueItem || queueItem.status !== QueueStatus.WASHING) return;

    if (!isSupabaseConfigured || !supabase) {
      const localQueue = get_local_queue();
      const item = localQueue.find((i) => i.id === queueItemId);
      if (item) {
        item.status = QueueStatus.WAITING;
        save_local_queue(localQueue);
      }
      save_local_machine_state({ status: MachineStatus.IDLE });
      fetchQueue();
      fetchMachineState();
      return;
    }

    try {
      const token = await getFreshToken();
      const response = await fetch('/api/admin/queue/cancel-washing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ queue_item_id: queueItemId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Ошибка отмены стирки');
      }

      await fetchQueue();
      await fetchMachineState();
    } catch (error) {
      throw error;
    }
  };



  // Admin: Mark washing as done (moves to history + removes from queue)
  const markDone = async (queueItemId: string) => {
    if (!isAdmin) return;

    const queueItem = queue.find((item) => item.id === queueItemId);
    if (!queueItem) return;

    if (!isSupabaseConfigured || !supabase) {
      mark_local_done();
      fetchQueue();
      fetchMachineState();
      fetchHistory();
      return;
    }

    try {
      const token = await getFreshToken();
      const response = await fetch('/api/admin/queue/mark-done', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ queue_item_id: queueItemId }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Ошибка завершения стирки');
      }

      void sendTelegramNotification({
        type: 'washing_done',
        full_name: queueItem.full_name,
        room: queueItem.room,
        student_id: queueItem.student_id,
        queue_item_id: queueItemId,
      }).catch((err) => console.error('sendTelegramNotification(washing_done) error:', err));

      await fetchQueue();
      await fetchMachineState();
      await fetchHistory();
    } catch (error) {
      throw error;
    }
  };



  // Load data and setup subscriptions on mount

  useEffect(() => {

    if (!isSupabaseConfigured) {
      // Local fallback
      setQueue(get_local_queue());
      setMachineState(get_local_machine_state());
      setHistory(get_local_history());
      setHistoryHasMore(false);
      loadStudents();
      setIsLoading(false);
      return;
    }


    if (!supabase) {
      setHistoryHasMore(false);
      setIsLoading(false);
      return;
    }


    // --- INITIAL FETCH ---

    loadStudents();

    fetchQueue();

    fetchMachineState();

    fetchHistory();

    setIsLoading(false);



    // --- SUBSCRIPTIONS ---

    const subs: ReturnType<typeof supabase.channel>[] = [];



    // Queue updates

    const queueSub = supabase

      .channel("queue-changes")

      .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, fetchQueue)

      .subscribe();

    subs.push(queueSub);



    // Machine state

    const machineStateSub = supabase
      .channel("machine-state-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "machine_state" },
        (payload) => {
          if (payload.new) {
            const next = payload.new as MachineState;
            setMachineState((prev) => {
              if (
                prev &&
                prev.status === next.status &&
                prev.current_queue_item_id === next.current_queue_item_id &&
                prev.started_at === next.started_at &&
                prev.expected_finish_at === next.expected_finish_at
              ) {
                return prev;
              }
              return next;
            });
            save_local_machine_state(next);
          } else {
            fetchMachineState();
          }
        }
      )
      .subscribe();

    subs.push(machineStateSub);



    // History

    const historySub = supabase

      .channel("history-changes")

      .on("postgres_changes", { event: "*", schema: "public", table: "history" }, fetchHistory)

      .subscribe();

    subs.push(historySub);



    // Machine live push updates

    const machineStateLiveSub = supabase

      .channel("machine_state_live")

      .on(

        "postgres_changes",

        { event: "*", schema: "public", table: "machine_state" },

        (payload) => {
          if (payload.new) {
            const next = payload.new as MachineState;
            setMachineState((prev) => {
              if (
                prev &&
                prev.status === next.status &&
                prev.current_queue_item_id === next.current_queue_item_id &&
                prev.started_at === next.started_at &&
                prev.expected_finish_at === next.expected_finish_at
              ) {
                return prev;
              }
              return next;
            });
            save_local_machine_state(next);
          } else {
            fetchMachineState();
          }
        }

      )

      .subscribe();

    subs.push(machineStateLiveSub);



    // Students avatar updates - refresh both queue and students list when any student's avatar changes

    const studentsAvatarSub = supabase

      .channel("students-avatar-updates")

      .on(

        "postgres_changes",

        {

          event: "UPDATE",

          schema: "public",

          table: "students",

        },

        (payload) => {

          // Update the student in the students array

          setStudents((prevStudents) => {

            if (!prevStudents) return prevStudents;

            return prevStudents.map((student) => {

              if (student.id === payload.new.id) {

                return {

                  ...student,

                  avatar_style: payload.new.avatar_style || student.avatar_style,

                  avatar_seed: payload.new.avatar_seed || student.avatar_seed,

                };

              }

              return student;

            });

          });

          

          // Update history to show current avatars

          setHistory((prevHistory) => {

            if (!prevHistory) return prevHistory;

            return prevHistory.map((item) => {

              if (item.student_id === payload.new.id) {

                return {

                  ...item,

                  avatar_style: payload.new.avatar_style || item.avatar_style,

                  avatar_seed: payload.new.avatar_seed || item.avatar_seed,

                };

              }

              return item;

            });

          });

          

          // Update queue avatars in place to avoid an extra network fetch.
          setQueue((prevQueue) => {
            if (!prevQueue || prevQueue.length === 0) return prevQueue;

            const nextQueue = prevQueue.map((item) => {
              if (item.student_id !== payload.new.id) return item;
              return {
                ...item,
                avatar_style: payload.new.avatar_style || item.avatar_style,
                avatar_seed: payload.new.avatar_seed || item.avatar_seed,
              };
            });

            try {
              save_local_queue(nextQueue);
            } catch {}
            return nextQueue;
          });

        }

      )

      .subscribe();

    subs.push(studentsAvatarSub);



    // --- TELEGRAM REAL-TIME (NEW & CORRECT) ---

    if (user?.student_id) {

      const telegramSub = supabase

        .channel("students-telegram-updates")

        .on(

          "postgres_changes",

          {

            event: "UPDATE",

            schema: "public",

            table: "students",

            filter: `id=eq.${user.student_id}`,

          },

          (payload) => {

            const newChatId = payload.new.telegram_chat_id;





            if (newChatId !== undefined && newChatId !== user.telegram_chat_id) {

              const updatedUser = { ...user, telegram_chat_id: newChatId };

              setUser(updatedUser);



              if (typeof window !== "undefined") {

                localStorage.setItem("laundryUser", JSON.stringify(updatedUser));

              }

            }

          }

        )

        .subscribe();



    subs.push(telegramSub);

  }

    if (user?.student_id) {
      const statusSub = supabase
        .channel("students-status-updates")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "students",
            filter: `id=eq.${user.student_id}`,
          },
          (payload) => {
            const isBanned = !!payload.new.is_banned;
            const isRegistered = payload.new.is_registered !== false;
            const hasUserId = !!payload.new.user_id;

            if (isBanned) {
              const banReason = payload.new.ban_reason || "Не указана";
              if (typeof window !== "undefined") {
                localStorage.setItem("banReason", banReason);
              }
              void logoutStudent({ keepBanNotice: true });
              return;
            }

            if (!isRegistered || !hasUserId) {
              void logoutStudent();
            }
          }
        )
        .subscribe();

      subs.push(statusSub);
    }



  // --- CLEANUP ---

  return () => {

    subs.forEach((s) => s.unsubscribe());

  };

}, [isSupabaseConfigured, supabase, user?.student_id]);







  useEffect(() => {

    if (user && typeof window !== "undefined" && window.localStorage) {

      try {

        localStorage.setItem('laundryUser', JSON.stringify(user));

      } catch (error) {

      }

    }

  }, [user]);

  

  // Save isNewUser status to localStorage

  useEffect(() => {

    localStorage.setItem('laundryIsNewUser', isNewUser.toString());

  }, [isNewUser]);



  // Clear local session after logout options are applied.

  const claimMyQueueItems = async () => {

    if (!supabase) return;



    try {

      const { error } = await supabase.rpc('claim_my_queue_items');



      if (error) {

        console.error('Error claiming queue items:', error);

      } else {



        await fetchQueue();

      }

    } catch (error) {

      console.error('Error in claimMyQueueItems:', error);

    }

  };



  // Clear local session after logout options are applied.

  const refreshMyRole = async () => {

    if (!isSupabaseConfigured || !supabase) {

      setUser(null);

      setIsAdmin(false);

      setIsSuperAdmin(false);
      setIsCleanupAdmin(false);
      setAuthReady(true);

      return;

    }



    try {

      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        AUTH_CALL_TIMEOUT_MS,
        'auth.getSession(refreshMyRole)'
      );

      let uid = session?.user?.id;

      if (!uid) {
        const ok = await waitForSession();
        if (ok) {
          const { data: { session: retrySession } } = await withTimeout(
            supabase.auth.getSession(),
            AUTH_CALL_TIMEOUT_MS,
            'auth.getSession(refreshMyRole.retry)'
          );
          uid = retrySession?.user?.id;
        }
      }



      if (!uid) {

        setUser(null);

        setIsAdmin(false);

        setIsSuperAdmin(false);
        setIsCleanupAdmin(false);

        setAuthReady(true);

        return;

      }

      let { data: me, error } = await withTimeout(
        supabase
          .from("students")
          .select("id, first_name, last_name, full_name, room, telegram_chat_id, ui_language, is_admin, is_super_admin, is_cleanup_admin, can_view_students, is_banned, ban_reason, avatar_style, avatar_seed")
          .eq("user_id", uid)
          .maybeSingle(),
        AUTH_CALL_TIMEOUT_MS,
        'students.select(refreshMyRole)'
      );

      if (!me) {
        const attempts = registeringRef.current ? 10 : 4;
        const linked = await waitForStudentLink(uid, attempts, 250);
        if (linked) {
          me = linked;
          error = null;
        }
      }

      if (error) {

        console.error('? Error fetching user data:', error);
        return;

      }



      if (!me) {
        // Keep current session; a temporary RLS/network glitch should not force logout.
        return;
      }



      if (me.is_banned) {
        const banReason = me.ban_reason || "Не указана";
        if (typeof window !== "undefined") {
          localStorage.setItem("banReason", banReason);
        }

        await supabase.auth.signOut({ scope: 'local' });
        clearLocalSession({ keepBanNotice: true });
        return;
      }



      const newUser: User = {

        id: uid,

        student_id: me.id,

        first_name: me.first_name,

        last_name: me.last_name,

        full_name: me.full_name,

        room: me.room,

        telegram_chat_id: me.telegram_chat_id,

        ui_language: (me as any).ui_language || undefined,

        avatar_style: me.avatar_style || 'bottts',

        avatar_seed: me.avatar_seed || null,





        is_admin: me.is_admin || false,

        is_super_admin: me.is_super_admin || false,
        is_cleanup_admin: me.is_cleanup_admin || false,

        can_view_students: me.can_view_students || false,

      };

      setUser(newUser);

      setIsAdmin(!!me.is_admin);

      setIsSuperAdmin(!!me.is_super_admin);
      setIsCleanupAdmin(!!me.is_cleanup_admin);



      // Clear local session after logout options are applied.

      if (typeof window !== "undefined") {

        localStorage.setItem("laundryUser", JSON.stringify(newUser));

      }





      if (uid && me.id) {

        claimMyQueueItems();

      }





      if (typeof window !== 'undefined') {

        localStorage.setItem('laundryUser', JSON.stringify(newUser));

      }

    } catch (error: unknown) {
      if (isTimeoutError(error)) {
        await resetStuckAuthSession('Auth initialization timed out');
        return;
      }

      console.error('Error in refreshMyRole:', error);

      setUser(null);

      setIsAdmin(false);

      setIsSuperAdmin(false);
      setIsCleanupAdmin(false);

    } finally {
      setAuthReady(true);
    }

  };



  // Load students from Supabase

  const loadStudents = async () => {

    if (!isSupabaseConfigured || !supabase) {

      return;

    }



    const client = supabase;

    const isAdminUser = !!(isAdmin || isSuperAdmin);

    const canViewStudents = !!(isAdminUser || isCleanupAdmin || user?.can_view_students);



    try {

      if (isAdminUser) {

        try {

          const { data, error } = await client

            .from("students")

            .select(

              "id, first_name, last_name, middle_name, full_name, room, telegram_chat_id, is_admin, is_super_admin, is_cleanup_admin, can_view_students, is_banned, ban_reason, user_id, is_registered, created_at, key_issued, key_lost, stay_type, avatar_style, avatar_seed"

            )

            .order("full_name", { ascending: true });



          if (error) throw error;



          

          const students: Student[] = (data || []).map((item: any): Student => {

            const fullName =

              item.full_name ||

              [item.first_name, item.last_name, item.middle_name].filter(Boolean).join(" ");



            return {

              id: item.id,

              first_name: item.first_name || "",

              last_name: item.last_name || "",

              middle_name: item.middle_name || "",

              full_name: fullName || "",

              room: item.room ?? null,

              is_registered: !!item.is_registered,

              created_at: item.created_at || new Date().toISOString(),

              is_banned: !!item.is_banned,

              ban_reason: item.ban_reason || null,

              user_id: item.user_id || undefined,

              is_admin: !!item.is_admin,

              is_super_admin: !!item.is_super_admin,
              is_cleanup_admin: !!item.is_cleanup_admin,

              can_view_students: !!item.can_view_students,

              telegram_chat_id: item.telegram_chat_id || undefined,

              key_issued: !!item.key_issued,

              key_lost: !!item.key_lost,

              stay_type: item.stay_type || "unknown",

              avatar_style: item.avatar_style || "bottts",

              avatar_seed: item.avatar_seed || "",

            };

          });



          setStudents(students);

          return;

        } catch (error) {

          const { data, error: legacyError } = await client

            .from("students")

            .select(

              "id, first_name, last_name, middle_name, full_name, room, telegram_chat_id, is_admin, is_super_admin, is_cleanup_admin, can_view_students, is_banned, ban_reason, user_id, is_registered, created_at, avatar_style, avatar_seed"

            )

            .order("full_name", { ascending: true });



          if (legacyError) throw legacyError;



          const students: Student[] = (data || []).map((item: any): Student => {

            const fullName =

              item.full_name ||

              [item.first_name, item.last_name, item.middle_name].filter(Boolean).join(" ");



            return {

              id: item.id,

              first_name: item.first_name || "",

              last_name: item.last_name || "",

              middle_name: item.middle_name || "",

              full_name: fullName || "",

              room: item.room ?? null,

              is_registered: !!item.is_registered,

              created_at: item.created_at || new Date().toISOString(),

              is_banned: !!item.is_banned,

              ban_reason: item.ban_reason || null,

              user_id: item.user_id || undefined,

              is_admin: !!item.is_admin,

              is_super_admin: !!item.is_super_admin,
              is_cleanup_admin: !!item.is_cleanup_admin,

              can_view_students: !!item.can_view_students,

              telegram_chat_id: item.telegram_chat_id || undefined,

              key_issued: false,

              key_lost: false,

              avatar_style: item.avatar_style || "bottts",

              avatar_seed: item.avatar_seed || "",

            };

          });



          setStudents(students);

          return;

        }

      }

      if (canViewStudents) {

        const { data: { session } } = await client.auth.getSession();
        let accessToken = session?.access_token;

        if (!accessToken) {
          const ok = await waitForSession();
          if (ok) {
            const { data: { session: retrySession } } = await client.auth.getSession();
            accessToken = retrySession?.access_token;
          }
        }

        if (accessToken) {

          const response = await fetch("/api/students/list", {

            method: "GET",

            headers: {

              Authorization: `Bearer ${accessToken}`,

            },

          });



          if (response.ok) {

            const result = await response.json();

            const apiStudents: Student[] = (result.students || []).map((item: any): Student => {

              const fullName =

                item.full_name ||

                [item.first_name, item.last_name, item.middle_name].filter(Boolean).join(" ");



              return {

                ...item,

                first_name: item.first_name || item.full_name?.split(" ")[0] || "",

                last_name: item.last_name || item.full_name?.split(" ").slice(1).join(" ") || "",

                middle_name: item.middle_name || "",

                full_name: fullName || "",

                is_registered: item.is_registered || false,

                created_at: item.created_at || new Date().toISOString(),

                is_banned: !!item.is_banned,

                is_admin: !!item.is_admin,

                is_super_admin: !!item.is_super_admin,
                is_cleanup_admin: !!item.is_cleanup_admin,

                can_view_students: !!item.can_view_students,

                telegram_chat_id: item.telegram_chat_id || undefined,

                key_issued: !!item.key_issued,

                key_lost: !!item.key_lost,

                stay_type: item.stay_type || "unknown",

                avatar_style: item.avatar_style || item.avatar_type || "bottts",

                avatar_seed: item.avatar_seed || "",

              };

            });



            setStudents(apiStudents);

            return;

          }

        }

      }



      try {



        const { data, error } = await client

          .from("students_login_list")

          .select("id, full_name, room, is_registered, is_banned, ban_reason, key_issued, key_lost, avatar_style, avatar_seed")

          .order("full_name", { ascending: true });



        if (error) throw error;





        const students: Student[] = (data || []).map((item: any): Student => ({

          ...item,

          first_name: item.full_name?.split(" ")[0] || "",

          last_name: item.full_name?.split(" ").slice(1).join(" ") || "",

          middle_name: "",

          is_registered: item.is_registered || false,

          created_at: new Date().toISOString(),

          is_banned: !!item.is_banned,
          ban_reason: item.ban_reason || null,

          user_id: undefined,

          is_admin: false,

          is_super_admin: false,
          is_cleanup_admin: false,

          can_view_students: false,

          telegram_chat_id: undefined,

          key_issued: !!item.key_issued,

          key_lost: !!item.key_lost,

          avatar_style: item.avatar_style || "bottts",

          avatar_seed: item.avatar_seed || "",

        }));



        setStudents(students);

        return;

      } catch (error) {



        const { data, error: legacyError } = await client

          .from("students_login_list")

          .select("id, full_name, room, is_registered, is_banned, ban_reason, key_issued, key_lost")

          .order("full_name", { ascending: true });



        if (legacyError) throw legacyError;



        const students: Student[] = (data || []).map((item: any): Student => ({

          ...item,

          first_name: item.full_name?.split(" ")[0] || "",

          last_name: item.full_name?.split(" ").slice(1).join(" ") || "",

          middle_name: "",

          is_registered: item.is_registered || false,

          created_at: new Date().toISOString(),

          is_banned: !!item.is_banned,
          ban_reason: item.ban_reason || null,

          user_id: undefined,

          is_admin: false,

          is_super_admin: false,
          is_cleanup_admin: false,

          can_view_students: false,

          telegram_chat_id: undefined,

          key_issued: !!item.key_issued,

          key_lost: !!item.key_lost,

          avatar_style: "bottts",

          avatar_seed: "",

        }));



        setStudents(students);

        return;

      }

    } catch (error) {

      console.error("Error loading students", error);

      setStudents((prev) => (prev.length ? prev : []));

    }

  };



  useEffect(() => {

    if (!isSupabaseConfigured || !supabase) return;

    loadStudents();

  }, [isAdmin, isSuperAdmin, isCleanupAdmin, user?.can_view_students]);

  



 





const finalizeUserSession = (

  authUserId: string,

  student: Student,

  isNew: boolean

): User => {

  

  const isAdminUser = student.is_admin || false;

  const isSuperAdminUser = student.is_super_admin || false;
  const isCleanupAdminUser = student.is_cleanup_admin || false;

  const canViewStudents = student.can_view_students || false;



  const newUser: User = {

    id: authUserId,

    student_id: student.id,

    first_name: student.first_name,

    last_name: student.last_name,

    full_name: student.full_name,

    room: student.room || undefined,

    telegram_chat_id: student.telegram_chat_id || undefined,

    ui_language: (student as any).ui_language || undefined,

    avatar_style: student.avatar_style || 'bottts',

    avatar_seed: student.avatar_seed || null,





    is_admin: isAdminUser,

    is_super_admin: isSuperAdminUser,
    is_cleanup_admin: isCleanupAdminUser,

    can_view_students: canViewStudents,

  };



  setUser(newUser);

  setIsNewUser(isNew);



  setIsAdmin(isAdminUser);

  setIsSuperAdmin(isSuperAdminUser);
  setIsCleanupAdmin(isCleanupAdminUser);



  // Clear local session after logout options are applied.

  if (typeof window !== "undefined") {

    localStorage.setItem("laundryUser", JSON.stringify(newUser));

  }

  return newUser;

};



    // ========================================



// ========================================



// ========================================



// ========================================



const registerStudent = async (

  studentId: string,

  password: string

): Promise<User | null> => {

  if (!isSupabaseConfigured || !supabase) {

    throw new Error("Supabase не настроен");

  }

  registeringRef.current = true;



  try {

    const student = students.find((s) => s.id === studentId);

    if (!student) throw new Error("Студент не найден");



    if (student.is_banned) {

      const banReason = student.ban_reason || "Не указана";

      throw new Error(`Вы забанены. Причина: ${banReason}. Обратитесь к администратору.`);

    }



    if (student.is_registered && student.user_id) {

      throw new Error("Студент уже зарегистрирован. Нажмите «Войти».");

    }





    if (password.length < 6) {

      throw new Error("Пароль должен быть не менее 6 символов");

    }





    const { data: studentData, error: emailErr } = await supabase

      .from('students')

      .select('auth_email')

      .eq('id', studentId)

      .single();



    if (emailErr) throw emailErr;



    const authEmail = studentData?.auth_email;

    if (!authEmail) throw new Error("Student auth_email is missing (check trigger)");





    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({

      email: authEmail,

      password,

      options: {

        data: {

          student_id: studentId,

          full_name: student.full_name,

        },

        emailRedirectTo: `${window.location.origin}/auth/callback`,

      },

    });



    let authUser = signUpData?.user;



    if (signUpErr) {

      console.error("SignUp error:", signUpErr);

      const msg = signUpErr.message?.toLowerCase() || "";

      



      if (msg.includes("already registered") || msg.includes("user already registered")) {

        const error = new Error("Аккаунт уже существует. Войдите в систему.") as any;

        error.code = "USER_ALREADY_REGISTERED";

        throw error;

      } else {

        throw new Error(`Ошибка регистрации: ${signUpErr.message}`);

      }

    }







    if (!authUser && !signUpErr) {

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({

        email: authEmail,

        password,

      });

      

      if (signInErr) {

        console.error("SignIn after null user error:", signInErr);

        throw new Error("Не удалось войти после регистрации. Возможно, требуется подтверждение email. Обратитесь к администратору.");

      }

      

      authUser = signInData?.user;

    }





    if (!authUser) {

      console.error("No auth user after all attempts");

      throw new Error("Не удалось создать пользователя. Проверьте настройки Supabase Auth (отключите Email Confirmation).");

    }





    const sessionReady = await waitForSession();

    if (!sessionReady) {

      throw new Error('Сессия не установлена. Попробуйте войти снова.');

    }







    const response = await fetch("/api/student/register", {

      method: "POST",

      headers: { "Content-Type": "application/json" },

      body: JSON.stringify({

        student_id: studentId,

        auth_user_id: authUser.id,

      }),

    });



    const result = await response.json();

    if (!response.ok) throw new Error(result.error);



    // 4) Wait for user_id link
    const linkedStudent = await waitForStudentLink(authUser.id, 10, 300);

    let updatedStudent = linkedStudent;
    if (!updatedStudent || updatedStudent.id !== studentId) {
      const { data } = await supabase
        .from("students")
        .select("id, first_name, last_name, full_name, room, telegram_chat_id, is_admin, is_super_admin, is_cleanup_admin, can_view_students, is_banned, ban_reason, user_id, is_registered, created_at, avatar_style, avatar_seed")
        .eq("id", studentId)
        .single();

      updatedStudent = data;
    }

    if (!updatedStudent || updatedStudent.user_id !== authUser.id || !updatedStudent.is_registered) {
      throw new Error("Account link not ready. Please try again.");
    }



    return finalizeUserSession(authUser.id, updatedStudent, true);

  } catch (error) {

    throw error;

  } finally {
    registeringRef.current = false;
  }
};





// ========================================



// ========================================



const loginStudent = async (

  studentId: string,

  password: string

): Promise<User | null> => {

  if (!isSupabaseConfigured || !supabase) {

    throw new Error("Supabase не настроен");

  }



  try {



    const { data: studentData, error: emailErr } = await supabase

      .from('students')

      .select('auth_email')

      .eq('id', studentId)

      .single();



    if (emailErr) throw emailErr;



    const authEmail = studentData?.auth_email;

    if (!authEmail) throw new Error("Student auth_email is missing (check trigger)");

    

    // Clear local session after logout options are applied.

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(authEmail)) {

      throw new Error("Неверный формат email адреса");

    }





    const { data: authData, error: authError } =

      await supabase.auth.signInWithPassword({

        email: authEmail,

        password,

      });



    if (authError) {

      if (authError.message === "Invalid login credentials") {

        throw new Error("Неправильный пароль");

      }

      throw new Error(authError.message || "Ошибка входа");

    }



    if (!authData?.user) {

      throw new Error("Не удалось войти");

    }



    const authUser = authData.user;





    const sessionReady = await waitForSession();

    if (!sessionReady) {

      throw new Error('Сессия не установлена. Попробуйте войти снова.');

    }





    const { data: updatedStudent, error: studentError } = await supabase

      .from("students")

      .select("id, first_name, last_name, full_name, room, telegram_chat_id, is_admin, is_super_admin, is_cleanup_admin, can_view_students, is_banned, ban_reason, user_id, is_registered, created_at, avatar_style, avatar_seed")

      .eq("user_id", authUser.id)

      .maybeSingle();

    

    if (studentError) throw studentError;

    



    if (!updatedStudent) {



      setNeedsClaim(true);

      return null;

    }





    if (updatedStudent.is_banned) {

      const banReason = updatedStudent.ban_reason || "Не указана";

      if (typeof window !== "undefined") {
        localStorage.setItem("banReason", banReason);
      }

      await supabase.auth.signOut({ scope: 'local' });
      throw new Error(`Вы забанены. Причина: ${banReason}. Обратитесь к администратору.`);

    }



    await fetchQueue();

    await loadStudents();



    const needsClaimAccount = !updatedStudent.user_id || updatedStudent.user_id !== authUser.id;

    setNeedsClaim(needsClaimAccount);



    return finalizeUserSession(authUser.id, updatedStudent, false);

  } catch (error: any) {

    throw error;

  }

};







  // Logout student
  const logoutStudent = async (options?: { keepBanNotice?: boolean }) => {
  try {
    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
      }
    }
  } catch (error) {
  } finally {
    // Clear local session after logout options are applied.
    clearLocalSession(options);
  }
};






  useEffect(() => {
    if (!authReady || !isSupabaseConfigured || !supabase || !user?.id) return;
    if (typeof window === "undefined") return;

    let cancelled = false;

    const client = supabase;

    const runCheck = async () => {
      if (cancelled || statusCheckRef.current.inFlight) return;
      if (!client) return;
      const now = Date.now();
      if (now - statusCheckRef.current.lastRunAt < 3000) return;

      statusCheckRef.current.inFlight = true;
      statusCheckRef.current.lastRunAt = now;

      try {
        const { data: { session } } = await client.auth.getSession();
        const uid = session?.user?.id;
        if (!uid) {
          statusCheckRef.current.missingLinkHits = 0;
          return;
        }

        const { data: studentData, error } = await client
          .from("students")
          .select("id, is_banned, ban_reason")
          .eq("user_id", uid)
          .maybeSingle();

        if (error) {
          return;
        }

        if (!studentData) {
          const linked = await waitForStudentLink(uid, 4, 250);
          if (linked) {
            statusCheckRef.current.missingLinkHits = 0;
            return;
          }
          statusCheckRef.current.missingLinkHits += 1;
          if (statusCheckRef.current.missingLinkHits < 3) {
            return;
          }
          await client.auth.signOut({ scope: 'local' });
          clearLocalSession();
          return;
        }

        statusCheckRef.current.missingLinkHits = 0;

        if (studentData.is_banned) {
          const banReason = studentData.ban_reason || "Не указана";
          localStorage.setItem("banReason", banReason);
          await client.auth.signOut({ scope: 'local' });
          clearLocalSession({ keepBanNotice: true });
        }
      } finally {
        statusCheckRef.current.inFlight = false;
      }
    };

    const intervalId = window.setInterval(() => runCheck(), 10000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        runCheck();
      }
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    runCheck();

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [authReady, isSupabaseConfigured, supabase, user?.id]);

// Admin: Reset student registration

const resetStudentRegistration = async (studentId: string) => {

  if (!isAdmin && !isSuperAdmin) {

    throw new Error("Недостаточно прав для сброса регистрации");

  }

  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase не настроен");





  const token = await getFreshToken();



  const res = await fetch("/api/admin/reset-registration", {

    method: "POST",

    headers: {

      "Content-Type": "application/json",

      "Authorization": `Bearer ${token}`,

    },

    body: JSON.stringify({ studentId }),

  });



  const data = await res.json();

  if (!res.ok) throw new Error(data?.error || "Reset failed");



  await fetchQueue();

  await loadStudents();





  if (user && user.student_id === studentId) {

    await logoutStudent();

  }

};





  // Telegram 

  const linkTelegram = async (telegramCode: string): Promise<{ success: boolean; error?: string }> => {

    if (!user) {

      return { success: false, error: '' };

    }



    try {

      const response = await fetch('/api/telegram/link', {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

        },

        body: JSON.stringify({

          student_id: user.student_id, // 

          telegram_chat_id: telegramCode,

        }),

      });



      const data = await response.json();



      if (!response.ok) {
        return { success: false, error: data.error || '' };

      }





      if (isSupabaseConfigured && supabase) {

        const { data: studentData, error: fetchError } = await supabase

          .from('students')

          .select('*')

          .eq('id', user.student_id)

          .single();

        

        if (fetchError) {

          throw fetchError;

        } else {

          const updatedUser: User = {

            ...user,

            telegram_chat_id: studentData.telegram_chat_id || undefined,

          };

          

          setUser(updatedUser);

          localStorage.setItem('laundryUser', JSON.stringify(updatedUser));

        }

      } else {

        const updatedUser = { ...user, telegram_chat_id: telegramCode };

        setUser(updatedUser);

        localStorage.setItem('laundryUser', JSON.stringify(updatedUser));

      }



      return { success: true };

    } catch (error: any) {

      return { success: false, error: '' };

    }

  };



    // Fetch queue from Supabase or local storage

    const fetchQueue = async () => {

      if (!isSupabaseConfigured || !supabase) {

        setQueue(get_local_queue());

        return;

      }



      const nowMs = Date.now();

      if (queueFetchStateRef.current.inFlight) return;

      if (nowMs - queueFetchStateRef.current.lastRunAt < 300) return;



      queueFetchStateRef.current.inFlight = true;

      queueFetchStateRef.current.lastRunAt = nowMs;



      try {

        // IMPORTANT:
        // Do not run destructive queue cleanup from client fetches.
        // It could unexpectedly delete active queue rows (e.g. after coupon expiry)
        // when any student simply opens the app.



        const { data, error } = await supabase.rpc('get_queue_active_with_avatars');

        if (error) {

          console.error('get_queue_active_with_avatars error:', error);

          return;

        }



        if (data && data.length > 0) {

        }

        setQueue(data || []);

        // Also update local storage as backup

        save_local_queue(data || []);

      } catch (error: any) {

        console.error('fetchQueue error:', error);

      } finally {

        queueFetchStateRef.current.inFlight = false;

      }

    };

  

    // Fetch machine state from Supabase or local storage

    const fetchMachineState = async (options?: { force?: boolean }) => {

      if (!isSupabaseConfigured || !supabase) {

        setMachineState(get_local_machine_state());

        return;

      }

      const nowMs = Date.now();
      if (machineFetchStateRef.current.inFlight) return;
      if (!options?.force && nowMs - machineFetchStateRef.current.lastRunAt < 300) return;

      machineFetchStateRef.current.inFlight = true;
      machineFetchStateRef.current.lastRunAt = nowMs;

      try {

        const { data, error } = await supabase

          .from('machine_state')

          .select('*')

          .order('id', { ascending: false })

          .limit(1)

          .maybeSingle();

        if (error) throw error;

        setMachineState(data);

        save_local_machine_state(data || { status: MachineStatus.IDLE });

      } catch (error: any) {

        console.error('fetchMachineState error:', error);

      } finally {
        machineFetchStateRef.current.inFlight = false;
      }

    };

  

    // Fetch history from Supabase or local storage

    const fetchHistory = async (options?: { force?: boolean }) => {

      if (!isSupabaseConfigured || !supabase) {
        const localHistory = get_local_history();
        setHistory(localHistory);
        setHistoryTotalCount(localHistory.length);
        setHistoryHasMore(false);
        return;
      }

      const nowMs = Date.now();
      if (historyFetchStateRef.current.inFlight) return;
      if (!options?.force && nowMs - historyFetchStateRef.current.lastRunAt < 800) return;

      historyFetchStateRef.current.inFlight = true;
      historyFetchStateRef.current.lastRunAt = nowMs;

      try {


        let historyData: any[] = [];
        let totalCount: number | null = null;
        



        const { data: fullData, error: fullError, count: fullCount } = await supabase
          .from('history')
          .select('id, user_id, student_id, full_name, room, started_at, finished_at, ready_at, key_issued_at, washing_started_at, washing_finished_at, return_requested_at, wash_count, coupons_used, payment_type, avatar_style, avatar_seed', { count: 'exact' })
          .order('finished_at', { ascending: false })
          .limit(historyLimitRef.current);
        

        if (!fullError && fullData) {
          historyData = fullData;
          totalCount = typeof fullCount === 'number' ? fullCount : null;
        } else {


          const { data: basicData, error: basicError, count: basicCount } = await supabase
            .from('history')
            .select('id, user_id, student_id, full_name, room, started_at, finished_at, ready_at, key_issued_at, washing_started_at, washing_finished_at, return_requested_at, wash_count, coupons_used, payment_type', { count: 'exact' })
            .order('finished_at', { ascending: false })
            .limit(historyLimitRef.current);
          

          if (!basicError && basicData) {



            historyData = basicData.map((item: any) => ({
              ...item,
              avatar_style: 'bottts',
              avatar_seed: item.full_name || 'default',
            }));
            totalCount = typeof basicCount === 'number' ? basicCount : null;
          } else {
            throw basicError || new Error('Failed to fetch history');

          }

        }

        

        // Clear local session after logout options are applied.

        if (historyData && students) {

          historyData = historyData.map(item => {

            const student = students.find(s => s.id === item.student_id);

            if (student) {

              return {

                ...item,

                avatar_style: student.avatar_style,

                avatar_seed: student.avatar_seed,

              };

            }

            return item;

          });

        }

        

        const nextHistory = historyData || [];
        const resolvedTotal = typeof totalCount === 'number' ? totalCount : nextHistory.length;
        setHistory(nextHistory);
        setHistoryTotalCount(resolvedTotal);
        setHistoryHasMore(nextHistory.length < resolvedTotal);
        save_local_history(nextHistory);

      } catch (error: any) {

        console.error('? Error fetching history:', error);

        // Fall back to local storage
        const localHistory = get_local_history();
        setHistory(localHistory);
        setHistoryTotalCount(localHistory.length);

      } finally {
        historyFetchStateRef.current.inFlight = false;
      }

    };



  const loadMoreHistory = async () => {

    if (!isSupabaseConfigured || !supabase) return;

    historyLimitRef.current += HISTORY_PAGE_SIZE;

    await fetchHistory({ force: true });

  };





// ========================================

// Clear local session after logout options are applied.

// ========================================



const joinQueue = async (

  name: string,

  room?: string,

  washCount: number = 1,

  couponsUsed: number = 0,

  expectedFinishAt?: string,

  chosenDate?: string,

  couponIds: string[] = []

) => {

  if (!user) {

    return;

  }

  

  if (!supabase) {

    

    return;

  }



  if (!user.id || typeof user.id !== 'string') {

    

    return;

  }



  // Clear local session after logout options are applied.

  if (!isNewUser) {



    try {

      let studentData: any = null;

      let attempts = 0;

      const maxAttempts = 3;

      

      while (attempts < maxAttempts) {

        const { data } = await supabase

          .from('students')

          .select('is_banned, ban_reason, user_id')

          .eq('id', user.student_id)

          .single();

        

        if (data?.user_id === user.id) {

          studentData = data;

          break;

        }

        

        if (attempts < maxAttempts - 1) {

          await new Promise(resolve => setTimeout(resolve, 500));

        }

        

        attempts++;

      }

      

      if (!studentData || studentData.user_id !== user.id) {

        

        logoutStudent();

        return;

      }



      if (studentData.is_banned) {

        const banReason = studentData.ban_reason || 'Не указана';

        if (typeof window !== "undefined") {
          localStorage.setItem("banReason", banReason);
        }

        await logoutStudent({ keepBanNotice: true });

        return;

      }

    } catch (err) {

      return;

    }

  } else {



    try {

      const { data: studentData } = await supabase

        .from('students')

        .select('is_banned, ban_reason')

        .eq('id', user.student_id)

        .single();

      

      if (studentData?.is_banned) {

        const banReason = studentData.ban_reason || 'Не указана';

        if (typeof window !== "undefined") {
          localStorage.setItem("banReason", banReason);
        }

        await logoutStudent({ keepBanNotice: true });

        return;

      }

    } catch (err) {

      return;

    }

  }



  if (isJoining) {

    return;

  }





  const todayISO = format(new Date(), 'yyyy-MM-dd');

  const targetDate = chosenDate || todayISO;

  const normalizedCouponIds = Array.isArray(couponIds)
    ? Array.from(new Set(couponIds.filter(Boolean)))
    : [];
  const selectedCouponIds = normalizedCouponIds.slice(0, washCount);
  const safeCouponsUsed = Math.max(
    0,
    Math.min(selectedCouponIds.length > 0 ? selectedCouponIds.length : couponsUsed, washCount)
  );

  const derivedPaymentType =

    safeCouponsUsed === 0 ? 'money' : safeCouponsUsed >= washCount ? 'coupon' : 'both';





  try {

    const { data: hasActive, error: checkError } = await supabase

      .rpc('has_active_queue_item', {

        p_student_id: user.student_id,

        p_date: targetDate

      });



    if (checkError) {

      console.error('Error checking active queue:', checkError);

      return;

    }



    if (hasActive) {

      return;

    }

  } catch (err) {

    console.error('Error checking active queue:', err);

    return;

  }



  setIsJoining(true);



  try {



    const { data: nextPosData, error: posErr } = await supabase

      .rpc('get_next_queue_position', {

        p_date: targetDate

      });



    if (posErr) {

      console.error('Error getting next position:', posErr);

      return;

    }



    const nextPos = nextPosData || 1;





    const { data: authData } = await supabase.auth.getSession();

    const currentUserId = authData.session?.user?.id || null;



    const newItem = {

      id: crypto.randomUUID(),

      // Clear local session after logout options are applied.

      student_id: user.student_id,



      user_id: currentUserId,

      full_name: name,

      room: room || null,

      wash_count: washCount,

      coupons_used: safeCouponsUsed,

      payment_type: derivedPaymentType,

      joined_at: new Date().toISOString(),

      expected_finish_at: expectedFinishAt || null,

      status: QueueStatus.WAITING,

      scheduled_for_date: targetDate,

      queue_date: targetDate,

      queue_position: nextPos,

      // Clear local session after logout options are applied.

      avatar_style: user.avatar_style || 'bottts',

      avatar_seed: user.avatar_seed || null,

    };



    const { error } = await supabase.from('queue').insert(newItem);



    if (error) {

      if (error.code === '23505') {

        return;

      }

      return;

    }



    if (safeCouponsUsed > 0) {

      const reserveFn =
        selectedCouponIds.length > 0
          ? 'reserve_specific_coupons_for_queue'
          : 'reserve_coupons_for_queue';
      const reservePayload =
        selectedCouponIds.length > 0
          ? { p_queue_id: newItem.id, p_coupon_ids: selectedCouponIds }
          : { p_queue_id: newItem.id, p_count: safeCouponsUsed };
      const { error: reserveError } = await supabase.rpc(reserveFn, reservePayload);



      if (reserveError) {

        await supabase.from('queue').delete().eq('id', newItem.id);

        throw new Error(reserveError.message || 'Не удалось забронировать купоны');

      }

    }





    if (isNewUser) {

      setIsNewUser(false);



    }

    

    void sendTelegramNotification({
      type: 'joined',
      student_id: user.student_id,
      full_name: name,
      room,
      wash_count: washCount,
      payment_type: derivedPaymentType,
      queue_length: queue.length + 1,
      expected_finish_at: expectedFinishAt,
      queue_item_id: newItem.id,
    })
      .then((notificationResult) => {
      })
      .catch((err) => {
        console.error('sendTelegramNotification(joined) error:', err);
      });



    await fetchQueue();



  } catch (err: any) {

    return;

  } finally {

    setTimeout(() => setIsJoining(false), 1000);

  }

};





  const getFreshToken = async (): Promise<string> => {

    if (!supabase) throw new Error('Supabase not configured');

    const { data: { session: currentSession } } = await withTimeout(
      supabase.auth.getSession(),
      AUTH_CALL_TIMEOUT_MS,
      'auth.getSession(getFreshToken)'
    );
    const currentToken = currentSession?.access_token;
    const expiresAtMs = currentSession?.expires_at ? currentSession.expires_at * 1000 : null;

    // Reuse current token while it is still valid enough.
    if (currentToken && (!expiresAtMs || expiresAtMs - Date.now() > 60_000)) {
      return currentToken;
    }

    if (!tokenRefreshRef.current) {
      tokenRefreshRef.current = (async () => {
        const { data: { session }, error } = await withTimeout(
          supabase.auth.refreshSession(),
          AUTH_CALL_TIMEOUT_MS,
          'auth.refreshSession(getFreshToken)'
        );

        if (error || !session?.access_token) {
          console.error('Failed to refresh session:', error);
          const { data: { session: fallbackSession } } = await withTimeout(
            supabase.auth.getSession(),
            AUTH_CALL_TIMEOUT_MS,
            'auth.getSession(getFreshToken.fallback)'
          );
          if (!fallbackSession?.access_token) {
            throw new Error('No active session');
          }
          return fallbackSession.access_token;
        }

        return session.access_token;
      })().finally(() => {
        tokenRefreshRef.current = null;
      });
    }

    return tokenRefreshRef.current;

  };





  const setQueueStatus = async (queueItemId: string, status: QueueStatus, options?: { skipFetch?: boolean }) => {

    if (!isAdmin && !isSuperAdmin) return;

    

    if (!isSupabaseConfigured || !supabase) {

      return;

    }



    const targetItem = queue.find(item => item.id === queueItemId);

    if (targetItem && user?.student_id && targetItem.student_id === user.student_id) {



      if (!isSuperAdmin && (status === QueueStatus.READY || status === QueueStatus.RETURNING_KEY)) {

        throw new Error('Нельзя вызвать себя за ключом или возвратом ключа.');

      }

    }



    try {

      // Clear local session after logout options are applied.

      const token = await getFreshToken();



      // Clear local session after logout options are applied.

      const response = await fetch('/api/admin/queue/set-status', {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'Authorization': `Bearer ${token}`,

        },

        body: JSON.stringify({ queue_item_id: queueItemId, status }),

      });



      const result = await response.json();



      if (!response.ok) {
        if (result?.removed) {
          await fetchQueue();
        }

        throw new Error(result.error || 'Ошибка изменения статуса');

      }



      if (!options?.skipFetch) {
        await fetchQueue();
      }

    } catch (error) {

      throw error;

    }

  };







const updateQueueItem = async (queueItemId: string, updates: Partial<QueueItem>, options?: { skipFetch?: boolean }) => {

  

  if (!isSupabaseConfigured || !supabase) {

    // Use local storage fallback

    if (user) {

      update_local_queue_item(queueItemId, user.id, updates);

    }

    if (!options?.skipFetch) {
      fetchQueue();
    }

    return;

  }

  

  if (updates.return_key_alert === true && user?.student_id) {

    const targetItem = queue.find(item => item.id === queueItemId);

    if (targetItem && targetItem.student_id === user.student_id) {

      throw new Error('Нельзя вызвать себя на возврат ключа.');

    }

  }



  try {

    // Clear local session after logout options are applied.

    const { data, error } = await supabase

      .from('queue')

      .update(updates)

      .eq('id', queueItemId)

      .select();



    if (error) {

      console.error('updateQueueItem error:', error);

      throw error;

    }

    if (!options?.skipFetch) {
      await fetchQueue();
    }

  } catch (error) {

    console.error('updateQueueItem catch:', error);

    // Fallback to local storage on error

    if (user) {

      update_local_queue_item(queueItemId, user.id, updates);

    }

    fetchQueue();

  }

};



const updateQueueEndTime = async (queueId: string, endTime: string) => {

  if (!supabase) return;

  

  const item = queue.find(q => q.id === queueId);

  if (!item) return;

  

  const updateData: any = {};

  if (item.status === QueueStatus.WASHING) {

    updateData.washEndTime = endTime;

  } else if (item.status === QueueStatus.DONE) {

    updateData.paymentEndTime = endTime;

  } else {

    return;  // Only for WASHING or DONE

  }

  

  await supabase.from('queue').update(updateData).eq('id', queueId);

  await fetchQueue();

};







// ========================================



// ========================================



const toggleAdminStatus = async (studentId: string, makeAdmin: boolean) => {

  if (!isSuperAdmin) return;

  

  try {

    const token = await getFreshToken();

    const response = await fetch("/api/admin/toggle-admin", {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },

      body: JSON.stringify({

        studentId,

        makeAdmin,

      }),

    });



    const res = await response.json();



    if (!response.ok) {

      return;

    }



    await loadStudents();

  } catch (err) {

    return;

  }

};







const toggleSuperAdminStatus = async (

  studentId: string,

  makeSuperAdmin: boolean

) => {

  if (!isSuperAdmin) return;

  

  try {

    const token = await getFreshToken();

    const response = await fetch("/api/admin/toggle-super-admin", {

      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },

      body: JSON.stringify({

        studentId,

        makeSuperAdmin,

      }),

    });



    const res = await response.json();



    if (!response.ok) {

      return;

    }



    await loadStudents();

  } catch (err) {

    return;

  }

};





// Admin: Send message to queue item

const sendAdminMessage = async (queueItemId: string, message: string) => {

  if (!isAdmin) return;

  

  if (!isSupabaseConfigured || !supabase) {

    // Use local storage fallback

    const queue = get_local_queue();

    const item = queue.find(i => i.id === queueItemId);

    if (item) {

      item.admin_message = message;

      save_local_queue(queue);

    }

    fetchQueue();

    return;

  }

  

  try {

    const { error } = await supabase

      .from('queue')

      .update({ admin_message: message })

      .eq('id', queueItemId);

    

    if (error) return;

  } catch (err) {

    return;

  }

};

 

const transferSelectedToToday = async (selectedIds: string[]) => {

  try {

    // 

    const unfinishedStatuses = [QueueStatus.WAITING, QueueStatus.READY, QueueStatus.KEY_ISSUED];

    

    const unfinishedItems = queue.filter(item => 

      selectedIds.includes(item.id) && unfinishedStatuses.includes(item.status)

    );

    

    if (unfinishedItems.length === 0) {

      return;

    }

    

    // 

    const today = new Date();

    const todayStr = format(today, 'yyyy-MM-dd');

    

    if (!isSupabaseConfigured) {

      // 

      // 

      const targetDate = todayStr;

      const existingOnDate = queue.filter(item => item.queue_date === targetDate);

      const minPosition = existingOnDate.length > 0 ? Math.min(...existingOnDate.map(item => item.queue_position)) : 0;



      const updatedQueue = queue.map(item => {

        const index = unfinishedItems.findIndex(u => u.id === item.id);

        if (index !== -1) {

          return { 

            ...item, 

            queue_date: targetDate, 

            scheduled_for_date: targetDate,

            queue_position: minPosition - 10000 - index  // 

          };

        }

        return item;

      });

      setQueue(updatedQueue);

      save_local_queue(updatedQueue);

      return;

    } else {

      if (supabase) {

        // 

        // 

        for (let i = 0; i < unfinishedItems.length; i++) {

          const item = unfinishedItems[i];

          await supabase

            .from('queue')

            .update({ 

              queue_date: todayStr,

              scheduled_for_date: todayStr

            })

            .eq('id', item.id);

        }

        

        // 

        const { data: allOnDate, error: fetchError } = await supabase

          .rpc('get_queue_public', {

            p_date: todayStr

          });



        if (fetchError) {

          console.error('Error fetching queue for date:', fetchError);

          return;

        }



        if (allOnDate) {

          const transferred = allOnDate.filter((item: QueueItem) => unfinishedItems.some(u => u.id === item.id));

          const existing = allOnDate.filter((item: QueueItem) => !unfinishedItems.some(u => u.id === item.id));

          

          // 

          transferred.sort((a: QueueItem, b: QueueItem) => unfinishedItems.findIndex(u => u.id === a.id) - unfinishedItems.findIndex(u => u.id === b.id));

          

          // 

          existing.sort((a: QueueItem, b: QueueItem) => a.queue_position - b.queue_position);

          

          // 

          const newOrder = [...existing, ...transferred];

          

          // 

          for (let k = 0; k < newOrder.length; k++) {

            await supabase

              .from('queue')

              .update({ queue_position: k + 1 })

              .eq('id', newOrder[k].id);

          }

        }



        await fetchQueue();  

      }

    }

  } catch (err: any) {

    return;

  }

};



// Clear local session after logout options are applied.

const transferSelectedToDate = async (selectedIds: string[], targetDateStr: string) => {

  try {

    const unfinishedStatuses = [QueueStatus.WAITING, QueueStatus.READY, QueueStatus.KEY_ISSUED];

    

    const unfinishedItems = queue.filter(item => 

      selectedIds.includes(item.id) && unfinishedStatuses.includes(item.status)

    );

    

    if (unfinishedItems.length === 0) {

      return;

    }

    

    if (!isSupabaseConfigured || !supabase) {

      return;

    }

    



    for (let i = 0; i < unfinishedItems.length; i++) {

      const item = unfinishedItems[i];

      await supabase

        .from('queue')

        .update({ 

          queue_date: targetDateStr,

          scheduled_for_date: targetDateStr

        })

        .eq('id', item.id);

    }

    



    const { data: allOnDate, error: fetchError } = await supabase

      .rpc('get_queue_public', {

        p_date: targetDateStr

      });



    if (fetchError) {

      console.error('Error fetching queue for date:', fetchError);

      return;

    }



    if (allOnDate) {

      const transferred = allOnDate.filter((item: QueueItem) => unfinishedItems.some(u => u.id === item.id));

      const existing = allOnDate.filter((item: QueueItem) => !unfinishedItems.some(u => u.id === item.id));

      

      transferred.sort((a: QueueItem, b: QueueItem) => unfinishedItems.findIndex(u => u.id === a.id) - unfinishedItems.findIndex(u => u.id === b.id));

      existing.sort((a: QueueItem, b: QueueItem) => a.queue_position - b.queue_position);

      

      const newOrder = [...existing, ...transferred];

      

      for (let k = 0; k < newOrder.length; k++) {

        await supabase

          .from('queue')

          .update({ queue_position: k + 1 })

          .eq('id', newOrder[k].id);

      }

    }



    await fetchQueue();

  } catch (err: any) {

    return;

  }

};





const formatDateForAlert = (dateStr: string) => {

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  

  const targetDate = new Date(dateStr + 'T00:00:00');

  targetDate.setHours(0, 0, 0, 0);

  

  const daysDiff = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  

  if (daysDiff === 0) return 'сегодня';

  if (daysDiff === 1) return 'завтра';

  if (daysDiff === -1) return 'вчера';

  if (daysDiff > 0) return `через ${daysDiff} дн.`;

  return `${Math.abs(daysDiff)} дн. назад`;

};



// 

const updateQueueItemDetails = async (

  queueId: string, 

  updates: {

    wash_count?: number;

    coupons_used?: number;

    payment_type?: string;

    expected_finish_at?: string;

    chosen_date?: string;

  }

) => {

  if (!isAdmin && !isSuperAdmin) return;

  if (!supabase) return;



  const item = queue.find(q => q.id === queueId);

  if (!item) {

    return;

  }



  if (item.status === QueueStatus.DONE) {

    return;

  }



  try {

    const token = await getFreshToken();



    const response = await fetch('/api/admin/queue/update-details', {

      method: 'POST',

      headers: {

        'Content-Type': 'application/json',

        'Authorization': `Bearer ${token}`,

      },

      body: JSON.stringify({ queue_item_id: queueId, updates }),

    });



    const result = await response.json();



    if (!response.ok) {

      throw new Error(result.error || 'Failed to update queue');

    }



    await fetchQueue();





    // if (updates.expected_finish_at && user) {

    //   await sendTelegramNotification({

    //     type: 'updated',

    //     student_id: user.student_id,

    //     full_name: item.full_name,

    //     expected_finish_at: updates.expected_finish_at,

    //   });

    // }

  } catch (error) {

    throw error;

  }

};

const changeQueuePosition = async (queueId: string, direction: 'up' | 'down') => {

  if (!supabase) return;

  

  try {

    if (!isAdmin) {

      return;

    }



    const itemToMove = queue.find(item => item.id === queueId);

    if (!itemToMove) {

      return;

    }

    

    const sameDayItems = queue

      .filter(item => item.queue_date === itemToMove.queue_date && item.scheduled_for_date === itemToMove.scheduled_for_date)

      .sort((a, b) => a.queue_position - b.queue_position);

    

    const currentIndex = sameDayItems.findIndex(item => item.id === queueId);

    

    // Clear local session after logout options are applied.

    const token = await getFreshToken();

    

    if (direction === 'up' && currentIndex > 0) {

      const prevItem = sameDayItems[currentIndex - 1];

      

      // Clear local session after logout options are applied.

      const response = await fetch('/api/admin/queue/swap-position', {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'Authorization': `Bearer ${token}`,

        },

        body: JSON.stringify({ 

          a_id: itemToMove.id, 

          b_id: prevItem.id 

        }),

      });



      const result = await response.json();

      if (!response.ok) {

        throw new Error(result.error || 'Ошибка смены позиции');

      }

      

    } else if (direction === 'down' && currentIndex < sameDayItems.length - 1) {

      const nextItem = sameDayItems[currentIndex + 1];

      

      // Clear local session after logout options are applied.

      const response = await fetch('/api/admin/queue/swap-position', {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          'Authorization': `Bearer ${token}`,

        },

        body: JSON.stringify({ 

          a_id: itemToMove.id, 

          b_id: nextItem.id 

        }),

      });



      const result = await response.json();

      if (!response.ok) {

        throw new Error(result.error || 'Ошибка смены позиции');

      }

    }

    

    await fetchQueue();

  } catch (err: any) {

    return;

  }

};



// Clear local session after logout options are applied.







  const value = {

    user,

    setUser,

    students,

    queue,
    machineState,
    history,
    historyTotalCount,
    historyHasMore,
    refreshMyRole,
    transferSelectedToToday,

    transferSelectedToDate,

    changeQueuePosition,

    registerStudent,

    loginStudent,

    // Clear local session after logout options are applied.

    logoutStudent,

    resetStudentRegistration,

    linkTelegram,

    joinQueue,

    leaveQueue,

    optimisticUpdateQueueItem,

    updateQueueItem,

    sendAdminMessage,

    setQueueStatus,

    fetchQueue,

    setReturnKeyAlert,

    startWashing,

    cancelWashing,

    markDone,

    startNext,

    clearQueue,

    removeFromQueue,

    clearCompletedQueue,

    clearOldQueues,

    clearStuckQueues,

    banStudent,

    unbanStudent,

    isAdmin,

    isSuperAdmin,
    isCleanupAdmin,

    needsClaim,

    setIsAdmin,

    setIsSuperAdmin,
    setIsCleanupAdmin,

    setIsJoining,

    setNeedsClaim,

    getUserQueueItem,

    isLoading,
    authReady,

    isNewUser,

    isJoining,

    setIsNewUser,

    addStudent,

   updateStudent,

   deleteStudent,

   adminAddToQueue,

   updateQueueItemDetails,

   updateQueueEndTime,              

   toggleAdminStatus,

   toggleSuperAdminStatus,

   loadStudents,

    fetchHistory,
    loadMoreHistory,

  };


  return <LaundryContext.Provider value={value}>{children}</LaundryContext.Provider>;

}



export function useLaundry() {

  const context = useContext(LaundryContext);

  if (context === undefined) {

    throw new Error('useLaundry must be used within a LaundryProvider');

  }

  return context;

}









