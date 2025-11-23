"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { User, Student, QueueItem, MachineStatus, QueueStatus, MachineState, HistoryItem } from '@/types';
import { sendTelegramNotification } from '@/lib/telegram';
import { parseISO, format, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { formatInTimeZone } from 'date-fns-tz';
import {
  get_local_queue,
  get_local_machine_state,
  get_local_history,
  save_local_queue,
  save_local_machine_state,
  save_local_history,
  add_to_local_queue,
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

// Generate a user ID for local storage
const generateUserId = () => uuidv4();

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
  adminLogin: (adminKey: string) => Promise<User | null>;
  logoutStudent: () => void;
  resetStudentRegistration: (studentId: string) => Promise<void>;
  linkTelegram: (telegramCode: string) => Promise<{ success: boolean; error?: string }>;
  joinQueue: (name: string, room?: string, washCount?: number, paymentType?: string, expectedFinishAt?: string, chosenDate?: string) => Promise<void>;
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
  setIsAdmin: (isAdmin: boolean) => void;
  setIsSuperAdmin: (isSuperAdmin: boolean) => void;
  getUserQueueItem: () => QueueItem | undefined;
  isLoading: boolean;
  isNewUser: boolean; // 
  setIsNewUser: (isNewUser: boolean) => void; // 
  addStudent: (firstName: string, lastName: string, room?: string) => Promise<void>;
  updateStudent: (studentId: string, updates: { first_name?: string; last_name?: string; middle_name?: string; room?: string; can_view_students?: boolean }) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  updateAdminKey: (newKey: string) => Promise<void>;
  adminAddToQueue: (studentRoom?: string, washCount?: number, paymentType?: string, expectedFinishAt?: string, chosenDate?: string, studentId?: string) => Promise<void>;
  updateQueueItemDetails: (queueId: string, updates: { wash_count?: number; payment_type?: string; expected_finish_at?: string; chosen_date?: string }) => Promise<void>;
  updateQueueEndTime: (queueId: string, endTime: string) => Promise<void>;
  toggleAdminStatus: (studentId: string, makeAdmin: boolean) => Promise<void>;
  toggleSuperAdminStatus: (studentId: string, makeSuperAdmin: boolean) => Promise<void>;
  loadStudents: () => void;
  optimisticUpdateQueueItem: (queueItemId: string, updates: Partial<QueueItem>) => void;
  fetchQueue: () => Promise<void>;
};

const LaundryContext = createContext<LaundryContextType | undefined>(undefined);

export function LaundryProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [machineState, setMachineState] = useState<MachineState>({
    status: MachineStatus.IDLE,
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Initialize user from localStorage
  useEffect(() => {
    
    const storedUser = localStorage.getItem('laundryUser');
    const storedIsAdmin = localStorage.getItem('laundryIsAdmin') === 'true';
    const storedIsSuperAdmin = localStorage.getItem('laundryIsSuperAdmin') === 'true';
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsAdmin(storedIsAdmin);
    setIsSuperAdmin(storedIsSuperAdmin);

    // Initial data fetch
    loadStudents(); // Load students list
    fetchQueue();
    fetchMachineState();
    fetchHistory();
    
    setIsLoading(false);
    
    // Only set up Supabase subscriptions if properly configured
    if (isSupabaseConfigured) {
      try {
        if (!supabase) {
          console.warn(' Supabase client is not available for real-time updates');
          return;
        }
        
        console.log(' Setting up Realtime subscriptions...');
        
        // Subscribe to queue changes
        const queueSubscription = supabase
          .channel('queue-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, payload => {
            console.log('🔄 QUEUE CHANGE DETECTED:', payload);
            fetchQueue();
          })
          .subscribe((status) => {
            console.log('📡 Queue subscription status:', status);
          });
        
        // Subscribe to machine state changes
        const machineStateSubscription = supabase
          .channel('public:machine_state')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'machine_state' }, payload => {
            console.log(' Machine state change detected:', payload);
            fetchMachineState();
          })
          .subscribe((status) => {
            console.log('Machine state subscription status:', status);
          });
        
        // Subscribe to history changes
        const historySubscription = supabase
          .channel('public:history')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'history' }, payload => {
            console.log(' History change detected:', payload);
            fetchHistory();
          })
          .subscribe((status) => {
            console.log('History subscription status:', status);
          });
        
        // Subscribe to machine state updates
        const machineStateChannel = supabase
          .channel('machine_state_updates')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'machine_state'
          }, (payload) => {
            console.log(' Real-time machine state update:', payload);
            setMachineState(payload.new as MachineState);
          })
          .subscribe();

        return () => {
          queueSubscription.unsubscribe();
          machineStateSubscription.unsubscribe();
          historySubscription.unsubscribe();
          machineStateChannel.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up Supabase subscriptions:', error);
        // Continue without real-time updates
      }
    }
  }, []);

  // Save user to localStorage when changed
  useEffect(() => {
    if (user) {
      localStorage.setItem('laundryUser', JSON.stringify(user));
    }
  }, [user]);
  
  // Save admin status to localStorage
  useEffect(() => {
    localStorage.setItem('laundryIsAdmin', isAdmin.toString());
  }, [isAdmin]);

  // Load students from Supabase
  const loadStudents = async () => {
    if (!isSupabaseConfigured || !supabase) {
      console.log(' Supabase not configured, cannot load students');
      return;
    }

    try {
      console.log(' Loading students...');
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      console.log(' Students loaded:', data?.length);
      setStudents(data || []);
    } catch (error: any) {
      console.error('Error loading students:', error);
      setStudents([]);
    }
  };

    // ========================================
// ИСПРАВЛЕННАЯ ФУНКЦИЯ РЕГИСТРАЦИИ
// ========================================

