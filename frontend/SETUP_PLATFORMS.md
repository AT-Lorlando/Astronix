# Setting Up Native Platforms

This guide explains how to add iOS and Android native platforms to your mobile app.

## Prerequisites

- Node.js >= 20.0.0
- For iOS: macOS with Xcode installed
- For Android: Android Studio installed

## Step 1: Install Dependencies

First, make sure all npm packages are installed:

```bash
cd frontend
npm install
```

## Step 2: Initialize Capacitor

If not already done, initialize Capacitor:

```bash
npx cap init
```

Follow the prompts or accept defaults. The configuration is already set in `capacitor.config.ts`.

## Step 3: Add Native Platforms

Add iOS platform:
```bash
npx cap add ios
```

Add Android platform:
```bash
npx cap add android
```

This will create `ios/` and `android/` directories with the native projects.

## Step 4: Build and Sync

Generate the Nuxt static files and sync them to native platforms:

```bash
npm run mobile:sync
```

This command:
1. Runs `npm run generate` to build the Nuxt app
2. Runs `npx cap sync` to copy web assets to native projects

## Step 5: Open Native IDEs

To open iOS project in Xcode:
```bash
npm run mobile:ios
```

To open Android project in Android Studio:
```bash
npm run mobile:android
```

## Development Workflow

### Regular Development
During development, you can enable live reload:

1. Find your local IP address:
   - macOS/Linux: `ipconfig getifaddr en0`
   - Windows: `ipconfig` (look for IPv4 address)

2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://YOUR_LOCAL_IP:3000',
     cleartext: true
   }
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Sync changes:
   ```bash
   npx cap copy
   ```

5. Rebuild and run the app from Xcode or Android Studio

### Production Build
For production builds:

1. Build the Nuxt app:
   ```bash
   npm run generate
   ```

2. Sync to native platforms:
   ```bash
   npx cap sync
   ```

3. Open in IDE and build/deploy:
   ```bash
   npm run mobile:ios    # or
   npm run mobile:android
   ```

## Troubleshooting

### Node Version Error
If you get errors about Node version, ensure you're using Node.js 20 or higher:
```bash
node --version
```

Consider using [nvm](https://github.com/nvm-sh/nvm) to manage Node versions.

### iOS Build Issues
- Ensure Xcode Command Line Tools are installed
- Update CocoaPods: `sudo gem install cocoapods`
- Clean build folder in Xcode

### Android Build Issues
- Ensure Android SDK is installed via Android Studio
- Check ANDROID_HOME environment variable is set
- Sync Gradle files in Android Studio

