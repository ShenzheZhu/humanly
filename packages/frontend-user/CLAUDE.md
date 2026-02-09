# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the **frontend-user** package - a Next.js 14 user portal for document management and certificate verification within the Humanly text provenance service. Users can view their documents, track writing events, and manage certificates with access codes.

## Monorepo Context

This package is part of a PNPM workspace monorepo at `/home/haoqian2131/humanly/`:
- `@humory/shared` - Shared TypeScript types, validators (Zod schemas), and utilities
- `@humory/editor` - Lexical-based rich text editor with integrated tracking
- `@humory/backend` - Express.js API server with Socket.IO
- `@humory/frontend` - Next.js 14 admin dashboard for developers
- `@humory/frontend-user` - **This package** - User portal
- `@humory/tracker` - JavaScript tracking library for external forms

## Development Commands

Run from the frontend-user package directory (`/home/haoqian2131/humanly/packages/frontend-user`):

```bash
# Development server (runs on port 3002)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

Run from monorepo root (`/home/haoqian2131/humanly`):

```bash
# Run this package's dev server
npm run dev:frontend

# Build all packages
npm run build:all

# Start Docker services (PostgreSQL, Redis)
docker-compose up -d
```

## Architecture

### Tech Stack
- **Next.js 14** with App Router
- **TypeScript** with strict mode
- **Tailwind CSS** with shadcn/ui components
- **Zustand** for state management (with persist middleware)
- **Axios** for HTTP client with interceptors
- **React Hook Form** + Zod for form validation
- **Lexical** editor integration via `@humory/editor`

### Key Directories

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth route group (login, register, verify-email, etc.)
│   ├── documents/         # Document listing and detail pages
│   ├── certificates/      # Certificate management pages
│   ├── demo/              # Demo page for editor
│   ├── verify/            # Certificate verification page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── documents/         # Document-specific components
│   ├── certificates/      # Certificate-specific components
│   └── navigation/        # Navigation components
├── lib/
│   ├── api-client.ts      # Axios instance with auth interceptors
│   ├── socket-client.ts   # Socket.IO client setup
│   └── utils.ts           # Utility functions (cn, etc.)
├── stores/
│   └── auth-store.ts      # Zustand auth store with persist
└── hooks/                 # Custom React hooks
```

### TypeScript Path Aliases

- `@/*` maps to `src/*`
- `@humory/shared` - Shared types from workspace
- `@humory/editor` - Editor component from workspace

Note: The editor package requires TypeScript path mapping configuration. If you encounter module resolution issues with `@humory/shared` or `@humory/editor`, check `tsconfig.json` paths and `next.config.js` transpilePackages.

## Authentication System

### Token Management
- **Access tokens** stored in localStorage
- **Refresh tokens** stored in httpOnly cookies (set by backend)
- Automatic token refresh via Axios interceptors in `api-client.ts`
- On 401 responses, automatically attempts refresh before retrying request

### Auth Store (Zustand)
Located at `src/stores/auth-store.ts`, provides:
- `login(email, password)` - Login and initialize socket
- `register(email, password, name?)` - Register new user
- `logout()` - Clear tokens and disconnect socket
- `verifyEmail(code)` - Verify email with code
- `forgotPassword(email)` - Request password reset
- `resetPassword(token, newPassword)` - Reset password
- `checkAuth()` - Check authentication status on mount
- `fetchUser()` - Fetch current user data

State persists to localStorage (user + isAuthenticated only).

### Auth Routes
Route group `(auth)` includes:
- `/login` - Login page
- `/register` - Registration page
- `/verify-email` - Email verification page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/check-email` - Email sent confirmation

## API Integration

### API Client Configuration
Base URL: `process.env.NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`)

**Environment variable** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### API Methods
Import from `@/lib/api-client`:
```typescript
import api from '@/lib/api-client';

// GET request
const data = await api.get('/documents');

// POST request
const result = await api.post('/documents', { title: 'New Doc' });

// PUT, PATCH, DELETE also available
```

### Socket.IO Integration
Located at `src/lib/socket-client.ts`:
- Connects on login/checkAuth
- Disconnects on logout
- Handles real-time event updates

## Shared Types and Editor

### Using Shared Types
```typescript
import type { Document, Certificate, Event } from '@humory/shared';
```

Common types include:
- `User` - User account
- `Document` - Document with content and metadata
- `Certificate` - Authenticity certificate
- `Event` - Keystroke tracking event
- API response types (ApiResponse, ApiError, etc.)

### Using the Editor
```typescript
import { LexicalEditor } from '@humory/editor';

<LexicalEditor
  initialContent={documentContent}
  onChange={(content) => setContent(content)}
  onEventsCapture={(events) => handleEvents(events)}
  trackingEnabled={true}
/>
```

The editor captures keystroke events and provides rich text editing with formatting options.

## Important Patterns

### Protected Routes
Use `checkAuth()` in page components:
```typescript
'use client';

export default function DocumentsPage() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) return <Loading />;
  if (!isAuthenticated) {
    redirect('/login');
  }

  return <DocumentsList />;
}
```

### API Error Handling
The API client throws `ApiError` instances with statusCode and data:
```typescript
try {
  await api.post('/documents', data);
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message);
  }
}
```

### Component Styling
Uses Tailwind CSS with shadcn/ui design system:
- Import UI components from `@/components/ui/*`
- Use `cn()` utility for conditional classes
- Follow shadcn/ui patterns for consistency

## Build Configuration

### Next.js Config
- Transpiles workspace packages: `@humory/shared`, `@humory/editor`
- API rewrites configured when `NEXT_PUBLIC_API_URL` is set
- TypeScript and ESLint errors ignored during build (for now)
- Allowed image domains: localhost, api.writehumanly.net

### TypeScript Config
- Extends root `tsconfig.json`
- Strict mode enabled
- Module resolution: bundler
- Path alias: `@/*` → `./src/*`

## Common Workflows

### Adding a New Page
1. Create route in `src/app/[route]/page.tsx`
2. If protected, add auth check with `useAuthStore`
3. Update navigation in `src/components/navigation/*`

### Adding a New API Endpoint
1. Add API call in relevant file (documents, certificates, etc.)
2. Use `api.get/post/put/delete` from `@/lib/api-client`
3. Handle errors with try-catch and `ApiError`
4. Update loading states appropriately

### Working with Shared Types
1. Import types from `@humory/shared`
2. If types are missing, add them to `packages/shared/src/types/`
3. Rebuild shared package: `cd packages/shared && npm run build`

### Debugging Authentication Issues
1. Check browser console for token presence in localStorage
2. Check Network tab for 401 responses and refresh attempts
3. Verify `NEXT_PUBLIC_API_URL` points to running backend
4. Check backend logs for authentication errors
5. Clear localStorage and cookies if state is inconsistent

## Known Configuration Notes

- TypeScript build errors are currently ignored (`ignoreBuildErrors: true`) - this should be fixed in future
- ESLint errors are ignored during builds (`ignoreDuringBuilds: true`)
- The package runs on port 3002 (admin frontend uses 3000, backend uses 3001)
- Requires backend API running for authentication and data fetching