const registerStudent = async (studentId: string, password: string): Promise<User | null> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase не настроен');
  }

  try {
    const student = students.find(s => s.id === studentId);
    if (!student) throw new Error('Студент не найден');
    
    if (student.is_banned) {
      throw new Error(`Вы забанены. Причина: ${student.ban_reason || 'Не указана'}`);
    }
    
    if (student.is_registered && student.user_id) {
      throw new Error('Студент уже зарегистрирован');
    }
    
    const shortId = studentId.slice(0, 8);
    const email = `student-${shortId}@example.com`;
    
    console.log('📝 Registering with email:', email);
    
    // Попытка регистрации
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          student_id: studentId,
          full_name: student.full_name,
          room: student.room
        }
      }
    });

    // Если пользователь уже существует - залогиниться
    if (authError && (authError.message.includes('already registered') || authError.message.includes('User already registered'))) {
      console.log('⚠️ User already exists, trying to login...');
      
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (loginError) {
        throw new Error('Этот email уже занят другим пользователем. Обратитесь к администратору.');
      }
      
      if (!loginData.user) {
        throw new Error('Не удалось войти');
      }

      // ✅ Определить authUser для обеих веток
      const authUser = authData?.user || loginData?.user;
      if (!authUser) {
        throw new Error('Не удалось создать/войти в аккаунт');
      }
      
      // ✅ КРИТИЧНО: Обновить user_id В ТРАНЗАКЦИИ
      
      // ✅ Обновить запись студента
      const { error: updateError } = await supabase
        .from('students')
        .update({
          user_id: authUser.id,
          is_registered: true,
          registered_at: new Date().toISOString(),
        })
        .eq('id', studentId);

      if (updateError) {
        console.error('❌ Update error:', updateError);
        throw updateError;
      }

      console.log('✅ Student registered with user_id:', authUser.id);
      // ✅ ОБНОВИТЬ ЗАПИСИ В ОЧЕРЕДИ
      try {
        const { error: queueUpdateError } = await supabase
          .from('queue')
          .update({ user_id: authUser.id })
          .eq('student_id', studentId)
          .is('user_id', null);
  
        if (queueUpdateError) {
          console.error('Error updating queue user_ids:', queueUpdateError);
        } else {
          console.log('✅ Updated queue records with new user_id');
          await fetchQueue();
        }
      } catch (queueError) {
        console.error('Error updating queue after registration:', queueError);
      }

      const newUser: User = {
        id: authUser.id,
        student_id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        full_name: student.full_name,
        room: student.room || undefined,
        telegram_chat_id: student.telegram_chat_id || undefined,
      };
      
      const isAdminUser = student.is_admin || false;
      const isSuperAdminUser = student.is_super_admin || false;
      
      setIsAdmin(isAdminUser);
      setIsSuperAdmin(isSuperAdminUser);
      localStorage.setItem('laundryIsAdmin', isAdminUser.toString());
      localStorage.setItem('laundryIsSuperAdmin', isSuperAdminUser.toString());
      
      setUser(newUser);
      localStorage.setItem('laundryUser', JSON.stringify(newUser));
      await loadStudents();
      console.log('✅ Student registered successfully:', newUser.full_name);
      
      return newUser;
    }

    if (authError) {
      console.error('❌ Auth error:', authError);
      throw authError;
    }
    
    if (!authData.user) {
      throw new Error('Не удалось создать пользователя');
    }

    console.log('✅ Auth user created:', authData.user.id);

    // ✅ КРИТИЧНО: Обновить user_id
    const { error: updateError } = await supabase
      .from('students')
      .update({ 
        is_registered: true,
        registered_at: new Date().toISOString(),
        user_id: authData.user.id,
        is_banned: false,
        ban_reason: null,
        banned_at: null
      })
      .eq('id', studentId);

    if (updateError) {
      console.error('❌ Update error:', updateError);
      throw updateError;
    }

    console.log('✅ Student updated with user_id:', authData.user.id);

    // ✅ ОБНОВИТЬ ЗАПИСИ В ОЧЕРЕДИ
    try {
      // ✅ Обновить ВСЕ записи для этого студента
      const { error: queueUpdateError } = await supabase
        .from('queue')
        .update({ user_id: authData.user.id })
        .eq('student_id', studentId);
  
      if (queueUpdateError) {
        console.error('Error updating queue user_ids:', queueUpdateError);
      } else {
        console.log('✅ Updated queue records with new user_id');
      }
    } catch (queueError) {
      console.error('Error updating queue after registration:', queueError);
    }

    // ✅ ДОБАВЛЕНО: Дождаться подтверждения с retry
    let verifyStudent: any = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Увеличена задержка
      
      const { data, error: verifyError } = await supabase
        .from('students')
        .select('user_id')
        .eq('id', studentId)
        .single();
      
      if (!verifyError && data?.user_id === authData.user.id) {
        verifyStudent = data;
        console.log('✅ Verified user_id:', verifyStudent.user_id);
        break;
      }
      
      console.warn(`⚠️ Retry ${retryCount + 1}/${maxRetries}: user_id not yet synced`, { data, expected: authData.user.id });
      retryCount++;
    }
    
    if (!verifyStudent || verifyStudent.user_id !== authData.user.id) {
      console.error('❌ user_id verification failed after retries!');
      // Не бросаем ошибку - продолжаем регистрацию
    }

    const newUser: User = {
      id: authData.user.id,
      student_id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      full_name: student.full_name,
      room: student.room || undefined,
      telegram_chat_id: student.telegram_chat_id || undefined,
    };
    
    const isAdminUser = student.is_admin || false;
    const isSuperAdminUser = student.is_super_admin || false;
    
    setIsAdmin(isAdminUser);
    setIsSuperAdmin(isSuperAdminUser);
    localStorage.setItem('laundryIsAdmin', isAdminUser.toString());
    localStorage.setItem('laundryIsSuperAdmin', isSuperAdminUser.toString());
    
    setUser(newUser);
    localStorage.setItem('laundryUser', JSON.stringify(newUser));
    await loadStudents();
    console.log('✅ Student registered successfully:', newUser.full_name);
    
    return newUser;
  } catch (error: any) {
    console.error('❌ Error registering student:', error);
    throw error;
  }
};

// ========================================
// ТАКЖЕ НУЖНО ИСПРАВИТЬ loginStudent
// ========================================

