# UI Renk Paleti Güncellemeleri — 2026-03-20

## Özet
Uygulamanın renk paletini güncelledik. Ana renk `#0ECDB9` (turkuaz) → `#03422d` (koyu yeşil) ve lig başlıkları ile arama çubuğunun arka planını `#15ab6f` (açık yeşil) yaptık.

---

## 1. Ana Primary Rengi Değişikliği
### `#0ECDB9` → `#03422d`

**Etkilenen Dosyalar:**
- ✅ `src/theme/tokens.ts`
  - `semanticColors.win`: `#0ECDB9` → `#03422d`
  - `colors.primary`: `#0ECDB9` → `#03422d`

- ✅ `src/components/LoadingIndicator.tsx`
  - `PRIMARY_COLOR`: `#0ECDB9` → `#03422d`

- ✅ `src/components/match/FootballPitch.tsx`
  - `ratingColor()`: 7.0–7.9 aralığı rengi `#0ECDB9` → `#03422d`
  - Kurtarış ikonu rengi: `#0ECDB9` → `#03422d`

**Etkilenen UI Elemanları:**
- Canlı maç vurguları
- Tab indicator çizgisi
- Rating rozeti (7.0–7.9 arası)
- Loading indicator
- Buton ve aktif ikonlar
- Tur atlayan takım rozeti

---

## 2. Arama Çubuğu (Search Bar) Güncellemeleri
### Dosya: `src/components/home/SearchBar.tsx`

| Özellik | Önceki | Yeni |
|---|---|---|
| Arka Plan | `theme.colors.surfaceVariant` | `#03422d` |
| Yazı Rengi | `theme.colors.textPrimary` | `#ffffff` (bold) |
| Placeholder | `theme.colors.textSecondary + '80'` | `rgba(255,255,255,0.6)` |
| Arama İkonu | `#888888`, boyut 16 | `#ffffff`, boyut 18 |
| Border (Normal) | `theme.colors.divider` | `#045e41` |
| Border (Fokus) | `theme.colors.primary` | `#15ab6f` |
| Font Weight | Normal | **700 (Bold)** |

