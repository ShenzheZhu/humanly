# Export Page Setup Guide

## Quick Start

The data export page has been successfully built at:
```
/home/ubuntu/humory/packages/frontend/src/app/(dashboard)/projects/[id]/export/page.tsx
```

## Installation Steps

### 1. Install New Dependencies

Run the following command in the frontend package directory:

```bash
cd /home/ubuntu/humory/packages/frontend
npm install
# or
pnpm install
# or
yarn install
```

This will install the newly added Radix UI dependencies:
- `@radix-ui/react-progress@^1.0.3`
- `@radix-ui/react-radio-group@^1.1.3`
- `@radix-ui/react-tabs@^1.0.4`

### 2. Files Created

The following files were created:

#### Main Export Page
- `/app/(dashboard)/projects/[id]/export/page.tsx` (1,025 lines)

#### New UI Components
- `/components/ui/radio-group.tsx` (Radix UI Radio Group wrapper)
- `/components/ui/tabs.tsx` (Radix UI Tabs wrapper)
- `/components/ui/progress.tsx` (Radix UI Progress bar wrapper)

#### Documentation
- `/home/ubuntu/humory/packages/frontend/EXPORT_PAGE_DOCUMENTATION.md`
- `/home/ubuntu/humory/EXPORT_PAGE_SETUP.md` (this file)

### 3. Updated Files

- `/packages/frontend/package.json` - Added 3 new Radix UI dependencies

## Backend Requirements

The backend needs to implement these API endpoints:

### 1. Export Preview Endpoint
```typescript
GET /api/v1/projects/:id/export/preview

Query Parameters:
- startDate: string (ISO date)
- endDate: string (ISO date)
- sessionIds?: string (comma-separated)
- userIds?: string (comma-separated)
- eventTypes?: string (comma-separated)
- submittedOnly?: string ('true' | 'false')

Response: {
  estimatedRecordCount: number;
  estimatedFileSize: string; // e.g., "2.4 MB"
  sampleData: any[]; // First 5 records
}
```

### 2. JSON Export Endpoint
```typescript
GET /api/v1/projects/:id/export/json

Query Parameters:
- startDate: string (ISO date)
- endDate: string (ISO date)
- sessionIds?: string (comma-separated)
- userIds?: string (comma-separated)
- eventTypes?: string (comma-separated)
- submittedOnly?: string ('true' | 'false')
- excludeMetadata?: string ('true' | 'false')
- timestampFormat?: 'iso8601' | 'unix' | 'human'
- prettyPrint?: string ('true' | 'false')
- compress?: string ('true' | 'false')

Response: Blob (application/json or application/zip)
Headers:
  Content-Disposition: attachment; filename="export-{projectId}-{date}.json"
  Content-Type: application/json (or application/zip if compressed)
```

### 3. CSV Export Endpoint
```typescript
GET /api/v1/projects/:id/export/csv

Query Parameters:
- startDate: string (ISO date)
- endDate: string (ISO date)
- sessionIds?: string (comma-separated)
- userIds?: string (comma-separated)
- eventTypes?: string (comma-separated)
- submittedOnly?: string ('true' | 'false')
- excludeMetadata?: string ('true' | 'false')
- timestampFormat?: 'iso8601' | 'unix' | 'human'
- includeHeaders?: string ('true' | 'false')
- delimiter?: ',' | ';' | '\t'
- compress?: string ('true' | 'false')

Response: Blob (text/csv or application/zip)
Headers:
  Content-Disposition: attachment; filename="export-{projectId}-{date}.csv"
  Content-Type: text/csv (or application/zip if compressed)
```

## Testing the Page

### 1. Start the Development Server
```bash
cd /home/ubuntu/humory/packages/frontend
npm run dev
```

### 2. Navigate to the Export Page
Open your browser and go to:
```
http://localhost:3000/projects/{your-project-id}/export
```

### 3. Test Features

