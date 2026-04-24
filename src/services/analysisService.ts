import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Match } from '../types';
import { db } from './firebase';

export type AnalysisStatus = 'pending' | 'approved' | 'rejected';

export interface PendingAnalysis {
  id: string;
  matchLabel: string;
  matchId?: string;
  leagueId?: string;
  editorUid: string;
  editorUsername: string;
  displayName: string;
  prediction: string;
  comment: string;
  status: AnalysisStatus;
  rejectionReason?: string;
  timestamp: Timestamp;
}

export interface LiveAnalysis {
  id: string;
  matchLabel: string;
  matchId?: string;
  leagueId?: string;
  editorUid?: string;        // Dinamik displayName için (UID → users koleksiyonu)
  editorUsername: string;
  displayName: string;       // Snapshot; canlı ad için editorUid kullan
  prediction: string;
  comment: string;
  approvedAt: Timestamp;
  pendingId: string;
  outcome?: 'correct' | 'incorrect' | null;
}

// ── Public: liveAnalyses ──────────────────────────────────────────────────────

export function subscribePublicAnalyses(
  cb: (analyses: LiveAnalysis[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'liveAnalyses'), orderBy('approvedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as LiveAnalysis)));
  });
}

export async function deleteFromLive(id: string): Promise<void> {
  await deleteDoc(doc(db, 'liveAnalyses', id));
}

// ── Editor: pendingAnalyses ───────────────────────────────────────────────────

export async function addPendingAnalysis(
  data: Omit<PendingAnalysis, 'id' | 'timestamp' | 'status' | 'rejectionReason'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'pendingAnalyses'), {
    ...data,
    status: 'pending' as AnalysisStatus,
    timestamp: Timestamp.now(),
  });
  return ref.id;
}

export async function updatePendingAnalysis(
  id: string,
  data: Partial<Pick<PendingAnalysis, 'matchLabel' | 'prediction' | 'comment'>>,
): Promise<void> {
  await updateDoc(doc(db, 'pendingAnalyses', id), { ...data, status: 'pending' });
}

export async function deletePendingAnalysis(id: string): Promise<void> {
  await deleteDoc(doc(db, 'pendingAnalyses', id));
}

export function subscribeEditorAnalyses(
  editorUid: string,
  cb: (analyses: PendingAnalysis[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'pendingAnalyses'),
    where('editorUid', '==', editorUid),
    orderBy('timestamp', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PendingAnalysis)));
  });
}

// ── Admin: pendingAnalyses ────────────────────────────────────────────────────

export function subscribeAllPending(
  cb: (analyses: PendingAnalysis[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'pendingAnalyses'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PendingAnalysis)));
  });
}

export async function approveAnalysis(pending: PendingAnalysis): Promise<void> {
  await addDoc(collection(db, 'liveAnalyses'), {
    matchLabel: pending.matchLabel,
    matchId: pending.matchId ?? null,
    leagueId: pending.leagueId ?? null,
    editorUid: pending.editorUid,
    editorUsername: pending.editorUsername,
    displayName: pending.displayName,
    prediction: pending.prediction,
    comment: pending.comment,
    approvedAt: Timestamp.now(),
    pendingId: pending.id,
    outcome: null,
  });
  await updateDoc(doc(db, 'pendingAnalyses', pending.id), { status: 'approved' });
}

// Editör UID listesinden güncel displayName, order ve başarı oranını çeker
export async function fetchEditorMetadata(
  uids: string[],
): Promise<Record<string, { displayName: string; order: number; successRate?: number; totalPredictions?: number }>> {
  const results: Record<string, { displayName: string; order: number; successRate?: number; totalPredictions?: number }> = {};
  await Promise.all(
    uids.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const data = snap.data();
          results[uid] = {
            displayName: data.displayName || data.username || '',
            order: data.order || 999,
            successRate: data.successRate || 0,
            totalPredictions: data.totalPredictions || 0,
          };
        }
      } catch { /* sessiz hata */ }
    }),
  );
  return results;
}

// Eski fonksiyon — uyumluluk için tutuldu
export async function fetchDisplayNames(
  uids: string[],
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  await Promise.all(
    uids.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const data = snap.data();
          results[uid] = data.displayName || data.username || '';
        }
      } catch { /* sessiz hata */ }
    }),
  );
  return results;
}

