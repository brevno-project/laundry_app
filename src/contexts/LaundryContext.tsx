"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { User, Student, QueueItem, MachineStatus, QueueStatus, MachineState, HistoryItem } from '@/types';
import { hashPassword, verifyPassword } from '@/lib/auth';
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
  registerStudent: (studentId: string, password: string) => Promise<void>;
  loginStudent: (studentId: string, password: string) => Promise<void>;
  logoutStudent: () => void;
  resetStudentRegistration: (studentId: string) => Promise<void>;
  joinQueue: (name: string, room?: string) => void;
  leaveQueue: (queueItemId: string) => void;
  updateQueueItem: (queueItemId: string, updates: Partial<QueueItem>) => void;
  startWashing: (queueItemId: string) => void;
  cancelWashing: (queueItemId: string) => void;
  markDone: (queueItemId: string) => void;
  startNext: () => void;
  clearQueue: () => void;
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
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
    } else {
      const newUser: User = {
        id: generateUserId(),
        name: '',
      };
      localStorage.setItem('laundryUser', JSON.stringify(newUser));
      setUser(newUser);
    }

    setIsAdmin(storedIsAdmin);
    
    // Initial data fetch
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
  const joinQueue = async (name: string, room?: string) => {
    if (!user) return;
    
    // Update user name if it changed
    if (name !== user.name || room !== user.room) {
      const updatedUser = { ...user, name, room };
      setUser(updatedUser);
    }
    
    // Check if user is already in queue
    const existingItem = queue.find(item => item.userId === user.id && item.status === QueueStatus.QUEUED);
    if (existingItem) return;
    
    // Create new queue item
    const newItem: QueueItem = {
      id: uuidv4(),
      userId: user.id,
      userName: name,
      userRoom: room,
      joinedAt: new Date().toISOString(),
      status: QueueStatus.QUEUED,
    };
    
    if (!isSupabaseConfigured || !supabase) {
      // Use local storage fallback
      addToLocalQueue(user);
      fetchQueue(); // Refresh queue from local storage
      return;
    }
    
    try {
      console.log('➕ Adding to queue:', newItem);
      const { error } = await supabase.from('queue').insert(newItem);
      if (error) throw error;
      console.log('✅ Successfully added to queue');
    } catch (error: any) {
      console.error('❌ Error joining queue:', error);
      console.error('Error details:', error?.message, error?.details, error?.hint, error?.code);
      // Fallback to local storage on error
      addToLocalQueue(user);
      fetchQueue(); // Refresh queue from local storage
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
      const { error } = await supabase
        .from('queue')
        .delete()
        .eq('id', queueItemId)
        .eq('userId', user.id); // Only allow users to remove their own entries
      
      if (error) throw error;
    } catch (error) {
      console.error('Error leaving queue:', error);
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

  // Admin: Start washing for a queue item
  const startWashing = async (queueItemId: string) => {
    if (!isAdmin) return;
    
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
      
      // Update queue item status to 'done' instead of deleting
      const { error: updateError } = await supabase
        .from('queue')
        .update({ status: QueueStatus.DONE })
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
        item.status = QueueStatus.QUEUED;
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
        .update({ status: QueueStatus.QUEUED })
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
    
    const nextItem = queue.find(item => item.status === QueueStatus.QUEUED);
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
        .eq('status', QueueStatus.QUEUED);
      
      if (queueError) throw queueError;
    } catch (error) {
      console.error('Error clearing queue:', error);
      // Fallback to local storage on error
      clearLocalQueue();
      fetchQueue(); // Refresh queue from local storage
      fetchMachineState(); // Refresh machine state from local storage
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
    return queue.find(item => item.userId === user.id && 
                     (item.status === QueueStatus.QUEUED || item.status === QueueStatus.WASHING));
  };

  const value = {
    user,
    setUser,
    queue,
    machineState,
    history,
    joinQueue,
    leaveQueue,
    updateQueueItem,
    startWashing,
    cancelWashing,
    markDone,
    startNext,
    clearQueue,
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
