# Asist - Futbol Uygulaması

## Proje Özeti
Expo + React Native ile iOS/Android futbol istatistikleri uygulaması. API-Sports ile canlı skorlar, maç detayları, oyuncu profilleri, puan durumları. i18n (TR/EN), dark mode, push notifications.

## Stack
- **Frontend**: Expo 55, React Native 0.83, React Router v6
- **API**: api-sports.io (futbol verileri)
- **State**: Zustand (settings, theme, favorites, notifications)
- **UI**: shadcn/ui bileşenleri, Tailwind CSS
- **Veri**: React Query 5.90
- **Build**: EAS (Apple/Play Store için)

## Mevcut Durum (2026-03-08)

### ✅ Tamamlandı
- **Kod kalitesi düzeltmeleri** (15 March 2026):
  - API error handling: tüm fetch çağrılarına `safeFetch` wrapper (res.ok kontrolü)
  - Zustand async actions → sync (setLanguage, setMode)
  - useAppTheme null check (systemScheme ?? 'light')
  - Date parsing: try/catch → isNaN(d.getTime())
  - Takım ID uyumsuzluğu düzeltildi (Beşiktaş 549→616, Trabzonspor 607→3566)
  - Commentary refetch logic (maç biterse durdur)
  - NavigationMenu route matching (kesin eşleşme)
  - Favorites search race condition (cancelled flag)
  - DateStrip calendar locale (dayjs dinamik)
  - Deep link matchId type check
  - favoritesStore error logging
  - defaultSource prop'ları kaldırıldı
  - Notification permission logging
  - TypeScript 0 hata ✓