**Görünüm:**
- Koyu yeşil arka plan (#03422d)
- Beyaz kalın yazı okunabilir
- Yeşil border (fokuslanınca #15ab6f)

---

## 3. Lig Başlığı (League Header) Güncellemeleri
### Dosya: `src/components/home/LeagueSection.tsx`

**Header Arka Planı:**
- Önceki: Dark mode `rgba(0,0,0,0.3)` / Light mode `#e0f2f1`
- Yeni: **`#15ab6f` (sabit, her iki modda aynı)**

**Etkilenen Bölümler:**
- "UEFA EUROPA LEAGUE" başlığı
- "SÜPER LİG" başlığı
- "LIGUE 1" başlığı
- "LIGA NACIONAL" başlığı
- Tüm lig başlık satırları

---

## 4. Uygulama İkonu ve Splash Screen (Native)
### Dosya: `app.json`

| Konfigürasyon | Önceki | Yeni |
|---|---|---|
| **icon** | `./assets/images/icon.png` | `./assets/images/app-logo.png` |
| **splash.image** | `./assets/images/splash-icon.png` | `./assets/images/app-logo.png` |
| **splash.dark.image** | `./assets/images/splash-icon.png` | `./assets/images/app-logo.png` |
| **splash.backgroundColor** | `#ffffff` | `#ffffff` ✓ |
| **splash.dark.backgroundColor** | `#121212` | `#0f1a19` (Forest Teal) |
| **android.adaptiveIcon.backgroundColor** | `#E6F4FE` | `#15ab6f` (yeşil tema) |

**Dosyalar Kopyalandı:**
- `1.png` → `assets/images/app-logo.png`

---

## 5. Web Uygulaması Güncellemeleri

### 5.1 Web Asset Dosyaları
**Oluşturulan:** `web/assets/`
```
web/assets/
├── favicon.png          (1.png kopyası)
├── icon-192x192.png    (PWA - masaüstü)
└── icon-512x512.png    (PWA - büyük ekran)
```

### 5.2 Web Manifest
**Oluşturulan:** `web/manifest.json`

```json
{
  "name": "Maç Servisi",
  "short_name": "Maç Servisi",
  "theme_color": "#03422d",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "./assets/icon-192x192.png", "sizes": "192x192" },
    { "src": "./assets/icon-512x512.png", "sizes": "512x512" }
  ]
}
```

### 5.3 HTML Güncellemeleri
**Güncellenen:** `web/index.html`

Eklenen meta etiketleri:
```html
<!-- App Icons -->
<link rel="icon" type="image/png" href="./assets/favicon.png" />
<link rel="apple-touch-icon" href="./assets/icon-192x192.png" />

<!-- PWA Manifest -->
<link rel="manifest" href="./manifest.json" />

<!-- Theme Color -->
<meta name="theme-color" content="#03422d" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Maç Servisi" />
```

**Özellikler:**
- ✅ Masaüstü favicon
- ✅ Apple touch icon (iOS home screen)
- ✅ PWA standalone modu
- ✅ Theme color: `#03422d`

---

## 6. Renk Paleti Özet

### Güncellenmiş Renkler
| Kullanım | Hex | Açıklama |
|---|---|---|
| **Primary (Yeni)** | `#03422d` | Koyu Forest Teal — ana renk |
| **Header Background** | `#15ab6f` | Açık yeşil — lig başlığı, arama çubuğu |
| **Search Bar Text** | `#ffffff` | Beyaz — okunabilirlik |
| **Border Fokus** | `#15ab6f` | Yeşil — arama çubuğu border |
| **Android Adaptive BG** | `#15ab6f` | Yeşil — Android ikon arka planı |
| **Dark Splash BG** | `#0f1a19` | Koyu Teal — açılış ekranı (dark mode) |

### Korunmuş Renkler
| Kullanım | Hex |
|---|---|
| Semantic Win | `#03422d` (güncellenmiş) |
| Semantic Draw | `#FFBB33` |
| Semantic Loss | `#FF3B5C` |
| Success | `#00C851` |
| Dark Background | `#0f1a19` |
| Light Background | `#f0fffe` |

---

## 7. Değiştirilen Tüm Dosyalar

### Native (Expo)
1. ✅ `src/theme/tokens.ts` — Primary renk güncellendi
2. ✅ `src/components/LoadingIndicator.tsx` — Loading color güncellendi
3. ✅ `src/components/match/FootballPitch.tsx` — Rating ve saves rengi güncellendi
4. ✅ `src/components/home/SearchBar.tsx` — Arama çubuğu styling
5. ✅ `src/components/home/LeagueSection.tsx` — Header background güncellendi
6. ✅ `app.json` — Icon ve splash screen referansları güncellendi

### Web (PWA)
7. ✅ `web/index.html` — Meta etiketleri ve manifest link eklendi
8. ✅ `web/manifest.json` — Yeni PWA manifest dosyası
9. ✅ `web/assets/` (Yeni Dizin)
   - `favicon.png`
   - `icon-192x192.png`
   - `icon-512x512.png`

### Assets
10. ✅ `assets/images/app-logo.png` — Yeni uygulama logosu

---

## 8. Test Etme

### Native App
```bash
cd macapp
npm run ios      # iOS simulator
npm run android  # Android emulator
npm start        # Expo dev server
```

### Web App
```bash
npm run web      # Web development
# Browser'da localhost:8081 açılacak
```

---

## 9. Yayınlama Checklist

- [ ] Local test et (iOS ve Android)
- [ ] Web uygulamasını test et
- [ ] Splash screen görünümünü kontrol et
- [ ] Icon masaüstünde düzgün gözüküyor mu kontrol et
- [ ] Dark/Light mode geçişini test et
- [ ] PWA manifest validation: `npm run web` → DevTools → Manifest tab
- [ ] EAS build hazırlığı:
  ```bash
  eas build --platform ios
  eas build --platform android
  ```

---

## 10. Notlar

- **Primary Renk:** Tüm `theme.colors.primary` kullanan bileşenler otomatik olarak `#03422d` görecek
- **Opacity:** Dinamik opacity hala `theme.colors.X + "XX"` formatında çalışıyor
- **Dark Mode:** Dark theme arka planı `#0f1a19` olarak kaldı
- **Search Bar:** Bold yazı (`fontWeight: '700'`) okunabilirliği artırıyor
- **Web Assets:** 192x192 ve 512x512 boyutları PWA standardı

---

**Güncelleme Tarihi:** 20 Mart 2026
**Güncelleme Yapan:** Claude Code
**Status:** ✅ Tamamlandı
