# Humory Frontend

Next.js 14 frontend application for Humory - a comprehensive mood tracking and mental wellness platform.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** Zustand
- **API Client:** Axios
- **Real-time:** Socket.IO Client

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` and configure:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   NEXT_PUBLIC_WS_URL=http://localhost:3001
   NEXT_PUBLIC_TRACKER_URL=http://localhost:3001
   ```

3. **Run development server:**
   ```bash
   pnpm dev
   ```

   The app will be available at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes (login, register, etc.)
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                   # Utilities and clients
│   ├── api-client.ts     # Axios API client with interceptors
│   ├── socket-client.ts  # Socket.IO client
│   └── utils.ts          # Utility functions
├── stores/               # Zustand state stores
│   └── auth-store.ts     # Authentication store
└── hooks/                # Custom React hooks
```

## Available Scripts

- `pnpm dev` - Start development server on port 3000
- `pnpm build` - Build production bundle
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking

## Features

### Authentication
- JWT-based authentication with access and refresh tokens
- Automatic token refresh on 401 errors
- Persistent auth state using Zustand with localStorage
- Protected routes and layouts

### API Integration
- Centralized API client with Axios
- Request/response interceptors
- Automatic error handling
- Token management

### Real-time Communication
- Socket.IO client for WebSocket connections
- Automatic reconnection
- Event-based messaging

### UI/UX
- Responsive design with Tailwind CSS
- Dark mode support
- shadcn/ui component library
- Accessible components

## Adding shadcn/ui Components

The project is configured for shadcn/ui. To add components:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
```

Components will be added to `src/components/ui/`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |
| `NEXT_PUBLIC_WS_URL` | WebSocket server URL | `http://localhost:3001` |
| `NEXT_PUBLIC_TRACKER_URL` | Tracking pixel URL | `http://localhost:3001` |

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Manual Build

```bash
pnpm build
pnpm start
```

## Development Guidelines

### Code Style
- Use TypeScript for all files
- Follow ESLint rules
- Use functional components with hooks
- Prefer named exports

### File Naming
- Components: PascalCase (e.g., `UserProfile.tsx`)
- Utilities: kebab-case (e.g., `api-client.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useAuth.ts`)

### Component Structure
```tsx
'use client'; // Only if needed (client components)

import { ... } from '...';

interface ComponentProps {
  // Props definition
}

export function Component({ ...props }: ComponentProps) {
  // Component logic
  return (
    // JSX
  );
}
```

## API Client Usage

```typescript
import api from '@/lib/api-client';

// GET request
const data = await api.get('/endpoint');

// POST request
const response = await api.post('/endpoint', { data });

// Error handling
try {
  await api.post('/endpoint', data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.message, error.statusCode);
  }
}
```

## State Management

```typescript
import { useAuthStore } from '@/stores/auth-store';

function Component() {
  const { user, login, logout } = useAuthStore();

  // Use state and actions
}
```

## Socket Integration

```typescript
import { initializeSocket, onEvent, emitEvent } from '@/lib/socket-client';

// Initialize connection
const socket = initializeSocket();

// Listen to events
onEvent('message', (data) => {
  console.log('Received:', data);
});

// Emit events
emitEvent('message', { content: 'Hello' });
```

## Troubleshooting

### Port already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Module not found
```bash
# Clear Next.js cache
rm -rf .next
pnpm install
```

### TypeScript errors
```bash
# Check types
pnpm type-check
```

## License

MIT
