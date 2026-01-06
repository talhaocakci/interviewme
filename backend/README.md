# Chat & Video Call Backend API

Backend server for the React Native chat and video calling application.

## Features

- **Authentication**: Email/password, phone OTP, Google, Facebook, Apple Sign In
- **Real-time Chat**: WebSocket-based messaging with Socket.IO
- **Video Calls**: WebRTC signaling for 1-on-1 and group video calls
- **File Storage**: AWS S3 integration for video recordings and media files
- **Database**: PostgreSQL with SQLAlchemy ORM

## Tech Stack

- Python 3.9+
- FastAPI
- Socket.IO
- SQLAlchemy + PostgreSQL
- boto3 (AWS S3)
- JWT authentication
- Twilio (SMS OTP)

## Setup

### Prerequisites

- Python 3.9 or higher
- PostgreSQL database
- AWS S3 bucket (optional, for production)
- Twilio account (optional, for SMS OTP)

### Installation

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
# Make sure PostgreSQL is running and create a database
createdb chatdb

# The tables will be created automatically on first run
```

### Running the Server

Development mode:
```bash
uvicorn app.main:application --reload --host 0.0.0.0 --port 8000
```

Production mode:
```bash
gunicorn app.main:application -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/phone/send-otp` - Send OTP to phone
- `POST /auth/phone/verify-otp` - Verify OTP
- `POST /auth/google` - Google OAuth
- `POST /auth/facebook` - Facebook OAuth
- `POST /auth/apple` - Apple Sign In
- `GET /auth/me` - Get current user

### Users
- `GET /users/me` - Get current user profile
- `GET /users/{user_id}` - Get user by ID
- `GET /users?q=search` - Search users

### Conversations
- `POST /conversations` - Create conversation
- `GET /conversations` - List user conversations
- `GET /conversations/{id}` - Get conversation details
- `GET /conversations/{id}/messages` - Get messages
- `POST /conversations/{id}/messages` - Send message

### Calls
- `POST /calls/initiate` - Start a call
- `POST /calls/{id}/accept` - Accept call
- `POST /calls/{id}/reject` - Reject call
- `POST /calls/{id}/end` - End call
- `POST /calls/{id}/recording` - Upload recording metadata
- `GET /calls/{id}` - Get call details
- `GET /calls/{id}/recordings` - Get call recordings

## WebSocket Events

### Client → Server
- `connect` - Connect with JWT token
- `join_conversation` - Join conversation room
- `send_message` - Send text message
- `typing` - Typing indicator
- `call_offer` - Send WebRTC offer
- `call_answer` - Send WebRTC answer
- `ice_candidate` - Send ICE candidate
- `call_ended` - End call

### Server → Client
- `new_message` - Receive new message
- `user_typing` - User typing indicator
- `call_offer` - Receive WebRTC offer
- `call_answer` - Receive WebRTC answer
- `ice_candidate` - Receive ICE candidate
- `peer_left` - Peer left call

## Environment Variables

See `.env.example` for all required environment variables.

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET_KEY` - Secret key for JWT tokens

### Optional
- `AWS_*` - AWS S3 credentials for file storage
- `TWILIO_*` - Twilio credentials for SMS OTP
- `GOOGLE_*` - Google OAuth credentials
- `FACEBOOK_*` - Facebook OAuth credentials
- `APPLE_*` - Apple Sign In credentials

## Database Schema

- `users` - User accounts
- `auth_providers` - Linked social auth providers
- `conversations` - Chat conversations (1-on-1 and groups)
- `participants` - Conversation participants
- `messages` - Chat messages
- `calls` - Video call records
- `recordings` - Call recording metadata

## Development

### Running Tests
```bash
pytest
```

### Database Migrations
```bash
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## Deployment

### Docker
```bash
docker build -t chat-backend .
docker run -p 8000:8000 --env-file .env chat-backend
```

### Production Checklist
- [ ] Set strong `JWT_SECRET_KEY`
- [ ] Configure PostgreSQL with proper credentials
- [ ] Set up AWS S3 bucket with CORS
- [ ] Configure Twilio for SMS (if using phone auth)
- [ ] Set up OAuth apps for social login
- [ ] Enable HTTPS/WSS
- [ ] Configure CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

## License

MIT