const loginStudent = async (studentId: string, password: string): Promise<User | null> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase не настроен');
  }

  try {
    // ✅ КРИТИЧНО: Сначала проверить бан ДО попытки входа
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();

    if (studentError) throw studentError;
    if (!studentData) throw new Error('Студент не найден');
    
    // ✅ ПРОВЕРКА БАНА ДО ЛОГИНА
    if (studentData.is_banned) {
      const banReason = studentData.ban_reason || 'Не указана';
      throw new Error(`Вы забанены. Причина: ${banReason}`);
    }
    
    if (!studentData.is_registered) throw new Error('Студент не зарегистрирован');

    const email = `student-${studentId.slice(0, 8)}@example.com`;
    console.log('📝 Logging in with email:', email);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      // Русифицируем ошибки Supabase
      if (authError.message === 'Invalid login credentials') {
        throw new Error('Неправильный пароль');
      }
      throw new Error(authError.message || 'Ошибка входа');
    }
    if (!authData.user) throw new Error('Не удалось войти');

    const newUser: User = {
      id: authData.user.id,
      student_id: studentData.id,
      first_name: studentData.first_name,
      last_name: studentData.last_name,
      full_name: studentData.full_name,
      room: studentData.room || undefined,
      telegram_chat_id: studentData.telegram_chat_id || undefined,
    };

    const isAdminUser = studentData.is_admin || false;
    const isSuperAdminUser = studentData.is_super_admin || false;

    setIsAdmin(isAdminUser);
    setIsSuperAdmin(isSuperAdminUser);

    localStorage.setItem('laundryIsAdmin', isAdminUser.toString());
    localStorage.setItem('laundryIsSuperAdmin', isSuperAdminUser.toString());

    setUser(newUser);
    localStorage.setItem('laundryUser', JSON.stringify(newUser));

    console.log('✅ Student logged in:', newUser.full_name);
    return newUser;
  } catch (error: any) {
    console.error('❌ Error logging in:', error);
    throw error;
  }
};

  // Logout student
  const logoutStudent = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    localStorage.removeItem('laundryUser');
    localStorage.removeItem('laundryIsAdmin');
    localStorage.removeItem('laundryIsSuperAdmin');
    console.log('👋 Student logged out');
  };

    // Admin: Reset student registration
    const resetStudentRegistration = async (studentId: string) => {
      if (!isAdmin) throw new Error('Недостаточно прав');
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase не настроен');
      }
    
      try {
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('user_id, is_registered, full_name')
          .eq('id', studentId)
          .single();
    
        if (studentError) throw studentError;
        if (!studentData) throw new Error('Студент не найден');
        
        console.log('🔄 Resetting registration for:', studentData.full_name);
    
        // Удалить из Supabase Auth если user_id существует
        if (studentData.user_id && user?.id) {
          console.log('🗑️ Deleting auth user:', studentData.user_id);
          try {
            const response = await fetch('/api/admin/delete-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                userId: studentData.user_id,
                adminUserId: user.id 
              })
            });
            
            const result = await response.json();
            if (!response.ok) {
              console.warn('⚠️ Could not delete auth user:', result.error);
            } else {
              console.log('✅ Auth user deleted');
            }
          } catch (error) {
            console.warn('⚠️ Error calling delete-user API:', error);
          }
        }
    
        // Сбросить регистрацию в таблице students
        const { error: updateError } = await supabase
          .from('students')
          .update({ 
            is_registered: false,
            registered_at: null,
            user_id: null,
            telegram_chat_id: null, // ✅ Сбрасываем Telegram
            avatar_type: 'default', // ✅ Сбрасываем аватар
            // НЕ СБРАСЫВАЕМ is_banned и ban_reason - они остаются!
          })
          .eq('id', studentId);
    
        if (updateError) throw updateError;
    
        await loadStudents();
        console.log('✅ Student registration reset');
      } catch (error: any) {
        console.error('❌ Error resetting registration:', error);
        throw error;
      }
    };

  // Telegram 
  const linkTelegram = async (telegramCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: '' };
    }

    try {
      console.log(' Sending telegram link request:', { student_id: user.student_id, telegram_chat_id: telegramCode });
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
        console.error(' Error from API:', data.error);
        return { success: false, error: data.error || '' };
      }

      console.log(' API response:', data);

      // Проверяем что данные обновились в базе
      if (isSupabaseConfigured && supabase) {
        const { data: studentData, error: fetchError } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.student_id)
          .single();
        
        if (fetchError) {
          console.error('Error fetching updated student:', fetchError);
        } else {
          console.log('Updated student from DB:', studentData);
          
          const updatedUser: User = {
            ...user,
            telegram_chat_id: studentData.telegram_chat_id || undefined,
          };
          
          setUser(updatedUser);
          localStorage.setItem('laundryUser', JSON.stringify(updatedUser));
          console.log('User updated with telegram_chat_id:', updatedUser.telegram_chat_id);
        }
      } else {
        const updatedUser = { ...user, telegram_chat_id: telegramCode };
        setUser(updatedUser);
        localStorage.setItem('laundryUser', JSON.stringify(updatedUser));
      }

      console.log('Telegram connected, Chat ID:', telegramCode);
      return { success: true };
    } catch (error: any) {
      console.error(' Error linking Telegram:', error);
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
        const { data, error } = await supabase
          .from('queue')
          .select('*')
          .order('queue_position', { ascending: true });

        console.log(' Fetched queue:', data);  
        console.log(' Current user:', user);   
        
        if (error) throw error;
        setQueue(data || []);
        // Also update local storage as backup
        save_local_queue(data || []);
      } catch (error: any) {
        console.error('Error fetching queue:', error);
        console.error('Error details:', error?.message, error?.details, error?.hint);
        // Fall back to local storage
        setQueue(get_local_queue());
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
        console.error('Error fetching machine state:', error);
        console.error('Error details:', error?.message, error?.details, error?.hint);
        // Fall back to local storage
        setMachineState(get_local_machine_state());
      }
    };
  
    // Fetch history from Supabase or local storage
    const fetchHistory = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setHistory(get_local_history());
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('history')
          .select('id, user_id, full_name, room, started_at, finished_at, ready_at, key_issued_at, washing_started_at, return_requested_at')
          .order('finished_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        setHistory(data || []);
        // Also update local storage as backup
        save_local_history(data || []);
      } catch (error: any) {
        console.error('Error fetching history:', error);
        console.error('Error details:', error?.message, error?.details, error?.hint);
        // Fall back to local storage
        setHistory(get_local_history());
      }
    };

  // ФУНКЦИЯ 1: joinQueue ( 
// ========================================