- **Deployment & i18n hazırlığı** (8 March 2026):
  - ✅ `.env` → `.gitignore`'a eklendi
  - ✅ `app.json`: scheme "macapp" → "asist", iOS bundleIdentifier + buildNumber, Android versionCode, splash dark mode, iOS privacy manifest (NSUserTrackingUsageDescription)
  - ✅ `eas.json` oluşturuldu (development, preview, production profilleri)
  - ✅ BannerAd placeholder kaldırıldı (4 ekrandan: index, favorites, leagues, settings)
  - ✅ Tüm hardcoded Türkçe stringler → i18n'ye taşındı:
    - onboarding.tsx: 10 string
    - favorites.tsx: 7 string
    - leagues.tsx: 5 string + kategori isimleri
    - match/[id].tsx: 12+ string (h2h, analysis, predictions)
    - team/[id].tsx: tab isimleri, hata mesajları
    - player/[id].tsx: hata mesajı
    - standings/[leagueId].tsx: tablo başlıkları
    - NavigationMenu.tsx: 4 menü etiketi
    - FootballPitch.tsx: pozisyon isimleri, yedekler, teknik direktör
    - FormStrip.tsx: "Form" etiketi
    - goalTracker.ts: bildirim başlıkları
    - _layout.tsx: tab başlıkları
  - ✅ Splash screen dark mode backgroundColor (#121212)
  - ✅ TypeScript 0 hata ✓

### ✅ HAZIR - Yayına Gidilebilir

1. **`USE_MOCK = false`** ✓ (mockData.ts:22)
   - Pro API key aktif
   - Gerçek API verilerle çalışıyor

## Architecture

### Dosya Yapısı
```
macapp/
├── app/                    # Expo Router (file-based routing)
│   ├── (tabs)/            # Tab navigator
│   │   ├── index.tsx      # Home (maçlar)
│   │   ├── favorites.tsx  # Favori takımlar
│   │   ├── leagues.tsx    # Ligler
│   │   └── settings.tsx   # Ayarlar
│   ├── match/[id].tsx     # Maç detayı
│   ├── player/[id].tsx    # Oyuncu profili
│   ├── team/[id].tsx      # Takım detayı
│   ├── standings/[leagueId].tsx # Puan durumu
│   ├── onboarding.tsx     # İlk açılış
│   └── _layout.tsx        # Root (React Query, i18n init)
│
├── src/
│   ├── services/
│   │   ├── api.ts         # API calls (safeFetch wrapper ile)
│   │   ├── mockData.ts    # Mock veri (USE_MOCK flag)
│   │   └── goalTracker.ts # Push notifications (i18n destekli)
│   ├── stores/            # Zustand stores
│   │   ├── settingsStore.ts  # language, profile
│   │   ├── themeStore.ts     # light/dark/system
│   │   ├── favoritesStore.ts # favoriteTeamIds
│   │   ├── matchStore.ts     # selectedDate
│   │   └── notificationStore.ts # notified matches
│   ├── hooks/
│   │   ├── useAppTheme.ts     # Theme resolver
│   │   ├── useMatches.ts      # React Query matches
│   │   ├── useMatchDetail.ts  # Refetch: 15s live'da, false bitince
│   │   ├── useCommentary.ts   # Refetch: 30s live'da, false bitince
│   │   ├── useNotifiedMatchTracker.ts # Background polling (30s)
│   │   └── ...
│   ├── components/        # UI components
│   │   ├── home/          # MatchCard, LeagueSection, DateStrip
│   │   ├── match/         # EventTimeline, Lineups, FootballPitch
│   │   └── ...
│   ├── types/             # TypeScript interfaces
│   ├── utils/             # Helpers (matchUtils, etc.)
│   ├── i18n/              # i18next (TR/EN) — tüm stringler çevrildi
│   └── theme/             # Color tokens
└── assets/images/         # Icon, splash, adaptive icons
```

### Key Patterns
- **API Error**: `safeFetch()` → throws on res.ok === false
- **Async Zustand**: Fire-and-forget (sync action + async storage)
- **Match Polling**: notifiedMatches → 30s interval, 5min window check
- **Date**: `dayjs().locale(i18n.language).format()`
- **i18n**: `useTranslation()` hook + service dosyalarında `i18n.t()` — hardcoded Türkçe string yok ✓

## Yapılacaklar (Öncelik Sırasıyla)

### ASAP - Production Release
- [ ] Pro API key al → `.env` güncelle
- [ ] `USE_MOCK = false` yap
- [ ] Gerçek API ile e2e test (limits, errors)
- [ ] EAS build: test build → TestFlight/Internal
- [ ] Store listings (screenshots, descriptions, privacy policy)
- [ ] `eas.json` submit config'lerini güncelle (appleId, ascAppId, appleTeamId)

### Nice-to-Have
- [ ] AdMob entegrasyonu (rewarded ads)
- [ ] Share functionality (maç sonuçları)
- [ ] Offline mode improvements
- [ ] Performance: FlatList virtualization (standings)

## Kritik Hatırlatmalar
1. API key `.env` → EXPOSE ETMEYİN (public repo değilse ok)
2. `USE_MOCK` production'a FALSE olmalı
3. EAS build öncesi version numbers increment etme
4. iOS sertifikaları (.p8, .p12) gitignore'da

## Son Güncelleme
**2026-03-09** - Tam UI redesign: LineearProgressBar kaldırıldı, standings i18n (WDL→GBM), takım sayfası (back button + sezon selector + standings), oyuncu profili (hero header + tabs + season merging), font size optimizasyonu

## Son Değişiklikler (2026-03-09 Detaylı)

### 1. Global Loading System Refactor
- **Kaldırıldı**: `src/context/LoadingContext.tsx`'deki LinearProgressBar fonksiyonu
- **Korundu**: LoadingProvider + circular spinner overlay
- **Dosyalar**: `app/_layout.tsx`, `src/context/LoadingContext.tsx`

### 2. Standings Lokalizasyon (i18n)
- **Sorun**: Türkçe seçiliyken WDL (İngilizce) gösteriliyor
- **Çözüm**: `app/standings/[leagueId].tsx`'ye FORM_LETTER_MAP eklendi
  ```typescript
  const FORM_LETTER_MAP: Record<string, string> = {
    'W': 'G',  // Win → Galibiyet
    'D': 'B',  // Draw → Beraberlik
    'L': 'M'   // Loss → Mağlubiyet
  };
  ```
- **Impl**: `i18n.language === 'tr'` kontrolü ile dinamik çeviri
- **Güncellenmiş dosyalar**: `tr.json`, `en.json` (standings translations)

### 3. Türkiye Lig ID Düzeltmeleri
- **Eski** → **Yeni**:
  - 1. Lig: 194 → 204
  - 2. Lig: (yeni) 205
  - Türkiye Kupası: 552 → 206
- **Dosyalar**: `app/(tabs)/index.tsx` (PRIORITY_LEAGUES), `app/(tabs)/leagues.tsx`

### 4. Takım Detay Sayfası Yeniden Tasarımı (`app/team/[id].tsx`)
**Eklenenler:**
- **Geri Butonu**: Safe area padding ile
- **Sezon Seçici**: "2025-2026" formatında dropdown
- **Tab Değişikliği**: Transfers → Standings
- **Standings Bölümü**:
  - İlgili sezonun puan durumu
  - Takım kendi satırı highlight edilmiş
  - Tüm tablo sütunları (Puan, GD, vb.)

**Teknik:**
- `useSafeAreaInsets()` back button padding için
- Season format: `formatSeason(startYear)` → "2025-2026"
- Standings fetch: ligId + sezon parametreleri

### 5. Yazı Boyutu Optimizasyonu (Font Size Reduction)
**Değişiklikler:**
- MatchCard: teamName 14px → 13px, score 17px → 14px
- LeagueSection: leagueName 13px → 12px
- Favorites: matchTeamName 14px → 13px, matchScore 16px → 14px
- League/Settings headers: 13px → 12px

**Overflow Koruma:**
- Container'lara `overflow: "hidden"` + `maxWidth: "100%"` eklendi
- Dosyalar: `MatchCard.tsx`, `LeagueSection.tsx`, `favorites.tsx`, `leagues.tsx`, `match/[id].tsx`, `settings.tsx`

### 6. Oyuncu Profili Sayası Tam Yeniden Tasarım (`app/player/[id].tsx`)

#### Hero Header
- Büyük oyuncu fotoğrafı (96x96px, 3px border)
- İsim (fontSize: 20, fontWeight: 800)
- Pozisyon chip (Türkçe çevirisi)
- Yaş + Uyruk
- Mevcut kulüp + logo (transfers endpoint'ten çekilen)
- Quick stats (Toplam maç, gol, asist)

#### Sezon Birleştirme Mantığı (`mergeSeasons()`)
```typescript
// Problem: API bazı sezonları birden fazla satırda döndürüyor
// Çözüm: season + team + type (club/national) gruplaması
// Her grup için istatistikleri sumla

- Detektleme: leagueCountry türü ve leagueName pattern'i ile national vs club ayrımı
- Milli Takım: leagueCountry === "International" veya startsWith("Copa América") vb.
- Sıralama: descending (yeni sezonlar önce)
```

#### Pozisyon Çevirisi
```typescript
const POSITION_TR: Record<string, string> = {
  'Goalkeeper': 'Kaleci',
  'Defender': 'Defans',
  'Midfielder': 'Orta Saha',
  'Forward': 'Forvet',
  'Attacker': 'Forvet'
};
```

#### Üç Tab Yapısı

**1. İstatistikler (Stats)**
- İki bölüm: "Kulüp Maçları" + "Milli Takım"
- Tablo: Sezon | Takım | M | G | A | SK | KK
- Render: CareerRow component

**2. Kariyer (Career)**
- Team logo + team name + season + key stats
- Tıklanabilir (team/[id]'ye navigate)

**3. Transferler (Transfers)**
- Tarih | Takım (out) → Takım (in) | Tip
- Logo'lar gösterilir

#### Güncellenmiş Tipler (`src/types/index.ts`)
```typescript
interface PlayerProfile {
  // ... existing fields
  currentTeam?: string;           // Mevcut kulüp (transfers'tan)
  currentTeamLogo?: string;       // Logo URL
}

interface PlayerSeason {
  // ... existing fields
  leagueName?: string;            // "Premier League", "Copa América", vb.
  leagueCountry?: string;         // Country code veya "International"
}
```

#### API Geliştirmesi (`src/services/api.ts`)
```typescript
export async function getPlayerProfile(playerId: number): Promise<PlayerProfile> {
  // 1. /players endpoint'ten player detayı
  // 2. /transfers endpoint'ten son transferi (current club)
  // 3. Seasons'lara leagueName + leagueCountry ekleme
  // 4. mergeSeasons() çağırması (internal)
}
```

---

## Türkiye Lig ID'leri (API-Sports)
| Lig | ID |
|-----|-----|
| Süper Lig | 203 |
| 1. Lig | 204 |
| 2. Lig | 205 |
| Türkiye Kupası | 206 |
| 3. Lig Grup 1 | 552 |
| 3. Lig Grup 2 | 553 |
| 3. Lig Grup 3 | 554 |
| Süper Kupa | 551 |

## API & Platform Desteği

### Canlı Skor (API Ready)
- ✅ API Service: `safeFetch()` wrapper, error handling tam
- ✅ `.env`'den `EXPO_PUBLIC_API_KEY` okuyor
- ✅ Live matches: 15s refetch, finished: polling off
- ✅ Push notifications: gol/başlama/bitiş
- ✅ Mock/Real toggle: `USE_MOCK` flag

### Platform Support
- ✅ **iOS**: AppStore ready (Expo + React Native)
- ✅ **Android**: PlayStore ready (Expo + React Native)
- ✅ **Web**: Expo web support aktif (ileride production'a alınabilir)

### Hemen Yapılacak (API Key Sonrası)
1. Pro API key al → `.env` güncelle
2. `USE_MOCK = false` yap (src/services/mockData.ts:22)
3. `eas build --platform ios/android`
4. TestFlight/Internal test

### Responsive UI
- ✅ Tailwind CSS + flexbox → Web-ready
- ✅ React Query, Zustand → Web uyumlu
- ✅ Push notifications: FCM (Web'de ekstra setup gerekli)

---

## Son Güncellemeler (2026-03-10)

### 1. Maç Detail Sayfası - H2H Sekme Refactoring
**Dosya**: `app/match/[id].tsx`

- **Problem**: H2H, Last Home, Last Away bölümleri aşağı doğru uzatıyor, sayfa çok uzun
- **Çözüm**: Tek bir alanda 3 sub-tab (H2H / Ev / Deplasman) ile gösterim
- **Impl**:
  ```typescript
  const [h2hSubTab, setH2hSubTab] = useState<"h2h" | "home" | "away">("h2h");
  ```
- **i18n**:
  - `matchDetail.home`: "Home" / "Ev"
  - `matchDetail.away`: "Away" / "Deplasman"
  - `matchDetail.matchesBetween`: "Head to Head" / "Aralarındaki Maçlar"

### 2. Maç Detail - Oyuncu Profil Navigasyonu
**Dosya**: `app/match/[id].tsx`

- **Problem**: İstatistikler sekmesindeki oyuncu listesine tıklanınca sadece event detayı açılıyor
- **Çözüm**: Tıklayınca `/player/{id}` sayfasına navigate
  ```typescript
  onPress={() => {
    if (isSelected) {
      setSelectedPlayer(null);
    } else {
      router.push(`/player/${p.id}`);
    }
  }}
  ```

### 3. Oyuncu Profili - Maç İstatistikleri
**Dosya**: `app/match/[id].tsx`, `src/services/api.ts`, `src/hooks/usePlayerMatchStats.ts`

**Yeni Type** (`src/types/index.ts`):
```typescript
export interface PlayerMatchStats {
  playerId: number;
  playerName: string;
  rating: number;        // 7.8 gibi
  position: string;
  passesAccurate: number;
  passesTotal: number;
  goals: number;
  assists: number;
  saves: number;         // Kaleciler için
  duelsWon: number;
}
```

**Yeni API Endpoint** (`src/services/api.ts`):
```typescript
async getPlayerMatchStats(fixtureId: string): Promise<PlayerMatchStats[]>
  // /players/fixtures endpoint'ini kullanarak maç oyuncu istatistiklerini çek
```

**Yeni Hook** (`src/hooks/usePlayerMatchStats.ts`):
```typescript
export const usePlayerMatchStats = (fixtureId: string, enabled = true)
  // React Query ile oyuncu maç istatistiklerini cache'le
```

**İstatistiklerin Gösterimi**:
- Rating, Pas (isabetli/toplam), Gol, Asist, Kurtarış (kaleciler), Kazanılan İkili
- Home ve Away oyuncu listelerinin altında gösterilir
- Sadece ilgili istatistikler varsa gösterilir (gol=0 ise gösterilmez)

### 4. Oyuncu Profili - Transfer Geçmişi Filtreleme
**Dosya**: `app/player/[id].tsx`

- **Problem**: Aynı kulüpten aynı kulübe olan çoklu transferler gösteriliyor
- **Çözüm**: Group by (from_team - to_team), sadece en son tarihi tut
  ```typescript
  const key = `${t.teamOut.name || "unknown"}-${t.teamIn.name || "unknown"}`;
  // Map'de varsa, daha yeni tarihi sakla
  ```
- **Dosya**: `app/player/[id].tsx` (filteredTransfers useMemo)

### 5. Oyuncu Profili - Kariyer Verileri Ayrımı (İlk Deneme)
**Dosya**: `app/player/[id].tsx`, `src/types/index.ts`

- **Type Update**: `PlayerSeason` interface'ine `leagueType?: string` eklendi
- **API Update**: `src/services/api.ts`'de `leagueType: stat.league?.type ?? ""` çekilir
- **mergeSeasons Logic**: `const isNational = s.leagueType === "National"`
- **Sorun**: Nationality kontrolü çalışmadı → Sonraki adımda değiştirildi

### 6. Oyuncu Profili - Kariyer Ayrımı (Nihai Çözüm)
**Dosya**: `app/player/[id].tsx`

**NATIONAL_TEAMS Listesi** (~195+ ülke):
```typescript
const NATIONAL_TEAMS = [
  // Europe: 47 ülke
  "Albania", "Austria", "Belgium", "Croatia", "Czechia", "Denmark",
  "England", "France", "Germany", "Greece", "Hungary", "Italy", "Netherlands",
  "Poland", "Portugal", "Spain", "Sweden", "Switzerland", "Turkey", "Türkiye",
  "Ukraine", "Wales", "Scotland", "Russia", ...

  // Americas: 35 ülke
  "USA", "Canada", "Mexico", "Brazil", "Argentina", "Chile", "Colombia",
  "Peru", "Ecuador", "Uruguay", "Paraguay", "Venezuela", ...

  // Africa: 54 ülke
  "Egypt", "Nigeria", "Cameroon", "Ghana", "Senegal", "Morocco", "Tunisia",
  "Algeria", "South Africa", "Kenya", ...

  // Asia: 44 ülke
  "Japan", "South Korea", "China", "India", "Saudi Arabia", "Iran",
  "Australia", ...

  // Oceania: 11 ülke
  "New Zealand", "Fiji", ...
];
```

**Karşılaştırma Mantığı**:
```typescript
// Case-insensitive, includes() kullanarak
const isNational = NATIONAL_TEAMS.some(n =>
  s.team.name.toLowerCase().includes(n.toLowerCase())
);
```

**Console Logs** (debug için):
```
[Player Stats] Season: 2023, Team: Cameroon, isNational: true
[Player Stats] Season: 2022, Team: Ajax, isNational: false
```

**UI Ek Özellikleri**:
- Stats sekmesi: "KULÜP KARİYERİ" (üst) ve "MİLLİ TAKIM" (alt)
- Aralarında kalın ayraç çizgisi (3px borderBottom)
- Her bölüm kendi tablo başlığı ve verileri
- En yeni sezon üstte (mergeSeasons'ta sort)
- Aynı sezon + aynı takım satırları birleştirilmiş (stats toplandı)

**Dosyalar Değiştirilen**:
- `app/player/[id].tsx`: NATIONAL_TEAMS, mergeSeasons, UI ayrım
- `src/types/index.ts`: PlayerSeason → leagueType eklendi
- `src/services/api.ts`: leagueType: stat.league?.type çekilir

---

## Teknik Notlar (2026-03-10)

### Kullanılan API Endpoints
- `/fixtures/players?fixture={id}` → Maç oyuncu istatistikleri
- `/transfers?player={id}` → Oyuncu transfer geçmişi
- `/players?id={id}&season={season}` → Oyuncu detay + sezonlar

### mergeSeasons() Çalışması
1. API'den gelen multiple satırlar (aynı sezon, aynı takım, farklı ligler)
2. Key = `season-team.id-type` (type: "CLUB" veya "NT")
3. İlk kez görmüş → yeni entry oluştur
4. Daha sonra görüş → stats topla (matches, goals, assists, cards, etc.)
5. Sort: descending by season (yeni sezonlar önce)

### Console Debug
Oyuncu profili sayfasını açarken, tarayıcı console'unda (F12) şu loglar görünür:
```
[Player Stats] Season: 2023, Team: Cameroon, isNational: true
[Player Stats] Season: 2023, Team: Ajax, isNational: false
[Player Stats] Season: 2022, Team: Inter, isNational: false
```

Bu sayede hangi takımların hangi bölüme atandığı doğrulanabilir.
