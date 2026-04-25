import { useEffect, useState } from 'react';
import * as StoreReview from 'expo-store-review';
import { useStoreReviewStore } from '../stores/storeReviewStore';

interface UseStoreReviewPromptReturn {
  showPrompt: boolean;
  handleRate: () => void;
  handleLater: () => void;
}

/**
 * Non-intrusive Store Review hook
 * - Shows after 24h, only 3 times max, with 3-day gaps
 * - Delays initial show by 3s (non-aggressive)
 * - Returns handlers for rate/dismiss actions
 */
export function useStoreReviewPrompt(): UseStoreReviewPromptReturn {
  const store = useStoreReviewStore();
  const [showPrompt, setShowPrompt] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    // Don't run timer if already shown in this session or conditions not met
    if (timerRunning || !store.shouldShowPrompt()) {
      return;
    }

    setTimerRunning(true);

    // Delay 3 seconds before showing (non-aggressive)
    const timer = setTimeout(() => {
      setShowPrompt(true);
      setTimerRunning(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
      setTimerRunning(false);
    };
  }, []);

  const handleRate = async () => {
    setShowPrompt(false);
    await store.markReviewed();
    // Request review (native dialog on iOS, Play Store on Android)
    if (StoreReview.isAvailable()) {
      await StoreReview.requestReview();
    }
  };

  const handleLater = async () => {
    setShowPrompt(false);
    await store.dismissPrompt();
  };

  return {
    showPrompt,
    handleRate,
    handleLater,
  };
}