const joinQueue = async (
  name: string,
  room?: string,
  washCount: number = 1,
  paymentType: string = 'money',
  expectedFinishAt?: string,
  chosenDate?: string
) => {
  if (!user) {
    console.error('❌ User not logged in');
    return;
  }
  
  if (!supabase) {
    console.error('❌ Supabase not initialized');
    alert('Ошибка инициализации');
    return;
  }

  if (!user.id || typeof user.id !== 'string') {
    console.error('❌ Invalid user.id:', user.id);
    alert('Ошибка авторизации');
    return;
  }

  console.log('📝 Current user:', { id: user.id, student_id: user.student_id, name: user.full_name });

  // ПРОВЕРКА БАНА
  try {
    const { data: studentData } = await supabase
      .from('students')
      .select('is_banned, ban_reason, user_id')
      .eq('id', user.student_id)
      .single();

    if (studentData?.is_banned) {
      const banReason = studentData.ban_reason || 'Не указана';
      alert(`Вы забанены. Причина: ${banReason}`);
      logoutStudent();
      return;
    }

    if (studentData?.user_id !== user.id) {
      console.error('❌ user_id mismatch!', { 
        studentUserId: studentData?.user_id, 
        currentUserId: user.id 
      });
      alert('Ошибка синхронизации данных');
      logoutStudent();
      return;
    }
  } catch (err) {
    console.error('Error checking ban status:', err);
    alert('Ошибка проверки статуса');
    return;
  }

  if (isJoining) {
    console.log('⏳ Already joining queue');
    return;
  }

  // Определяем целевую дату
  const todayISO = new Date().toISOString().slice(0, 10);
  const targetDate = chosenDate || todayISO;

  console.log('📅 Target date:', targetDate);

  // ✅ ИСПРАВЛЕНО: Проверяем по student_id на эту дату
  try {
    const { data: existingEntry } = await supabase
      .from('queue')
      .select('id')
      .eq('student_id', user.student_id)
      .eq('queue_date', targetDate)
      .in('status', ['waiting', 'ready', 'key_issued', 'washing', 'returning_key']);

    if (existingEntry && existingEntry.length > 0) {
      alert('Вы уже в очереди на эту дату');
      return;
    }
  } catch (err) {
    console.error('Error checking existing entry:', err);
  }

  setIsJoining(true);

  try {
    const { data: sameDayRows, error: posErr } = await supabase
      .from('queue')
      .select('queue_position, scheduled_for_date, queue_date')
      .eq('queue_date', targetDate)
      .eq('scheduled_for_date', targetDate);

    if (posErr) {
      console.error('Error fetching positions:', posErr);
      throw posErr;
    }

    let nextPos = 1;
    if (sameDayRows && sameDayRows.length > 0) {
      const maxPos = Math.max(...sameDayRows.map((r: any) => r.queue_position ?? 0));
      nextPos = maxPos + 1;
    }

    console.log('✅ Next position:', nextPos, 'for date:', targetDate);

    console.log('✅ Next position:', nextPos, 'for date:', targetDate);

    // ✅ Проверяем user.id перед созданием записи
    if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
      console.error('❌ Invalid user.id for queue creation:', user.id);
      alert('Ошибка обновления данных. Попробуйте войти снова.');
      logoutStudent();
      return;
    }

    const newItem = {
      id: crypto.randomUUID(),
      user_id: user.id,  // Теперь гарантированно валиден
      student_id: user.student_id,
      full_name: name,
      room: room || null,
      wash_count: washCount,
      payment_type: paymentType,
      joined_at: new Date().toISOString(),
      expected_finish_at: expectedFinishAt || null,
      status: QueueStatus.WAITING,
      scheduled_for_date: targetDate,
      queue_date: targetDate,
      queue_position: nextPos,
      avatar_type: user.avatar_type || 'default', // ✅ Копируем аватар из профиля
    };

    console.log('✅ Inserting new queue item:', newItem);

    const { error } = await supabase.from('queue').insert(newItem);

    if (error) {
      if (error.code === '23505') {
        console.warn('⚠️ Duplicate entry blocked');
        alert('Вы уже в очереди на эту дату');
        return;
      }
      console.error('❌ Insert error:', error);
      throw error;
    }

    console.log('✅ Successfully added to queue');

    await sendTelegramNotification({
      type: 'joined',
      student_id: user.student_id,
      full_name: name,
      room,
      wash_count: washCount,
      payment_type: paymentType,
      queue_length: queue.length + 1,
      expected_finish_at: expectedFinishAt,
    });

    await fetchQueue();

  } catch (err: any) {
    console.error('❌ Error joining queue:', err);
    alert('Ошибка добавления в очередь');
  } finally {
    setTimeout(() => setIsJoining(false), 1000);
  }
};

  // Admin: Изменить статус записи в очереди
  const setQueueStatus = async (queueItemId: string, status: QueueStatus) => {
    if (!isAdmin) return;
    
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured');
      return;
    }

    try {
      const { error } = await supabase
        .from('queue')
        .update({ status })
        .eq('id', queueItemId);
      
      if (error) throw error;
      console.log(' Status updated:', status);
      await fetchQueue();
    } catch (error) {
      console.error(' Error updating status:', error);
    }
  };


  // Admin: Add student to queue (works for both registered and unregistered students)
const adminAddToQueue = async (
  studentRoom?: string,
  washCount: number = 1,
  paymentType: string = 'money',
  expectedFinishAt?: string,
  chosenDate?: string,
  studentId?: string
) => {
  const student = students.find(s => s.id === studentId);
  if (!student) {
    alert('Студент не найден');
    return;
  }
  
  // ПРОВЕРКА: обычный админ не может ставить в очередь супер-админов
  if (!isSuperAdmin && student.is_super_admin) {
    alert('Только супер-админ может добавлять супер-админов в очередь');
    return;
  }
  
  if (!isAdmin) {
    console.error('❌ Not admin');
    alert('Недостаточно прав');
    return;
  }

  if (!supabase) {
    console.error('❌ Supabase not initialized');
    alert('Ошибка инициализации');
    return;
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const targetDate = chosenDate || todayISO;

  console.log('📝 Admin adding to queue, target date:', targetDate);

  try {
    // Получить позиции для правильной сортировки
    const { data: sameDayRows, error: posErr } = await supabase
      .from('queue')
      .select('queue_position, scheduled_for_date, queue_date')
      .eq('queue_date', targetDate)
      .eq('scheduled_for_date', targetDate);

    if (posErr) {
      console.error('Error getting positions:', posErr);
      alert('Ошибка получения позиций');
      return;
    }

    let nextPos = 1;
    if (sameDayRows && sameDayRows.length > 0) {
      const maxPos = Math.max(...sameDayRows.map(row => row.queue_position || 0));
      nextPos = maxPos + 1;
    }

    // ✅ Проверяем дубликат по student_id
    const { data: existingStudent } = await supabase
      .from('queue')
      .select('id')
      .eq('student_id', student.id)
      .eq('queue_date', targetDate)
      .in('status', ['WAITING', 'READY', 'KEY_ISSUED', 'WASHING']);

    if (existingStudent && existingStudent.length > 0) {
      alert(`${student.full_name} уже в очереди на эту дату`);
      return;
    }

    // ✅ КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: user_id может быть null для незарегистрированных
    const userId = student.is_registered ? student.user_id : null;

    const newItem = {
      id: crypto.randomUUID(),
      user_id: userId,  // ✅ null для незарегистрированных!
      student_id: student.id,
      full_name: student.full_name,
      room: studentRoom || student.room || null,
      wash_count: washCount,
      payment_type: paymentType,
      joined_at: new Date().toISOString(),
      expected_finish_at: expectedFinishAt || null,
      status: QueueStatus.WAITING,
      scheduled_for_date: targetDate,
      queue_date: targetDate,
      queue_position: nextPos,
      admin_message: null,
      return_key_alert: false,
      created_at: new Date().toISOString(),
      avatar_type: student.avatar_type || 'default', // ✅ Копируем аватар студента
    };

    console.log('✅ Admin inserting queue item:', newItem);
    console.log('✅ user_id (may be null):', newItem.user_id);
    
    // ✅ Проверяем сессию Supabase
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('✅ Supabase session:', sessionData?.session?.user?.email);
    
    if (!sessionData?.session) {
      console.error('❌ No Supabase session!');
      alert('❌ Нет сессии Supabase. Перезайдите как админ.');
      return;
    }

    const { error } = await supabase.from('queue').insert(newItem);

    if (error) {
      console.error('❌ Error inserting queue item:', error);
      alert('Ошибка добавления в очередь: ' + error.message);
      return;
    }

    console.log('✅ Admin added to queue successfully');
    await fetchQueue();

  } catch (error: any) {
    console.error('❌ Exception in adminAddToQueue:', error);
    alert('Ошибка добавления');
  }
};

// ========================================
// ДОПОЛНИТЕЛЬНО: Функция для обновления старых записей
// ========================================

// Эту функцию можно вызвать один раз для миграции старых данных
/*
const migrateOldQueueItems = async () => {
  if (!isAdmin || !supabase) return;

  try {
    console.log(' Starting migration of old queue items...');

    // Получить все записи без user_id
    const { data: oldItems, error: fetchError } = await supabase
      .from('queue')
      .select('*')
      .is('user_id', null);

    if (fetchError) throw fetchError;

    if (!oldItems || oldItems.length === 0) {
      console.log(' No old items to migrate');
      return;
    }

    console.log(` Found ${oldItems.length} items without user_id`);

    // Для каждой записи попытаться найти user_id через studentId
    for (const item of oldItems) {
      if (!item.studentId) {
        console.log(` Skipping item ${item.id} - no studentId`);
        continue;
      }

      const { data: studentData } = await supabase
        .from('students')
        .select('user_id')
        .eq('id', item.studentId)
        .single();

      if (studentData?.user_id) {
        await supabase
          .from('queue')
          .update({ user_id: studentData.user_id })
          .eq('id', item.id);

        console.log(` Migrated item ${item.id} -> user_id: ${studentData.user_id}`);
      } else {
        console.log(` No user_id found for studentId: ${item.studentId}`);
      }
    }

    console.log(' Migration completed!');
    await fetchQueue();
  } catch (error) {
    console.error(' Migration error:', error);
  }
};
*/

  // Admin: Set return key alert
  const setReturnKeyAlert = async (queueItemId: string, alert: boolean) => {
    if (!isAdmin) return;
    
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured');
      return;
    }

    try {
      const { error } = await supabase
        .from('queue')
        .update({ returnKeyAlert: alert })
        .eq('id', queueItemId);
      
      if (error) throw error;
      console.log(' Return key alert updated:', alert);
      
      if (alert) {
        // Trigger alert and Telegram notification
        sendTelegramNotification({ type: 'admin_return_key', message: '' });
      }
    } catch (error) {
      console.error(' Error updating return key alert:', error);
    }
  };

 // Admin: Start washing for a queue item
