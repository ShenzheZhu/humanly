# Quick Start Guide

Get the Humory frontend running in 3 steps.

## 1. Install Dependencies

From the root of the monorepo:

```bash
npm install
```

## 2. Start the Development Server

```bash
npm run dev:frontend
```

The app will be available at: http://localhost:3000

## 3. Next Steps

### Add shadcn/ui Components

```bash
cd packages/frontend
npx shadcn-ui@latest add button input label card form
```

### Create Your First Auth Page

Example: `src/app/(auth)/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Login</h1>
      {error && <div className="text-destructive">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-2 border rounded"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-2 border rounded"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full p-2 bg-primary text-white rounded"
        >
          {isLoading ? 'Loading...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
```

## Important URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- WebSocket: ws://localhost:3001

## Useful Commands

```bash
# Development
npm run dev:frontend          # Start dev server
npm run build:frontend        # Build for production
npm run lint --workspace=@humory/frontend  # Lint code

# From frontend directory
cd packages/frontend
npm run dev                   # Start dev server
npm run type-check           # Check TypeScript
```

## Project Structure (Key Files)

```
packages/frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Auth pages: /login, /register
│   │   ├── (dashboard)/     # Protected pages
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Landing page (/)
│   ├── components/ui/       # shadcn components
│   ├── lib/
│   │   ├── api-client.ts    # API calls
│   │   └── utils.ts         # Utilities
│   ├── stores/
│   │   └── auth-store.ts    # Auth state
│   └── hooks/
│       └── use-auth.ts      # Auth hook
├── .env.local              # Environment vars
└── package.json
```

## Common Tasks

### Make an API Call

```typescript
import api from '@/lib/api-client';

const data = await api.get('/endpoint');
await api.post('/endpoint', { data });
```

### Use Authentication

```typescript
import { useAuth } from '@/hooks';

function Component() {
  const { user, login, logout } = useAuth();
  // ...
}
```

### Style with Tailwind

```tsx
<div className="flex items-center justify-center p-4 bg-primary text-white rounded-lg">
  Content
</div>
```

### Protected Route

Pages in `src/app/(dashboard)/` are automatically protected.

```typescript
// src/app/(dashboard)/mood/page.tsx
export default function MoodPage() {
  // Only accessible when authenticated
  return <div>Mood Tracking</div>;
}
```

## Troubleshooting

### Port already in use
```bash
lsof -ti:3000 | xargs kill -9
```

### Clear cache
```bash
rm -rf .next node_modules
npm install
```

### Check backend is running
```bash
curl http://localhost:3001/health
```

## Documentation

- Full docs: `README.md`
- Setup guide: `SETUP.md`
- Task checklist: `CHECKLIST.md`

## Get Help

- Next.js: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com
- Tailwind: https://tailwindcss.com/docs
