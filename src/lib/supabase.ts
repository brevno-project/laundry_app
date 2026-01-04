"use client";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create the client if we have a valid URL and key
const isValidUrl = (url?: string) => {
  if (!url) return false;
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};

export const supabase = isValidUrl(supabaseUrl) && supabaseAnonKey
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

// Make supabase available in console for debugging (only on client side)
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
  console.log('🔧 Supabase client available in console as window.supabase:', supabase);

  // Helper function to get supabase client safely
  (window as any).getSupabase = () => {
    if (!supabase) {
      console.error('❌ Supabase client not initialized. Check environment variables:');
      console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***' : 'MISSING');
      return null;
    }
    return supabase;
  };
}
