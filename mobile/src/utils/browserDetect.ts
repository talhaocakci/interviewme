export const getBrowserInfo = () => {
  if (typeof navigator === 'undefined') {
    return { isIOS: false, isChrome: false, isSafari: false, isSupported: true };
  }

  const userAgent = navigator.userAgent || '';
  
  // Detect iOS (iPhone, iPad, iPod)
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  
  // Detect Chrome on iOS (CriOS in user agent)
  const isIOSChrome = isIOS && /CriOS/.test(userAgent);
  
  // Detect Safari on iOS
  const isIOSSafari = isIOS && /Safari/.test(userAgent) && !/CriOS|FxiOS|OPiOS/.test(userAgent);
  
  // Detect Chrome on desktop/Android
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
  
  // Detect Safari on desktop
  const isSafari = /Safari/.test(userAgent) && /Apple Computer/.test(navigator.vendor);
  
  // WebRTC is only properly supported on iOS Safari, not iOS Chrome/Firefox/etc
  const isSupported = !isIOSChrome;
  
  return {
    isIOS,
    isIOSChrome,
    isIOSSafari,
    isChrome,
    isSafari,
    isSupported,
    userAgent
  };
};

export const getUnsupportedBrowserMessage = () => {
  const browser = getBrowserInfo();
  
  if (browser.isIOSChrome) {
    return {
      title: 'Browser Not Supported',
      message: 'Chrome on iOS does not support video calls. Please use Safari instead.',
      action: 'Open in Safari'
    };
  }
  
  if (!browser.isSupported) {
    return {
      title: 'Browser Not Supported',
      message: 'Your browser does not support video calls. Please use Safari on iOS or Chrome/Firefox on other devices.',
      action: null
    };
  }
  
  return null;
};

