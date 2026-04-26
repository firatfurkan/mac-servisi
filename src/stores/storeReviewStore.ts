import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const REVIEW_STATE_KEY = '@asist_review_state';

export interface ReviewState {
  reviewed: boolean;
  promptCount: number;
  lastPromptTimestamp: number;
  firstOpenTimestamp: number;
  appOpenCount: number;
}

const defaultReviewState: ReviewState = {
  reviewed: false,
  promptCount: 0,
  lastPromptTimestamp: 0,
  firstOpenTimestamp: 0,
  appOpenCount: 0,
};

interface StoreReviewStore extends ReviewState {
  loadReviewState: () => Promise<void>;
  incrementOpenCount: () => Promise<void>;
  markReviewed: () => Promise<void>;
  dismissPrompt: () => Promise<void>;
  shouldShowPrompt: () => boolean;
}

export const useStoreReviewStore = create<StoreReviewStore>((set, get) => ({
  ...defaultReviewState,

  loadReviewState: async () => {
    try {
      const stored = await AsyncStorage.getItem(REVIEW_STATE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ReviewState;
        set(parsed);
        return;
      }
    } catch {
      // Ignore parse errors, use defaults
    }

    // First time: set firstOpenTimestamp if not set
    const state = get();
    if (state.firstOpenTimestamp === 0) {
      const newState: ReviewState = {
        ...defaultReviewState,
        firstOpenTimestamp: Date.now(),
      };
      set(newState);
      await AsyncStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(newState)).catch(
        () => {}
      );
    }
  },

  incrementOpenCount: async () => {
    const newState: ReviewState = {
      ...get(),
      appOpenCount: (get().appOpenCount || 0) + 1,
    };
    set(newState);
    await AsyncStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(newState)).catch(() => {});
  },

  markReviewed: async () => {
    const newState: ReviewState = {
      ...get(),
      reviewed: true,
      promptCount: (get().promptCount || 0) + 1,
      lastPromptTimestamp: Date.now(),
    };
    set(newState);
    await AsyncStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(newState)).catch(
      () => {}
    );
  },

  dismissPrompt: async () => {
    const newState: ReviewState = {
      ...get(),
      promptCount: (get().promptCount || 0) + 1,
      lastPromptTimestamp: Date.now(),
    };
    set(newState);
    await AsyncStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(newState)).catch(
      () => {}
    );
  },

  shouldShowPrompt: () => {
    const state = get();

    // 1. Already reviewed → never show
    if (state.reviewed) return false;

    // 2. Max 3 prompts → stop after 3rd dismiss
    if (state.promptCount >= 3) return false;

    // 3. Minimum 3 app opens required
    if ((state.appOpenCount || 0) < 3) return false;

    // 4. First 24 hours → no prompt (warmup period)
    const appAge = Date.now() - state.firstOpenTimestamp;
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (appAge < ONE_DAY_MS) return false;

    // 5. Last prompt check — 3 days gap
    if (state.lastPromptTimestamp > 0) {
      const timeSinceLastPrompt = Date.now() - state.lastPromptTimestamp;
      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      if (timeSinceLastPrompt < THREE_DAYS_MS) return false;
    }

    return true;
  },
}));
