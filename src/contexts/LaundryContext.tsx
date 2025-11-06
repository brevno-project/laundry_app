"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { User, Student, QueueItem, MachineStatus, QueueStatus, MachineState, HistoryItem } from '@/types';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { sendTelegramNotification } from '@/lib/telegram';
import { parseISO, format, addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import {
  getLocalQueue,
  getLocalMachineState,
  getLocalHistory,
  saveLocalQueue,
  saveLocalMachineState,
  saveLocalHistory,
  addToLocalQueue,
  removeFromLocalQueue,
  updateLocalQueueItem,
  startLocalWashing,
  markLocalDone,
  startLocalNext,
  clearLocalQueue,
  
} from '@/lib/localStorageFallback';
  


const TIMEZONE = 'Asia/Bishkek';
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is configured
const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_KEY && !!supabase;

// Generate a user ID for local storage
const generateUserId = () => uuidv4();

// Format date to local timezone
export const formatDate = (dateString: string) => {
  return formatInTimeZone(parseISO(dateString), TIMEZONE, 'HH:mm, dd MMM');
};

type LaundryContextType = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  students: Student[];
  queue: QueueItem[];
  machineState: MachineState;
  history: HistoryItem[];
  transferSelectedToNextDay: (selectedIds: string[]) => Promise<void>;
  transferSelectedToPreviousDay: (selectedIds: string[]) => Promise<void>;
  transferSelectedToToday: (selectedIds: string[]) => Promise<void>;
  changeQueuePosition: (queueId: string, direction: 'up' | 'down') => Promise<void>;
  registerStudent: (studentId: string, password: string) => Promise<User | null>;
  loginStudent: (studentId: string, password: string) => Promise<User | null>;
  logoutStudent: () => void;
  resetStudentRegistration: (studentId: string) => Promise<void>;
  linkTelegram: (telegramCode: string) => Promise<{ success: boolean; error?: string }>;
  joinQueue: (name: string, room?: string, washCount?: number, paymentType?: string, expectedFinishAt?: string, chosenDate?: string) => Promise<void>;
  adminAddToQueue: (studentName: string, studentRoom?: string, washCount?: number, paymentType?: string, expectedFinishAt?: string, chosenDate?: string) => Promise<void>;
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
  banStudent: (studentId: string, reason?: string) => Promise<void>;
  unbanStudent: (studentId: string) => Promise<void>;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  verifyAdminKey: (key: string) => boolean;
  getUserQueueItem: () => QueueItem | undefined;
  isLoading: boolean;
  isNewUser: boolean; // ✅ ДОБАВИТЬ ЭТО
  setIsNewUser: (isNewUser: boolean) => void; // ✅ ДОБАВИТЬ ЭТО
  addStudent: (firstName: string, lastName: string, room?: string) => Promise<void>;
  updateStudent: (studentId: string, updates: { firstName?: string; lastName?: string; room?: string }) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  updateAdminKey: (newKey: string) => Promise<void>;
  updateQueueItemDetails: (queueId: string, updates: { washCount?: number; paymentType?: string; expectedFinishAt?: string; chosenDate?: string }) => Promise<void>;
  updateQueueEndTime: (queueId: string, endTime: string) => Promise<void>;
  
};

const LaundryContext = createContext<LaundryContextType | undefined>(undefined);

