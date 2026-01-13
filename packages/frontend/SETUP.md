# Frontend Setup Guide

This guide will walk you through setting up the Humory frontend application.

## Quick Start

From the root of the monorepo:

```bash
# Install all dependencies
npm install

# Start frontend development server
npm run dev:frontend
```

The frontend will be available at http://localhost:3000

## Detailed Setup

### 1. Install Dependencies

Navigate to the frontend package:
```bash
cd packages/frontend
npm install
```

Or from the root:
```bash
npm install
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` to match your backend configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_TRACKER_URL=http://localhost:3001
```

### 3. Install shadcn/ui Components

The project is configured for shadcn/ui. Add components as needed:

```bash
# Navigate to frontend directory
cd packages/frontend

# Add components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add card
npx shadcn-ui@latest add form
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add select
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add alert
```

Components will be added to `src/components/ui/`

### 4. Start Development Server

From frontend directory:
```bash
npm run dev
```

Or from root:
```bash
npm run dev:frontend
```

The app will be available at http://localhost:3000

## Project Structure Explained

```
packages/frontend/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Auth route group (login, register, etc.)
│   │   │   ├── layout.tsx       # Auth pages layout
│   │   │   ├── login/           # Login page (to be implemented)
│   │   │   ├── register/        # Register page (to be implemented)
│   │   │   ├── verify-email/    # Email verification (to be implemented)
│   │   │   └── reset-password/  # Password reset (to be implemented)
│   │   ├── (dashboard)/         # Protected route group
│   │   │   └── layout.tsx       # Dashboard layout with auth check
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Landing page
│   │   └── globals.css          # Global styles with Tailwind
│   ├── components/
│   │   └── ui/                  # shadcn/ui components
│   ├── lib/
│   │   ├── api-client.ts        # Axios instance with interceptors
│   │   ├── socket-client.ts     # Socket.IO client
│   │   └── utils.ts             # Utility functions
│   ├── stores/
│   │   └── auth-store.ts        # Zustand auth store
│   └── hooks/
│       ├── use-auth.ts          # Auth hook
│       └── index.ts             # Hooks barrel export
├── public/                       # Static assets
├── .env.local                    # Environment variables (not in git)
├── .env.local.example            # Environment template
├── components.json               # shadcn/ui config
├── next.config.js                # Next.js config
├── tailwind.config.ts            # Tailwind config
├── tsconfig.json                 # TypeScript config
└── package.json                  # Dependencies and scripts
```

## Route Groups Explained

Next.js App Router uses route groups `(folder)` to organize routes without affecting the URL:

- `(auth)` - Contains all authentication-related pages
  - `/login` - Login page
  - `/register` - Registration page
  - `/verify-email` - Email verification page
  - `/reset-password` - Password reset page

- `(dashboard)` - Contains all authenticated pages
  - Automatically checks authentication via layout
  - Redirects to `/login` if not authenticated

## Key Features

### API Client

Located at `src/lib/api-client.ts`:

- Axios instance with baseURL configured
- Automatic token injection in requests
- Token refresh on 401 errors
- Error handling and transformation
- Request/response interceptors

Usage:
```typescript
import api from '@/lib/api-client';

// Simple requests
const data = await api.get('/endpoint');
await api.post('/endpoint', { data });

// Error handling
try {
  await api.post('/endpoint', data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.message, error.statusCode);
  }
}
```

### Socket Client

Located at `src/lib/socket-client.ts`:

- Socket.IO client with auto-reconnection
- Token-based authentication
- Event management utilities

Usage:
```typescript
import { initializeSocket, onEvent, emitEvent } from '@/lib/socket-client';

// Initialize
const socket = initializeSocket();

// Listen
onEvent('event-name', (data) => {
  console.log('Received:', data);
});

// Emit
emitEvent('event-name', { data });
```

### Auth Store

Located at `src/stores/auth-store.ts`:

- Zustand store with persistence
- Complete auth flow methods
- Token management
- Loading states

Usage:
```typescript
import { useAuthStore } from '@/stores/auth-store';

function Component() {
  const { user, login, logout } = useAuthStore();

  const handleLogin = async () => {
    await login('email@example.com', 'password');
  };

  return <div>{user?.email}</div>;
}
```

Or use the hook:
```typescript
import { useAuth } from '@/hooks';

function Component() {
  const { user, login, logout } = useAuth();
  // Same as above
}
```

## Path Aliases

The project uses TypeScript path aliases:

- `@/*` → `src/*`

Examples:
```typescript
import { useAuth } from '@/hooks';
import api from '@/lib/api-client';
import { Button } from '@/components/ui/button';
```

## Styling

### Tailwind CSS

All styling uses Tailwind CSS utility classes:

```tsx
<div className="flex items-center justify-center p-4 bg-primary text-white">
  Content
</div>
```

### CSS Variables

Theme colors are defined as CSS variables in `globals.css`:

- `--background`, `--foreground`
- `--primary`, `--secondary`
- `--muted`, `--accent`
- `--destructive`
- etc.

### Dark Mode

Dark mode is supported via the `dark` class on the `<html>` element.

### Class Name Utility

Use the `cn()` utility to merge Tailwind classes:

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  "base-class",
  condition && "conditional-class",
  props.className
)} />
```

## Adding New Pages

### Auth Pages

Add pages inside `src/app/(auth)/`:

```typescript
// src/app/(auth)/login/page.tsx
export default function LoginPage() {
  return <div>Login Page</div>;
}
```

URL: `/login`

### Dashboard Pages

Add pages inside `src/app/(dashboard)/`:

```typescript
// src/app/(dashboard)/mood/page.tsx
export default function MoodPage() {
  return <div>Mood Tracking</div>;
}
```

URL: `/mood` (requires authentication)

### Public Pages

Add pages directly in `src/app/`:

```typescript
// src/app/about/page.tsx
export default function AboutPage() {
  return <div>About Us</div>;
}
```

URL: `/about`

## Development Tips

### Type Safety

Always define interfaces for your data:

```typescript
interface MoodEntry {
  id: string;
  mood: number;
  note: string;
  createdAt: string;
}

const entries = await api.get<MoodEntry[]>('/mood');
```

### Component Patterns

Use functional components with TypeScript:

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button onClick={onClick} className={cn(
      "px-4 py-2 rounded",
      variant === 'primary' && "bg-primary text-white",
      variant === 'secondary' && "bg-secondary text-black"
    )}>
      {label}
    </button>
  );
}
```

### Client vs Server Components

- Server components by default (better performance)
- Use `'use client'` directive when needed:
  - Using React hooks (useState, useEffect, etc.)
  - Using browser APIs
  - Using event handlers
  - Using Zustand stores

```typescript
'use client';

import { useState } from 'react';

export function ClientComponent() {
  const [count, setCount] = useState(0);
  // ...
}
```

## Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build test
npm run build
```

## Troubleshooting

### Port in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Module resolution errors
```bash
# Clear Next.js cache
rm -rf .next
rm -rf node_modules
npm install
```

### Shared package not found
```bash
# From root directory
npm install
```

### TypeScript errors with shared package
Make sure `@humory/shared` package exists and is built:
```bash
cd packages/shared
npm run build
```

## Next Steps

1. Install shadcn/ui components as needed
2. Create authentication pages (login, register)
3. Create dashboard pages
4. Implement mood tracking UI
5. Add real-time features with Socket.IO
6. Add analytics integration

## Resources

- [Next.js 14 Docs](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [TypeScript](https://www.typescriptlang.org/docs)
