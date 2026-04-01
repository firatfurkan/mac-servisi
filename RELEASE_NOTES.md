# Yayın Hazırlığı Değişiklikleri — 2026-03-23

## Özet
Asist uygulaması App Store ve Google Play Store'a yayın öncesi kritik güvenlik ve stabilite iyileştirmeleri yapıldı.

---

## 1. API Güvenliği & Hata Yönetimi

### 1.1 Console Logging Temizliği
- **Dosya:** `src/services/api.ts`
- **Değişiklik:** 10 adet `console.log()` satırı kaldırıldı
  - `getMatchDetail()`: Fixture, stats, events JSON dump'larını loglayan 5 satır
  - `getTeamSquad()`: Squad roster, stats page, player stats logging satırları
- **Sebep:** Üretim kodunda gereksiz console çıkışı, 50KB+ JSON stringify'larından performance kaybı

### 1.2 API Request Timeout
- **Dosya:** `src/services/api.ts`
- **Değişiklik:** `safeFetch()` fonksiyonuna 15 saniye timeout eklendi
```typescript
// Yeni:
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15_000);
try {
  const res = await fetch(url, { ...options, signal: controller.signal });
  ...
} finally {
  clearTimeout(timeout);
}
```
- **Sebep:** Asılı API çağrıları uygulamayı dondurabiliyor, timeout ile iyi UX sağlama

### 1.3 Null Safety — getMatchDetail()
- **Dosya:** `src/services/api.ts` satır 371
- **Değişiklik:** Null check eklendi
```typescript
// Önceki:
const fixture = fixtureData.response[0];

// Sonraki:
if (!fixtureData.response?.[0]) throw new Error(`Match not found: ${id}`);
const fixture = fixtureData.response[0];
```
- **Sebep:** API response eksikse app crash yapıyor, hata handling sağlama

### 1.4 Live Endpoint Fallback
- **Dosya:** `src/hooks/useMatches.ts` satır 19-22
- **Değişiklik:** `getLiveMatches()` fail ederse boş array döndürmek
```typescript
// Önceki:
const [matches, liveMatches] = await Promise.all([...]);

// Sonraki:
const [matches, liveMatches] = await Promise.all([
  apiService.getMatchesByDate(date),
  hasLive
    ? apiService.getLiveMatches().catch(() => [] as Match[])
    : Promise.resolve<Match[]>([]),
]);
```
- **Sebep:** Live endpoint fail ederse tüm query fail ediyor, graceful fallback sağlama

---

## 2. Error Handling & Crash Prevention

### 2.1 Error Boundary Component
- **Yeni Dosya:** `src/components/common/ErrorBoundary.tsx`
- **Yerleşim:** `app/_layout.tsx` içinde root layout'ı sarıyor
- **Özellikler:**
  - Tüm render hatalarını yakalar
  - Kullanıcıya "Bir şeyler ters gitti" UI gösterir
  - Retry butonu ile recovery sağlar
  - Hata loglama console'a yazılır
- **Sebep:** Herhangi bir component crash'inde white screen yerine graceful UI göster

### 2.2 Notification Error Logging
- **Dosya:** `src/services/goalTracker.ts`
- **Değişiklik:** 5 fonksiyonda boş `catch {}` bloklarına `console.error` eklendi
  - `sendGoalNotification()`
  - `sendRedCardNotification()`
  - `sendHalfTimeNotification()`
  - `sendMatchStartNotification()`
  - `sendMatchFinishNotification()`
```typescript
// Önceki:
} catch {}

// Sonraki:
} catch (err) {
  console.error('[Notifications] Goal notification failed:', err);
}
```
- **Sebep:** Notification fail'leri sessizce kayboluyor, debug imkânı vermeme

---

## 3. Production Logging Kontrolü

### 3.1 Development-Only Console Warnings
- **Dosya:** 3 dosya — `api.ts`, `BannerAd.tsx`, `_layout.tsx`
- **Değişiklik:** `console.warn()` çağrıları `__DEV__` guard'ı ile sarıldı
```typescript
// Önceki:
console.warn('Message:', error);

// Sonraki:
if (__DEV__) console.warn('Message:', error);
```
- **Satırlar:**
  - `api.ts:729` — Squad fetch uyarı
  - `BannerAd.tsx:25` — Ad loading uyarı
  - `_layout.tsx:91` — Notification permission uyarı
- **Sebep:** Production console spam'ı önle, dev-only debugging info tut

---

## 4. App Configuration

### 4.1 Privacy Policy Configuration
- **Dosya:** `app.json`
- **Değişiklik:** Privacy policy URL eklendi
```json
"extra": {
  "privacyPolicy": "https://furkanf.github.io/asist/privacy"
}
```
- **Sebep:** App Store gözden geçiremesi için privacy policy URL gerekli