const startWashing = async (queueItemId: string) => {
  if (!isAdmin) {
    console.error(' Not admin!');
    return;
  }
  
  console.log(' Starting washing for:', queueItemId);
  
  if (!isSupabaseConfigured || !supabase) {
    // Use local storage fallback
    start_local_washing(queueItemId);
    fetchQueue();
    fetchMachineState();
    return;
  }
  
  try {
    const queueItem = queue.find(item => item.id === queueItemId);
    if (!queueItem) {
      console.error(' Queue item not found!');
      return;
    }
    
    console.log(' Updating queue item status to WASHING...');
    // Update queue item status
    const { error: queueError } = await supabase
      .from('queue')
      .update({ status: QueueStatus.WASHING })
      .eq('id', queueItemId);
    
    if (queueError) {
      console.error(' Queue error:', queueError);
      throw queueError;
    }
    console.log(' Queue item status updated!');
    
    // Update machine state
    const newMachineState: MachineState = {
      status: MachineStatus.WASHING,
      current_queue_item_id: queueItemId,
      started_at: new Date().toISOString(),
      expected_finish_at: queueItem.expected_finish_at,
    };
    
    console.log(' Updating machine state:', newMachineState);
    const { error: machineError } = await supabase
      .from('machine_state')
      .upsert(newMachineState, { onConflict: 'id' });
    
    if (machineError) {
      console.error(' Machine error:', machineError);
      throw machineError;
    }
    console.log(' Machine state updated!');
    
    // Обновить локальный state немедленно
    setMachineState(newMachineState);
    save_local_machine_state(newMachineState);
    console.log(' Local machine state updated:', newMachineState);
    
    // Обновить состояние для всех клиентов
    await fetchQueue();
    await fetchMachineState();
    
    console.log(' startWashing completed successfully!');
  } catch (error) {
    console.error(' Error starting washing:', error);
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
      // Добавить в историю
      const historyItem: HistoryItem = {
        id: uuidv4(),
        user_id: queueItem.user_id,
        full_name: queueItem.full_name,
        room: queueItem.room || undefined,
        started_at: machineState.started_at || new Date().toISOString(),
        finished_at: new Date().toISOString(),
        // ✅ Таймеры
        ready_at: queueItem.ready_at,
        key_issued_at: queueItem.key_issued_at,
        washing_started_at: queueItem.washing_started_at,
        return_requested_at: queueItem.return_requested_at,
      };
      
      const { error: historyError } = await supabase
        .from('history')
        .insert(historyItem);
      
      if (historyError) throw historyError;
      
      // Удалить из очереди
      const { error: deleteError } = await supabase
        .from('queue')
        .delete()
        .eq('id', queueItemId);
      
      if (deleteError) throw deleteError;
      
      // Сбросить состояние машины
      const idleMachineState: MachineState = {
        status: MachineStatus.IDLE,
        current_queue_item_id: undefined,
        started_at: undefined,
        expected_finish_at: undefined,
      };
      const { error: machineError } = await supabase
        .from('machine_state')
        .upsert(idleMachineState);
      
      if (machineError) throw machineError;
      
      setMachineState(idleMachineState);
      save_local_machine_state(idleMachineState);
    } catch (error) {
      console.error('Error marking done:', error);
      mark_local_done();
      fetchQueue();
      fetchMachineState();
      fetchHistory();
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
      // Update queue item status back to 'queued'
      const { error: updateError } = await supabase
        .from('queue')
        .update({ status: QueueStatus.WAITING })
        .eq('id', queueItemId);
      
      if (updateError) throw updateError;
      
      // Reset machine state
      const { error: machineError } = await supabase
        .from('machine_state')
        .upsert({
          status: MachineStatus.IDLE,
          current_queue_item_id: null,
          started_at: null,
          expected_finish_at: null,
        });
      
      if (machineError) throw machineError;
    } catch (error) {
      console.error('Error canceling washing:', error);
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
      // ✅ СБРОС машины
      const { error: machineError } = await supabase
        .from('machine_state')
        .upsert({
          status: MachineStatus.IDLE,
          current_queue_item_id: null,
          started_at: null,
          expected_finish_at: null,
        });
      
      if (machineError) throw machineError;
      
      // ✅ УДАЛИТЬ ВСЕ записи из очереди (включая те, что добавлены админом)
      const { error: queueError } = await supabase
        .from('queue')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');  // ✅ Удаляем ВСЕ
      
      if (queueError) throw queueError;
      
      console.log('✅ Queue cleared');
      await fetchQueue();
      await fetchMachineState();
    } catch (error) {
      console.error('❌ Error clearing queue:', error);
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
      const { error } = await supabase
        .from('queue')
        .delete()
        .eq('id', queueItemId);

      if (error) throw error;

      console.log(' Queue item removed:', queueItemId);
      await fetchQueue();
    } catch (error) {
      console.error(' Error removing from queue:', error);
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
      const { error } = await supabase
        .from('queue')
        .delete()
        .eq('status', QueueStatus.DONE);

      if (error) throw error;

      console.log(' Completed queue items cleared');
      await fetchQueue();
    } catch (error) {
      console.error(' Error clearing completed queue:', error);
    }
  };

  // Очистить старую очередь (за предыдущие дни)
  const clearOldQueues = async () => {
    console.log(' clearOldQueues вызвана');
    console.log('isAdmin в контексте:', isAdmin);
    
    if (!isAdmin) {
      console.log('❌ Нет прав админа');
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
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('queue')
        .delete()
        .lt('scheduled_for_date', today);

      if (error) throw error;

      console.log(' Old queue items cleared');
      await fetchQueue();
    } catch (error) {
      console.error(' Error clearing old queue:', error);
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
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const cutoffDate = twoDaysAgo.toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('queue')
        .delete()
        .lt('scheduled_for_date', cutoffDate)
        .neq('status', QueueStatus.DONE);

      if (error) throw error;

      console.log(' Stuck queue items cleared');
      await fetchQueue();
    } catch (error) {
      console.error(' Error clearing stuck queue:', error);
    }
  };

  // Забанить студента
  const banStudent = async (studentId: string, reason?: string) => {
    if (!isAdmin) return;
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase ');
    }
  
    try {
      // Найти целевого студента
      const targetStudent = students.find(s => s.id === studentId);
      if (!targetStudent) {
        throw new Error('Студент не найден');
      }

      // ПРОВЕРКА: обычный админ не может банить супер-админов
      if (!isSuperAdmin && targetStudent.is_super_admin) {
        throw new Error('Только супер-админ может банить супер-админов');
      }
      
      // ПРОВЕРКА: нельзя банить супер-админов (даже супер-админу)
      if (targetStudent.is_super_admin) {
        throw new Error('Нельзя банить супер-админов');
      }
      console.log(' Banning student:', studentId, 'Reason:', reason);
  
      // Убрать из очереди
      const { error: queueError } = await supabase
        .from('queue')
        .delete()
        .eq('student_id', studentId);
  
      if (queueError) {
        console.error('Error removing from queue:', queueError);
      }
  
      // Забанить
      const { error } = await supabase
        .from('students')
        .update({
          is_banned: true,  
          banned_at: new Date().toISOString(),  
          ban_reason: reason || '',  
        })
        .eq('id', studentId);
  
      if (error) {
        console.error('Ban error:', error);
        throw error;
      }
  
      
      // Если забанили текущего пользователя - принудительно разлогинить
      if (user && user.student_id === studentId) {
        console.log(' Current user banned - logging out');
        await logoutStudent();
        alert('Вы были забанены администратором');
        return; // Не продолжать выполнение
      }

      console.log(' Student banned successfully');
      await loadStudents();
      await fetchQueue();
    } catch (error) {
      console.error(' Error banning student:', error);
      throw error;
    }
  };

  // Разбанить студента
  const unbanStudent = async (studentId: string) => {
    console.log('🔓 unbanStudent called:', { studentId, isAdmin, user: user?.full_name });
    
    if (!isAdmin) {
      console.error('❌ Not admin, cannot unban');
      return;
    }
    
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Проверить текущую сессию
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('🔑 Current session:', sessionData.session?.user?.id);
      
      const { data, error } = await supabase
        .from('students')
        .update({
          is_banned: false,
          banned_at: null,
          ban_reason: null,
        })
        .eq('id', studentId)
        .select();

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      console.log('✅ Student unbanned:', studentId, data);
      await loadStudents();
    } catch (error) {
      console.error('❌ Error unbanning student:', error);
      throw error;
    }
  };

  // Добавить нового студента
  const addStudent = async (firstName: string, lastName: string, room?: string) => {
    if (!isAdmin) throw new Error('Недостаточно прав');
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase не настроен');
    }
  
    try {
      const fullName = lastName ? `${firstName} ${lastName}` : firstName;
      
      const { error } = await supabase
        .from('students')
        .insert({
          id: uuidv4(),
          first_name: firstName,
          last_name: lastName || '',
          full_name: fullName,
          room: room || null,
          is_registered: false,
          created_at: new Date().toISOString(),
        });
  
      if (error) throw error;
  
      console.log('✅ Student added:', fullName);
      await loadStudents();
    } catch (error: any) {
      console.error('❌ Error adding student:', error);
      throw error;
    }
  };

  // Обновить данные студента
  const updateStudent = async (
    studentId: string,
    updates: { first_name?: string; last_name?: string; middle_name?: string; room?: string; can_view_students?: boolean; avatar_type?: string }
) => {
  console.log('✏️ updateStudent called:', { studentId, updates, isAdmin, user: user?.full_name });
  
  if (!isAdmin) throw new Error('Недостаточно прав');
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase не настроен');
  }

  try {
    const targetStudent = students.find(s => s.id === studentId);
    if (!targetStudent) {
      throw new Error('Студент не найден');
    }
    
    // ПРОВЕРКА: обычный админ не может редактировать супер-админов
    if (!isSuperAdmin && targetStudent.is_super_admin) {
      throw new Error('Только супер-админ может редактировать супер-админов');
    }

    const updateData: any = {};
    
    if (updates.first_name !== undefined || updates.last_name !== undefined || updates.middle_name !== undefined) {
      const newFirstName = updates.first_name !== undefined ? updates.first_name : targetStudent.first_name;
      const newLastName = updates.last_name !== undefined ? updates.last_name : (targetStudent.last_name || '');
      const newMiddleName = updates.middle_name !== undefined ? updates.middle_name : (targetStudent.middle_name || '');
      
      // Формируем full_name: Имя Фамилия Отчество
      const nameParts = [newFirstName, newLastName, newMiddleName].filter(Boolean);
      updateData.full_name = nameParts.join(' ');
      
      if (updates.first_name !== undefined) updateData.first_name = newFirstName;
      if (updates.last_name !== undefined) updateData.last_name = newLastName || null;
      if (updates.middle_name !== undefined) updateData.middle_name = newMiddleName || null;
    }

    if (updates.room !== undefined) updateData.room = updates.room;
    if (updates.can_view_students !== undefined) updateData.can_view_students = updates.can_view_students;
    if (updates.avatar_type !== undefined) updateData.avatar_type = updates.avatar_type;

    console.log('📝 Update data:', updateData);
    
    // Проверить текущую сессию
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('🔑 Current session:', sessionData.session?.user?.id);

    const { data, error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', studentId)
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ Student updated:', studentId, data);
    await loadStudents();
  } catch (error: any) {
    console.error('❌ Error updating student:', error);
    throw error;
  }
};

