# Video Call Recording

## Overview

The video call recording feature allows users to record their video calls and automatically upload them to AWS S3 for storage.

## Features

✅ **One-Click Recording** - Start/stop recording with a single button  
✅ **Automatic Upload** - Records are automatically uploaded to S3 after stopping  
✅ **Both Streams** - Captures both local and remote video/audio  
✅ **Visual Feedback** - Recording indicator with duration timer  
✅ **Secure Storage** - Uses S3 presigned URLs for secure uploads  
✅ **30-Day Retention** - Recordings automatically expire after 30 days (configurable)  
✅ **Fallback Download** - If upload fails, offers local download

## How It Works

### 1. Start Recording

Click the record button (🔴) in the call controls:
- Button becomes orange/yellow when recording
- Recording indicator appears in room info
- Timer starts counting duration

### 2. During Recording

- `MediaRecorder API` captures both streams
- Data chunks are collected every second
- Duration displayed as `REC 0:45`
- Recording continues even if network temporarily drops

### 3. Stop Recording

Click the stop button (⏹️):
- Recording stops immediately
- Chunks are combined into a single WebM file
- File size is calculated
- Upload process begins automatically

### 4. Upload to S3

**Backend Flow:**
```
Frontend → POST /recordings/upload-url
           ↓
Lambda generates presigned S3 URL
           ↓
Frontend uploads directly to S3
           ↓
Recording metadata saved to DynamoDB
```

**S3 Structure:**
```
s3://bucket-name/recordings/{room_id}/{timestamp}-recording.webm
```

## UI Components

### Record Button

| State | Icon | Color | Enabled |
|-------|------|-------|---------|
| Not Recording | 🔴 record-circle | Blue | When peer connected |
| Recording | ⏹️ stop-circle | Orange | Always |
| No Peer | 🔴 record-circle | Blue (disabled) | Only with peer |

### Recording Indicator

Located in the room info panel (top-left):
```
┌─────────────────────────┐
│ Room Name • ✅ Connected│
│ 🔴 REC 1:23             │
│ 🔌 connected | 🧊 ...   │
└─────────────────────────┘
```

## Technical Details

### MediaRecorder Configuration

```typescript
const options = { 
  mimeType: 'video/webm;codecs=vp8,opus' 
};
const mediaRecorder = new MediaRecorder(combinedStream, options);
```

- **Format**: WebM container
- **Video Codec**: VP8
- **Audio Codec**: Opus
- **Chunk Interval**: 1000ms (1 second)

### Combined Stream

The recording captures:
- **Local Stream**: Your camera and microphone
- **Remote Stream**: Peer's camera and microphone

```typescript
const combinedStream = new MediaStream();
localStream.getTracks().forEach(track => combinedStream.addTrack(track));
remoteStream.getTracks().forEach(track => combinedStream.addTrack(track));
```

### S3 Upload

1. **Request Upload URL**:
   ```typescript
   POST /recordings/upload-url
   {
     "room_id": "abc123",
     "filename": "recording-1234567890.webm",
     "contentType": "video/webm",
     "size": 12345678
   }
   ```

2. **Receive Presigned URL**:
   ```json
   {
     "upload_url": "https://s3.amazonaws.com/...",
     "recording_id": "uuid",
     "s3_key": "recordings/abc123/20260106-123456-recording.webm",
     "expires_in": 1800
   }
   ```

3. **Upload to S3**:
   ```typescript
   await fetch(uploadUrl, {
     method: 'PUT',
     body: blob,
     headers: { 'Content-Type': 'video/webm' }
   });
   ```

### Database Storage

Recording metadata is saved to DynamoDB:

```json
{
  "PK": "RECORDING#uuid",
  "SK": "METADATA#20260106-123456",
  "recording_id": "uuid",
  "room_id": "abc123",
  "user_id": "user-email@example.com",
  "s3_key": "recordings/abc123/20260106-123456-recording.webm",
  "s3_bucket": "bucket-name",
  "filename": "recording-1234567890.webm",
  "content_type": "video/webm",
  "size": 12345678,
  "status": "completed",
  "created_at": "2026-01-06T12:34:56.789Z",
  "ttl": 1736160000
}
```

