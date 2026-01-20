# LiveKit Integration Setup

## Install Dependencies

Run this command to install LiveKit components:

```bash
pnpm add livekit-client @livekit/components-react
# or
npm install livekit-client @livekit/components-react
```

## Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
```

## Get LiveKit Credentials

1. Go to https://livekit.io/
2. Sign up for a free account
3. Create a new project
4. Copy your credentials to `.env.local`

## Usage

The meeting page is ready to use. Users will:
1. See their video preview
2. Check camera/microphone permissions
3. Select devices
4. Join the meeting when ready