// Удалить студента
const deleteStudent = async (studentId: string) => {
  if (!isAdmin && !isSuperAdmin) throw new Error('Недостаточно прав');
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase не настроен');
  }

  try {
    // ✅ ПРОВЕРКА: Существует ли студент
    const targetStudent = students.find(s => s.id === studentId);
    if (!targetStudent) {
      throw new Error('Студент не найден');
    }
    
    // ✅ ПРОВЕРКА: Админ не может удалять других админов
    if (isAdmin && !isSuperAdmin && (targetStudent.is_admin || targetStudent.is_super_admin)) {
      throw new Error('Админ не может удалять других админов');
    }
    
    // ✅ ПРОВЕРКА: Нельзя удалить последнего супер-админа
    if (targetStudent.is_super_admin) {
      const superAdminsCount = students.filter(s => s.is_super_admin).length;
      if (superAdminsCount <= 1) {
        throw new Error('Нельзя удалить последнего супер-админа');
      }
    }
    
    // 1. Удалить записи из очереди
    const { error: queueError } = await supabase
      .from('queue')
      .delete()
      .eq('student_id', studentId);

    if (queueError) {
      console.error('❌ Queue delete error:', queueError);
      // Не бросаем ошибку, продолжаем удаление
    }

    // 2. Удалить из истории (если есть)
    const { error: historyError } = await supabase
      .from('history')
      .delete()
      .eq('user_id', targetStudent.user_id);

    if (historyError) {
      console.error('❌ History delete error:', historyError);
      // Не бросаем ошибку, продолжаем удаление
    }

    // 3. Удалить auth пользователя (если есть user_id)
    if (targetStudent.user_id && user?.id) {
      try {
        const response = await fetch('/api/admin/delete-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: targetStudent.user_id,
            adminUserId: user.id 
          })
        });
        
        const result = await response.json();
        if (!response.ok) {
          console.warn('⚠️ Could not delete auth user:', result.error);
        }
      } catch (error) {
        console.warn('⚠️ Error calling delete-user API:', error);
        // Не бросаем ошибку, продолжаем удаление
      }
    }

    // 4. Удалить студента из таблицы students
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (deleteError) {
      console.error('❌ Delete student error:', deleteError);
      throw deleteError;
    }

    console.log('✅ Student deleted:', studentId);
    await loadStudents();
    await fetchQueue();
  } catch (error: any) {
    console.error('❌ Error deleting student:', error);
    throw error;
  }
};

