import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';


interface EditorState {
  uid: string | null;
  loggedInEditor: string | null;   // username
  displayName: string | null;
  role: 'editor' | 'admin' | null;
  initialized: boolean;
  unauthorizedAuth: boolean; // Auth'ta var ama Firestore users kaydı yok
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  restore: () => () => void;  // returns unsubscribe fn
}

// Firestore role → normalize lowercase ('Editor' → 'editor')
function normalizeRole(raw: any): 'editor' | 'admin' | null {
  const r = (raw ?? '').toString().toLowerCase().trim();
  if (r === 'editor') return 'editor';
  if (r === 'admin') return 'admin';
  return null;
}

export const useEditorStore = create<EditorState>((set) => ({
  uid: null,
  loggedInEditor: null,
  displayName: null,
  role: null,
  initialized: false,
  unauthorizedAuth: false,

  login: async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userSnap = await getDoc(doc(db, 'users', cred.user.uid));

      if (!userSnap.exists()) {
        await signOut(auth);
        if (__DEV__) console.log(`[DEBUG] Login: UID ${cred.user.uid} — Firestore users kaydı YOK`);
        return { success: false, error: 'Kullanıcı kaydınız onaylanmamış. Lütfen admin ile iletişime geçin.' };
      }

      const data = userSnap.data();
      const role = normalizeRole(data.role);
      if (__DEV__) console.log(`[DEBUG] Login: UID=${cred.user.uid} | Firestore role="${data.role}" | Normalized="${role}"`);

      if (!role) {
        await signOut(auth);
        return { success: false, error: 'Hesabınıza henüz rol atanmamış. Lütfen admin ile iletişime geçin.' };
      }

      set({
        uid: cred.user.uid,
        loggedInEditor: data.username ?? data.email ?? email,
        displayName: data.displayName ?? email.split('@')[0],
        role,
        unauthorizedAuth: false,
      });
      return { success: true };
    } catch (e: any) {
      const code: string = e?.code ?? '';
      if (__DEV__) console.log('[DEBUG] Login Error:', code);
      if (code.includes('wrong-password') || code.includes('invalid-credential') || code.includes('user-not-found')) {
        return { success: false, error: 'E-posta veya şifre hatalı.' };
      }
      return { success: false, error: 'Giriş başarısız. Bağlantıyı kontrol edin.' };
    }
  },

  logout: async () => {
    await signOut(auth);
    set({ uid: null, loggedInEditor: null, displayName: null, role: null, unauthorizedAuth: false });
  },

  restore: () => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        set({ uid: null, loggedInEditor: null, displayName: null, role: null, initialized: true, unauthorizedAuth: false });
        return;
      }
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          const role = normalizeRole(data.role);
          if (__DEV__) console.log(`[DEBUG] Restore: UID=${user.uid} | Firestore role="${data.role}" | Normalized="${role}"`);
          set({
            uid: user.uid,
            loggedInEditor: data.username ?? data.email ?? user.email ?? '',
            displayName: data.displayName ?? user.email?.split('@')[0] ?? '',
            role,
            initialized: true,
            unauthorizedAuth: false,
          });
        } else {
          // Auth'ta var ama Firestore'da kayıt yok
          if (__DEV__) console.log(`[DEBUG] Restore: UID=${user.uid} — Firestore users kaydı YOK`);
          set({ uid: user.uid, loggedInEditor: null, displayName: null, role: null, initialized: true, unauthorizedAuth: true });
        }
      } catch (err) {
        if (__DEV__) console.log('[DEBUG] Restore error:', err);
        set({ uid: null, loggedInEditor: null, displayName: null, role: null, initialized: true, unauthorizedAuth: false });
      }
    });
    return unsub;
  },
}));
