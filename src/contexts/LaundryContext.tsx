"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is configured
const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_KEY && !!supabase;

// ========================================
// Ожидание стабильной сессии после auth
// ========================================
async function waitForSession(): Promise<boolean> {
  if (!supabase) return false;
  
  // Ждём пока session стабильно доступна (до 5 попыток)
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      console.log('✅ Session established after', i + 1, 'attempts');
      return true;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  
  console.error('❌ Session not established after 5 attempts');
  return false;
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
  transferSelectedToToday: (selectedIds: string[]) => Promise<void>;
  transferSelectedToDate: (selectedIds: string[], targetDateStr: string) => Promise<void>;
  changeQueuePosition: (queueId: string, direction: 'up' | 'down') => Promise<void>;
  registerStudent: (studentId: string, password: string) => Promise<User | null>;
  loginStudent: (studentId: string, password: string) => Promise<User | null>;
  // ❌ УДАЛЕНО: adminLogin - админы входят через loginStudent
  logoutStudent: () => void;
  resetStudentRegistration: (studentId: string) => Promise<void>;
  linkTelegram: (telegramCode: string) => Promise<{ success: boolean; error?: string }>;
  joinQueue: (name: string, room?: string, washCount?: number, couponsUsed?: number, expectedFinishAt?: string, chosenDate?: string) => Promise<void>;
  leaveQueue: (queueItemId: string) => void;
  updateQueueItem: (queueItemId: string, updates: Partial<QueueItem>) => void;
  sendAdminMessage: (queueItemId: string, message: string) => Promise<void>;
  setQueueStatus: (queueItemId: string, status: QueueStatus) => Promise<void>;
  setReturnKeyAlert: (queueItemId: string, alert: boolean) => Promise<void>;
  startWashing: (queueItemId: string) => void;
  cancelWashing: (queueItemId: string) => void;
  markDone: (queueItemId: string) => void;
  startNext: () => void;
  clearQueue: () => void;
  removeFromQueue: (queueItemId: string) => Promise<void>;
  clearCompletedQueue: () => Promise<void>;
  clearOldQueues: () => Promise<void>;
  clearStuckQueues: () => Promise<void>;
  banStudent: (studentId: string, reason?: string) => Promise<void>;
  unbanStudent: (studentId: string) => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  needsClaim: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  setIsSuperAdmin: (isSuperAdmin: boolean) => void;
  setIsJoining: (value: boolean) => void;
  setNeedsClaim: (value: boolean) => void;
  getUserQueueItem: () => QueueItem | undefined;
  isLoading: boolean;
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
  // ✅ User стартует null, НЕ из localStorage!
  // refreshMyRole() установит правильное значение из Supabase Auth session
  const [user, setUser] = useState<User | null>(null);
  
  // ✅ Права определяются ТОЛЬКО из Supabase Auth session + БД
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [machineState, setMachineState] = useState<MachineState>({
    status: MachineStatus.IDLE,
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('laundryIsNewUser') === 'true';
    }
    return false;
  });
  const [isJoining, setIsJoining] = useState(false);
  const [needsClaim, setNeedsClaim] = useState<boolean>(false);

  // ✅ ПРИ СТАРТЕ: Синхронизация прав с Supabase Auth
  useEffect(() => {
    refreshMyRole();
  }, []);

  // ✅ ПРИ ИЗМЕНЕНИИ AUTH: Обновляем права
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state changed:', event);
      refreshMyRole();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [isSupabaseConfigured, supabase]);

  // Load data and setup subscriptions on mount
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Local fallback
      setQueue(get_local_queue());
      setMachineState(get_local_machine_state());
      setHistory(get_local_history());
      loadStudents();
      setIsLoading(false);
      return;
    }

    if (!supabase) {
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
      .on("postgres_changes", { event: "*", schema: "public", table: "machine_state" }, fetchMachineState)
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
          setMachineState(payload.new as MachineState);
        }
      )
      .subscribe();
    subs.push(machineStateLiveSub);

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
            console.log('🔔 Telegram realtime update received:', { newChatId, currentChatId: user.telegram_chat_id });

            // Обновляем если новый chat_id отличается от текущего
            if (newChatId !== undefined && newChatId !== user.telegram_chat_id) {
              const updatedUser = { ...user, telegram_chat_id: newChatId };
              setUser(updatedUser);

              if (typeof window !== "undefined") {
                localStorage.setItem("laundryUser", JSON.stringify(updatedUser));
              }
              
              console.log('✅ User telegram_chat_id updated in state and localStorage');
            }
          }
        )
        .subscribe();

    subs.push(telegramSub);
  }

  // --- CLEANUP ---
  return () => {
    subs.forEach((s) => s.unsubscribe());
  };
}, [isSupabaseConfigured, supabase, user?.student_id]);


  // Save user to localStorage when changed (только для UI, не права)
  useEffect(() => {
    if (user) {
      localStorage.setItem('laundryUser', JSON.stringify(user));
    }
  }, [user]);
  
  // Save isNewUser status to localStorage
  useEffect(() => {
    localStorage.setItem('laundryIsNewUser', isNewUser.toString());
  }, [isNewUser]);

  // ✅ Автопривязка записей очереди при логине студента (через RPC)
  const claimMyQueueItems = async () => {
    if (!supabase) return;

    try {
      const { error } = await supabase.rpc('claim_my_queue_items');

      if (error) {
        console.error('Error claiming queue items:', error);
      } else {
        console.log('✅ Claimed queue items successfully');
        // Обновляем очередь чтобы увидеть изменения
        await fetchQueue();
      }
    } catch (error) {
      console.error('Error in claimMyQueueItems:', error);
    }
  };

  // ✅ ЕДИНАЯ ФУНКЦИЯ: Синхронизация прав с Supabase Auth session
  const refreshMyRole = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;

      if (!uid) {
        console.log('🔓 No active session');
        setUser(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }

      console.log('🔐 Active session found, fetching user data...');
      const { data: me, error } = await supabase
        .from("students")
        .select("id, first_name, last_name, full_name, room, avatar_type, telegram_chat_id, is_admin, is_super_admin, can_view_students, is_banned, ban_reason")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching user data:', error);
        setUser(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }

      if (!me) {
        console.log('⚠️ User authenticated but not in students table');
        setUser({ id: uid } as any);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        return;
      }

      console.log('✅ User data loaded:', { full_name: me.full_name, is_admin: me.is_admin, is_super_admin: me.is_super_admin });

      if (me.is_banned) {
        const banReason = me.ban_reason || "Не указана";
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "banNotice",
            `Вы забанены. Причина: ${banReason}. Обратитесь к администратору.`
          );
        }

        await supabase.auth.signOut();
        setUser(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
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
        avatar_type: me.avatar_type || 'default',

        // 🔥 Добавляем эти поля в объект пользователя
        is_admin: me.is_admin || false,
        is_super_admin: me.is_super_admin || false,
        can_view_students: me.can_view_students || false,
      };

      setUser(newUser);
      setIsAdmin(!!me.is_admin);
      setIsSuperAdmin(!!me.is_super_admin);

      // ✅ Сохраняем только user, НЕ права (права из refreshMyRole)
      if (typeof window !== "undefined") {
        localStorage.setItem("laundryUser", JSON.stringify(newUser));
      }

      // 🔄 Автопривязка записей очереди для залогиненного студента
      if (uid && me.id) {
        claimMyQueueItems();
      }

      // Сохраняем только user в localStorage (для UI), НЕ права
      if (typeof window !== 'undefined') {
        localStorage.setItem('laundryUser', JSON.stringify(newUser));
      }
    } catch (error) {
      console.error('❌ Error in refreshMyRole:', error);
      setUser(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
    }
  };

  // Load students from Supabase
  const loadStudents = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    const client = supabase;
    const isAdminUser = !!(isAdmin || isSuperAdmin);
    const canViewStudents = !!(isAdminUser || user?.can_view_students);

    try {
      if (isAdminUser) {
        try {
          const { data, error } = await client
            .from("students")
            .select(
              "id, first_name, last_name, middle_name, full_name, room, avatar_type, telegram_chat_id, is_admin, is_super_admin, can_view_students, is_banned, ban_reason, user_id, is_registered, created_at, key_issued, key_lost"
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
              can_view_students: !!item.can_view_students,
              telegram_chat_id: item.telegram_chat_id || undefined,
              key_issued: !!item.key_issued,
              key_lost: !!item.key_lost,
              avatar: item.avatar_type || "default",
              avatar_type: item.avatar_type || "default",
            };
          });

          setStudents(students);
          return;
        } catch (error) {
          const { data, error: legacyError } = await client
            .from("students")
            .select(
              "id, first_name, last_name, middle_name, full_name, room, avatar_type, telegram_chat_id, is_admin, is_super_admin, can_view_students, is_banned, ban_reason, user_id, is_registered, created_at"
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
              can_view_students: !!item.can_view_students,
              telegram_chat_id: item.telegram_chat_id || undefined,
              key_issued: false,
              key_lost: false,
              avatar: item.avatar_type || "default",
              avatar_type: item.avatar_type || "default",
            };
          });

          setStudents(students);
          return;
        }
      }

      if (canViewStudents) {
        const { data: { session } } = await client.auth.getSession();
        if (session?.access_token) {
          const response = await fetch("/api/students/list", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
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
                can_view_students: !!item.can_view_students,
                telegram_chat_id: item.telegram_chat_id || undefined,
                key_issued: !!item.key_issued,
                key_lost: !!item.key_lost,
                avatar: item.avatar_type || "default",
                avatar_type: item.avatar_type || "default",
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
          .select("id, full_name, room, avatar_type, is_registered, is_banned, key_issued, key_lost")
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
          user_id: undefined,
          is_admin: false,
          is_super_admin: false,
          can_view_students: false,
          telegram_chat_id: undefined,
          key_issued: !!item.key_issued,
          key_lost: !!item.key_lost,
          avatar: item.avatar_type || "default",
        }));

        setStudents(students);
        return;
      } catch (error) {
        const { data, error: legacyError } = await client
          .from("students_login_list")
          .select("id, full_name, room, avatar_type, is_registered")
          .order("full_name", { ascending: true });

        if (legacyError) throw legacyError;

        const students: Student[] = (data || []).map((item: any): Student => ({
          ...item,
          first_name: item.full_name?.split(" ")[0] || "",
          last_name: item.full_name?.split(" ").slice(1).join(" ") || "",
          middle_name: "",
          is_registered: item.is_registered || false,
          created_at: new Date().toISOString(),
          is_banned: false,
          user_id: undefined,
          is_admin: false,
          is_super_admin: false,
          can_view_students: false,
          telegram_chat_id: undefined,
          key_issued: false,
          key_lost: false,
          avatar: item.avatar_type || "default",
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
  }, [isAdmin, isSuperAdmin, user?.can_view_students]);
  

 

  // Универсальный хелпер: формирует локального пользователя и статусы
const finalizeUserSession = (
  authUserId: string,
  student: Student,
  isNew: boolean
): User => {
  const isAdminUser = student.is_admin || false;
  const isSuperAdminUser = student.is_super_admin || false;
  const canViewStudents = student.can_view_students || false;

  const newUser: User = {
    id: authUserId,
    student_id: student.id,
    first_name: student.first_name,
    last_name: student.last_name,
    full_name: student.full_name,
    room: student.room || undefined,
    telegram_chat_id: student.telegram_chat_id || undefined,
    avatar_type: student.avatar_type || "default",

    // 🔥 Добавляем эти поля в объект пользователя
    is_admin: isAdminUser,
    is_super_admin: isSuperAdminUser,
    can_view_students: canViewStudents,
  };

  setUser(newUser);
  setIsNewUser(isNew);

  setIsAdmin(isAdminUser);
  setIsSuperAdmin(isSuperAdminUser);

  // ✅ Сохраняем только user, НЕ права (права из refreshMyRole)
  if (typeof window !== "undefined") {
    localStorage.setItem("laundryUser", JSON.stringify(newUser));
  }

  return newUser;
};

    // ========================================
// ФУНКЦИЯ РЕГИСТРАЦИИ
// ========================================

// ========================================
// ФУНКЦИЯ РЕГИСТРАЦИИ (НОВАЯ, ФИКС)
// ========================================

const registerStudent = async (
  studentId: string,
  password: string
): Promise<User | null> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase не настроен");
  }

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

    // Проверка длины пароля
    if (password.length < 6) {
      throw new Error("Пароль должен быть не менее 6 символов");
    }

    // 1) Получаем auth_email из БД (обязательное поле после миграции)
    const { data: studentData, error: emailErr } = await supabase
      .from('students')
      .select('auth_email')
      .eq('id', studentId)
      .single();

    if (emailErr) throw emailErr;

    const authEmail = studentData?.auth_email;
    if (!authEmail) throw new Error("Student auth_email is missing (check trigger)");

    // 2) Создаём auth user
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
    let userAlreadyExisted = false;

    if (signUpErr) {
      console.error("SignUp error:", signUpErr);
      const msg = signUpErr.message?.toLowerCase() || "";
      
      // Если пользователь уже существует - выбрасываем специальную ошибку
      if (msg.includes("already registered") || msg.includes("user already registered")) {
        console.log("User already exists - showing login form");
        const error = new Error("Аккаунт уже существует. Войдите в систему.") as any;
        error.code = "USER_ALREADY_REGISTERED";
        throw error;
      } else {
        throw new Error(`Ошибка регистрации: ${signUpErr.message}`);
      }
    }

    // Если user null, но нет ошибки - возможно включен email confirmation
    // Пробуем войти с этими же credentials
    if (!authUser && !signUpErr) {
      console.log("User is null after signUp (email confirmation?), trying to sign in...");
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

    // Проверяем что пользователь создан
    if (!authUser) {
      console.error("No auth user after all attempts");
      throw new Error("Не удалось создать пользователя. Проверьте настройки Supabase Auth (отключите Email Confirmation).");
    }

    console.log("Auth user created/retrieved:", authUser.id);

    // 2) Ждём стабильную сессию
    const sessionReady = await waitForSession();
    if (!sessionReady) {
      throw new Error('Сессия не установлена. Попробуйте войти снова.');
    }

    // 3) ВСЕГДА вызываем backend API для установки user_id
    // Это важно даже если пользователь уже существовал в Auth, но не был связан с students
    console.log("Linking auth user to student record...");
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

    // 4) Загрузка обновлённого студента (теперь безопасно - сессия есть)
    const { data: updatedStudent } = await supabase
      .from("students")
      .select("id, first_name, last_name, full_name, room, avatar_type, telegram_chat_id, is_admin, is_super_admin, can_view_students, is_banned, ban_reason, user_id, is_registered, created_at")
      .eq("id", studentId)
      .single();

    if (!updatedStudent) throw new Error("Ошибка загрузки данных студента");

    // 5) Финализируем
    return finalizeUserSession(authUser.id, updatedStudent, true);
  } catch (error) {
    throw error;
  }
};