export function LaundryProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
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
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsAdmin(storedIsAdmin);

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
          console.warn('⚠️ Supabase client is not available for real-time updates');
          return;
        }
        
        console.log('🔌 Setting up Realtime subscriptions...');
        
        // Subscribe to queue changes
        const queueSubscription = supabase
          .channel('public:queue')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'queue' }, payload => {
            console.log('🔔 Queue change detected:', payload);
            fetchQueue();
          })
          .subscribe((status) => {
            console.log('Queue subscription status:', status);
          });
        
        // Subscribe to machine state changes
        const machineStateSubscription = supabase
          .channel('public:machine_state')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'machine_state' }, payload => {
            console.log('🔔 Machine state change detected:', payload);
            fetchMachineState();
          })
          .subscribe((status) => {
            console.log('Machine state subscription status:', status);
          });
        
        // Subscribe to history changes
        const historySubscription = supabase
          .channel('public:history')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'history' }, payload => {
            console.log('🔔 History change detected:', payload);
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
            console.log('🔔 Real-time machine state update:', payload);
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
      console.log('⚠️ Supabase not configured, cannot load students');
      return;
    }

    try {
      console.log('👥 Loading students...');
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('fullName', { ascending: true });

      if (error) throw error;
      console.log('✅ Students loaded:', data?.length);
      setStudents(data || []);
    } catch (error: any) {
      console.error('❌ Error loading students:', error);
      setStudents([]);
    }
  };

    // Register a new student using Supabase Auth
    const registerStudent = async (studentId: string, password: string): Promise<User | null> => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase не настроен');
      }
  
      try {
        // Check if student exists and is not registered
        const student = students.find(s => s.id === studentId);
        if (!student) throw new Error('Студент не найден');
        if (student.isRegistered) throw new Error('Этот студент уже зарегистрирован');
  
        // Create email from studentId for Supabase Auth
        const email = `${studentId}@laundry.local`;
        
        // Register with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              student_id: studentId,
              full_name: student.fullName,
              room: student.room
            }
          }
        });
  
        if (authError) throw authError;
        if (!authData.user) throw new Error('Не удалось создать пользователя');
  
        // Mark student as registered
        const { error: updateError } = await supabase
          .from('students')
          .update({ 
            isRegistered: true, 
            registeredAt: new Date().toISOString(),
            user_id: authData.user.id // Link to Supabase Auth user
          })
          .eq('id', studentId);
  
        if (updateError) throw updateError;
  
        // Create user object
        const newUser: User = {
          id: authData.user.id,
          studentId: student.id,
          name: student.fullName,
          room: student.room || undefined,
          telegram_chat_id: student.telegram_chat_id || undefined,
        };
        setUser(newUser);
        console.log('✅ Student registered:', newUser.name);
        return newUser;
      } catch (error: any) {
        console.error('❌ Error registering student:', error);
        throw error;
      }
    };
          // Login student using Supabase Auth
  const loginStudent = async (studentId: string, password: string): Promise<User | null> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Create email from studentId
      const email = `${studentId}@laundry.local`;
      
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Неверные учетные данные');

      // Get student info
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;
      if (!studentData.isRegistered) throw new Error('Студент не зарегистрирован');

      // ✅ ПРОВЕРКА БАНА
      if (studentData.is_banned) {
        const banReason = studentData.ban_reason || 'Не указана';
        throw new Error(`❌ Вы заблокированы!\n\nПричина: ${banReason}\n\nОбратитесь к администратору.`);
      }

      // Create user object
      const newUser: User = {
        id: authData.user.id,
        studentId: studentData.id,
        name: studentData.fullName,
        room: studentData.room || undefined,
        telegram_chat_id: studentData.telegram_chat_id || undefined,
      };

      // Check admin status
      const isAdminUser = studentData.firstName?.toLowerCase() === 'swaydikon';
      setIsAdmin(isAdminUser);
      console.log('🔑 Admin status:', isAdminUser);

      setUser(newUser);
      localStorage.setItem('laundryUser', JSON.stringify(newUser));

      console.log('✅ Student logged in with Supabase Auth:', newUser.name);
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
    localStorage.removeItem('laundryUser');
    console.log('👋 Student logged out');
  };

    // Admin: Reset student registration
    const resetStudentRegistration = async (studentId: string) => {
      if (!isAdmin) throw new Error('Требуются права администратора');
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase не настроен');
      }
  
      try {
        // Get student data
        const { data: studentData } = await supabase
          .from('students')
          .select('user_id')
          .eq('id', studentId)
          .single();
  
        if (studentData?.user_id) {
          // Delete from Supabase Auth (admin operation)
          const { error: authError } = await supabase.auth.admin.deleteUser(studentData.user_id);
          if (authError) console.warn('Could not delete auth user:', authError);
        }
  
        // Mark student as not registered
        const { error: updateError } = await supabase
          .from('students')
          .update({ 
            isRegistered: false, 
            registeredAt: null,
            user_id: null
          })
          .eq('id', studentId);
  
        if (updateError) throw updateError;
  
        // Reload students list
        await loadStudents();
  
        console.log('✅ Student registration reset');
      } catch (error: any) {
        console.error('❌ Error resetting registration:', error);
        throw error;
      }
    };

  // Связать Telegram с аккаунтом студента
  const linkTelegram = async (telegramCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Не авторизован' };
    }

    try {
      console.log('📤 Sending telegram link request:', { studentId: user.studentId, telegramChatId: telegramCode });
      const response = await fetch('/api/telegram/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: user.studentId, // ✅ Используем правильный ID из таблицы students
          telegramChatId: telegramCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Error from API:', data.error);
        return { success: false, error: data.error || 'Ошибка подключения' };
      }

      console.log('✅ API response:', data);

      // Обновить локального user
      const updatedUser = { ...user, telegram_chat_id: telegramCode };
      setUser(updatedUser);
      localStorage.setItem('laundryUser', JSON.stringify(updatedUser)); // ✅ Правильный ключ

      console.log('✅ Telegram успешно подключен, Chat ID:', telegramCode);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Error linking Telegram:', error);
      return { success: false, error: 'Ошибка сети' };
    }
  };

    // Fetch queue from Supabase or local storage
    const fetchQueue = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setQueue(getLocalQueue());
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('queue')
          .select('*')
          .order('position', { ascending: true });
        
        if (error) throw error;
        setQueue(data || []);
        // Also update local storage as backup
        saveLocalQueue(data || []);
      } catch (error: any) {
        console.error('Error fetching queue:', error);
        console.error('Error details:', error?.message, error?.details, error?.hint);
        // Fall back to local storage
        setQueue(getLocalQueue());
      }
    };
  
    // Fetch machine state from Supabase or local storage
    const fetchMachineState = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setMachineState(getLocalMachineState());
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('machine_state')
          .select('*')
          .single();
        
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        setMachineState(data || { status: MachineStatus.IDLE });
        // Also update local storage as backup
        saveLocalMachineState(data || { status: MachineStatus.IDLE });
      } catch (error: any) {
        console.error('Error fetching machine state:', error);
        console.error('Error details:', error?.message, error?.details, error?.hint);
        // Fall back to local storage
        setMachineState(getLocalMachineState());
      }
    };
  
    // Fetch history from Supabase or local storage
    const fetchHistory = async () => {
      if (!isSupabaseConfigured || !supabase) {
        setHistory(getLocalHistory());
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('history')
          .select('*')
          .order('finishedAt', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        setHistory(data || []);
        // Also update local storage as backup
        saveLocalHistory(data || []);
      } catch (error: any) {
        console.error('Error fetching history:', error);
        console.error('Error details:', error?.message, error?.details, error?.hint);
        // Fall back to local storage
        setHistory(getLocalHistory());
      }
    };

  const joinQueue = async (
    name: string,
    room?: string,
    washCount: number = 1,
    paymentType: string = 'money',
    expectedFinishAt?: string,
    chosenDate?: string
  ) => {
    if (!user) return;
    
    if (!supabase) {
      console.error('❌ Supabase not initialized');
      alert('Ошибка подключения к базе данных');
      return;
    }
  
    // ✅ ПРОВЕРКА БАНА
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('is_banned, ban_reason')
        .eq('id', user.studentId)
        .single();
  
      if (studentData?.is_banned) {
        const banReason = studentData.ban_reason || 'Не указана';
        alert(`❌ Вы заблокированы!\n\nПричина: ${banReason}`);
        logoutStudent();
        return;
      }
    } catch (err) {
      console.error('Error checking ban status:', err);
    }
  
    // ✅ Защита от повторного добавления
    if (isJoining) {
      console.log('⚠️ Already joining queue');
      return;
    }
  
    const existingLocal = queue.find(item =>
      item.studentId === user.studentId &&
      ['WAITING', 'READY', 'KEY_ISSUED', 'WASHING', 'queued', 'waiting', 'ready', 'washing'].includes(item.status)
    );
    
    if (existingLocal) {
      alert('Вы уже в очереди!');
      return;
    }
  
    // ✅ Определяем целевую дату
    const todayISO = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const targetDate = chosenDate || todayISO;
  
    console.log('📅 Target date:', targetDate);
  
    setIsJoining(true);
  
    try {
      // ✅ Получаем максимальную позицию для выбранной даты
      const { data: sameDayRows, error: posErr } = await supabase
        .from('queue')
        .select('position, scheduledForDate, currentDate')
        .eq('currentDate', targetDate)
        .eq('scheduledForDate', targetDate);
  
      if (posErr) {
        console.error('Error fetching positions:', posErr);
        throw posErr;
      }
  
      let nextPos = 1;
      if (sameDayRows && sameDayRows.length > 0) {
        const maxPos = Math.max(...sameDayRows.map((r: any) => r.position ?? 0));
        nextPos = maxPos + 1;
      }
  
      console.log('📊 Next position:', nextPos, 'for date:', targetDate);
  
      // ✅ Создаем новую запись
      const newItem = {
        id: crypto.randomUUID(),
        userId: user.id,
        studentId: user.studentId,
        userName: name,
        userRoom: room || null,
        washCount,
        paymentType,
        joinedAt: new Date().toISOString(),
        expectedFinishAt: expectedFinishAt || null,
        status: QueueStatus.WAITING,
        scheduledForDate: targetDate,
        currentDate: targetDate,
        position: nextPos,
      };
  
      console.log('➕ Inserting new queue item:', newItem);
  
      const { error } = await supabase.from('queue').insert(newItem);
  
      if (error) {
        if (error.code === '23505') {
          console.warn('⚠️ Duplicate entry blocked');
          alert('Вы уже в очереди!');
          return;
        }
        console.error('❌ Insert error:', error);
        throw error;
      }
  
      console.log('✅ Successfully added to queue');
  
      // ✅ Уведомление админа
      await sendTelegramNotification({
        type: 'joined',
        studentId: user.studentId,
        userName: name,
        userRoom: room,
        washCount,
        paymentType,
        queueLength: queue.length + 1,
        expectedFinishAt,
      });
  
      await fetchQueue();
  
    } catch (err: any) {
      console.error('❌ Error joining queue:', err);
      alert('Ошибка добавления в очередь: ' + err.message);
    } finally {
      setTimeout(() => setIsJoining(false), 1000);
    }
  };

  // ✅ Функция для админа - добавление студента в очередь без проверки дубликатов по админу
