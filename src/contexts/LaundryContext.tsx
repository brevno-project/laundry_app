"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { User, Student, QueueItem, MachineStatus, QueueStatus, MachineState, HistoryItem } from '@/types';
import { hashPassword, verifyPassword } from '@/lib/auth';
import { getLaundryTimeStatus } from '@/lib/timeHelper';
import { sendTelegramNotification } from '@/lib/telegram';
import { parseISO, addMinutes } from 'date-fns';
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
  registerStudent: (studentId: string, password: string) => Promise<User | null>;
  loginStudent: (studentId: string, password: string) => Promise<User | null>;
  logoutStudent: () => void;
  resetStudentRegistration: (studentId: string) => Promise<void>;
  linkTelegram: (telegramCode: string) => Promise<{ success: boolean; error?: string }>;
  joinQueue: (name: string, room?: string, washCount?: number, paymentType?: string, expectedFinishAt?: string) => void;
  leaveQueue: (queueItemId: string) => void;
  updateQueueItem: (queueItemId: string, updates: Partial<QueueItem>) => void;
  sendAdminMessage: (queueItemId: string, message: string) => Promise<void>;
  setQueueStatus: (queueItemId: string, status: QueueStatus) => Promise<void>;
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
        
        return () => {
          queueSubscription.unsubscribe();
          machineStateSubscription.unsubscribe();
          historySubscription.unsubscribe();
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

  // Register a new student
  const registerStudent = async (studentId: string, password: string): Promise<User | null> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Check if student exists and is not registered
      const student = students.find(s => s.id === studentId);
      if (!student) throw new Error('Студент не найден');
      if (student.isRegistered) throw new Error('Этот студент уже зарегистрирован');

      // Hash password
      const passwordHash = await hashPassword(password);

      // Save password
      const { error: authError } = await supabase
        .from('student_auth')
        .insert({ studentId, passwordHash });

      if (authError) throw authError;

      // Mark student as registered
      const { error: updateError } = await supabase
        .from('students')
        .update({ isRegistered: true, registeredAt: new Date().toISOString() })
        .eq('id', studentId);

      if (updateError) throw updateError;

      // Auto-login after registration
      const user = await loginStudent(studentId, password);
      
      // Reload students list
      await loadStudents();

      console.log('✅ Student registered successfully');
      return user;
    } catch (error: any) {
      console.error('❌ Error registering student:', error);
      throw error;
    }
  };

  // Login student
  const loginStudent = async (studentId: string, password: string): Promise<User | null> => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase не настроен');
    }

    try {
      // Get student info
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;
      if (!studentData.isRegistered) throw new Error('Студент не зарегистрирован');

      // Get password hash
      const { data: authData, error: authError } = await supabase
        .from('student_auth')
        .select('passwordHash')
        .eq('studentId', studentId)
        .single();

      if (authError) throw authError;

      // Verify password
      const isValid = await verifyPassword(password, authData.passwordHash);
      if (!isValid) throw new Error('Неверный пароль');

      // Create user object
      const newUser: User = {
        id: uuidv4(),
        studentId: studentData.id, // ✅ ТОЧНЫЙ ID из базы данных
        name: studentData.fullName,
        room: studentData.room || undefined,
        telegram_chat_id: studentData.telegram_chat_id || undefined,
      };

      console.log('✅ Created user object:', { id: newUser.id, studentId: newUser.studentId, name: newUser.name });

      // Проверка админа (если имя = swaydikon)
      const isAdminUser = studentData.firstName?.toLowerCase() === 'swaydikon';
      setIsAdmin(isAdminUser);
      console.log('🔑 Admin status:', isAdminUser);

      setUser(newUser);
      localStorage.setItem('laundryUser', JSON.stringify(newUser));

      console.log('✅ Student logged in:', newUser.name);
      return newUser;
    } catch (error: any) {
      console.error('❌ Error logging in:', error);
      throw error;
    }
  };

  // Logout student
  const logoutStudent = () => {
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
      // Delete password
      const { error: authError } = await supabase
        .from('student_auth')
        .delete()
        .eq('studentId', studentId);

      if (authError) throw authError;

      // Mark student as not registered
      const { error: updateError } = await supabase
        .from('students')
        .update({ isRegistered: false, registeredAt: null })
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
      console.log('📱 Using localStorage for queue');
      setQueue(getLocalQueue());
      return;
    }
    
    try {
      console.log('🔄 Fetching queue from Supabase...');
      const { data, error } = await supabase
        .from('queue')
        .select('*')
        .order('joinedAt', { ascending: true });
      
      if (error) throw error;
      console.log('✅ Queue fetched:', data);
      
      // Проверка expectedFinishAt
      if (data && data.length > 0) {
        data.forEach((item, index) => {
          console.log(`📊 Item ${index + 1}:`, {
            userName: item.userName,
            status: item.status,
            expectedFinishAt: item.expectedFinishAt,
            hasExpectedFinishAt: !!item.expectedFinishAt
          });
        });
      }
      
      setQueue(data || []);
      // Also update local storage as backup
      saveLocalQueue(data || []);
    } catch (error: any) {
      console.error('❌ Error fetching queue:', error);
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
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is for no rows returned
      
      if (data) {
        setMachineState(data);
        // Also update local storage as backup
        saveLocalMachineState(data);
      }
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

  // Join the queue
  const joinQueue = async (name: string, room?: string, washCount: number = 1, paymentType: string = 'money', expectedFinishAt?: string) => {
    if (!user) return;
    
    // Update user name if it changed
    if (name !== user.name || room !== user.room) {
      const updatedUser = { ...user, name, room };
      setUser(updatedUser);
    }
    
    // Check if user is already in queue
    const existingItem = queue.find(item => 
      item.studentId === user.studentId && 
      (item.status === QueueStatus.WAITING || item.status === QueueStatus.READY || item.status === QueueStatus.KEY_ISSUED || item.status === QueueStatus.WASHING)
    );
    if (existingItem) {
      console.log('⚠️ User already in queue:', existingItem);
      return;
    }
    
    // Create new queue item
    const newItem: QueueItem = {
      id: uuidv4(),
      userId: user.id,
      studentId: user.studentId, // Добавляем studentId для поиска telegram_chat_id
      userName: name,
      userRoom: room,
      washCount: washCount,
      paymentType: paymentType,
      joinedAt: new Date().toISOString(),
      expectedFinishAt: expectedFinishAt,
      status: QueueStatus.WAITING,
    };
    
    if (!isSupabaseConfigured || !supabase) {
      // Use local storage fallback
      addToLocalQueue(user);
      fetchQueue();
      return;
    }
    
    try {
      console.log('➜ Adding to queue:', newItem);
      const { error } = await supabase.from('queue').insert(newItem);
      if (error) throw error;
      console.log('✅ Successfully added to queue');
      
      // Отправить уведомление в Telegram
      sendTelegramNotification({
        type: 'joined',
        userName: name,
        userRoom: room,
        washCount: washCount,
        paymentType: paymentType,
        queueLength: queue.length + 1,
      });
    } catch (error: any) {
      console.error('❌ Error joining queue:', error);
      console.error('Error details:', error?.message, error?.details, error?.hint, error?.code);
      // Fallback to local storage on error
      addToLocalQueue(user);
      fetchQueue();
    }
  };

  // Leave the queue
  const leaveQueue = async (queueItemId: string) => {
    if (!user) return;
    
    if (!isSupabaseConfigured || !supabase) {
      // Use local storage fallback
      removeFromLocalQueue(queueItemId, user.id);
      fetchQueue(); // Refresh queue from local storage
      return;
    }
    
    try {
      console.log('❌ Leaving queue:', { queueItemId, studentId: user.studentId });
      const { error } = await supabase
        .from('queue')
        .delete()
        .eq('id', queueItemId)
        .eq('studentId', user.studentId); // ✅ Используем studentId для проверки
      
      if (error) {
        console.error('❌ Error from Supabase:', error);
        throw error;
      }
      console.log('✅ Successfully left queue');
    } catch (error) {
      console.error('❌ Error leaving queue:', error);
      // Fallback to local storage on error
      removeFromLocalQueue(queueItemId, user.id);
      fetchQueue(); // Refresh queue from local storage
    }
  };

  // Update queue item details
  const updateQueueItem = async (queueItemId: string, updates: Partial<QueueItem>) => {
    if (!user) return;
    
    if (!isSupabaseConfigured || !supabase) {
      // Use local storage fallback
      updateLocalQueueItem(queueItemId, user.id, updates);
      fetchQueue(); // Refresh queue from local storage
      return;
    }
    
    try {
      const { error } = await supabase
        .from('queue')
        .update(updates)
        .eq('id', queueItemId)
        .eq('userId', user.id); // Only allow users to update their own entries
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating queue item:', error);
      // Fallback to local storage on error
      updateLocalQueueItem(queueItemId, user.id, updates);
      fetchQueue(); // Refresh queue from local storage
    }
  };

  // Admin: Отправить сообщение студенту
  const sendAdminMessage = async (queueItemId: string, message: string) => {
    if (!isAdmin) return;
    
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase not configured');
      return;
    }

    try {
      const { error } = await supabase
        .from('queue')
        .update({ adminMessage: message })
        .eq('id', queueItemId);
      
      if (error) throw error;
      console.log('✅ Admin message sent:', message);
    } catch (error) {
      console.error('❌ Error sending admin message:', error);
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

  // Admin: Start washing for a queue item
  const startWashing = async (queueItemId: string) => {
    if (!isAdmin) return;
    
    // Проверка времени - нельзя начать стирку ночью
    const timeStatus = getLaundryTimeStatus();
    if (timeStatus.isClosed) {
      alert('⚠️ Стирка закрыта с 22:00 до 09:00. Нельзя начать стирку.');
      return;
    }
    
    if (!isSupabaseConfigured || !supabase) {
      // Use local storage fallback
      startLocalWashing(queueItemId);
      fetchQueue(); // Refresh queue from local storage
      fetchMachineState(); // Refresh machine state from local storage
      return;
    }
    
    try {
      const queueItem = queue.find(item => item.id === queueItemId);
      if (!queueItem) return;
      
      // Update queue item status
      const { error: queueError } = await supabase
        .from('queue')
        .update({ status: QueueStatus.WASHING })
        .eq('id', queueItemId);
      
      if (queueError) throw queueError;
      
      // Update machine state
      const newMachineState: MachineState = {
        status: MachineStatus.WASHING,
        currentQueueItemId: queueItemId,
        startedAt: new Date().toISOString(),
        expectedFinishAt: queueItem.expectedFinishAt,
      };
      
      const { error: machineError } = await supabase
        .from('machine_state')
        .upsert(newMachineState);
      
      if (machineError) throw machineError;
    } catch (error) {
      console.error('Error starting washing:', error);
      // Fallback to local storage on error
      startLocalWashing(queueItemId);
      fetchQueue(); // Refresh queue from local storage
      fetchMachineState(); // Refresh machine state from local storage
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
      // Убрать из очереди
      await supabase
        .from('queue')
        .delete()
        .eq('userId', studentId);

      // Забанить
      const { error } = await supabase
        .from('students')
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          ban_reason: reason || 'Не указано',
        })
        .eq('id', studentId);

      if (error) throw error;

      console.log('✅ Student banned:', studentId);
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
  };

  return <LaundryContext.Provider value={value}>{children}</LaundryContext.Provider>;
}

export const useLaundry = () => {
  const context = useContext(LaundryContext);
  if (context === undefined) {
    throw new Error('useLaundry must be used within a LaundryProvider');
  }
  return context;
};
