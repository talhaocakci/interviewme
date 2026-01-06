# Mobile App - React Native Frontend

Cross-platform mobile application built with React Native and Expo.

## Features

- 📱 Works on iOS, Android, and Web
- 💬 Real-time chat messaging
- 📹 Video calling with WebRTC
- 🔐 JWT authentication
- 📤 File uploads to S3
- 🔄 Redux state management
- 🎨 Material Design with React Native Paper

## Quick Start

### Install Dependencies

```bash
# Install all dependencies
npm install

# Install web support
npx expo install react-native-web@~0.19.6 react-dom@18.2.0
```

### Configure Environment

```bash
# Create .env file
cat > .env << EOF
API_BASE_URL=https://your-api-gateway-url.amazonaws.com/dev
WS_URL=wss://your-websocket-url.amazonaws.com/dev
EOF
```

Get your API URLs from Terraform:
```bash
cd ../terraform
terraform output api_gateway_url
terraform output websocket_url
```

### Run the App

```bash
# Start Expo
npm start

# Then press:
# - 'w' for web browser
# - 'i' for iOS simulator (Mac only)
# - 'a' for Android emulator
```

Or run directly:

```bash
npm run web      # Web browser
npm run ios      # iOS simulator
npm run android  # Android emulator
```

## Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── MessageBubble.tsx
│   ├── screens/             # Screen components
│   │   ├── AuthScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── CallScreen.tsx
│   │   └── ConversationsScreen.tsx
│   ├── navigation/          # Navigation setup
│   │   └── AppNavigator.tsx
│   ├── services/            # API & WebSocket clients
│   │   ├── api.ts          # REST API client
│   │   ├── socket.ts       # WebSocket client
│   │   └── webrtc.ts       # WebRTC manager
│   ├── store/               # Redux store
│   │   ├── store.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── chatSlice.ts
│   │       └── callSlice.ts
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useChat.ts
│   │   └── useCallRecording.ts
│   └── utils/               # Utilities
│       ├── storage.ts
│       └── helpers.ts
├── App.tsx                  # App entry point
├── app.json                 # Expo configuration
├── package.json
└── tsconfig.json
```

## Available Scripts

```bash
npm start          # Start Expo development server
npm run web        # Start web version
npm run ios        # Start iOS simulator
npm run android    # Start Android emulator
```

## Platform Support

### Web
✅ Fully supported
- Works in any modern browser
- Chrome, Firefox, Safari, Edge
- Responsive design

### iOS
✅ Fully supported (Mac only for development)
- iPhone 11+
- iOS 13+
- Requires Xcode for simulator

### Android
✅ Fully supported
- Android 8.0+
- Works with Android Studio emulator
- Works with physical devices

## Dependencies

### Core
- `react` - React framework
- `react-native` - React Native framework
- `expo` - Expo framework

### Navigation
- `@react-navigation/native` - Navigation
- `@react-navigation/stack` - Stack navigator
- `@react-navigation/bottom-tabs` - Tab navigator

### State Management
- `@reduxjs/toolkit` - Redux
- `react-redux` - React Redux bindings

### UI
- `react-native-paper` - Material Design components
- `react-native-vector-icons` - Icons
- `react-native-safe-area-context` - Safe areas

### Network
- `axios` - HTTP client
- `socket.io-client` - WebSocket client

### Storage
- `@react-native-async-storage/async-storage` - Local storage

### Media
- `expo-camera` - Camera access
- `expo-image-picker` - Image picker
- `expo-av` - Audio/video
- `react-native-webrtc` - WebRTC for video calls

### Web Support
- `react-dom` - React DOM for web
- `react-native-web` - React Native Web

## Configuration

### Environment Variables

Create `.env` file:

```env
# API Configuration (from Terraform outputs)
API_BASE_URL=https://abc123.execute-api.us-east-1.amazonaws.com/dev
WS_URL=wss://xyz789.execute-api.us-east-1.amazonaws.com/dev

# OAuth (optional)
GOOGLE_WEB_CLIENT_ID=your-google-client-id
FACEBOOK_APP_ID=your-facebook-app-id
```

### Expo Configuration

Edit `app.json`:

```json
{
  "expo": {
    "name": "Chat & Video",
    "slug": "chat-video-app",
    "platforms": ["ios", "android", "web"],
    "version": "1.0.0"
  }
}
```

## Development

### Hot Reload

Changes are automatically reflected:
- Save file → See changes instantly
- No need to rebuild

### Debugging

```bash
# Open React DevTools
npm start
# Press 'j' for debugger

# View logs
# Logs appear in terminal automatically
```

### Testing on Physical Device

1. Install "Expo Go" app from App Store or Play Store
2. Scan QR code shown in terminal
3. App runs on your device

## Building for Production

### iOS App Store

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### Google Play Store

```bash
# Build for Android
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

### Web

```bash
# Build for web
npx expo export:web

# Deploy build directory to:
# - Vercel
# - Netlify
# - AWS S3 + CloudFront
# - Any static hosting
```

## Troubleshooting

### Web doesn't start

```bash
# Install web dependencies
npx expo install react-native-web@~0.19.6 react-dom@18.2.0

# Clear cache
npm start -- --clear
```

### iOS simulator not opening

```bash
# Make sure Xcode is installed (Mac only)
xcode-select --install

# Start iOS simulator manually
open -a Simulator

# Then press 'i' in Expo
```

### Android emulator not opening

```bash
# Make sure Android Studio is installed
# Open Android Studio → AVD Manager → Start Emulator

# Then press 'a' in Expo
```

### WebRTC not working

```bash
# Make sure you're on HTTPS in production
# HTTP only works on localhost

# For production, use proper SSL certificate
```

### Connection to backend failed

```bash
# Check API URLs in .env
cat .env

# Get correct URLs from Terraform
cd ../terraform
terraform output api_gateway_url
terraform output websocket_url

# Update .env with correct URLs
nano .env
```

### Module not found errors

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm start -- --clear
```

## Performance Tips

1. **Images**: Use optimized images
2. **Lists**: Use FlatList for long lists
3. **Memoization**: Use React.memo for components
4. **State**: Keep Redux state minimal
5. **Network**: Implement request caching

## Best Practices

1. **TypeScript**: Use types for better code quality
2. **Components**: Keep components small and focused
3. **Hooks**: Use custom hooks for reusable logic
4. **Testing**: Write tests for critical paths
5. **Accessibility**: Add accessibility labels

## Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)

## Support

For issues:
1. Check this README
2. Check main project README
3. Open an issue on GitHub
4. Check Expo documentation

---

Happy coding! 🚀