// ── Editör İstatistikleri (Kümülatif) ──────────────────────────────────────────

/**
 * Editörün başarı oranını hesapla ve Firestore'a kaydet.
 * Çağrı: outcome null'dan bir değere (correct/incorrect) değiştiğinde
 */
export async function updateEditorStats(editorUid: string, correct: boolean): Promise<void> {
  try {
    const userRef = doc(db, 'users', editorUid);
    const snap = await getDoc(userRef);
    const current = snap.data() || {};

    const totalPredictions = (current.totalPredictions || 0) + 1;
    const correctPredictions = (current.correctPredictions || 0) + (correct ? 1 : 0);
    const successRate = totalPredictions > 0
      ? Math.round((correctPredictions / totalPredictions) * 10000) / 100  // 2 decimal
      : 0;

    await updateDoc(userRef, {
      totalPredictions,
      correctPredictions,
      successRate,
      lastPredictionUpdate: Timestamp.now(),
    });
  } catch (err) {
    console.error('[Editor Stats] update error:', err);
  }
}

export async function setAnalysisOutcome(
  id: string,
  outcome: 'correct' | 'incorrect' | null,
): Promise<void> {
  // Mevcut outcome'ı kontrol et
  const docRef = doc(db, 'liveAnalyses', id);
  const snap = await getDoc(docRef);
  const analysis = snap.data() as LiveAnalysis | undefined;

  // Eğer outcome null'dan bir değere değişiyorsa editör stats'ı güncelle
  if (analysis && analysis.outcome === null && outcome !== null && analysis.editorUid) {
    await updateEditorStats(analysis.editorUid, outcome === 'correct');
  }

  await updateDoc(docRef, { outcome });
}

export async function rejectAnalysis(pendingId: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'pendingAnalyses', pendingId), {
    status: 'rejected',
    rejectionReason: reason || 'Reddedildi.',
  });
}

// ── Otomatik Outcome Belirleme ──────────────────────────────────────────────────

/**
 * Tahmin ile maç sonucunu karşılaştır.
 * Maç finished değilse null döner (henüz sonuç yok).
 */
export function checkPredictionOutcome(prediction: string, match: Match): 'correct' | 'incorrect' | null {
  if (match.status !== 'finished') return null;

  const hs = match.homeScore ?? 0;
  const as = match.awayScore ?? 0;
  const total = hs + as;

  let isCorrect = false;

  const pred = prediction.trim().toUpperCase();

  // Maç sonucu tahminleri
  if (pred === 'MS1' || pred === 'HOME' || pred === 'HOMEWIN') {
    isCorrect = hs > as;
  } else if (pred === 'MS2' || pred === 'AWAY' || pred === 'AWAYWIN') {
    isCorrect = as > hs;
} else if (pred === 'MSX' || pred.includes('X') || pred === 'DRAW') {

    isCorrect = hs === as;
  }
  // Alt/Üst tahminleri (2.5)
  else if (pred.includes('2.5') && pred.includes('ALT')) {
    isCorrect = total < 2.5;
  } else if (pred.includes('2.5') && pred.includes('ÜST')) {
    isCorrect = total > 2.5;
  }
  // Karşılıklı gol tahminleri
  else if (pred.includes('KG') && (pred.includes('VAR') || pred.includes('GG') || pred.includes('YES'))) {
    isCorrect = hs > 0 && as > 0;
  } else if (pred.includes('KG') && (pred.includes('YOK') || pred.includes('NG') || pred.includes('NO'))) {
    isCorrect = hs === 0 || as === 0;
  }
  // 1X2 tahminleri (İkili seçenekler)
  else if (pred === '1X' || pred.includes('1X')) {
    isCorrect = hs >= as; // Home win veya draw
  } else if (pred === '12' || pred.includes('12')) {
    isCorrect = hs !== as; // Home win veya away win (draw değil)
  } else if (pred === 'X2' || pred.includes('X2')) {
    isCorrect = as >= hs; // Away win veya draw
  }
  // İngilizce alternatifleri
  else if (pred.includes('UNDER') || pred.includes('ALT')) {
    isCorrect = total < 2.5;
  } else if (pred.includes('OVER') || pred.includes('ÜST')) {
    isCorrect = total > 2.5;
  }

  return isCorrect ? 'correct' : 'incorrect';
}

