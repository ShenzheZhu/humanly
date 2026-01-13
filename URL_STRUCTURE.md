# URL Structure

## New Clean & Professional URL Structure

### Authentication
- `/login` - User login
- `/register` - User registration
- `/verify-email` - Email verification

### Projects (Main Application)
- `/projects` - List all projects (main view after login)
- `/projects/new` - Create a new project
- `/projects/{id}` - Project overview/details
- `/projects/{id}/analytics` - Project analytics dashboard
- `/projects/{id}/settings` - Project settings
- `/projects/{id}/export` - Export project data
- `/projects/{id}/live-preview` - Real-time session monitoring
- `/projects/{id}/snippets` - Integration code snippets

### Legacy Redirects
- `/dashboard` - Redirects to `/projects`

## Design Principles

1. **RESTful**: Follows REST conventions with resource-based URLs
2. **Flat Structure**: Minimal nesting - no unnecessary `/dashboard/` prefix
3. **Semantic**: URLs clearly indicate the resource and action
4. **Consistent**: All project-related operations under `/projects`
5. **Professional**: Matches industry standard URL patterns

## Examples

**Old (Verbose):**
```
http://54.91.235.109:3000/dashboard/projects/f38c0b45-4dbf-4aca-9698-78cb56672643
http://54.91.235.109:3000/dashboard/projects/new
http://54.91.235.109:3000/dashboard/projects/f38c0b45-4dbf-4aca-9698-78cb56672643/analytics
```

**New (Clean):**
```
http://54.91.235.109:3000/projects/f38c0b45-4dbf-4aca-9698-78cb56672643
http://54.91.235.109:3000/projects/new
http://54.91.235.109:3000/projects/f38c0b45-4dbf-4aca-9698-78cb56672643/analytics
```

## Implementation Notes

- All files moved from `app/dashboard/projects/*` to `app/projects/*`
- Authentication protection handled by `app/projects/layout.tsx`
- Login redirects to `/projects` instead of `/dashboard`
- Legacy `/dashboard` route redirects to `/projects` for compatibility
- All internal route references updated throughout the application
