import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { apiService } from '../services/api';
import { useRedCardStore } from '../stores/redCardStore';

// Top 5 major leagues + key tournaments
const TOP_TIER_LEAGUES = new Set([
  39,   // Premier League
  140,  // La Liga
  135,  // Serie A
  61,   // Ligue 1
  71,   // Super Lig
  203,  // Turkish Cup
  307,  // UEFA Champions League
  322,  // UEFA Europa League
  330,  // UEFA Conference League
]);

const POLL_INTERVAL = 60_000; // 60 seconds

/**
 * Monitors live matches in top 5 leagues for red cards.
 * Caches red card events to minimize API usage.
 * Runs at app root level independently of user navigation.
 */
export function useRedCardMonitor() {
  const { setRedCardEvent, clearExpired } = useRedCardStore();
  const lastPollRef = useRef<number>(0);
  const isPollingRef = useRef<boolean>(false);

  useEffect(() => {
    const pollRedCards = async () => {
      if (isPollingRef.current) return; // Skip if already polling
      isPollingRef.current = true;

      try {
        // Only poll if app is active
        if (AppState.currentState !== 'active') {
          isPollingRef.current = false;
          return;
        }

        const now = Date.now();

        // Get today's matches (generic date range)
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];

        const matches = await apiService.getMatchesByDate(dateStr);

        // Filter: live only + top 5 leagues
        const liveTopMatches = matches.filter(
          (m) => m.status === 'live' && TOP_TIER_LEAGUES.has(m.league.id),
        );

        if (liveTopMatches.length === 0) {
          lastPollRef.current = now;
          isPollingRef.current = false;
          return;
        }

        // Fetch details for red card events only
        for (const match of liveTopMatches) {
          try {
            const detail = await apiService.getMatchDetail(match.id);

            // Extract red cards from events
            const redCardEvents = detail.events?.filter(
              (e) => e.type === 'Card' && e.card === 'Red',
            ) ?? [];

            for (const event of redCardEvents) {
              setRedCardEvent({
                matchId: match.id,
                matchLabel: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
                playerName: event.player?.name ?? 'Unknown',
                playerTeam: event.team?.name ?? '',
                minute: event.minute,
                timestamp: now,
              });
            }
          } catch (err) {
            if (__DEV__) console.error(`[RedCard] Failed to fetch details for match ${match.id}:`, err);
          }
        }

        lastPollRef.current = now;
      } catch (err) {
        if (__DEV__) console.error('[RedCard] Polling error:', err);
      } finally {
        isPollingRef.current = false;
      }
    };

    // Initial poll + interval
    pollRedCards();
    const intervalId = setInterval(pollRedCards, POLL_INTERVAL);

    // App state listener
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        pollRedCards(); // Poll immediately when app comes to foreground
      }
    });

    // Cleanup
    return () => {
      clearInterval(intervalId);
      sub.remove();
    };
  }, [setRedCardEvent]);

  // Periodically clear expired events (older than 24h)
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      clearExpired(24 * 60 * 60 * 1000); // 24 hours
    }, 30 * 60 * 1000); // Every 30 minutes

    return () => clearInterval(cleanupInterval);
  }, [clearExpired]);
}