const adminAddToQueue = async (
  studentName: string,
  studentRoom?: string,
  washCount: number = 1,
  paymentType: string = 'money',
  expectedFinishAt?: string,
  chosenDate?: string
) => {
  if (!supabase) {
    console.error('❌ Supabase not initialized');
    alert('Ошибка подключения к базе данных');
    return;
  }

  // ✅ Определяем целевую дату
  const todayISO = new Date().toISOString().slice(0, 10);
  const targetDate = chosenDate || todayISO;

  console.log('📅 Admin adding to queue, target date:', targetDate);

  try {
    // ✅ Получаем максимальную позицию для выбранной даты
    const { data: sameDayRows, error: posErr } = await supabase
      .from('queue')
      .select('position, scheduledForDate, currentDate')
      .eq('currentDate', targetDate)
      .eq('scheduledForDate', targetDate);

    if (posErr) {
      console.error('Error getting positions:', posErr);
      alert('Ошибка получения данных очереди');
      return;
    }

    let nextPos = 1;
    if (sameDayRows && sameDayRows.length > 0) {
      const maxPos = Math.max(...sameDayRows.map(row => row.position || 0));
      nextPos = maxPos + 1;
    }

    // ✅ Проверяем дубликат по имени студента на эту дату
    const { data: existingStudent } = await supabase
      .from('queue')
      .select('id')
      .eq('userName', studentName)
      .eq('currentDate', targetDate)
      .in('status', ['WAITING', 'READY', 'KEY_ISSUED', 'WASHING']);

    if (existingStudent && existingStudent.length > 0) {
      alert(`${studentName} уже в очереди на ${targetDate}!`);
      return;
    }

    // ✅ Создаем новую запись
    const newItem = {
      id: crypto.randomUUID(),
      userId: `admin_${Date.now()}`, // Уникальный ID для админских записей
      studentId: null, // Админ добавляет, studentId может быть null
      userName: studentName,
      userRoom: studentRoom || null,
      washCount,
      paymentType,
      joinedAt: new Date().toISOString(),
      expectedFinishAt: expectedFinishAt || null,
      status: QueueStatus.WAITING,
      scheduledForDate: targetDate,
      currentDate: targetDate,
      position: nextPos,
    };

    const { error } = await supabase.from('queue').insert(newItem);

    if (error) {
      console.error('❌ Error inserting queue item:', error);
      alert('Ошибка добавления в очередь: ' + error.message);
      return;
    }

    console.log('✅ Admin added to queue:', newItem);
    await fetchQueue(); // Обновляем очередь

  } catch (error: any) {
    console.error('❌ Exception in adminAddToQueue:', error);
    alert('Ошибка: ' + error.message);
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
      console.log('✅ Status updated:', status);
    } catch (error) {
      console.error('❌ Error updating status:', error);
    }
  };

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
      console.log('✅ Return key alert updated:', alert);
      
      if (alert) {
        // Trigger alert and Telegram notification
        sendTelegramNotification({ type: 'admin_return_key', message: 'ПРИНЕСИТЕ КЛЮЧ!' });
      }
    } catch (error) {
      console.error('❌ Error updating return key alert:', error);
    }
  };

 // Admin: Start washing for a queue item