## API Endpoints

### POST /recordings/upload-url

Generate presigned S3 URL for upload.

**Request:**
```json
{
  "room_id": "string (required)",
  "filename": "string (optional)",
  "contentType": "string (optional, default: video/webm)",
  "size": number (optional)
}
```

**Response:**
```json
{
  "upload_url": "string",
  "recording_id": "string",
  "s3_key": "string",
  "expires_in": 1800
}
```

### GET /recordings

List recordings for current user or specific room.

**Query Parameters:**
- `room_id` (optional): Filter by room

**Response:**
```json
{
  "recordings": [
    {
      "recording_id": "string",
      "room_id": "string",
      "filename": "string",
      "size": number,
      "created_at": "string",
      "download_url": "string (presigned, 1 hour)"
    }
  ]
}
```

## Configuration

### Recording Retention

Default: 30 days (set via DynamoDB TTL)

To change retention period, update in `lambda/recordings/handler.py`:

```python
'ttl': int((datetime.utcnow() + timedelta(days=30)).timestamp())
                                                    ^^^ Change this
```

### File Size Limits

**S3 Limit**: 5 TB per object (no practical limit)  
**Lambda Timeout**: 30 seconds (plenty for generating URL)  
**Typical Recording**: ~10-20 MB per minute

### Presigned URL Expiry

- **Upload URL**: 30 minutes (1800 seconds)
- **Download URL**: 1 hour (3600 seconds)

## Error Handling

### Upload Fails

If S3 upload fails:
1. Error message displayed: "Failed to upload recording"
2. **Automatic fallback**: Downloads file locally to user's computer
3. User can manually upload later

### Network Interruption During Recording

- Recording continues in browser memory
- If reconnection succeeds, recording continues normally
- If max reconnection attempts reached, recording stops

### Permission Denied

If recording starts before remote stream is available:
- Only local stream is recorded
- Remote stream is added when available
- This happens if you click record before peer joins

## Deployment

### 1. Deploy Lambda

```bash
cd lambda
./deploy.sh
```

This packages the `recordings` Lambda with PyJWT for token validation.

### 2. Apply Terraform

```bash
cd terraform
terraform apply
```

Creates:
- `recordings` Lambda function
- API Gateway integration
- Routes for `/recordings/upload-url` and `/recordings`

### 3. Verify

```bash
terraform output lambda_functions
```

Should show `recordings = "chatvideo-recordings-dev"`.

## Testing

### Test Recording

1. **Join a room with another user**
2. **Click record button** (should turn orange)
3. **Wait 10-20 seconds**
4. **Click stop button**
5. **Check console** for upload progress:
   ```
   🎥 Starting recording...
   ✅ Recording started
   Recorded chunk: 12345 bytes
   🎬 Recording stopped, processing...
   📦 Recording size: 1.23 MB
   📤 Requesting upload URL...
   📤 Uploading to S3...
   ✅ Recording uploaded successfully!
   ```

### List Recordings

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://YOUR_API_URL/dev/recordings
```

## Browser Support

| Browser | Recording | Upload | Notes |
|---------|-----------|--------|-------|
| Chrome 60+ | ✅ | ✅ | Full support |
| Firefox 55+ | ✅ | ✅ | Full support |
| Safari 14.1+ | ✅ | ✅ | Full support |
| Edge 79+ | ✅ | ✅ | Full support |
| iOS Safari 14.5+ | ✅ | ✅ | Works on iPhone/iPad |
| iOS Chrome | ❌ | - | WebRTC not supported |

## Future Enhancements

- [ ] Recording quality selector (720p, 1080p)
- [ ] Picture-in-picture layout for recordings
- [ ] Automatic thumbnail generation
- [ ] Video transcoding (WebM → MP4)
- [ ] Shared recording access links
- [ ] Recording search/filtering
- [ ] Email notification when ready
- [ ] Download manager for large files

