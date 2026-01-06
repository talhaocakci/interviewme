// Mock PermissionsAndroid for web
// PermissionsAndroid is Android-only, not needed on web

export default {
  PERMISSIONS: {},
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },
  check: () => Promise.resolve(false),
  request: () => Promise.resolve('denied'),
  requestMultiple: () => Promise.resolve({}),
};

