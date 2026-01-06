# Testing Guide

This document provides instructions for testing the Chat & Video Call application.

## Running Tests

### Backend Tests

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Install test dependencies
pip install pytest pytest-asyncio pytest-cov httpx

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v
```

### Frontend Tests

```bash
cd mobile

# Run tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Manual Testing Checklist

### Authentication Testing

#### Email/Password Authentication
- [ ] Register new user with email and password
- [ ] Register with invalid email format (should fail)
- [ ] Register with password < 6 characters (should fail)
- [ ] Register with existing email (should fail)
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Token persists after app restart
- [ ] Logout clears authentication

#### Phone Authentication
- [ ] Send OTP to valid phone number
- [ ] Receive OTP code (check logs in development)
- [ ] Verify with correct OTP
- [ ] Verify with incorrect OTP (should fail)
- [ ] OTP expires after 5 minutes
- [ ] Login/Register with phone number

#### Social Authentication
- [ ] Google Sign In
- [ ] Facebook Login
- [ ] Apple Sign In
- [ ] Link multiple auth providers to same account
- [ ] Existing email user can connect social accounts

### Chat Testing

#### Conversations
- [ ] Create new 1-on-1 conversation
- [ ] Create new group conversation
- [ ] List all conversations
- [ ] Search conversations
- [ ] Open conversation
- [ ] View conversation participants

#### Messaging
- [ ] Send text message
- [ ] Receive real-time message
- [ ] Messages appear in correct order
- [ ] Send message with emoji
- [ ] Long messages wrap correctly
- [ ] Message timestamps are correct
- [ ] Typing indicator shows when other user types
- [ ] Typing indicator disappears after typing stops
- [ ] Load older messages (pagination)
- [ ] Reply to message
- [ ] Send image (if implemented)
- [ ] Send video (if implemented)
- [ ] Send file (if implemented)

### Video Call Testing

#### Call Initialization
- [ ] Initiate 1-on-1 call
- [ ] Receive incoming call notification
- [ ] Accept incoming call
- [ ] Reject incoming call
- [ ] Call status updates correctly

#### During Call
- [ ] Video streams for both participants
- [ ] Audio works bi-directionally
- [ ] Toggle microphone (mute/unmute)
- [ ] Toggle camera (on/off)
- [ ] Switch camera (front/back) on mobile
- [ ] Call duration updates
- [ ] Video quality adjusts to network
- [ ] Handle network reconnection

#### Group Calls
- [ ] Multiple participants join call
- [ ] All video streams display
- [ ] Audio from all participants
- [ ] Participant leaves, others continue
- [ ] New participant joins active call

#### Call End
- [ ] End call button works
- [ ] Call ends for all participants
- [ ] Call duration recorded correctly
- [ ] Recording uploaded to S3 (if enabled)
- [ ] Return to chat screen after call

### WebSocket Testing

#### Connection
- [ ] WebSocket connects on app start
- [ ] Reconnects after disconnection
- [ ] Authentication token validated
- [ ] Connection status indicator (if present)

#### Real-time Updates
- [ ] Messages appear instantly
- [ ] Typing indicators update
- [ ] User presence updates
- [ ] Call signals transmitted
- [ ] ICE candidates exchanged

### Cross-Platform Testing

#### iOS
- [ ] App launches successfully
- [ ] Navigation works
- [ ] Authentication works
- [ ] Chat functions correctly
- [ ] Video calls work
- [ ] Camera/microphone permissions requested
- [ ] UI renders correctly
- [ ] No crashes or freezes

#### Android
- [ ] App launches successfully
- [ ] Navigation works
- [ ] Authentication works
- [ ] Chat functions correctly
- [ ] Video calls work
- [ ] Camera/microphone permissions requested
- [ ] UI renders correctly
- [ ] Back button behavior correct
- [ ] No crashes or freezes

#### Web
- [ ] App loads in browser
- [ ] Responsive design works
- [ ] Authentication works
- [ ] Chat functions correctly
- [ ] Video calls work (WebRTC support)
- [ ] Browser permissions requested
- [ ] Works in Chrome, Firefox, Safari

### Performance Testing

#### Backend
- [ ] API response times < 500ms
- [ ] WebSocket latency < 100ms
- [ ] Database queries optimized
- [ ] Concurrent users handled (load test)
- [ ] Memory usage stable

#### Frontend
- [ ] App launch time < 3 seconds
- [ ] Screen transitions smooth
- [ ] List scrolling smooth (60 FPS)
- [ ] Image loading doesn't block UI
- [ ] Video playback smooth
- [ ] Memory usage stable
- [ ] Battery usage acceptable

### Security Testing