/**
 * Belirtilen maç ID'li tüm yayındaki analizlerin outcome'ını otomatik belirle.
 * Bu fonksiyon admin tarafından admin panelinde tetiklenir.
 */
export async function updateAnalysisOutcomesForMatch(matchId: string | undefined, match: Match): Promise<void> {
  if (!matchId || match.status !== 'finished') return;

  try {
    const q = query(collection(db, 'liveAnalyses'), where('matchId', '==', matchId));
    const snap = await getDocs(q);

    await Promise.all(
      snap.docs.map(async (doc) => {
        const analysis = doc.data() as LiveAnalysis;
        if (analysis.outcome === null) {
          // Outcome henüz belirlenmediyse otomatik belirle
          const outcome = checkPredictionOutcome(analysis.prediction, match);
          if (outcome !== null) {
            await updateDoc(doc.ref, { outcome });
          }
        }
      }),
    );
  } catch {
    // Sessiz hata — API çağrısı başarısız olabilir
  }
}

/**
 * En başarılı editörü seç (tie-breaker: toplam tahmin sayısı).
 * Oranlar eşitse, daha fazla tecrübeye sahip (daha fazla tahmin) editörü tercih et.
 */
export function selectTopEditor(
  editors: Array<{ displayName: string; successRate: number; totalPredictions: number; editorUid?: string }>,
): (typeof editors)[0] | null {
  if (editors.length === 0) return null;

  return editors.reduce((top, current) => {
    // Başarı oranı yüksekse onu al
    if (current.successRate > top.successRate) return current;
    // Oranlar eşitse, daha fazla tahmin yapan (tecrübeli) editörü al
    if (current.successRate === top.successRate && current.totalPredictions > top.totalPredictions) return current;
    // Aksi halde top'u koru
    return top;
  });
}

/**
 * Tüm editörler arasından en başarılı olanı bul (for home screen promotion).
 * Snapshot bir kere çeker (realtime değil).
 */
export async function getTopEditorForPromotion(): Promise<{
  displayName: string;
  successRate: number;
} | null> {
  try {
    // Tüm live analyses çek
    const q = query(collection(db, 'liveAnalyses'));
    const snap = await getDocs(q);

    // Editörlere göre group et
    const editorMap = new Map<
      string,
      { displayName: string; editorUid?: string; outcomes: ('correct' | 'incorrect')[] }
    >();

    snap.docs.forEach((doc) => {
      const analysis = doc.data() as LiveAnalysis;
      const key = analysis.editorUsername;

      if (!editorMap.has(key)) {
        editorMap.set(key, {
          displayName: analysis.displayName || analysis.editorUsername,
          editorUid: analysis.editorUid,
          outcomes: [],
        });
      }

      const editor = editorMap.get(key)!;
      if (analysis.outcome) editor.outcomes.push(analysis.outcome);
    });

    // En başarılı editörü bul
    let topEditor: { displayName: string; successRate: number } | null = null;
    let topRate = -1;
    let topCount = -1;

    editorMap.forEach((editor) => {
      if (editor.outcomes.length === 0) return;
      const rate = (editor.outcomes.filter((o) => o === 'correct').length / editor.outcomes.length) * 100;
      const count = editor.outcomes.length;

      if (rate > topRate || (rate === topRate && count > topCount)) {
        topRate = rate;
        topCount = count;
        topEditor = {
          displayName: editor.displayName,
          successRate: rate,
        };
      }
    });

    return topEditor;
  } catch {
    return null;
  }
}

/**
 * Tüm yayındaki analizleri taramak ve bitmiş maçlarının outcome'ını belirlemek için helper.
 */
export async function autoCheckAllAnalysisOutcomes(matchesMap: Map<string, Match>): Promise<void> {
  try {
    const q = query(collection(db, 'liveAnalyses'), where('outcome', '==', null));
    const snap = await getDocs(q);

    await Promise.all(
      snap.docs.map(async (doc) => {
        const analysis = doc.data() as LiveAnalysis;
        const match = analysis.matchId ? matchesMap.get(analysis.matchId) : undefined;

        if (match && match.status === 'finished') {
          const outcome = checkPredictionOutcome(analysis.prediction, match);
          if (outcome !== null) {
            await updateDoc(doc.ref, { outcome });
          }
        }
      }),
    );
  } catch {
    // Sessiz hata
  }
}
