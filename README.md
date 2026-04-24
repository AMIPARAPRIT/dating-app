# Spark — AI-Powered Dating App

## Stack
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **Backend**: Node.js + Express + Socket.io
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT + Google OAuth
- **Storage**: Cloudinary
- **AI Matching**: Rule-based scoring engine (upgradeable to ML)

## Setup

### Backend
```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env   # add VITE_GOOGLE_CLIENT_ID
npm install
npm run dev
```

## Environment Variables

### Backend `.env`
| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `CLOUDINARY_*` | Cloudinary credentials |
| `CLIENT_URL` | Frontend URL (default: http://localhost:5173) |

### Frontend `.env`
| Variable | Description |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

## Features
- 9-step profile onboarding with progress bar
- Swipe-based match feed with compatibility scores
- Real-time chat with Socket.io
- AI conversation starters
- Match celebration with confetti
- Profile strength scoring
- Verified badge system
- Report/block users

## Matching Algorithm
Scores are weighted across 6 dimensions:
- Location proximity (25%)
- Age preference (20%)
- Intent match (15%)
- Interests overlap (15%)
- Lifestyle similarity (10%)
- Behavior signals (15%)

## Deployment
- **Frontend**: Vercel / Netlify
- **Backend**: Render / Railway
- **Database**: MongoDB Atlas
