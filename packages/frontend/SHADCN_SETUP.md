# shadcn/ui Components Setup Guide

This guide will help you complete the setup of shadcn/ui components for the Humory frontend.

## Components Installed

All shadcn/ui components have been manually created in `/home/ubuntu/humory/packages/frontend/src/components/ui/`:

1. **button.tsx** - Button component with variants (default, destructive, outline, secondary, ghost, link)
2. **input.tsx** - Input component for forms
3. **label.tsx** - Label component for form fields
4. **card.tsx** - Card components (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
5. **alert.tsx** - Alert component for displaying messages (default, destructive, success variants)
6. **checkbox.tsx** - Checkbox component (already existed)
7. **form.tsx** - Form components with react-hook-form integration
8. **toast.tsx** - Toast notification components
9. **toaster.tsx** - Toast container component
10. **use-toast.ts** - Toast hook for triggering notifications

## Installation Steps

### 1. Install Missing Dependency

The `@radix-ui/react-toast` dependency has been added to package.json. Install it by running:

```bash
cd /home/ubuntu/humory/packages/frontend
pnpm install
```

Or from the root:

```bash
cd /home/ubuntu/humory
pnpm install
```

### 2. Add Toaster to Root Layout

Update your root layout to include the Toaster component:

```tsx
// /home/ubuntu/humory/packages/frontend/src/app/layout.tsx
import { Toaster } from '@/components/ui/toaster';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

### 3. Verify Tailwind Configuration

The tailwind.config.ts file already includes the necessary configuration for shadcn/ui components:
- CSS variables for theming
- Animation classes
- Custom colors

### 4. Verify Path Aliases

The tsconfig.json should have the following path alias:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Dependencies Already Configured

The following dependencies are already in package.json:

- `class-variance-authority` - For component variants
- `clsx` - For conditional classnames
- `tailwind-merge` - For merging Tailwind classes
- `tailwindcss-animate` - For animations
- `lucide-react` - For icons
- `react-hook-form` - For form management
- `@hookform/resolvers` - For form validation
- `zod` - For schema validation
- `@radix-ui/react-label` - For Label component
- `@radix-ui/react-slot` - For Button component
- `@radix-ui/react-checkbox` - For Checkbox component

## Example Usage

A complete authentication example has been created at:
`/home/ubuntu/humory/packages/frontend/src/components/examples/auth-example.tsx`

This example demonstrates:
- Login and registration forms
- Form validation with zod
- Error handling and display
- Loading states
- Toast notifications
- All UI components working together

## Quick Start - Login Form

Here's a minimal login form example:

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export function LoginForm() {
  const form = useForm({
    resolver: zodResolver(loginSchema),
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(console.log)} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register('email')} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...form.register('password')} />
          </div>
          <Button type="submit" className="w-full">Login</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

## Documentation

For detailed documentation on each component, see:
- `/home/ubuntu/humory/packages/frontend/src/components/ui/README.md`

For component examples and patterns:
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Documentation](https://www.radix-ui.com)

## Component Features

All components include:
- TypeScript with proper type definitions
- Tailwind CSS styling
- Class variance authority for variants
- Forward refs for proper React refs handling
- Accessibility attributes (ARIA)
- Dark mode support
- Responsive design
- Next.js 14 App Router compatibility
- React Server Components compatibility (where applicable)

## Testing the Components

To test the components, you can:

1. Create a test page in your app directory:
```tsx
// app/test/page.tsx
import { AuthExample } from '@/components/examples/auth-example';

export default function TestPage() {
  return <AuthExample />;
}
```

2. Run the development server:
```bash
pnpm dev
```

3. Navigate to `http://localhost:3000/test`

## Troubleshooting

### If you see import errors:
1. Make sure you've run `pnpm install`
2. Check that path aliases are configured in tsconfig.json
3. Restart your development server

### If styles don't apply:
1. Verify Tailwind is configured correctly
2. Check that globals.css includes the CSS variables
3. Make sure tailwindcss-animate is installed

### If forms don't work:
1. Ensure react-hook-form is installed
2. Check that @hookform/resolvers and zod are installed
3. Verify form components are used within a Form provider

## Next Steps

1. Run `pnpm install` to install the missing @radix-ui/react-toast dependency
2. Add the Toaster component to your root layout
3. Start building your authentication forms using the provided components
4. Customize the components as needed for your specific use case

## File Structure

```
/home/ubuntu/humory/packages/frontend/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── alert.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── use-toast.ts
│   │   │   └── README.md
│   │   └── examples/
│   │       └── auth-example.tsx
│   ├── lib/
│   │   └── utils.ts (already existed)
│   └── app/
│       └── ... (your app files)
├── components.json (shadcn config)
├── tailwind.config.ts
├── package.json (updated with @radix-ui/react-toast)
└── SHADCN_SETUP.md (this file)
```

## Support

All components follow the official shadcn/ui patterns and are production-ready. They are fully compatible with:
- Next.js 14 with App Router
- React 18
- TypeScript
- Tailwind CSS
- Dark mode
- Server and Client Components

Happy coding!