#### Authentication Security
- [ ] Passwords hashed (not stored plain text)
- [ ] JWT tokens expire correctly
- [ ] Refresh tokens work
- [ ] Invalid tokens rejected
- [ ] Rate limiting on auth endpoints
- [ ] SQL injection attempts blocked
- [ ] XSS attempts sanitized

#### API Security
- [ ] Protected endpoints require authentication
- [ ] Users can only access their own data
- [ ] CORS configured correctly
- [ ] No sensitive data in logs
- [ ] File upload size limits enforced

#### WebSocket Security
- [ ] WSS (secure WebSocket) in production
- [ ] Authentication required for connection
- [ ] Message validation
- [ ] Rate limiting

### Error Handling

#### Network Errors
- [ ] Offline mode indicated to user
- [ ] Retry logic for failed requests
- [ ] Graceful degradation
- [ ] Error messages user-friendly

#### Application Errors
- [ ] Crashes logged (Sentry or similar)
- [ ] User sees helpful error messages
- [ ] App doesn't crash on errors
- [ ] Recovery from errors possible

### Edge Cases

#### Authentication
- [ ] Multiple devices with same account
- [ ] Login on new device logs out old device (or both work)
- [ ] Account with no profile picture
- [ ] Account with very long name

#### Chat
- [ ] Empty messages not sent
- [ ] Messages with only whitespace
- [ ] Very long messages (1000+ characters)
- [ ] Rapid fire messages
- [ ] Message sent while offline (queued)
- [ ] Conversation with 100+ messages loads
- [ ] Conversation with 10+ participants

#### Video Calls
- [ ] Call with poor network connection
- [ ] Call while moving (changing networks)
- [ ] Call on cellular vs WiFi
- [ ] Call with background noise
- [ ] Call in low light conditions
- [ ] Rotate device during call
- [ ] Incoming phone call during video call
- [ ] App backgrounded during call
- [ ] Battery low during call

## Automated Test Examples

### Backend Test Example

```python
# tests/test_auth.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_register_user():
    response = client.post(
        "/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpass123",
            "full_name": "Test User"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data

def test_login_user():
    response = client.post(
        "/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpass123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
```

### Frontend Test Example

```typescript
// __tests__/LoginScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { store } from '../src/store';
import LoginScreen from '../src/screens/LoginScreen';

describe('LoginScreen', () => {
  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <Provider store={store}>
        <LoginScreen />
      </Provider>
    );
    
    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
  });

  it('shows error for empty fields', async () => {
    const { getByText } = render(
      <Provider store={store}>
        <LoginScreen />
      </Provider>
    );
    
    const loginButton = getByText('Sign In');
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(getByText('Please enter email and password')).toBeTruthy();
    });
  });
});
```

## Load Testing

### Backend Load Test with Locust

```python
# locustfile.py
from locust import HttpUser, task, between

class ChatUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login
        response = self.client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "testpass123"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def get_conversations(self):
        self.client.get("/conversations", headers=self.headers)
    
    @task(2)
    def get_messages(self):
        self.client.get("/conversations/1/messages", headers=self.headers)
    
    @task(1)
    def send_message(self):
        self.client.post(
            "/conversations/1/messages",
            json={"content": "Test message"},
            headers=self.headers
        )

# Run: locust -f locustfile.py --host=http://localhost:8000
```

## Performance Benchmarks

### Target Metrics

**Backend:**
- API response time: < 200ms (p95)
- WebSocket latency: < 50ms
- Concurrent users: 1000+
- Messages per second: 100+

**Frontend:**
- Time to interactive: < 3s
- Frame rate: 60 FPS
- Memory usage: < 200MB
- Battery drain: < 5%/hour

## Bug Reporting

When reporting bugs, include:

1. **Environment:**
   - Platform (iOS/Android/Web)
   - Device model
   - OS version
   - App version

2. **Steps to Reproduce:**
   - Detailed step-by-step instructions

3. **Expected Behavior:**
   - What should happen

4. **Actual Behavior:**
   - What actually happens

5. **Screenshots/Videos:**
   - Visual evidence of the issue

6. **Logs:**
   - Console logs
   - Error messages
   - Stack traces

## Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest pytest-cov
      - name: Run tests
        run: |
          cd backend
          pytest --cov=app
  
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Node
        uses: actions/setup-node@v2
        with:
          node-version: 16
      - name: Install dependencies
        run: |
          cd mobile
          npm install
      - name: Run tests
        run: |
          cd mobile
          npm test
```

## Test Coverage Goals

- Backend: > 80% code coverage
- Frontend: > 70% code coverage
- Critical paths: 100% coverage
  - Authentication
  - Message sending/receiving
  - Call initiation/end

## Conclusion

Thorough testing ensures a reliable, high-quality application. Always test on multiple platforms and devices before releasing to production.