### 4.2 Mevcut Configuration Doğrulama
| Alan | Değer | Durum |
|------|-------|-------|
| version | 1.0.0 | ✅ |
| ios.bundleIdentifier | com.furkanf.asist | ✅ |
| ios.buildNumber | 1 | ✅ |
| android.package | com.furkanf.asist | ✅ |
| android.versionCode | 1 | ✅ |
| AdMob Plugin | Eklendi | ✅ |

---

## 5. AdMob Configuration (EAS Build Öncesi)

### 5.1 BannerAd Component
- **Dosya:** `app/(tabs)/index.tsx`
- **Durum:** ✅ Zaten ekli ve korunuyor
- **Platform Kontrolü:**
  ```typescript
  const isExpoGo = Constants.appOwnership === 'expo';
  const BannerAd = isExpoGo
    ? () => null
    : require('../../src/components/ads/BannerAd').default;
  ```
- **Render:** `{!isExpoGo && <BannerAd />}` (satır 298)

### 5.2 Placeholder Değerleri Doldurma (YAPILMAMIŞSA)
`app.json` satır 88-89:
```json
{
  "plugin": "react-native-google-mobile-ads",
  "config": {
    "androidAppId": "ca-app-pub-3272601063768123~ANDROID_APP_ID",  // ← Doldur
    "iosAppId": "ca-app-pub-3272601063768123~IOS_APP_ID"           // ← Doldur
  }
}
```

---

## 6. Yayın Öncesi Kontrol Listesi

### Gerekli Belgeler
- [ ] Privacy Policy URL değiştirildi (opsiyonel: kendi URL'ini kullan)
- [ ] AdMob Console'dan gerçek App ID'ler alındı
- [ ] `eas.json` → `appleId`, `ascAppId`, `appleTeamId`, `track` değerleri dolduruldu

### App Store Submission (iOS)
- [ ] Version: 1.0.0
- [ ] Build Number: 1
- [ ] Bundle ID: com.furkanf.asist
- [ ] Privacy Policy URL: app.json extra alanında ayarlandı
- [ ] Screenshots ve description hazırlandı

### Google Play Submission (Android)
- [ ] Version: 1.0.0
- [ ] Version Code: 1
- [ ] Package: com.furkanf.asist
- [ ] google-services.json yüklendi
- [ ] Screenshots ve description hazırlandı

### Testing
- [ ] Real iOS device'ta test edildi (AdMob, notifications, error boundary)
- [ ] Real Android device'ta test edildi
- [ ] Expo Go'da test edildi (BannerAd gösterilmiyor ✅)
- [ ] Offline mode test edildi
- [ ] Error boundary crash test edildi (intentional error atıp retry)

---

## 7. Sürüm Yönetimi

### Gelecek Release'ler İçin
Yeni build almadan önce:
1. `app.json`:
   - `version`: "1.0.1" (hotfix), "1.1.0" (feature), "2.0.0" (major)
2. `app.json`:
   - `ios.buildNumber`: "2" (her build)
   - `android.versionCode`: 2 (her build)

---

## 8. EAS Build Komutu

```bash
# Environment secrets ekle (bir kez yapılır)
eas secret:create --scope project
# EXPO_PUBLIC_API_KEY=<gerçek-key>
# EXPO_PUBLIC_API_BASE_URL=<url>

# Android build
eas build --platform android

# iOS build
eas build --platform ios

# Android submit
eas submit -p android

# iOS submit (Apple Developer account gerekli)
eas submit -p ios
```

---

## 9. Değişiklik Özeti

| Kategori | Sayı | Durum |
|----------|------|-------|
| Güvenlik İyileştirmeleri | 4 | ✅ Tamamlandı |
| Error Handling | 2 | ✅ Tamamlandı |
| Logging Kontrolü | 3 | ✅ Tamamlandı |
| Configuration | 2 | ✅ Tamamlandı |
| Toplam Dosya | 7 | ✅ |

**Muhasım kısaltılmış değişiklikler:**
- `api.ts`: 10 console.log kaldırıldı, timeout eklendi, null check eklendi, console.warn guard'ı
- `goalTracker.ts`: 5 notification catch bloğuna error logging eklendi
- `useMatches.ts`: getLiveMatches fallback eklendi
- `ErrorBoundary.tsx`: Yeni component oluşturuldu
- `_layout.tsx`: ErrorBoundary import'u ve wrapping, console.warn guard'ı
- `BannerAd.tsx`: console.warn guard'ı
- `app.json`: privacyPolicy extra alanı eklendi

---

**Rapor Tarihi:** 2026-03-23
**Sonraki Adım:** EAS secrets ekle → Build al → Store submit
