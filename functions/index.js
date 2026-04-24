/**
 * Asist — Live Match Push Notification Cloud Function
 *
 * Runs every minute. Polls API-Sports for all matches that have active
 * subscribers in Firestore. Sends Expo push notifications for goals,
 * half-time, match start, and match finish events.
 *
 * SETUP:
 *   1. firebase functions:secrets:set FOOTBALL_API_KEY
 *   2. cd functions && npm install
 *   3. firebase deploy --only functions
 *
 * REQUIRES: Firebase Blaze plan (outbound HTTP to API-Sports)
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { Expo } = require('expo-server-sdk');
const { defineSecret } = require('firebase-functions/params');

initializeApp();
const db = getFirestore();
const expo = new Expo();

const footballApiKey = defineSecret('FOOTBALL_API_KEY');

const API_BASE = 'https://v3.football.api-sports.io';

// Maç max ~2.5 saat sürer. 4 saat sonrasında stale sayılır.
const STALE_MS = 4 * 60 * 60 * 1000;
// Ghost match güvenlik kilidi: 6 saat
const GHOST_MS = 6 * 60 * 60 * 1000;
// not_started maçlar için polling penceresi: başlangıçtan 30dk önce
const PRE_MATCH_WINDOW_MS = 30 * 60 * 1000;

exports.trackLiveMatches = onSchedule(
  {
    schedule: 'every 1 minutes',
    secrets: [footballApiKey],
    timeoutSeconds: 55,
    region: 'europe-west1',
    memory: '256MiB',
  },
  async () => {
    const apiKey = footballApiKey.value();
    if (!apiKey) {
      console.error('FOOTBALL_API_KEY secret is not set.');
      return;
    }

    const matchDocs = await db.collection('matchSubscriptions').listDocuments();
    if (matchDocs.length === 0) return;

    const CONCURRENCY = 8;
    for (let i = 0; i < matchDocs.length; i += CONCURRENCY) {
      const batch = matchDocs.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(ref => processMatch(ref.id, apiKey).catch(err => {
        console.error(`Error processing match ${ref.id}:`, err.message);
      })));
    }
  },
);

async function cleanupMatch(matchId, subscribersSnap) {
  const deleteBatch = db.batch();
  if (subscribersSnap) {
    subscribersSnap.forEach(d => deleteBatch.delete(d.ref));
  }
  deleteBatch.delete(db.collection('matchSubscriptions').doc(matchId));
  deleteBatch.delete(db.collection('matchTracking').doc(matchId));
  await deleteBatch.commit().catch(() => {});
}

async function processMatch(matchId, apiKey) {
  // ── 1. Parent doc: stale kontrolü ──────────────────────────────
  const parentSnap = await db.collection('matchSubscriptions').doc(matchId).get();
  const parentData = parentSnap.data();

  if (parentData?.startTime) {
    const startMs = new Date(parentData.startTime).getTime();
    const elapsed = Date.now() - startMs;

    // Stale: 4 saatten eski → API çağrısı yapmadan temizle
    if (elapsed > STALE_MS) {
      const subsSnap = await db.collection('matchSubscriptions').doc(matchId).collection('subscribers').get();
      await cleanupMatch(matchId, subsSnap);
      console.log(`[cleanup:stale] ${matchId}`);
      return;
    }

    // not_started: henüz 30 dakikadan fazla varsa API çağrısı yapma
    const trackingSnap = await db.collection('matchTracking').doc(matchId).get();
    const prevStatus = trackingSnap.data()?.status;
    if (
      (!prevStatus || prevStatus === 'not_started') &&
      startMs - Date.now() > PRE_MATCH_WINDOW_MS
    ) {
      return; // Henüz erken, bu turu atla
    }
  }

  // ── 2. Abone kontrolü ──────────────────────────────────────────
  const subscribersSnap = await db
    .collection('matchSubscriptions')
    .doc(matchId)
    .collection('subscribers')
    .get();

  if (subscribersSnap.empty) {
    await cleanupMatch(matchId, null);
    return;
  }

  // ── 3. API çağrısı ─────────────────────────────────────────────
  const res = await fetch(`${API_BASE}/fixtures?id=${matchId}`, {
    headers: { 'x-apisports-key': apiKey },
  });
  const data = await res.json();
  const fixture = data.response?.[0];

  if (!fixture) {
    await cleanupMatch(matchId, subscribersSnap);
    return;
  }

  const current = {
    status: mapStatus(fixture.fixture.status.short),
    homeScore: fixture.goals.home ?? 0,
    awayScore: fixture.goals.away ?? 0,
    homeTeam: fixture.teams.home.name,
    awayTeam: fixture.teams.away.name,
    minute: fixture.fixture.status.elapsed,
  };

  // ── 4. Önceki takip durumu ─────────────────────────────────────
  const trackingRef = db.collection('matchTracking').doc(matchId);
  const trackingSnap = await trackingRef.get();
  const prev = trackingSnap.data();

  // İlk kez görülüyor → initialize
  if (!prev) {
    await trackingRef.set({
      homeScore: current.homeScore,
      awayScore: current.awayScore,
      status: current.status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  // Ghost match güvenlik kilidi: 6 saatten uzun süredir takip ediliyor
  if (prev.updatedAt && (Date.now() - prev.updatedAt.toDate().getTime() > GHOST_MS)) {
    await cleanupMatch(matchId, subscribersSnap);
    console.log(`[cleanup:ghost] ${matchId}`);
    return;
  }

  // Zaten bitmiş veya iptal → cleanup (önceden temizlenmemişse)
  if (prev.status === 'finished' || prev.status === 'cancelled') {
    await cleanupMatch(matchId, subscribersSnap);
    console.log(`[cleanup:terminal] ${matchId} status=${prev.status}`);
    return;
  }

  // ── 5. Bildirimler ─────────────────────────────────────────────
  const notifications = [];

  if (
    prev.status === 'not_started' &&
    (current.status === 'live' || current.status === 'half_time')
  ) {
    notifications.push({
      title: '🟢 Maç Başladı',
      body: `${current.homeTeam} - ${current.awayTeam}`,
      sound: 'duduk.wav',
      channelId: 'match-alerts',
    });
  }

  if (current.homeScore > prev.homeScore) {
    const min = current.minute ? ` ${current.minute}'` : '';
    notifications.push({
      title: `⚽ GOL! ${current.homeTeam}`,
      body: `${current.homeTeam} ${current.homeScore} - ${current.awayScore} ${current.awayTeam}${min}`,
      sound: 'gol.mp3',
      channelId: 'match-goal-sound',
    });
  }
  if (current.awayScore > prev.awayScore) {
    const min = current.minute ? ` ${current.minute}'` : '';
    notifications.push({
      title: `⚽ GOL! ${current.awayTeam}`,
      body: `${current.homeTeam} ${current.homeScore} - ${current.awayScore} ${current.awayTeam}${min}`,
      sound: 'gol.mp3',
      channelId: 'match-goal-sound',
    });
  }

  if (prev.status === 'live' && current.status === 'half_time') {
    notifications.push({
      title: '⏱️ Devre Arası',
      body: `${current.homeTeam} ${current.homeScore} - ${current.awayScore} ${current.awayTeam}`,
      sound: 'duduk.wav',
      channelId: 'match-alerts',
    });
  }

  if (prev.status === 'half_time' && current.status === 'live') {
    notifications.push({
      title: '▶️ İkinci Devre Başladı',
      body: `${current.homeTeam} ${current.homeScore} - ${current.awayScore} ${current.awayTeam}`,
      sound: 'duduk.wav',
      channelId: 'match-alerts',
    });
  }

  if (prev.status !== 'finished' && current.status === 'finished') {
    notifications.push({
      title: '🏁 Maç Bitti',
      body: `${current.homeTeam} ${current.homeScore} - ${current.awayScore} ${current.awayTeam}`,
      sound: 'duduk.wav',
      channelId: 'match-alerts',
    });
  }

  // ── 6. State güncelle ──────────────────────────────────────────
  await trackingRef.set({
    homeScore: current.homeScore,
    awayScore: current.awayScore,
    status: current.status,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // ── 7. Push gönder + Error Handling ────────────────────────────
  if (notifications.length > 0) {
    const messages = [];
    const tokenToDocRef = new Map(); // token → docRef mapping

    subscribersSnap.forEach(subDoc => {
      const { token } = subDoc.data();
      if (!Expo.isExpoPushToken(token)) return;
      tokenToDocRef.set(token, subDoc.ref);
      for (const notif of notifications) {
        messages.push({
          to: token,
          title: notif.title,
          body: notif.body,
          data: { matchId },
          sound: notif.sound,
          channelId: notif.channelId,
          priority: 'high',
        });
      }
    });

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      const invalidTokens = [];

      for (const chunk of chunks) {
        const results = await expo.sendPushNotificationsAsync(chunk).catch(err => {
          console.error('Push send error:', err.message);
          return [];
        });

        // Expo error response'larını kontrol et
        // results[i] → chunk[i] bire bir eşleşiyor
        results.forEach((result, idx) => {
          if (result.status === 'error') {
            const code = result.details?.error;
            // DeviceNotRegistered: Cihaz push servisine kayıtlı değil
            // InvalidToken: Token geçersiz/süresi dolmuş
            if (code === 'DeviceNotRegistered' || code === 'InvalidToken') {
              const msg = chunk[idx];
              if (msg?.to && !invalidTokens.includes(msg.to)) {
                invalidTokens.push(msg.to);
              }
            }
          }
        });
      }

      // Geçersiz token'ları Firestore'dan sil
      if (invalidTokens.length > 0) {
        const batch = db.batch();
        invalidTokens.forEach(token => {
          const docRef = tokenToDocRef.get(token);
          if (docRef) {
            batch.delete(docRef);
            console.log(`[cleanup:invalid-token] ${matchId} token=${token}`);
          }
        });
        await batch.commit().catch(err => {
          console.error('Failed to delete invalid tokens:', err.message);
        });
      }
    }
  }

  // ── 8. Terminal durumlarda cleanup (push gönderildikten sonra) ──
  if (current.status === 'finished' || current.status === 'cancelled') {
    await cleanupMatch(matchId, subscribersSnap);
    console.log(`[cleanup:done] ${matchId} status=${current.status}`);
  }
}

function mapStatus(short) {
  if (['TBD', 'NS'].includes(short)) return 'not_started';
  if (['1H', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT'].includes(short)) return 'live';
  if (short === 'HT') return 'half_time';
  if (['FT', 'AET', 'PEN'].includes(short)) return 'finished';
  if (['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(short)) return 'cancelled';
  return 'not_started';
}