// Обновить админ-ключ
const updateAdminKey = async (newKey: string) => {
  if (!isAdmin) throw new Error('');
  
  try {
    const response = await fetch('/api/admin/update-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newKey }),
    });

    if (!response.ok) throw new Error('');

    console.log(' Admin key updated');
    alert('');
  } catch (error: any) {
    console.error(' Error updating admin key:', error);
    throw error;
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
      // ✅ RLS политика сама проверит права через is_queue_owner() OR is_admin()
      const { error } = await supabase
        .from('queue')
        .delete()
        .eq('id', queueItemId);

      if (error) {
        console.error('❌ Error from Supabase:', error);
        throw error;
      }

      await fetchQueue();
    } catch (error) {
      console.error('❌ Error leaving queue:', error);
      remove_from_local_queue(queueItemId, user.id);
      await fetchQueue();
    }
  };

  // ✅ Оптимистичное обновление для мгновенного UI обновления
  const optimisticUpdateQueueItem = (queueItemId: string, updates: Partial<QueueItem>) => {
    console.log('⚡ OPTIMISTIC UPDATE:', queueItemId, updates);
    console.log('📊 Queue before:', queue.length);
    
    setQueue(prev => {
      const newQueue = prev.map(item => 
        item.id === queueItemId ? { ...item, ...updates } : item
      );
      console.log('📊 Queue after:', newQueue.length);
      console.log('🎯 Updated item:', newQueue.find(i => i.id === queueItemId));
      return newQueue;
    });
  };

// Update queue item details
const updateQueueItem = async (queueItemId: string, updates: Partial<QueueItem>) => {
  console.log(' updateQueueItem called:', { queueItemId, updates, isAdmin, user });
  
  if (!isSupabaseConfigured || !supabase) {
    // Use local storage fallback
    if (user) {
      update_local_queue_item(queueItemId, user.id, updates);
    }
    fetchQueue();
    return;
  }
  
  try {
    // Для админа - обновляем без проверки владельца
    // Для обычного пользователя - проверяем studentId
    let query = supabase
      .from('queue')
      .update(updates)
      .eq('id', queueItemId);
    
    // Только для НЕ-админа проверяем владельца
    if (!isAdmin) {
      if (!user) {
        console.error(' User not found for non-admin update');
        return;
      }
      query = query.eq('student_id', user.student_id);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error(' Error from Supabase:', error);
      throw error;
    }
    
    console.log(' Queue item updated successfully');
  } catch (error) {
    console.error(' Error updating queue item:', error);
    await fetchQueue();
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
  if (!isAdmin) {
    throw new Error('Недостаточно прав');
  }
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase не настроен');
  }
  
  try {
    const currentStudent = students.find(s => s.id === user?.student_id);
    const targetStudent = students.find(s => s.id === studentId);
    
    // Только супер админ может менять админ статусы
    if (!currentStudent?.is_super_admin) {
      throw new Error('Только супер-админ может управлять админами');
    }
    
    // Нельзя снять супер админа
    if (!makeAdmin && targetStudent?.is_super_admin) {
      throw new Error('Нельзя снять супер-админа');
    }
    
    console.log(`🔄 ${makeAdmin ? 'Добавление' : 'Снятие'} админа ${studentId}`);
    
    // ✅ ПРЯМОЙ UPDATE вместо RPC
    const { error } = await supabase
      .from('students')
      .update({ is_admin: makeAdmin })
      .eq('id', studentId);
      
    if (error) {
      console.error('❌ Ошибка обновления статуса:', error);
      throw error;
    }
    
    console.log('✅ Статус админа обновлен');
    await loadStudents();
    
  } catch (error: any) {
    console.error('❌ Ошибка toggleAdminStatus:', error);
    throw error;
  }
};