// ========================================
// loginStudent — безопасная версия
// ========================================

const loginStudent = async (
  studentId: string,
  password: string
): Promise<User | null> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase не настроен");
  }

  try {
    // 1) Получаем auth_email из БД (обязательное поле после миграции)
    const { data: studentData, error: emailErr } = await supabase
      .from('students')
      .select('auth_email')
      .eq('id', studentId)
      .single();

    if (emailErr) throw emailErr;

    const authEmail = studentData?.auth_email;
    if (!authEmail) throw new Error("Student auth_email is missing (check trigger)");

    // 2) Логин через Supabase Auth
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

    // 3) Ждём стабильную сессию
    const sessionReady = await waitForSession();
    if (!sessionReady) {
      throw new Error('Сессия не установлена. Попробуйте войти снова.');
    }

    // 4) Только ПОСЛЕ логина и установки сессии читаем students по user_id (RLS безопасно)
    const { data: updatedStudent, error: studentError } = await supabase
      .from("students")
      .select("id, first_name, last_name, full_name, room, avatar_type, telegram_chat_id, is_admin, is_super_admin, can_view_students, is_banned, ban_reason, user_id, is_registered, created_at")
      .eq("user_id", authUser.id)
      .maybeSingle();
    
    if (studentError) throw studentError;
    
    // Если студент не найден по user_id - значит нужно сделать claim
    if (!updatedStudent) {
      // Выходим и показываем экран claim
      setNeedsClaim(true);
      return null;
    }

    // 4) Проверяем бан (только после логина)
    if (updatedStudent.is_banned) {
      const banReason = updatedStudent.ban_reason || "Не указана";
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "banNotice",
          `Вы забанены. Причина: ${banReason}. Обратитесь к администратору.`
        );
      }
      await supabase.auth.signOut();
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
  const logoutStudent = async () => {
    if (supabase) {
      await supabase.auth.signOut(); // ✅ Это вызовет onAuthStateChange → refreshMyRole
    }
    setUser(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    setIsNewUser(false);
    localStorage.removeItem('laundryUser');
    localStorage.removeItem('laundryIsNewUser');
    // ✅ Права больше не хранятся в localStorage
  };


// Admin: Reset student registration
const resetStudentRegistration = async (studentId: string) => {
  if (!isAdmin && !isSuperAdmin) {
    throw new Error("Недостаточно прав для сброса регистрации");
  }
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase не настроен");

  // берём JWT текущей сессии, чтобы сервер мог проверить права
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

  // если сбросили себя — разлогин
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

      // Проверяем что данные обновились в базе
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
      
      try {
        // ✅ Используем RPC для получения активной очереди на все даты
        await supabase.rpc('cleanup_coupon_queue_for_today');
        const { data, error } = await supabase.rpc('get_queue_active');
        
        if (error) throw error;
        setQueue(data || []);
        // Also update local storage as backup
        save_local_queue(data || []);
      } catch (error: any) {
        throw error;
      }
    };
  
    // Fetch machine state from Supabase or local storage
    const fetchMachineState = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setMachineState(get_local_machine_state());
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('machine_state')
          .select('*')
          .order('id', { ascending: false })  
          .limit(1)  
          .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        setMachineState(data || { status: MachineStatus.IDLE });
        // Also update local storage as backup
        save_local_machine_state(data || { status: MachineStatus.IDLE });
      } catch (error: any) {
        throw error;
      }
    };
  
    // Fetch history from Supabase or local storage
    const fetchHistory = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setHistory(get_local_history());
        return;
      }
      
      try {
        // Получаем историю (с fallback для старой схемы)
        let historyData: any[] = [];
        try {
          const { data, error } = await supabase
            .from('history')
            .select('id, user_id, full_name, room, started_at, finished_at, ready_at, key_issued_at, washing_started_at, washing_finished_at, return_requested_at, wash_count, coupons_used, payment_type')
            .order('finished_at', { ascending: false })
            .limit(100);
          
          if (error) throw error;
          historyData = data || [];
        } catch (err) {
          const { data, error } = await supabase
            .from('history')
            .select('id, user_id, full_name, room, started_at, finished_at, ready_at, key_issued_at, washing_started_at, return_requested_at')
            .order('finished_at', { ascending: false })
            .limit(100);
          
          if (error) throw error;
          historyData = data || [];
        }
        
        // Получаем уникальные user_id
        const userIds = [...new Set((historyData || []).map((item: any) => item.user_id))];
        
        // Получаем аватары для всех пользователей (по user_id, не по id!)
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('user_id, avatar_type')
          .in('user_id', userIds);
        
        // Создаем мапу user_id -> avatar_type
        const avatarMap = new Map(
          (studentsData || []).map((student: any) => [student.user_id, student.avatar_type])
        );
        
        // Добавляем avatar_type к каждой записи истории
        const historyWithAvatars = (historyData || []).map((item: any) => ({
          ...item,
          avatar_type: avatarMap.get(item.user_id) || 'default'
        }));
        
        setHistory(historyWithAvatars);
        save_local_history(historyWithAvatars);
      } catch (error: any) {
        // Fall back to local storage
        setHistory(get_local_history());
      }
    };

  // ФУНКЦИЯ 1: joinQueue ( 
