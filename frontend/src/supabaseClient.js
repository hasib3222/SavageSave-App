import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uroodwfcrrzaqqwzuvsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyb29kd2ZjcnJ6YXFxd3p1dnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMTYxNjksImV4cCI6MjA5MjY5MjE2OX0.5mTnb1yDBD9P0Bvc2prTNeSoeeE_mVNIW2WH4yX9Zbc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
