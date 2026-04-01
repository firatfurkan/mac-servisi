# AdMob Integration Guide

## Setup Status: ✅ COMPLETE

This document describes the AdMob banner ad integration for the Asist Football App.

---

## Configuration Details

### App Information
- **AdMob App ID**: `ca-app-pub-3272601063768123~7042696977`
- **Banner Ad Unit ID**: `ca-app-pub-3272601063768123/7285040449`

### Packages Installed
- `react-native-google-mobile-ads` — Google Mobile Ads SDK for React Native

### Files Modified

#### 1. **app.json** — Configuration
- ✅ Added `react-native-google-mobile-ads` plugin with AdMob App ID
- ✅ Added `SKAdNetworkItems` for iOS (AdMob networks)
- ✅ Added iOS Privacy Manifest entries (NSPrivacyAccessedAPITypes, NSPrivacyCollectedDataTypes)
- ✅ Added `googleServicesFile` reference for Android

#### 2. **app/_layout.tsx** — SDK Initialization
- ✅ Imported `mobileAds` from `react-native-google-mobile-ads`
- ✅ Added `await mobileAds().initialize()` in root layout initialization

#### 3. **src/components/ads/BannerAd.tsx** — Banner Component
- ✅ Replaced placeholder with real `BannerAd` component
- ✅ Configured for adaptive banner (adjusts to screen width)
- ✅ Added error handling (silent fail, hides on error)
- ✅ Added content targeting keywords: football, soccer, sports, match, score
- ✅ Removed hardcoded colors (now theme-aware)

#### 4. **google-services.json** — Android Configuration
- ✅ Created minimal config for Android Google Play Services
- ✅ Linked to package name: `com.furkanf.asist`
- ✅ Contains Firebase project credentials (shared with Firestore)

---

## How It Works

### Ad Display Flow
1. App initializes `mobileAds()` SDK in `_layout.tsx`
2. When `BannerAd` component mounts, it requests ad from AdMob
3. AdMob returns ad matching keywords: football, soccer, sports
4. Banner displays at bottom of screen (adaptive width)
5. If ad fails to load, component silently hides (returns null)

### Targeting
- **Keywords**: football, soccer, sports, match, score
- **Content URL**: asist-app.com (for contextual matching)
- **Non-personalized ads**: Enabled by default (privacy-first)

### Error Handling
- Failed ad loads are logged as warnings (not errors)
- Component gracefully hides if ad fails (no blank space)
- No crash if AdMob network unavailable

---

## iOS Specific (Privacy Manifest)

### SKAdNetwork Items
Two AdMob networks registered:
- `cstr6suwn9.skadnetwork` (primary)
- `4pfyvq9l8r.skadnetwork` (fallback)

### Privacy Manifest
- **NSPrivacyAccessedAPITypes**: UserDefaults access for CA92.1 (Apple requirement)
- **NSPrivacyCollectedDataTypes**:
  - User ID (not linked, not tracked)
  - Coarse location (not linked, not tracked)
  - Purposes: App functionality only

---

## Android Specific

### Build Configuration
- Added `react-native-google-mobile-ads` plugin to `app.json`
- `google-services.json` placed in project root
- Package name: `com.furkanf.asist`
- Min SDK: 24 (compatible with existing config)

### Permissions (Automatic)
Plugin adds required permissions:
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`

---

## Testing & Validation

### Before EAS Build
```bash
# Test app locally
npm start

# iOS
npm run ios

# Android
npm run android
```

### Ad Display Verification
1. Open app
2. Navigate to screen showing BannerAd component
3. Look for banner at bottom
4. Check console: no errors about AdMob

### Test Device (Optional)
To test on real devices without serving real ads:
```javascript
// Add to BannerAd.tsx requestOptions:
requestOptions={{
  testDeviceIds: ['EMULATOR', 'YOUR_DEVICE_ID'],
}}
```

---

## EAS Build & Submission

### Before `eas build`
1. ✅ Ensure `google-services.json` is in project root
2. ✅ Update `eas.json` with real Apple/Google credentials
3. ✅ Increment version/buildNumber in `app.json`

### iOS Submission
- Privacy Manifest automatically included
- SKAdNetwork entries included
- No additional AdMob setup needed

### Android Submission
- `google-services.json` automatically processed
- AdMob App ID configured in plugin
- Ready for Play Store submission

---

## Troubleshooting

### Ad Not Showing
1. Check network connection
2. Verify AdMob App ID in `app.json` plugin section
3. Check console for `[BannerAd]` warnings
4. Ensure banner component is mounted (not hidden by parent)

### Build Errors
- **iOS**: Ensure cocoapods updated: `cd ios && pod install && cd ..`
- **Android**: Clear gradle cache: `cd android && ./gradlew clean && cd ..`

### Privacy Issues
- All privacy manifest requirements met for iOS 14.5+
- Content targeting keywords are general (no user tracking)
- Non-personalized ads enabled by default

---

## Future Considerations

### Interstitial Ads (Optional)
- Can add between screen transitions
- Good for pause moments (goal replays)
- Requires additional component

### Reward Ads (Optional)
- Users watch ad for in-app currency
- Could unlock premium features
- Requires server-side validation

### Mediation (Advanced)
- Add multiple ad networks (Facebook, MoPub, etc.)
- Higher fill rates, better revenue
- Configured in AdMob console

---

## References

- [Google Mobile Ads Documentation](https://developers.google.com/admob)
- [react-native-google-mobile-ads](https://github.com/react-native-google-mobile-ads/react-native-google-mobile-ads)
- [iOS Privacy Manifest](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)
- [Play Store Monetization Policies](https://support.google.com/admob/answer/1316904)