const toggleSuperAdminStatus = async (studentId: string, makeSuperAdmin: boolean) => {
  if (!isAdmin) {
    throw new Error('');
  }
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase ');
  }
  try {
    const currentStudent = students.find(s => s.id === user?.student_id);
    
    // Only super admin can manage super admin status
    if (!currentStudent?.is_super_admin) {
      throw new Error('');
    }
    
    // Cannot remove the last super admin
    if (!makeSuperAdmin) {
      const superAdminsCount = students.filter(s => s.is_super_admin).length;
      if (superAdminsCount <= 1) {
        throw new Error('');
      }
    }
    
    const { error } = await supabase
      .from('students')
      .update({ is_super_admin: makeSuperAdmin })
      .eq('id', studentId);
      
    if (error) {
      throw error;
    }
    
    await loadStudents();
    
  } catch (error: any) {
    console.error('');
    throw error;
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
    
    if (error) throw error;
    console.log(' Admin message sent');
  } catch (error) {
    console.error(' Error sending admin message:', error);
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
      alert('');
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
      alert('');
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
        const { data: allOnDate } = await supabase
          .from('queue')
          .select('*')
          .eq('queue_date', todayStr);

        if (allOnDate) {
          const transferred = allOnDate.filter(item => unfinishedItems.some(u => u.id === item.id));
          const existing = allOnDate.filter(item => !unfinishedItems.some(u => u.id === item.id));
          
          // 
          transferred.sort((a, b) => unfinishedItems.findIndex(u => u.id === a.id) - unfinishedItems.findIndex(u => u.id === b.id));
          
          // 
          existing.sort((a, b) => a.queue_position - b.queue_position);
          
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

        alert('');
        await fetchQueue();  
      }
    }
  } catch (err: any) {
    console.error('');
    alert('');
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
      alert('Нет незавершенных записей для переноса');
      return;
    }
    
    if (!isSupabaseConfigured || !supabase) {
      alert('Ошибка: Supabase не настроен');
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
    const { data: allOnDate } = await supabase
      .from('queue')
      .select('*')
      .eq('queue_date', targetDateStr);

    if (allOnDate) {
      const transferred = allOnDate.filter(item => unfinishedItems.some(u => u.id === item.id));
      const existing = allOnDate.filter(item => !unfinishedItems.some(u => u.id === item.id));
      
      transferred.sort((a, b) => unfinishedItems.findIndex(u => u.id === a.id) - unfinishedItems.findIndex(u => u.id === b.id));
      existing.sort((a, b) => a.queue_position - b.queue_position);
      
      const newOrder = [...existing, ...transferred];
      
      for (let k = 0; k < newOrder.length; k++) {
        await supabase
          .from('queue')
          .update({ queue_position: k + 1 })
          .eq('id', newOrder[k].id);
      }
    }

    const dateLabel = formatDateForAlert(targetDateStr);
    alert(`✅ Перенесено ${unfinishedItems.length} записей на ${dateLabel}`);
    await fetchQueue();
  } catch (err: any) {
    console.error('Ошибка переноса:', err);
    alert('❌ Ошибка переноса');
  }
};

// Вспомогательная функция для красивого отображения даты
const formatDateForAlert = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
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
    payment_type?: string;
    expected_finish_at?: string;
    chosen_date?: string;
  }
) => {
  if (!supabase) {
    console.error('');
    return;
  }

  try {
    const item = queue.find(q => q.id === queueId);
    if (!item) {
      alert('');
      return;
    }

    // 
    if (item.status !== QueueStatus.WAITING) {
      alert('');
      return;
    }

    const updateData: any = {};
    if (updates.wash_count !== undefined) updateData.wash_count = updates.wash_count;  
    if (updates.payment_type !== undefined) updateData.payment_type = updates.payment_type;  
    if (updates.expected_finish_at !== undefined) updateData.expected_finish_at = updates.expected_finish_at;  
    if (updates.chosen_date !== undefined) {
      updateData.scheduled_for_date = updates.chosen_date;  
      updateData.queue_date = updates.chosen_date;  
    }

    const { error } = await supabase
      .from('queue')
      .update(updateData)
      .eq('id', queueId);

    if (error) {
      console.error('');
      alert('');
      return;
    }

    console.log('');
    await fetchQueue();  
    
    // 
    if (updates.expected_finish_at && user) {
      await sendTelegramNotification({
        type: 'updated',
        student_id: user.student_id,
        full_name: item.full_name,
        room: item.room || undefined,
        wash_count: updates.wash_count || item.wash_count,
        payment_type: updates.payment_type || item.payment_type,
        expected_finish_at: updates.expected_finish_at,
      });
    }

  } catch (error: any) {
    console.error('');
    alert('');
  }
};

// 
const changeQueuePosition = async (queueId: string, direction: 'up' | 'down') => {
  if (!supabase) {
    alert('');
    return;
  }
  
  try {
    // 
    const itemToMove = queue.find(item => item.id === queueId);
    if (!itemToMove) {
      alert('');
      return;
    }
    
    // 
    const sameDayItems = queue
      .filter(item => item.queue_date === itemToMove.queue_date && item.scheduled_for_date === itemToMove.scheduled_for_date)
      .sort((a, b) => a.queue_position - b.queue_position);
    
    const currentIndex = sameDayItems.findIndex(item => item.id === queueId);
    
    if (direction === 'up' && currentIndex > 0) {
      // 
      const prevItem = sameDayItems[currentIndex - 1];
      
      // 
      await supabase.from('queue').update({ queue_position: prevItem.queue_position }).eq('id', queueId);
      await supabase.from('queue').update({ queue_position: itemToMove.queue_position }).eq('id', prevItem.id);
      
    } else if (direction === 'down' && currentIndex < sameDayItems.length - 1) {
      // 
      const nextItem = sameDayItems[currentIndex + 1];
      
      // 
      await supabase.from('queue').update({ queue_position: nextItem.queue_position }).eq('id', queueId);
      await supabase.from('queue').update({ queue_position: itemToMove.queue_position }).eq('id', nextItem.id);
    }
    
    await fetchQueue();
  } catch (err: any) {
    console.error('');
    alert('');
  }
};

  const adminLogin = async (password: string): Promise<User | null> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      // Вызываем безопасный API route, который хранит email админа на сервере
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка входа');
      }

      // Устанавливаем сессию в Supabase клиенте
      if (result.session) {
        await supabase.auth.setSession(result.session);
      }

      const newUser: User = result.user;

      setUser(newUser);
      setIsAdmin(newUser.is_admin || false);
      setIsSuperAdmin(newUser.is_super_admin || false);
      localStorage.setItem('laundryUser', JSON.stringify(newUser));
      localStorage.setItem('laundryIsAdmin', (newUser.is_admin || false).toString());
      localStorage.setItem('laundryIsSuperAdmin', (newUser.is_super_admin || false).toString());

      console.log('✅ Admin logged in:', newUser.full_name, 'isAdmin:', newUser.is_admin, 'isSuperAdmin:', newUser.is_super_admin);
      return newUser;
    } catch (error: any) {
      console.error('❌ Admin login error:', error);
      throw error;
    }
  };

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
    adminLogin,
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
    setIsAdmin,
    setIsSuperAdmin,
    getUserQueueItem,
    isLoading,
    isNewUser,
    setIsNewUser,
    addStudent,
   updateStudent,
   deleteStudent,
   updateAdminKey,
   adminAddToQueue,
   updateQueueItemDetails,
   updateQueueEndTime,              
   toggleAdminStatus,
   toggleSuperAdminStatus,
   loadStudents,
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