// ========================================
// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ
// ========================================

const joinQueue = async (
  name: string,
  room?: string,
  washCount: number = 1,
  couponsUsed: number = 0,
  expectedFinishAt?: string,
  chosenDate?: string
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

  // ✅ ИСПРАВЛЕНИЕ: Разделить логику для новых и существующих пользователей
  if (!isNewUser) {
    // 🔒 СТРОГАЯ ПРОВЕРКА для существующих пользователей
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
          localStorage.setItem(
            "banNotice",
            `Вы забанены. Причина: ${banReason}. Обратитесь к администратору.`
          );
        }
        await logoutStudent();
        return;
      }
    } catch (err) {
      return;
    }
  } else {
    // 🆕 ПРОСТАЯ ПРОВЕРКА для новых пользователей (только бан)
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('is_banned, ban_reason')
        .eq('id', user.student_id)
        .single();
      
      if (studentData?.is_banned) {
        const banReason = studentData.ban_reason || 'Не указана';
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "banNotice",
            `Вы забанены. Причина: ${banReason}. Обратитесь к администратору.`
          );
        }
        await logoutStudent();
        return;
      }
    } catch (err) {
      return;
    }
  }

  if (isJoining) {
    return;
  }

  // Определяем целевую дату
  const todayISO = new Date().toISOString().slice(0, 10);
  const targetDate = chosenDate || todayISO;
  const safeCouponsUsed = Math.max(0, Math.min(couponsUsed, washCount));
  const derivedPaymentType =
    safeCouponsUsed === 0 ? 'money' : safeCouponsUsed >= washCount ? 'coupon' : 'both';

  // Проверяем по student_id на эту дату через RPC
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
    // Получаем следующую позицию через RPC
    const { data: nextPosData, error: posErr } = await supabase
      .rpc('get_next_queue_position', {
        p_date: targetDate
      });

    if (posErr) {
      console.error('Error getting next position:', posErr);
      return;
    }

    const nextPos = nextPosData || 1;

    // 🔑 Получаем сессию для определения user_id
    const { data: authData } = await supabase.auth.getSession();
    const currentUserId = authData.session?.user?.id || null;

    const newItem = {
      id: crypto.randomUUID(),
      // ✅ Всегда пишем student_id
      student_id: user.student_id,
      // 🔑 ВАЖНО: если студент залогинен — сразу привязываем, иначе null (для админа)
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
      avatar_type: user.avatar_type || 'default',
    };

    const { error } = await supabase.from('queue').insert(newItem);

    if (error) {
      if (error.code === '23505') {
        return;
      }
      return;
    }

    if (safeCouponsUsed > 0) {
      const { error: reserveError } = await supabase.rpc('reserve_coupons_for_queue', {
        p_queue_id: newItem.id,
        p_count: safeCouponsUsed,
      });

      if (reserveError) {
        await supabase.from('queue').delete().eq('id', newItem.id);
        throw new Error(reserveError.message || 'Не удалось забронировать купоны');
      }
    }

    // СБРОС ФЛАГА: После первого успешного действия новый пользователь становится обычным
    if (isNewUser) {
      setIsNewUser(false);
      // localStorage будет обновлен в useEffect
    }

    await sendTelegramNotification({
      type: 'joined',
      student_id: user.student_id,
      full_name: name,
      room,
      wash_count: washCount,
      payment_type: derivedPaymentType,
      queue_length: queue.length + 1,
      expected_finish_at: expectedFinishAt,
    });

    await fetchQueue();

  } catch (err: any) {
    return;
  } finally {
    setTimeout(() => setIsJoining(false), 1000);
  }
};

  // Вспомогательная функция для получения свежего JWT токена
  const getFreshToken = async (): Promise<string> => {
    if (!supabase) throw new Error('Supabase not configured');
    
    // Всегда обновляем сессию для получения свежего токена
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error || !session?.access_token) {
      console.error('Failed to refresh session:', error);
      // Fallback: пробуем получить текущую сессию
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        throw new Error('No active session');
      }
      return currentSession.access_token;
    }
    
    return session.access_token;
  };

  // Admin: Изменить статус записи в очереди
  const setQueueStatus = async (queueItemId: string, status: QueueStatus) => {
    if (!isAdmin && !isSuperAdmin) return;
    
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // ✅ Получаем свежий JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
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
        throw new Error(result.error || 'Ошибка изменения статуса');
      }

      await fetchQueue();
    } catch (error) {
      throw error;
    }
  };


  const adminAddToQueue = async (
    studentRoom?: string,
    washCount: number = 1,
    couponsUsed: number = 0,
    expectedFinishAt?: string,
    chosenDate?: string,
    studentId?: string
  ) => {
    const student = students.find(s => s.id === studentId);
    if (!student) {
      return;
    }
  
    if (!isAdmin) {
      return;
    }
  
    const todayISO = new Date().toISOString().slice(0, 10);
    const targetDate = chosenDate || todayISO;
  
    const response = await fetch("/api/admin/add-to-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: student.id,
        admin_student_id: user?.student_id,
        full_name: student.full_name,
        room: studentRoom || student.room,
        wash_count: washCount,
        coupons_used: couponsUsed,
        expected_finish_at: expectedFinishAt,
        scheduled_for_date: targetDate,
        avatar_type: student.avatar_type,
      }),
    });
  
    const res = await response.json();
  
    if (!response.ok) {
      return;
    }
  
    await fetchQueue();
  };
  

  // Admin: Set return key alert
  const setReturnKeyAlert = async (queueItemId: string, alert: boolean) => {
    if (!isAdmin) return;
    
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // ✅ Получаем JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
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
        throw new Error(result.error || 'Ошибка установки алерта');
      }

      if (alert) {
        // Trigger alert and Telegram notification
        sendTelegramNotification({ type: 'admin_return_key' });
      }
    } catch (error) {
      throw error;
    }
  };

 // Admin: Start washing for a queue item
