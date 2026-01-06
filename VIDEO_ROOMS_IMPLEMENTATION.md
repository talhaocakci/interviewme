# Video Call Rooms Implementation

## Overview

A complete video call room system where users can:
1. Create a room
2. Share a link
3. Others join via the link
4. Start a WebRTC video call

## Architecture

```
User 1 (Host)                          User 2 (Joiner)
     │                                       │
     ├─ Create Room ─────────────────────>  │
     │  (GET room_id & link)                │
     │                                       │
     ├─ Share Link ──────────────────────>  │
     │                                       │
     ├─ Connect to WebSocket                ├─ Click Link
     │  with room_id                         │
     │                                       ├─ Connect to WebSocket
     │                                       │  with room_id
     │  <──── peer_joined ───────────────   │
     │                                       │
     ├──── offer (SDP) ──────────────────>  │
     │  <─── answer (SDP) ──────────────    │
     │                                       │
     ├──── ICE candidates ───────────────>  │
     │  <─── ICE candidates ───────────     │
     │                                       │
     │  ═══════ P2P Video Stream ═══════    │
     │  (direct connection via WebRTC)      │
```

## Files Created

### Backend (Lambda)

1. **`lambda/room/handler.py`** - Room management
   - POST `/room/create` - Create a room
   - POST `/room/join` - Join a room
   - GET `/room/{room_id}` - Get room details
   - GET `/rooms` - List active rooms

2. **`lambda/websocket/room_handler.py`** - WebRTC signaling
   - `connect_handler` - Handle WebSocket connections
   - `disconnect_handler` - Handle disconnections
   - `message_handler` - Handle WebRTC signaling (offer, answer, ICE)

### Frontend (React Native)

1. **`mobile/src/screens/CreateRoomScreen.tsx`** - Room creation UI
   - Create room with name
   - Get shareable link
   - Navigate to video call

## Implementation Steps

### Step 1: Deploy Backend

```bash
# 1. Add room Lambda to Terraform
cd terraform
# Edit lambda.tf to add room Lambda function

# 2. Update API Gateway
# Edit api_gateway.tf to add room routes

# 3. Package and deploy Lambda
cd ../lambda
./deploy.sh

# 4. Apply Terraform
cd ../terraform
terraform apply
```

### Step 2: Complete Frontend

You need to create:

1. **VideoRoomScreen.tsx** - Main video call screen with WebRTC
2. **JoinRoomScreen.tsx** - Join room by ID or link
3. **RoomWebSocketService** - WebSocket client for signaling
4. **RoomWebRTCService** - WebRTC peer connection management

### Step 3: Add Navigation

Update `AppNavigator.tsx`:

```typescript
<Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
<Stack.Screen name="VideoRoom" component={VideoRoomScreen} />
<Stack.Screen name="JoinRoom" component={JoinRoomScreen} />
```

## API Endpoints Needed

Add to `terraform/api_gateway.tf`:

```hcl
# Room routes
resource "aws_apigatewayv2_route" "create_room" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /room/create"
  target    = "integrations/${aws_apigatewayv2_integration.room.id}"
}

resource "aws_apigatewayv2_route" "join_room" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /room/join"
  target    = "integrations/${aws_apigatewayv2_integration.room.id}"
}

resource "aws_apigatewayv2_route" "get_room" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /room/{room_id}"
  target    = "integrations/${aws_apigatewayv2_integration.room.id}"
}
```

## WebSocket Signaling Flow

```javascript
// 1. Connect to WebSocket with room ID
const ws = new WebSocket(`wss://your-api.com/dev?room_id=${roomId}`);

// 2. Send join message
ws.send(JSON.stringify({ type: 'join_room' }));

// 3. Receive peer list
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'peers_list') {
    // Create offer for each peer
    msg.peers.forEach(peerId => createOffer(peerId));
  }
  
  else if (msg.type === 'offer') {
    // Handle offer and send answer
    handleOffer(msg.from, msg.data);
  }
  
  else if (msg.type === 'answer') {
    // Handle answer
    handleAnswer(msg.from, msg.data);
  }
  
  else if (msg.type === 'ice-candidate') {
    // Add ICE candidate
    addIceCandidate(msg.from, msg.data);
  }
};
```

## WebRTC Connection Flow

```typescript
// 1. Get local stream
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});

// 2. Create peer connection
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
});

// 3. Add local stream
stream.getTracks().forEach(track => {
  pc.addTrack(track, stream);
});

// 4. Handle ICE candidates
pc.onicecandidate = (event) => {
  if (event.candidate) {
    ws.send(JSON.stringify({
      type: 'ice-candidate',
      target: peerId,
      data: event.candidate
    }));
  }
};

// 5. Handle remote stream
pc.ontrack = (event) => {
  remoteVideo.srcObject = event.streams[0];
};

// 6. Create offer (caller)
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
ws.send(JSON.stringify({
  type: 'offer',
  target: peerId,
  data: offer
}));

// 7. Handle offer (callee)
await pc.setRemoteDescription(offer);
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);
ws.send(JSON.stringify({
  type: 'answer',
  target: peerId,
  data: answer
}));
```

## URL Sharing

### Generate Room Link

```typescript
const roomLink = `https://yourapp.com/room/${room_id}`;
// or
const roomLink = `exp://localhost:8081/--/room/${room_id}`;  // For Expo
```

### Deep Linking (Optional)

Add to `app.json`:

```json
{
  "expo": {
    "scheme": "chatvideoapp",
    "web": {
      "linking": {
        "prefixes": ["https://yourapp.com"]
      }
    }
  }
}
```

## Quick Start (For You)

### 1. Test Room Creation

```bash
# After deploying Lambda
curl -X POST https://YOUR_API/dev/room/create \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Room"}'

# Response:
# {
#   "room_id": "abc123xyz",
#   "join_url": "/room/abc123xyz"
# }
```

### 2. Test Room Join

```bash
curl -X POST https://YOUR_API/dev/room/join \
  -H "Content-Type: application/json" \
  -d '{"room_id": "abc123xyz"}'
```

### 3. Connect WebSocket

```javascript
const ws = new WebSocket('wss://YOUR_WS_API/dev?room_id=abc123xyz');
```

## Next Steps

1. ✅ Backend Lambda created
2. ✅ Frontend CreateRoomScreen created
3. ⏳ Add Terraform configuration for room Lambda
4. ⏳ Create VideoRoomScreen with WebRTC
5. ⏳ Create RoomWebSocketService
6. ⏳ Add navigation routes
7. ⏳ Test end-to-end

## Need Help?

See these files for reference:
- Backend: `lambda/room/handler.py`
- WebSocket: `lambda/websocket/room_handler.py`
- Frontend: `mobile/src/screens/CreateRoomScreen.tsx`

The basic structure is in place. You now need to:
1. Update Terraform to deploy the room Lambda
2. Complete the frontend VideoRoomScreen
3. Integrate WebSocket signaling

Would you like me to continue with any specific part?

