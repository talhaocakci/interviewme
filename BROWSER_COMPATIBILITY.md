# Browser Compatibility Guide

## Supported Browsers

### ✅ Fully Supported

| Platform | Browser | WebRTC | Camera/Mic | Screen Share |
|----------|---------|--------|------------|--------------|
| **Desktop** | Chrome 90+ | ✅ | ✅ | ✅ |
| **Desktop** | Firefox 88+ | ✅ | ✅ | ✅ |
| **Desktop** | Edge 90+ | ✅ | ✅ | ✅ |
| **Desktop** | Safari 14+ | ✅ | ✅ | ✅ |
| **iOS** | Safari 14.3+ | ✅ | ✅ | ❌ |
| **Android** | Chrome 90+ | ✅ | ✅ | ✅ |
| **Android** | Firefox 88+ | ✅ | ✅ | ✅ |

### ❌ Not Supported

| Platform | Browser | Reason |
|----------|---------|--------|
| **iOS** | Chrome | Apple restricts WebRTC APIs on iOS browsers other than Safari |
| **iOS** | Firefox | Same restriction as Chrome |
| **iOS** | Edge | Same restriction as Chrome |
| **iOS** | Opera | Same restriction as Chrome |

## Why iOS Chrome Doesn't Work?

Apple requires **all browsers on iOS to use WebKit** (Safari's rendering engine). This means:

1. **Chrome on iOS is actually Safari** with a Chrome UI
2. **Chrome on iOS doesn't implement full WebRTC APIs** properly
3. **`getUserMedia()` is blocked or automatically denied**
4. **Only Safari on iOS has full WebRTC support**

This is an Apple policy, not a limitation of our app or Chrome.

## User Experience

When a user tries to join a video call on iOS Chrome:

1. **Automatic Detection**: The app detects iOS Chrome before requesting camera access
2. **Helpful Dialog**: Shows a dialog explaining the limitation
3. **"Open in Safari" Button**: Provides a button to switch to Safari
4. **Clear Error Message**: Displays user-friendly error instead of technical jargon

## Implementation

### Browser Detection (`mobile/src/utils/browserDetect.ts`)

```typescript
export const getBrowserInfo = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isIOSChrome = isIOS && /CriOS/.test(navigator.userAgent);
  const isSupported = !isIOSChrome;
  
  return { isIOS, isIOSChrome, isSupported };
};
```

### Integration

Both `VideoRoomScreen.tsx` and `CallScreen.tsx` now:

1. Check browser compatibility before requesting camera access
2. Show a user-friendly dialog if browser is unsupported
3. Provide an "Open in Safari" button for easy switching

## Recommendations for Users

### On iOS:
- ✅ **Use Safari** for video calls
- ❌ **Don't use Chrome, Firefox, Edge, or Opera**

### On Desktop:
- ✅ Use any modern browser (Chrome, Firefox, Edge, Safari)

### On Android:
- ✅ Use any modern browser (Chrome, Firefox, Edge)

## Testing Checklist

- [ ] iOS Safari - Camera/Mic access works
- [ ] iOS Chrome - Shows unsupported browser dialog
- [ ] Desktop Chrome - Full functionality
- [ ] Desktop Firefox - Full functionality
- [ ] Desktop Safari - Full functionality
- [ ] Android Chrome - Full functionality

## Links

- [WebRTC Browser Support](https://caniuse.com/rtcpeerconnection)
- [iOS Browser Restrictions](https://developer.apple.com/app-store/review/guidelines/#software-requirements)
- [getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