const startWashing = async (queueItemId: string) => {
  if (!isAdmin) {
    console.error('❌ Not admin!');
    return;
  }
  
  console.log('🎽 Starting washing for:', queueItemId);
  
  if (!isSupabaseConfigured || !supabase) {
    // Use local storage fallback
    startLocalWashing(queueItemId);
    fetchQueue();
    fetchMachineState();
    return;
  }
  
  try {
    const queueItem = queue.find(item => item.id === queueItemId);
    if (!queueItem) {
      console.error('❌ Queue item not found!');
      return;
    }
    
    console.log('🔄 Updating queue item status to WASHING...');
    // Update queue item status
    const { error: queueError } = await supabase
      .from('queue')
      .update({ status: QueueStatus.WASHING })
      .eq('id', queueItemId);
    
    if (queueError) {
      console.error('❌ Queue error:', queueError);
      throw queueError;
    }
    console.log('✅ Queue item status updated!');
    
    // Update machine state
    const newMachineState: MachineState = {
      status: MachineStatus.WASHING,
      currentQueueItemId: queueItemId,
      startedAt: new Date().toISOString(),
      expectedFinishAt: queueItem.expectedFinishAt,
    };
    
    console.log('🎰 Updating machine state:', newMachineState);
    const { error: machineError } = await supabase
      .from('machine_state')
      .upsert(newMachineState, { onConflict: 'id' });
    
    if (machineError) {
      console.error('❌ Machine error:', machineError);
      throw machineError;
    }
    console.log('✅ Machine state updated!');
    
    // Обновить локальный state немедленно
    setMachineState(newMachineState);
    saveLocalMachineState(newMachineState);
    console.log('✅ Local machine state updated:', newMachineState);
    
    // Обновить состояние для всех клиентов
    await fetchQueue();
    await fetchMachineState();
    
    console.log('✅✅✅ startWashing completed successfully!');
  } catch (error) {
    console.error('❌ Error starting washing:', error);
    // Fallback to local storage on error
    startLocalWashing(queueItemId);
    fetchQueue();
    fetchMachineState();
  }
};
  // Admin: Mark washing as done
  const markDone = async (queueItemId: string) => {
    if (!isAdmin) return;
    
    const queueItem = queue.find(item => item.id === queueItemId);
    if (!queueItem || queueItem.status !== QueueStatus.WASHING) return;
    
    if (!isSupabaseConfigured || !supabase) {
      // Use local storage fallback
      markLocalDone();
      fetchQueue(); // Refresh queue from local storage
      fetchMachineState(); // Refresh machine state from local storage
      fetchHistory(); // Refresh history from local storage
      return;
    }
    
    try {
      
      // Add to history
      const historyItem: HistoryItem = {
        id: uuidv4(),
        userId: queueItem.userId,
        userName: queueItem.userName,
        userRoom: queueItem.userRoom,
        startedAt: machineState.startedAt || new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      };
      
      const { error: historyError } = await supabase
        .from('history')
        .insert(historyItem);
      
      if (historyError) throw historyError;
      
      // Удалить из очереди (вместо статуса DONE)
      const { error: deleteError } = await supabase
        .from('queue')
        .delete()
        .eq('id', queueItemId);
      
      if (deleteError) throw deleteError;
      
      // Reset machine state
      const idleMachineState: MachineState = {
        status: MachineStatus.IDLE,
        currentQueueItemId: undefined,
        startedAt: undefined,
        expectedFinishAt: undefined,
      };
      const { error: machineError } = await supabase
        .from('machine_state')
        .upsert(idleMachineState);
      
      if (machineError) throw machineError;
      
      setMachineState(idleMachineState);
      saveLocalMachineState(idleMachineState);
    } catch (error) {
      console.error('Error marking done:', error);
      // Fallback to local storage on error
      markLocalDone();
      fetchQueue(); // Refresh queue from local storage
      fetchMachineState(); // Refresh machine state from local storage
      fetchHistory(); // Refresh history from local storage
    }
  };

  // Admin: Cancel washing (return to queue)
  const cancelWashing = async (queueItemId: string) => {
    if (!isAdmin) return;
    
    const queueItem = queue.find(item => item.id === queueItemId);
    if (!queueItem || queueItem.status !== QueueStatus.WASHING) return;
    
    if (!isSupabaseConfigured || !supabase) {
      // Use local storage fallback
      const queue = getLocalQueue();
      const item = queue.find(i => i.id === queueItemId);
      if (item) {
        item.status = QueueStatus.WAITING;
        saveLocalQueue(queue);
      }
      saveLocalMachineState({ status: MachineStatus.IDLE });
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
          currentQueueItemId: null,
          startedAt: null,
          expectedFinishAt: null,
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
      startLocalNext();
      fetchQueue(); // Refresh queue from local storage
      fetchMachineState(); // Refresh machine state from local storage
      return;
    }
    
    const nextItem = queue.find(item => item.status === QueueStatus.WAITING || item.status === QueueStatus.READY);
    if (nextItem) {
      await startWashing(nextItem.id);
    } else if (!isSupabaseConfigured || !supabase) {
      // Fallback to local storage on error
      startLocalNext();
      fetchQueue(); // Refresh queue from local storage
      fetchMachineState(); // Refresh machine state from local storage
    }
  };

  // Admin: Clear queue
  const clearQueue = async () => {
    if (!isAdmin) return;
    
    if (!isSupabaseConfigured || !supabase) {
      // Use local storage fallback
      clearLocalQueue();
      fetchQueue(); // Refresh queue from local storage
      fetchMachineState(); // Refresh machine state from local storage
      return;
    }
    
    try {
      // Reset machine state
      const { error: machineError } = await supabase
        .from('machine_state')
        .upsert({
          status: MachineStatus.IDLE,
          currentQueueItemId: null,
          startedAt: null,
          expectedFinishAt: null,
        });
      
      if (machineError) throw machineError;
      
      // Delete all queue items except those currently washing
      const { error: queueError } = await supabase
        .from('queue')
        .delete()
        .eq('status', QueueStatus.WAITING);
      
      if (queueError) throw queueError;
    } catch (error) {
      console.error('Error clearing queue:', error);
      // Fallback to local storage on error
      clearLocalQueue();
      fetchQueue(); // Refresh queue from local storage
      fetchMachineState(); // Refresh machine state from local storage
    }
  };

  // Удалить конкретного человека из очереди
  const removeFromQueue = async (queueItemId: string) => {
    if (!isAdmin) return;

    if (!isSupabaseConfigured || !supabase) {
      // Local storage fallback
      const localQueue = getLocalQueue();
      const updatedQueue = localQueue.filter(item => item.id !== queueItemId);
      saveLocalQueue(updatedQueue);
      fetchQueue();
      return;
    }

    try {
      const { error } = await supabase
        .from('queue')
        .delete()
        .eq('id', queueItemId);

      if (error) throw error;

      console.log('✅ Queue item removed:', queueItemId);
      await fetchQueue();
    } catch (error) {
      console.error('❌ Error removing from queue:', error);
    }
  };

  // Очистить завершенных из очереди
  const clearCompletedQueue = async () => {
    if (!isAdmin) return;

    if (!isSupabaseConfigured || !supabase) {
      // Local storage fallback
      const localQueue = getLocalQueue();
      const updatedQueue = localQueue.filter(item => item.status !== QueueStatus.DONE);
      saveLocalQueue(updatedQueue);
      fetchQueue();
      return;
    }

    try {
      const { error } = await supabase
        .from('queue')
        .delete()
        .eq('status', QueueStatus.DONE);

      if (error) throw error;

      console.log('✅ Completed queue items cleared');
      await fetchQueue();
    } catch (error) {
      console.error('❌ Error clearing completed queue:', error);
    }
  };

  // Забанить студента
  const banStudent = async (studentId: string, reason?: string) => {
    if (!isAdmin) return;
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase не настроен');
    }
  
    try {
      console.log('🚫 Banning student:', studentId, 'Reason:', reason);
  
      // Убрать из очереди
      const { error: queueError } = await supabase
        .from('queue')
        .delete()
        .eq('studentId', studentId);
  
      if (queueError) {
        console.error('Error removing from queue:', queueError);
      }
  
      // Забанить
      const { error } = await supabase
        .from('students')
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          ban_reason: reason || 'Не указано',
        })
        .eq('id', studentId);
  
      if (error) {
        console.error('Ban error:', error);
        throw error;
      }
  
      console.log('✅ Student banned successfully');
      await loadStudents();
      await fetchQueue();
    } catch (error) {
      console.error('❌ Error banning student:', error);
      throw error;
    }
  };

  // Разбанить студента
  const unbanStudent = async (studentId: string) => {
    if (!isAdmin) return;
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      const { error } = await supabase
        .from('students')
        .update({
          is_banned: false,
          banned_at: null,
          ban_reason: null,
        })
        .eq('id', studentId);

      if (error) throw error;

      console.log('✅ Student unbanned:', studentId);
      await loadStudents();
    } catch (error) {
      console.error('❌ Error unbanning student:', error);
      throw error;
    }
  };

  // Добавить нового студента
