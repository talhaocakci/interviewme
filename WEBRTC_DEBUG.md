# WebRTC Connection Debugging Guide

## Quick Fixes

### 1. Check WebSocket URL (Most Common Issue)

**Open `mobile/.env` and verify:**

```env
API_BASE_URL=https://e83ohzrpp3.execute-api.us-east-1.amazonaws.com/dev
WS_URL=wss://it0klizcpl.execute-api.us-east-1.amazonaws.com/dev
```

⚠️ **Make sure `WS_URL` starts with `wss://` not `ws://` or `http://`**

### 2. Restart Dev Server

After changing `.env`:

```bash
cd mobile
npm start -- --reset-cache
```

### 3. Clear Browser Cache

- **Chrome**: Cmd+Shift+Delete → Clear browsing data
- **Safari**: Cmd+Option+E → Clear cache

## Connection States Explained

You'll now see connection states in the room info panel:

| Icon | State | Meaning |
|------|-------|---------|
| 🔌 new | Initial state | Just created connection |
| 🔌 connecting | Attempting connection | Exchanging offers/answers |
| 🔌 connected | ✅ Success! | Peer-to-peer connection established |
| 🔌 disconnected | ⚠️ Warning | Connection lost (network issue?) |
| 🔌 failed | ❌ Error | Connection permanently failed |

| Icon | State | Meaning |
|------|-------|---------|
| 🧊 new | Initial | Waiting for ICE candidates |
| 🧊 checking | Checking | Testing network paths |
| 🧊 connected | ✅ Success! | Found working path |
| 🧊 completed | ✅ Done | Best path selected |
| 🧊 failed | ❌ Error | No path found (firewall/NAT?) |
| 🧊 disconnected | ⚠️ Warning | Path lost |

## Common Issues & Solutions

### Issue 1: "Connection state: disconnected" immediately

**Likely cause:** WebSocket not connecting to AWS

**Fix:**
1. Check console for WebSocket errors
2. Verify `WS_URL` in `.env` is correct: `wss://it0klizcpl.execute-api.us-east-1.amazonaws.com/dev`
3. Restart dev server

### Issue 2: "ICE connection state: failed"

**Likely cause:** Firewall blocking peer-to-peer connection

**Fix:**
- Now using TURN servers which should help!
- Check if you're behind a corporate firewall/VPN
- Try on mobile data instead of WiFi
- Try from a different network

### Issue 3: Can't see remote video

**Checklist:**
- [ ] Both users in the same room?
- [ ] Console shows "Received remote track"?
- [ ] Console shows "Connection state: connected"?
- [ ] Remote video element exists? (check with browser DevTools)

### Issue 4: WebSocket connection fails

**Check console for:**
```
WebSocket connection to 'wss://...' failed
```

**Fix:**
1. Verify AWS WebSocket API Gateway is deployed:
   ```bash
   cd terraform
   terraform output websocket_url
   ```
2. Copy the URL (without quotes) to `mobile/.env`
3. Restart dev server

## Improved Configuration

I've added:

### ✅ Multiple STUN Servers
- Google STUN servers (5 different ones for redundancy)

### ✅ TURN Servers
- Free Open Relay Project TURN servers
- Works through firewalls and strict NATs
- Should fix most connection issues

### ✅ Automatic Reconnection
- Automatically attempts to reconnect if connection drops
- Up to 3 reconnection attempts with exponential backoff
- UI shows reconnection status
- Waits 5 seconds for natural recovery before forcing reconnection

### ✅ Better Debugging
- Connection state displayed in UI
- ICE connection state displayed in UI  
- Reconnection status and attempts shown
- Detailed console logging

## Testing Steps

### Test 1: Open two tabs in same browser

1. Create a room in Tab 1
2. Copy room URL
3. Open in Tab 2 (incognito/private window)
4. Both should see each other