const startWashing = async (queueItemId: string) => {
  if (!isAdmin) {
    return;
  }
  
  if (!isSupabaseConfigured || !supabase) {
    // Use local storage fallback
    start_local_washing(queueItemId);
    fetchQueue();
    fetchMachineState();
    return;
  }
  
  try {
    // ✅ Получаем свежий JWT
    const token = await getFreshToken();

    // ✅ Вызываем API route с JWT
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
      throw new Error(result.error || 'Ошибка запуска стирки');
    }

    await fetchQueue();
    await fetchMachineState();
  } catch (error) {
    // Fallback to local storage on error
    start_local_washing(queueItemId);
    fetchQueue();
    fetchMachineState();
  }
};
  // Admin: Mark washing as done
  const markDone = async (queueItemId: string) => {
    if (!isAdmin) return;
    
    const queueItem = queue.find(item => item.id === queueItemId);
    if (!queueItem) return;
    
    // ✅ УБРАНА проверка статуса - можно завершить любого
    
    if (!isSupabaseConfigured || !supabase) {
      mark_local_done();
      fetchQueue();
      fetchMachineState();
      fetchHistory();
      return;
    }
    
    try {
      // ✅ Получаем JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
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

      await fetchQueue();
      await fetchMachineState();
      await fetchHistory();
    } catch (error) {
      throw error;
    }
  };

  // Admin: Cancel washing (return to queue)
  const cancelWashing = async (queueItemId: string) => {
    if (!isAdmin) return;
    
    const queueItem = queue.find(item => item.id === queueItemId);
    if (!queueItem || queueItem.status !== QueueStatus.WASHING) return;
    
    if (!isSupabaseConfigured || !supabase) {
      // Use local storage fallback
      const queue = get_local_queue();
      const item = queue.find(i => i.id === queueItemId);
      if (item) {
        item.status = QueueStatus.WAITING;
        save_local_queue(queue);
      }
      save_local_machine_state({ status: MachineStatus.IDLE });
      fetchQueue();
      fetchMachineState();
      return;
    }
    
    try {
      // ✅ Получаем JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
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

  // Admin: Start next in queue
  const startNext = async () => {
    if (!isAdmin) return;
    
    if (!isSupabaseConfigured || !supabase) {
      // Use local storage fallback
      start_local_next();
      fetchQueue(); // Refresh queue from local storage
      fetchMachineState(); // Refresh machine state from local storage
      return;
    }
    
    const nextItem = queue.find(item => item.status === QueueStatus.WAITING || item.status === QueueStatus.READY);
    if (nextItem) {
      await startWashing(nextItem.id);
    } else if (!isSupabaseConfigured || !supabase) {
      // Fallback to local storage on error
      start_local_next();
      fetchQueue(); // Refresh queue from local storage
      fetchMachineState(); // Refresh machine state from local storage
    }
  };

  // Admin: Clear queue
  const clearQueue = async () => {
    if (!isAdmin) return;
    
    if (!isSupabaseConfigured || !supabase) {
      clear_local_queue();
      fetchQueue();
      fetchMachineState();
      return;
    }
    
    try {
      // ✅ Получаем JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
      const response = await fetch('/api/admin/queue/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'all' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка очистки очереди');
      }

      await fetchQueue();
      await fetchMachineState();
    } catch (error) {
      clear_local_queue();
      fetchQueue();
      fetchMachineState();
    }
  };

  // Удалить конкретного человека из очереди
  const removeFromQueue = async (queueItemId: string) => {
    if (!isAdmin) return;

    if (!isSupabaseConfigured || !supabase) {
      // Local storage fallback
      const localQueue = get_local_queue();
      const updatedQueue = localQueue.filter(item => item.id !== queueItemId);
      save_local_queue(updatedQueue);
      fetchQueue();
      return;
    }

    try {
      // ✅ Получаем JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
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
    } catch (error) {
      throw error;
    }
  };

  // Очистить завершенных из очереди
  const clearCompletedQueue = async () => {
    if (!isAdmin) return;

    if (!isSupabaseConfigured || !supabase) {
      // Local storage fallback
      const localQueue = get_local_queue();
      const updatedQueue = localQueue.filter(item => item.status !== QueueStatus.DONE);
      save_local_queue(updatedQueue);
      fetchQueue();
      return;
    }

    try {
      // ✅ Получаем JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
      const response = await fetch('/api/admin/queue/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'completed' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка очистки завершенных');
      }

      await fetchQueue();
    } catch (error) {
      throw error;
    }
  };

  // Очистить старую очередь (за предыдущие дни)
  const clearOldQueues = async () => {
    
    
    if (!isAdmin) {
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      // Local storage fallback
      const today = new Date().toISOString().split('T')[0];
      const localQueue = get_local_queue();
      const updatedQueue = localQueue.filter(item => item.scheduled_for_date >= today);
      save_local_queue(updatedQueue);
      fetchQueue();
      return;
    }

    try {
      // ✅ Получаем JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
      const response = await fetch('/api/admin/queue/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'old' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка очистки старой очереди');
      }

      await fetchQueue();
    } catch (error) {
      throw error;
    }
  };

  // Очистить зависшие записи (старше 2 дней, не DONE)
  const clearStuckQueues = async () => {
    if (!isSuperAdmin) return;

    if (!isSupabaseConfigured || !supabase) {
      // Local storage fallback
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const cutoffDate = twoDaysAgo.toISOString().split('T')[0];
      
      const localQueue = get_local_queue();
      const updatedQueue = localQueue.filter(item => 
        item.status === QueueStatus.DONE || item.scheduled_for_date >= cutoffDate
      );
      save_local_queue(updatedQueue);
      fetchQueue();
      return;
    }

    try {
      // ✅ Получаем JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
      const response = await fetch('/api/admin/queue/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: 'stuck' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка очистки зависших');
      }

      await fetchQueue();
    } catch (error) {
      throw error;
    }
  };

  // Забанить студента
  const banStudent = async (studentId: string, reason?: string) => {
    if (!isAdmin) return;
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase не настроен');
    }
  
    try {
      // ✅ Получаем JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
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

      // Если забанили текущего пользователя - принудительно разлогинить
      if (user && user.student_id === studentId) {
        await logoutStudent();
        return;
      }

      await loadStudents();
      await fetchQueue();
    } catch (error) {
      throw error;
    }
  };

  // Разбанить студента
  const unbanStudent = async (studentId: string) => {
    if (!isAdmin) return;
    
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // ✅ Получаем JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
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
    } catch (error) {
      throw error;
    }
  };

  // Добавить нового студента
  const addStudent = async (
    firstName: string,
    lastName: string,
    room?: string,
    middleName?: string
  ) => {
    if (!isAdmin) throw new Error("Недостаточно прав");
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase не настроен");
    }
  
    try {
      // ✅ Получаем JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
      const response = await fetch('/api/admin/add-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          first_name: firstName,
          last_name: lastName || "",
          middle_name: middleName || null,
          room: room || null
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка добавления студента');
      }
  
      await loadStudents();
    } catch (error: any) {
      console.error("Error adding student:", error);
      throw error;
    }
  };
  

  // Обновить данные студента
  const updateStudent = async (
    studentId: string,
    updates: {
      first_name?: string;
      last_name?: string;
      middle_name?: string;
      room?: string;
      can_view_students?: boolean;
      avatar_type?: string;
      key_issued?: boolean;
      key_lost?: boolean;
    }
  ) => {
    if (!isAdmin) return;
  
    if (!isSupabaseConfigured || !supabase) {
      return;
    }
  
    try {
      // ✅ Получаем JWT
      const token = await getFreshToken();

      // ✅ Вызываем API route с JWT
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
        throw new Error(result.error || 'Ошибка обновления');
      }

      await loadStudents();

      // 🔁 Если обновлённый студент — это текущий пользователь, обновляем его сессию
      if (user && user.student_id === studentId && result.student) {
        const updatedStudent = result.student;
        const updatedUser: User = {
          ...user,
          full_name: updatedStudent.full_name,
          room: updatedStudent.room,
          avatar_type: updatedStudent.avatar_type,
          can_view_students: updatedStudent.can_view_students ?? false,
        };

        setUser(updatedUser);
        if (typeof window !== "undefined") {
          localStorage.setItem("laundryUser", JSON.stringify(updatedUser));
        }
      }
    } catch (error: any) {
      throw error;
    }
  };
  

