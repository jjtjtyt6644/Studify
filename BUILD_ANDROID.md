# Building Studify for Android (APK)

## Prerequisites
1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```

2. Create an Expo account at https://expo.dev if you don't have one

3. Login to EAS:
   ```bash
   eas login
   ```

## Building the APK

### For Preview/Testing (Recommended for first build)
```bash
eas build --platform android --profile preview
```

### For Production
```bash
eas build --platform android --profile production
```

## What happens during build:
1. EAS will ask you to configure the project (press Y)
2. It will ask about Android package name (already set to `com.studify.app`)
3. Build will be queued on Expo's servers
4. You'll receive a download link when complete (usually 10-15 minutes)

## Installing the APK
1. Download the APK from the link provided after build completes
2. Transfer the APK to your Android device
3. Enable "Install from Unknown Sources" in Android settings
4. Open the APK file and install

## Build Profiles Explained
- **preview**: Creates APK for easy testing and sharing
- **production**: Creates optimized APK for release

## Local Development
To test without building:
```bash
npx expo start
```
Then scan the QR code with Expo Go app on your Android device.

## Troubleshooting
- If build fails, check that all dependencies are correctly installed
- Make sure package.json has no errors
- Verify app.json configuration is valid
- Check EAS build logs at https://expo.dev

## App Configuration
- Package name: `com.studify.app`
- Version: 1.0.0
- Version Code: 1
- Permissions: VIBRATE (for timer notifications)