**Expected console output:**
```
✅ ICE connection established!
✅✅✅ PEER CONNECTION ESTABLISHED! ✅✅✅
📹 Received remote track: video
📹 Received remote track: audio
```

### Test 2: Open on two different devices

1. Create room on Device 1
2. Share URL to Device 2
3. Both join

**If it works:** ✅ Everything is good!  
**If it doesn't:** Check firewall/network settings

### Test 3: Check WebSocket connection

**Open browser console and look for:**

```javascript
// Good signs:
"WebSocket connected"
"Joined room successfully"
"Found existing peer, creating connection"

// Bad signs:
"WebSocket connection failed"
"WebSocket error"
"Connection refused"
```

## Advanced Debugging

### Check ICE Candidates

In console, you should see:
```
📤 Sending ICE candidate to: <peer-id>
📥 Received ICE candidate
✅ ICE candidate added
```

If you see **no ICE candidates**, the WebRTC configuration might be wrong.

### Check Offer/Answer Exchange

You should see:
```
📤 Sending offer to: <peer-id>
📥 Received answer from: <peer-id>
```

or:
```
📥 Received offer from: <peer-id>
📤 Sending answer to: <peer-id>
```

If **no offer/answer exchange**, the WebSocket signaling isn't working.

### Verify Local Stream

Console should show:
```
Got local stream: MediaStream { id: "...", active: true }
Adding 2 local tracks to peer connection
  - video track: ...
  - audio track: ...
```

## Emergency Fixes

### Nuclear Option: Complete Reset

```bash
cd mobile

# Clear everything
rm -rf node_modules
rm package-lock.json
rm -rf .expo

# Reinstall
npm install

# Clear caches and restart
npm start -- --reset-cache --clear
```

### Check if AWS Services are Running

```bash
cd terraform

# Check all outputs
terraform output

# Specifically check WebSocket URL
terraform output websocket_url
```

Should show: `"wss://it0klizcpl.execute-api.us-east-1.amazonaws.com/dev"`

## Automatic Reconnection

### How It Works

When a connection drops, the app automatically:

1. **Detects Failure** - Monitors ICE connection state
2. **Waits for Recovery** - If "disconnected", waits 5 seconds for natural recovery
3. **Initiates Reconnection** - If still disconnected or if "failed", starts reconnection
4. **Attempts 3 Times** - Will try up to 3 times before giving up
5. **Shows Status** - Displays "🔄 Reconnecting" and attempt count

### What Triggers Reconnection?

- **ICE state: "failed"** → Immediate reconnection
- **ICE state: "disconnected"** → Waits 5s, then reconnects if still disconnected
- **Network interruption** → Auto-detects and reconnects

### Reconnection Process

```
Connection Lost
    ↓
Wait 5 seconds (if disconnected)
    ↓
Close existing peer connection
    ↓
Create new peer connection
    ↓
Re-establish WebRTC offer/answer
    ↓
Connection Restored ✅
```

### Console Messages

**Successful reconnection:**
```
⚠️ ICE connection disconnected - will attempt reconnection if not recovered
🔄 Reconnection attempt 1/3
Creating new peer connection for reconnection...
🔗 Creating peer connection for: <peer-id>
✅ ICE connection established!
✅✅✅ PEER CONNECTION ESTABLISHED! ✅✅✅
```

**Failed reconnection:**
```
🔄 Reconnection attempt 3/3
❌ Max reconnection attempts (3) reached
```

### What Happens After Max Attempts?

- Shows error: "Connection lost. Please refresh the page to rejoin."
- Stops trying to reconnect automatically
- User must manually refresh or rejoin the room

## Still Not Working?

### Share Console Output

Please share the console output including:

1. WebSocket connection messages
2. ICE connection state changes
3. Connection state changes
4. Any error messages

### Check Browser DevTools Network Tab

1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for your WebSocket URL
4. Status should be "101 Switching Protocols" (good)
5. If it's "failed" or "error", the WebSocket can't connect