const deleteStudent = async (studentId: string) => {
  if (!isAdmin && !isSuperAdmin) throw new Error("Недостаточно прав");

  try {
    const response = await fetch("/api/admin/delete-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        adminStudentId: user?.student_id
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return;
    }

    await loadStudents();
    await fetchQueue();
  } catch (err) {
    console.error(err);
    return;
  }
};




  // Get current user's queue item if it exists
  const getUserQueueItem = (): QueueItem | undefined => {
    if (!user) return undefined;
    return queue.find(item => item.student_id === user.student_id && 
                     (item.status === QueueStatus.WAITING || item.status === QueueStatus.READY || item.status === QueueStatus.KEY_ISSUED || item.status === QueueStatus.WASHING || item.status === QueueStatus.RETURNING_KEY));
  };

  // Leave the queue
  const leaveQueue = async (queueItemId: string) => {
    if (!user) return;
    
    if (!isSupabaseConfigured || !supabase) {
      remove_from_local_queue(queueItemId, user.id);
      fetchQueue();
      return;
    }
    
    try {
      // ✅ RLS сам проверит через is_queue_owner()
      await supabase.rpc('release_coupons_for_queue', { p_queue_id: queueItemId });
      const { error } = await supabase
        .from('queue')
        .delete()
        .eq('id', queueItemId);

      if (error) {
        console.error('leaveQueue error:', error);
        // Показываем ошибку пользователю
        throw new Error(error.message || 'Не удалось выйти из очереди');
      }

      await fetchQueue();
    } catch (error: any) {
      console.error('leaveQueue error:', error);
      // Можно выбросить ошибку наверх для UI или показать alert
      throw error;
    }
  };

  // ✅ Оптимистичное обновление для мгновенного UI обновления
  const optimisticUpdateQueueItem = (queueItemId: string, updates: Partial<QueueItem>) => {
    setQueue(prev => {
      const newQueue = prev.map(item => 
        item.id === queueItemId ? { ...item, ...updates } : item
      );
      return newQueue;
    });
  };