const addStudent = async (firstName: string, lastName: string, room?: string) => {
  if (!isAdmin) throw new Error('Требуются права администратора');
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase не настроен');
  }

  try {
    const fullName = `${firstName} ${lastName}`;
    const { error } = await supabase
      .from('students')
      .insert({
        id: uuidv4(),
        firstName,
        lastName,
        fullName,
        room: room || null,
        isRegistered: false,
        createdAt: new Date().toISOString(),
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
  updates: { firstName?: string; lastName?: string; room?: string }
) => {
  if (!isAdmin) throw new Error('Требуются права администратора');
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase не настроен');
  }

  try {
    const updateData: any = { ...updates };
    
    // Если изменяются имя или фамилия, обновляем fullName
    if (updates.firstName || updates.lastName) {
      const student = students.find(s => s.id === studentId);
      if (student) {
        const firstName = updates.firstName || student.firstName;
        const lastName = updates.lastName || student.lastName;
        updateData.fullName = `${firstName} ${lastName}`;
      }
    }

    const { error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', studentId);

    if (error) throw error;

    console.log('✅ Student updated:', studentId);
    await loadStudents();
  } catch (error: any) {
    console.error('❌ Error updating student:', error);
    throw error;
  }
};

// Удалить студента
const deleteStudent = async (studentId: string) => {
  if (!isAdmin) throw new Error('Требуются права администратора');
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase не настроен');
  }

  try {
    // Удалить из очереди
    await supabase
      .from('queue')
      .delete()
      .eq('studentId', studentId);

    // Удалить аутентификацию
    await supabase
      .from('student_auth')
      .delete()
      .eq('studentId', studentId);

    // Удалить студента
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (error) throw error;

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
  if (!isAdmin) throw new Error('Требуются права администратора');
  
  try {
    const response = await fetch('/api/admin/update-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newKey }),
    });

    if (!response.ok) throw new Error('Ошибка обновления ключа');

    console.log('✅ Admin key updated');
    alert('Админ-ключ обновлён! Перезагрузите страницу.');
  } catch (error: any) {
    console.error('❌ Error updating admin key:', error);
    throw error;
  }
};

  // Verify admin key
  const verifyAdminKey = (key: string): boolean => {
    const isValid = key === ADMIN_KEY;
    if (isValid) {
      setIsAdmin(true);
    }
    return isValid;
  };

  // Get current user's queue item if it exists
  const getUserQueueItem = (): QueueItem | undefined => {
    if (!user) return undefined;
    return queue.find(item => item.studentId === user.studentId && 
                     (item.status === QueueStatus.WAITING || item.status === QueueStatus.READY || item.status === QueueStatus.KEY_ISSUED || item.status === QueueStatus.WASHING));
  };

  // Leave the queue
const leaveQueue = async (queueItemId: string) => {
  if (!user) return;
  
  if (!isSupabaseConfigured || !supabase) {
    // Use local storage fallback
    removeFromLocalQueue(queueItemId, user.id);
    fetchQueue();
    return;
  }
  
  try {
    console.log('❌ Leaving queue:', { queueItemId, studentId: user.studentId });
    const { error } = await supabase
      .from('queue')
      .delete()
      .eq('id', queueItemId)
      .eq('studentId', user.studentId);
    
    if (error) {
      console.error('❌ Error from Supabase:', error);
      throw error;
    }
    console.log('✅ Successfully left queue');
  } catch (error) {
    console.error('❌ Error leaving queue:', error);
    // Fallback to local storage on error
    removeFromLocalQueue(queueItemId, user.id);
    fetchQueue();
  }
};

// Update queue item details
const updateQueueItem = async (queueItemId: string, updates: Partial<QueueItem>) => {
  console.log('📦 updateQueueItem called:', { queueItemId, updates, isAdmin, user });
  
  if (!isSupabaseConfigured || !supabase) {
    // Use local storage fallback
    if (user) {
      updateLocalQueueItem(queueItemId, user.id, updates);
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
        console.error('❌ User not found for non-admin update');
        return;
      }
      query = query.eq('studentId', user.studentId);
    }
    
    const { error } = await query;
    
    if (error) {
      console.error('❌ Error from Supabase:', error);
      throw error;
    }
    
    console.log('✅ Queue item updated successfully');
  } catch (error) {
    console.error('❌ Error updating queue item:', error);
    // Fallback to local storage on error
    if (user) {
      updateLocalQueueItem(queueItemId, user.id, updates);
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

// Admin: Send message to queue item
const sendAdminMessage = async (queueItemId: string, message: string) => {
  if (!isAdmin) return;
  
  if (!isSupabaseConfigured || !supabase) {
    // Use local storage fallback
    const queue = getLocalQueue();
    const item = queue.find(i => i.id === queueItemId);
    if (item) {
      item.adminMessage = message;
      saveLocalQueue(queue);
    }
    fetchQueue();
    return;
  }
  
  try {
    const { error } = await supabase
      .from('queue')
      .update({ adminMessage: message })
      .eq('id', queueItemId);
    
    if (error) throw error;
    console.log('✅ Admin message sent');
  } catch (error) {
    console.error('❌ Error sending admin message:', error);
  }
};

// ✅ Перенос незавершенных на следующий день
const transferSelectedToNextDay = async (selectedIds: string[]) => {
  try {
    // Получить все незавершенные записи (WAITING, READY, KEY_ISSUED)
    const unfinishedStatuses = [QueueStatus.WAITING, QueueStatus.READY, QueueStatus.KEY_ISSUED];
    
    const unfinishedItems = queue.filter(item => 
      selectedIds.includes(item.id) && unfinishedStatuses.includes(item.status)
    );
    
    if (unfinishedItems.length === 0) {
      alert('✅ Нет незавершенных записей для переноса');
      return;
    }
    
    // Перенести на следующий день
    const nextDay = addDays(new Date(), 1);
    const nextDayStr = format(nextDay, 'yyyy-MM-dd');
    
    if (!isSupabaseConfigured) {
      // Локальный режим
      // Найти минимальную позицию на целевой дате в текущем queue
      const targetDate = nextDayStr;
      const existingOnDate = queue.filter(item => item.currentDate === targetDate);
      const minPosition = existingOnDate.length > 0 ? Math.min(...existingOnDate.map(item => item.position)) : 0;

      const updatedQueue = queue.map(item => {
        const index = unfinishedItems.findIndex(u => u.id === item.id);
        if (index !== -1) {
          return { 
            ...item, 
            currentDate: targetDate, 
            scheduledForDate: targetDate,
            position: minPosition - 10000 - index  // Перенесенные первыми, порядок сохраняется
          };
        }
        return item;
      });
      setQueue(updatedQueue);
      saveLocalQueue(updatedQueue);
      alert(`✅ ${unfinishedItems.length} записей перенесено на ${format(nextDay, 'dd.MM.yyyy')}!`);
    } else {
      if (supabase) {
        // Supabase режим
        // Сначала обновить даты для переносимых записей
        for (let i = 0; i < unfinishedItems.length; i++) {
          const item = unfinishedItems[i];
          await supabase
            .from('queue')
            .update({ 
              currentDate: nextDayStr,
              scheduledForDate: nextDayStr
            })
            .eq('id', item.id);
        }
        
        // Получить все записи на целевой дате и пересортировать
        const { data: allOnDate } = await supabase
          .from('queue')
          .select('*')
          .eq('currentDate', nextDayStr);

        if (allOnDate) {
          const transferred = allOnDate.filter(item => unfinishedItems.some(u => u.id === item.id));
          const existing = allOnDate.filter(item => !unfinishedItems.some(u => u.id === item.id));
          
          // Сортировать перенесенные по порядку в unfinishedItems (сохраняет порядок переноса)
          transferred.sort((a, b) => unfinishedItems.findIndex(u => u.id === a.id) - unfinishedItems.findIndex(u => u.id === b.id));
          
          // existing сортировать по текущей position
          existing.sort((a, b) => a.position - b.position);
          
          // Новый порядок: перенесенные + существующие (первый в дне остается первым)
          const newOrder = [...existing, ...transferred];
          
          // Присвоить position 1, 2, 3...
          for (let k = 0; k < newOrder.length; k++) {
            await supabase
              .from('queue')
              .update({ position: k + 1 })
              .eq('id', newOrder[k].id);
          }
        }

        alert(`✅ ${unfinishedItems.length} записей перенесено на ${format(nextDay, 'dd.MM.yyyy')}!`);
        await fetchQueue();  // Обновить после пересчета
      }
    }
  } catch (err: any) {
    console.error('Exception transferring:', err);
    alert('Ошибка: ' + err.message);
  }
};

// ✅ Перенос незавершенных на предыдущий день
const transferSelectedToPreviousDay = async (selectedIds: string[]) => {
  try {
    // Получить все незавершенные записи (WAITING, READY, KEY_ISSUED)
    const unfinishedStatuses = [QueueStatus.WAITING, QueueStatus.READY, QueueStatus.KEY_ISSUED];
    
    const unfinishedItems = queue.filter(item => 
      selectedIds.includes(item.id) && unfinishedStatuses.includes(item.status)
    );
    
    if (unfinishedItems.length === 0) {
      alert('✅ Нет незавершенных записей для переноса');
      return;
    }
    
    // Перенести на предыдущий день
    const prevDay = addDays(new Date(), -1);
    const prevDayStr = format(prevDay, 'yyyy-MM-dd');
    
    if (!isSupabaseConfigured) {
      // Локальный режим
      // Найти минимальную позицию на целевой дате в текущем queue
      const targetDate = prevDayStr;
      const existingOnDate = queue.filter(item => item.currentDate === targetDate);
      const minPosition = existingOnDate.length > 0 ? Math.min(...existingOnDate.map(item => item.position)) : 0;

      const updatedQueue = queue.map(item => {
        const index = unfinishedItems.findIndex(u => u.id === item.id);
  if (index !== -1) {
    return { 
      ...item, 
      currentDate: targetDate, 
      scheduledForDate: targetDate,
      position: minPosition - 10000 - index  // Перенесенные первыми, порядок сохраняется
    };
  }
  return item;
});
      setQueue(updatedQueue);
      saveLocalQueue(updatedQueue);
      alert(`✅ ${unfinishedItems.length} записей перенесено на ${format(prevDay, 'dd.MM.yyyy')}!`);
    } else {
      if (supabase) {
        // Supabase режим
        // Сначала обновить даты для переносимых записей
        for (let i = 0; i < unfinishedItems.length; i++) {
          const item = unfinishedItems[i];
          await supabase
            .from('queue')
            .update({ 
              currentDate: prevDayStr,
              scheduledForDate: prevDayStr
            })
            .eq('id', item.id);
        }
        
        // Получить все записи на целевой дате и пересортировать
        const { data: allOnDate } = await supabase
          .from('queue')
          .select('*')
          .eq('currentDate', prevDayStr);

        if (allOnDate) {
          const transferred = allOnDate.filter(item => unfinishedItems.some(u => u.id === item.id));
          const existing = allOnDate.filter(item => !unfinishedItems.some(u => u.id === item.id));
          
          // Сортировать перенесенные по порядку в unfinishedItems (сохраняет порядок переноса)
          transferred.sort((a, b) => unfinishedItems.findIndex(u => u.id === a.id) - unfinishedItems.findIndex(u => u.id === b.id));
          
          // existing сортировать по текущей position
          existing.sort((a, b) => a.position - b.position);
          
          // Новый порядок: перенесенные + существующие (первый в дне остается первым)
          const newOrder = [...existing, ...transferred];
          
          // Присвоить position 1, 2, 3...
          for (let k = 0; k < newOrder.length; k++) {
            await supabase
              .from('queue')
              .update({ position: k + 1 })
              .eq('id', newOrder[k].id);
          }
        }

        alert(`✅ ${unfinishedItems.length} записей перенесено на ${format(prevDay, 'dd.MM.yyyy')}!`);
        await fetchQueue();
      }
    }
  } catch (err: any) {
    console.error('Exception transferring:', err);
    alert('Ошибка: ' + err.message);
  }
};

// ✅ Перенос незавершенных на сегодняшний день
const transferSelectedToToday = async (selectedIds: string[]) => {
  try {
    // Получить все незавершенные записи (WAITING, READY, KEY_ISSUED)
    const unfinishedStatuses = [QueueStatus.WAITING, QueueStatus.READY, QueueStatus.KEY_ISSUED];
    
    const unfinishedItems = queue.filter(item => 
      selectedIds.includes(item.id) && unfinishedStatuses.includes(item.status)
    );
    
    if (unfinishedItems.length === 0) {
      alert('✅ Нет незавершенных записей для переноса');
      return;
    }
    
    // Перенести на сегодняшний день
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    if (!isSupabaseConfigured) {
      // Локальный режим
      // Найти минимальную позицию на целевой дате в текущем queue
      const targetDate = todayStr;
      const existingOnDate = queue.filter(item => item.currentDate === targetDate);
      const minPosition = existingOnDate.length > 0 ? Math.min(...existingOnDate.map(item => item.position)) : 0;

      const updatedQueue = queue.map(item => {
        const index = unfinishedItems.findIndex(u => u.id === item.id);
        if (index !== -1) {
          return { 
            ...item, 
            currentDate: targetDate, 
            scheduledForDate: targetDate,
            position: minPosition - 10000 - index  // Перенесенные первыми, порядок сохраняется
          };
        }
        return item;
      });
      setQueue(updatedQueue);
      saveLocalQueue(updatedQueue);
      alert(`✅ ${unfinishedItems.length} записей перенесено на ${format(today, 'dd.MM.yyyy')}!`);
    } else {
      if (supabase) {
        // Supabase режим
        // Сначала обновить даты для переносимых записей
        for (let i = 0; i < unfinishedItems.length; i++) {
          const item = unfinishedItems[i];
          await supabase
            .from('queue')
            .update({ 
              currentDate: todayStr,
              scheduledForDate: todayStr
            })
            .eq('id', item.id);
        }
        
        // Получить все записи на целевой дате и пересортировать
        const { data: allOnDate } = await supabase
          .from('queue')
          .select('*')
          .eq('currentDate', todayStr);

        if (allOnDate) {
          const transferred = allOnDate.filter(item => unfinishedItems.some(u => u.id === item.id));
          const existing = allOnDate.filter(item => !unfinishedItems.some(u => u.id === item.id));
          
          // Сортировать перенесенные по порядку в unfinishedItems (сохраняет порядок переноса)
          transferred.sort((a, b) => unfinishedItems.findIndex(u => u.id === a.id) - unfinishedItems.findIndex(u => u.id === b.id));
          
          // existing сортировать по текущей position
          existing.sort((a, b) => a.position - b.position);
          
          // Новый порядок: перенесенные + существующие (первый в дне остается первым)
          const newOrder = [...existing, ...transferred];
          
          // Присвоить position 1, 2, 3...
          for (let k = 0; k < newOrder.length; k++) {
            await supabase
              .from('queue')
              .update({ position: k + 1 })
              .eq('id', newOrder[k].id);
          }
        }

        alert(`✅ ${unfinishedItems.length} записей перенесено на ${format(today, 'dd.MM.yyyy')}!`);
        await fetchQueue();  // Обновить после пересчета
      }
    }
  } catch (err: any) {
    console.error('Exception transferring:', err);
    alert('Ошибка: ' + err.message);
  }
};

// ✅ Функция для редактирования параметров очереди
const updateQueueItemDetails = async (
  queueId: string, 
  updates: {
    washCount?: number;
    paymentType?: string;
    expectedFinishAt?: string;
    chosenDate?: string;
  }
) => {
  if (!supabase) {
    console.error('❌ Supabase not initialized');
    return;
  }

  try {
    const item = queue.find(q => q.id === queueId);
    if (!item) {
      alert('❌ Запись не найдена');
      return;
    }

    // ✅ Проверяем, можно ли редактировать
    if (item.status !== QueueStatus.WAITING) {
      alert('❌ Можно редактировать только записи в ожидании');
      return;
    }

    const updateData: any = {};
    if (updates.washCount !== undefined) updateData.washCount = updates.washCount;
    if (updates.paymentType !== undefined) updateData.paymentType = updates.paymentType;
    if (updates.expectedFinishAt !== undefined) updateData.expectedFinishAt = updates.expectedFinishAt;
    if (updates.chosenDate !== undefined) {
      updateData.scheduledForDate = updates.chosenDate;
      updateData.currentDate = updates.chosenDate;
    }

    const { error } = await supabase
      .from('queue')
      .update(updateData)
      .eq('id', queueId);

    if (error) {
      console.error('❌ Error updating queue item:', error);
      alert('Ошибка обновления: ' + error.message);
      return;
    }

    console.log('✅ Queue item updated:', updateData);
    await fetchQueue(); // Обновляем очередь
    
    // ✅ Уведомление админа если изменилось время окончания
    if (updates.expectedFinishAt && user) {
      await sendTelegramNotification({
        type: 'updated',
        studentId: user.studentId,
        userName: item.userName,
        userRoom: item.userRoom,
        washCount: updates.washCount || item.washCount,
        paymentType: updates.paymentType || item.paymentType,
        expectedFinishAt: updates.expectedFinishAt,
      });
    }

  } catch (error: any) {
    console.error('❌ Exception in updateQueueItemDetails:', error);
    alert('Ошибка: ' + error.message);
  }
};

// ✅ Изменение позиции в очереди (вверх/вниз) - ТОЛЬКО ВНУТРИ ОДНОЙ ДАТЫ
const changeQueuePosition = async (queueId: string, direction: 'up' | 'down') => {
  if (!supabase) {
    alert('❌ Supabase не подключен');
    return;
  }
  
  try {
    // Найдем элемент для перемещения
    const itemToMove = queue.find(item => item.id === queueId);
    if (!itemToMove) {
      alert('❌ Запись не найдена');
      return;
    }
    
    // Получим все элементы за эту дату
    const sameDayItems = queue
      .filter(item => item.currentDate === itemToMove.currentDate && item.scheduledForDate === itemToMove.scheduledForDate)
      .sort((a, b) => a.position - b.position);
    
    const currentIndex = sameDayItems.findIndex(item => item.id === queueId);
    
    if (direction === 'up' && currentIndex > 0) {
      // Меняем с предыдущим элементом
      const prevItem = sameDayItems[currentIndex - 1];
      
      // Обновляем позиции в базе данных
      await supabase.from('queue').update({ position: prevItem.position }).eq('id', queueId);
      await supabase.from('queue').update({ position: itemToMove.position }).eq('id', prevItem.id);
      
    } else if (direction === 'down' && currentIndex < sameDayItems.length - 1) {
      // Меняем со следующим элементом
      const nextItem = sameDayItems[currentIndex + 1];
      
      // Обновляем позиции в базе данных
      await supabase.from('queue').update({ position: nextItem.position }).eq('id', queueId);
      await supabase.from('queue').update({ position: itemToMove.position }).eq('id', nextItem.id);
    }
    
    await fetchQueue();
  } catch (err: any) {
    console.error('Exception changing position:', err);
    alert('Ошибка: ' + err.message);
  }
};

  const value = {
    user,
    setUser,
    students,
    queue,
    machineState,
    history,
    registerStudent,
    loginStudent,
    logoutStudent,
    resetStudentRegistration,
    linkTelegram,
    joinQueue,
    leaveQueue,
    updateQueueItem,
    sendAdminMessage,
    setQueueStatus,
    setReturnKeyAlert,
    startWashing,
    cancelWashing,
    markDone,
    startNext,
    clearQueue,
    removeFromQueue,
    clearCompletedQueue,
    banStudent,
    unbanStudent,
    isAdmin,
    setIsAdmin,
    verifyAdminKey,
    getUserQueueItem,
    isLoading,
    isNewUser,
    setIsNewUser,
    addStudent,
   updateStudent,
   deleteStudent,
   updateAdminKey,
   transferSelectedToNextDay,
   transferSelectedToPreviousDay,
   transferSelectedToToday,  
   changeQueuePosition,
   adminAddToQueue,
   updateQueueItemDetails,
   updateQueueEndTime,              
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