1. **Format Selection**: Toggle between JSON and CSV tabs
2. **Date Range**: Try different presets (Last 7 days, Last 30 days, etc.)
3. **Custom Dates**: Select custom start and end dates
4. **Filters**: Add session IDs, user IDs, and select event types
5. **Preview**: Verify preview loads with estimated counts
6. **Export**: Click Export Data and verify file downloads

## Common Issues & Solutions

### Issue: "Module not found" errors
**Solution**: Run `npm install` to install the new dependencies

### Issue: Export preview doesn't load
**Solution**:
- Check that the backend API is running
- Verify the API endpoint `/api/v1/projects/:id/export/preview` is implemented
- Check browser console for CORS or network errors

### Issue: Export doesn't download
**Solution**:
- Verify the export endpoint returns a blob response
- Check that `Content-Disposition` header is set correctly
- Ensure CORS allows blob downloads
- Check browser console for errors

### Issue: Date validation not working
**Solution**:
- Ensure dates are in `YYYY-MM-DD` format
- Check that end date is after start date
- Verify browser supports HTML5 date inputs

### Issue: Progress bar doesn't show
**Solution**:
- Ensure `@radix-ui/react-progress` is installed
- Check that the Progress component is imported correctly
- Verify Axios is configured with `onDownloadProgress`

## Environment Variables

Ensure the following environment variable is set:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Or your actual backend API URL.

## Production Considerations

### 1. File Size Limits
- Consider implementing pagination for very large exports
- Add server-side limits on export size
- Show warning for exports > 10,000 records

### 2. Rate Limiting
- Implement rate limiting on export endpoints
- Add cooldown period between exports
- Track export requests per user

### 3. Background Processing
- For very large exports, consider async processing
- Queue export jobs and email download links
- Store generated exports temporarily

### 4. Security
- Verify user has access to the project
- Validate all query parameters
- Sanitize session/user IDs to prevent injection
- Implement CSRF protection

### 5. Performance
- Add database indexes on frequently filtered fields
- Consider caching preview results
- Stream large exports instead of loading into memory
- Use CDN for serving generated export files

### 6. Monitoring
- Log export requests
- Track export sizes and durations
- Monitor error rates
- Alert on unusually large exports

## Feature Roadmap

### Implemented
- Export format selection (JSON/CSV)
- Date range filtering with presets
- Session ID and User ID filtering
- Event type filtering
- Submitted sessions filter
- Metadata inclusion toggle
- Timestamp format options
- CSV delimiter options
- Compression option
- Export preview with estimates
- Progress indicator
- File download
- Error handling

### Not Implemented (Future Enhancements)
- Export history
- Scheduled exports
- Email delivery
- Custom field selection
- Multiple file formats (Excel, Parquet)
- Export templates
- Saved filter presets

## Support & Documentation

For detailed documentation, see:
- `/home/ubuntu/humory/packages/frontend/EXPORT_PAGE_DOCUMENTATION.md`

For backend API reference, see:
- Backend API documentation (to be created)

## Testing Checklist

Before deploying to production:

- [ ] Install all dependencies
- [ ] Backend API endpoints implemented
- [ ] Preview endpoint returns correct data
- [ ] JSON export downloads correctly
- [ ] CSV export downloads correctly
- [ ] Date validation works
- [ ] Filter combinations work
- [ ] Progress indicator shows during download
- [ ] Error messages display correctly
- [ ] Success message appears after export
- [ ] Clear filters button works
- [ ] Responsive design tested on mobile
- [ ] CORS configured correctly
- [ ] Authentication works
- [ ] Authorization checks in place

## Next Steps

1. Run `npm install` in the frontend package
2. Implement the backend API endpoints
3. Test the export functionality
4. Add appropriate logging and monitoring
5. Deploy to staging environment
6. Perform user acceptance testing
7. Deploy to production

## Questions?

If you encounter any issues or have questions:
1. Check the comprehensive documentation in `EXPORT_PAGE_DOCUMENTATION.md`
2. Review the TypeScript types and interfaces in the export page
3. Verify all dependencies are installed
4. Check browser console for errors
5. Verify backend API is responding correctly