// Update queue item details (для timestamps и других полей без проверки статуса)
const updateQueueItem = async (queueItemId: string, updates: Partial<QueueItem>) => {
  console.log('updateQueueItem called:', { queueItemId, updates });
  
  if (!isSupabaseConfigured || !supabase) {
    console.log('updateQueueItem: No Supabase, using local storage');
    // Use local storage fallback
    if (user) {
      update_local_queue_item(queueItemId, user.id, updates);
    }
    fetchQueue();
    return;
  }
  
  try {
    console.log('updateQueueItem: Updating database...');
    // ✅ Напрямую обновляем БД (для timestamps и других полей)
    const { data, error } = await supabase
      .from('queue')
      .update(updates)
      .eq('id', queueItemId)
      .select();

    console.log('updateQueueItem result:', { data, error });

    if (error) {
      console.error('updateQueueItem error:', error);
      throw error;
    }

    console.log('updateQueueItem: Success, fetching queue...');
    await fetchQueue();
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
    return;  // Только для WASHING или DONE
  }
  
  await supabase.from('queue').update(updateData).eq('id', queueId);
  await fetchQueue();
};



// ========================================
// АДМИН ФУНКЦИИ
// ========================================

const toggleAdminStatus = async (studentId: string, makeAdmin: boolean) => {
  if (!isSuperAdmin) return;

  try {
    const response = await fetch("/api/admin/toggle-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        makeAdmin,
        adminStudentId: user?.student_id,
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
    const response = await fetch("/api/admin/toggle-super-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        makeSuperAdmin,
        adminStudentId: user?.student_id,
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

// ✅ УНИВЕРСАЛЬНАЯ функция переноса на любую дату
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
    
    // Перенести даты
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
    
    // Пересчитать позиции
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

// Вспомогательная функция для красивого отображения даты
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

  if (item.status !== QueueStatus.WAITING) {
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

    if (updates.expected_finish_at && user) {
      await sendTelegramNotification({
        type: 'updated',
        student_id: user.student_id,
        full_name: item.full_name,
        expected_finish_at: updates.expected_finish_at,
      });
    }
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
    
    // ✅ Получаем JWT
    const token = await getFreshToken();
    
    if (direction === 'up' && currentIndex > 0) {
      const prevItem = sameDayItems[currentIndex - 1];
      
      // ✅ Вызываем API swap-position
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
      
      // ✅ Вызываем API swap-position
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

// ❌ УДАЛЕНО: adminLogin больше не нужен
// Админы входят через обычный loginStudent, права определяются из БД


  const value = {
    user,
    setUser,
    students,
    queue,
    machineState,
    history,
    transferSelectedToToday,
    transferSelectedToDate,
    changeQueuePosition,
    registerStudent,
    loginStudent,
    // ❌ УДАЛЕНО: adminLogin, finalizeUserSession (внутренний хелпер)
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
    needsClaim,
    setIsAdmin,
    setIsSuperAdmin,
    setIsJoining,
    setNeedsClaim,
    getUserQueueItem,
    isLoading,
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
