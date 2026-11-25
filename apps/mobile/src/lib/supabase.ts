import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Database } from '@/types/database';
import { assertLocalShowcaseEndpoint } from '@/lib/showcase-config';
import { demoClient } from '@/lib/demo-client';

/** Static hosted build: in-browser fictional backend, no database. */
export const isDemoMode = process.env.EXPO_PUBLIC_DEMO_MODE === '1';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),

  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(key, value),

  removeItem: (key: string) =>
    SecureStore.deleteItemAsync(key),
};

const WebStorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },

  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  },

  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  },
};

function createShowcaseClient(): SupabaseClient<Database> {
  if (isDemoMode) {
    return demoClient as unknown as SupabaseClient<Database>;
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  assertLocalShowcaseEndpoint(supabaseUrl);

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      storage:
        Platform.OS === 'web'
          ? WebStorageAdapter
          : SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createShowcaseClient();
