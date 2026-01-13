# Live Preview Page - Feature Summary

## Page Location
`/home/ubuntu/humory/packages/frontend/src/app/(dashboard)/projects/[id]/live-preview/page.tsx`

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Live Preview                                    [Tracking Code] [Back]│
│ Monitor user sessions and events in real-time                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│ │Connection│ │  Active  │ │  Events  │ │Events/Sec│                │
│ │ Connected│ │Sessions:3│ │Received:│ │   2.45   │                │
│ │   [●]    │ │          │ │   157   │ │          │                │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘                │
│                                                                       │
├──────────────┬────────────────────────────────────────────────────┤
│              │  Event Stream                                       │
│ Active       │  Showing 45 of 157 events                          │
│ Sessions     │  [▼ Filters (2)] [👁 Auto-scroll] [⏸ Pause] [🗑 Clear]│
│              │                                                     │
│ ┌──────────┐│ ┌──────────────────────────────────────────────┐  │
│ │User: 123 ││ │ [keydown] 2:34:15 PM                          │  │
│ │8 events  ││ │ user-123 • abc12345...                        │  │
│ │5m ago    ││ │ Key: A • Field: email                         │  │
│ │abc12... ││ ├──────────────────────────────────────────────┤  │
│ └──────────┘│ │ [paste] 2:34:12 PM                            │  │
│             │ │ user-456 • def67890...                        │  │
│ ┌──────────┐│ │ Pasted: "example@email.com"                   │  │
│ │User: 456 ││ ├──────────────────────────────────────────────┤  │
│ │3 events  ││ │ [focus] 2:34:08 PM                            │  │
│ │Just now  ││ │ user-789 • ghi34567...                        │  │
│ │def67... ││ │ Field: password                               │  │
│ └──────────┘│ ├──────────────────────────────────────────────┤  │
│             │ │ ...more events...                             │  │
│ ┌──────────┐│ │                                               │  │
│ │User: 789 ││ │                                               │  │
│ │2 events  ││ │                                               │  │
│ │Just now  ││ │                                               │  │
│ │ghi34... ││ │                                               │  │
│ └──────────┘│ │                                               │  │
│             │ │                                               │  │
│             │ └──────────────────────────────────────────────┘  │
│             │                                                     │
└──────────────┴────────────────────────────────────────────────────┘
```

## Feature Breakdown

### 1. WebSocket Connection Management
- ✅ Auto-connect on page load
- ✅ JWT authentication with access token
- ✅ Connection status display (4 states)
- ✅ Automatic reconnection on failure
- ✅ Join/leave project rooms
- ✅ Proper cleanup on unmount

### 2. Real-time Event Stream
- ✅ Live feed updates as events arrive
- ✅ Most recent events shown first
- ✅ Event details displayed:
  - Timestamp (formatted)
  - Event type (color-coded badge)
  - User ID
  - Session ID (shortened)
  - Field name
  - Key pressed / text content
  - Cursor position
- ✅ Alternating row colors for readability
- ✅ Scrollable list with fixed header
- ✅ Memory limit (500 events max)

### 3. Event Type Color Coding
```
┌─────────┬──────────────────────────────────────┐
│ keydown │ Blue (darker) - bg-blue-100          │
│ keyup   │ Blue (lighter) - bg-blue-50          │
│ paste   │ Green - bg-green-100                 │
│ copy    │ Yellow - bg-yellow-100               │
│ cut     │ Orange - bg-orange-100               │
│ focus   │ Purple - bg-purple-100               │
│ blur    │ Gray - bg-gray-100                   │
│ input   │ Cyan - bg-cyan-100                   │
└─────────┴──────────────────────────────────────┘
```

### 4. Advanced Filtering
- ✅ Event Type Filter (checkboxes for each type)
- ✅ User ID text filter
- ✅ Session ID text filter
- ✅ Active filter count indicator
- ✅ Clear all filters button
- ✅ Collapsible filter panel
- ✅ Real-time filter application

### 5. Session Monitoring Sidebar
- ✅ List of active sessions
- ✅ Per-session information:
  - User ID
  - Session ID (shortened)
  - Start time (relative)
  - Event count
- ✅ Independent scroll area
- ✅ Hover effects
- ✅ Real-time updates

### 6. Live Statistics
```
┌─────────────────────────────────────────────────┐
│ Connection   │ Active    │ Events    │ Events/  │
│ Status       │ Sessions  │ Received  │ Second   │
├─────────────────────────────────────────────────┤
│ Connected    │ 3         │ 157       │ 2.45     │
│ [●] Green    │ Currently │ Total     │ Live rate│
│              │ tracking  │ received  │ (5s avg) │
└─────────────────────────────────────────────────┘
```

### 7. Control Panel
```
┌─────────────────────────────────────────────────┐
│ [▼ Filters (2)]  - Toggle filter panel          │
│ [👁 Auto-scroll] - Enable/disable auto-scroll   │
│ [⏸ Pause]       - Pause/resume event reception  │
│ [🗑 Clear]       - Clear event list             │
└─────────────────────────────────────────────────┘
```

### 8. Empty States

#### No Connection
```
┌─────────────────────────────────────────┐
│         [⌛ Loading Spinner]              │
│                                         │
│          Connecting...                  │
│   Establishing connection to            │
│       event stream                      │
└─────────────────────────────────────────┘
```

#### No Events (Connected)
```
┌─────────────────────────────────────────┐
│         [📊 Activity Icon]               │
│                                         │
│          No Events Yet                  │
│   Waiting for events to be tracked...   │
│                                         │
│   Make sure you have added the          │
│   tracking code to your survey or form. │
│                                         │
│   [View Tracking Code] (button)         │
└─────────────────────────────────────────┘
```

#### No Events (Filtered)
```
┌─────────────────────────────────────────┐
│         [📊 Activity Icon]               │
│                                         │
│          No Events Yet                  │
│   No events match your current filters. │
└─────────────────────────────────────────┘
```

## Technical Implementation

### State Management
```typescript
// Connection
const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
const [connectionError, setConnectionError] = useState<string | null>(null);

// Events
const [events, setEvents] = useState<RealtimeEvent[]>([]);
const [sessions, setSessions] = useState<Map<string, SessionInfo>>(new Map());
const [isPaused, setIsPaused] = useState(false);
const [autoScroll, setAutoScroll] = useState(true);

// Filters
const [selectedEventTypes, setSelectedEventTypes] = useState<Set<EventType>>(new Set());
const [userIdFilter, setUserIdFilter] = useState('');
const [sessionIdFilter, setSessionIdFilter] = useState('');

// Stats
const [totalEventsReceived, setTotalEventsReceived] = useState(0);
const [eventsPerSecond, setEventsPerSecond] = useState(0);
```

### WebSocket Event Handlers
```typescript
socket.on('connect', () => {
  // Set connected status, join room
});

socket.on('disconnect', (reason) => {
  // Set disconnected status, handle reconnection
});

socket.on('session-started', (data) => {
  // Add session to sessions map
});

socket.on('event-received', (data) => {
  // Add event to list (if not paused)
  // Update session event count
  // Update statistics
});

socket.on('session-ended', (data) => {
  // Mark session as ended
});
```

### Performance Optimizations
1. **Memory Management**: Limit to 500 events
2. **Rate Calculation**: 5-second sliding window
3. **Efficient Filtering**: Apply during render
4. **Auto-scroll**: Only when enabled
5. **Pause Feature**: Stop processing without disconnecting

## Integration Points

### Backend Requirements
```typescript
// WebSocket server must emit:
- 'session-started': { sessionId, userId, timestamp }
- 'event-received': { eventId, sessionId, userId, eventType, timestamp, data }
- 'session-ended': { sessionId, userId, timestamp }

// WebSocket server must accept:
- 'join-project': projectId
- 'leave-project': projectId
```

### Environment Variables
```bash
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### Dependencies
- `socket.io-client`: ^4.6.1
- `@radix-ui/react-scroll-area`: ^1.0.5
- `class-variance-authority`: ^0.7.0
- `lucide-react`: ^0.303.0

## UI Components Created

1. **Badge Component** (`/components/ui/badge.tsx`)
   - Variants: default, secondary, destructive, outline
   - Used for event types and status indicators

2. **ScrollArea Component** (`/components/ui/scroll-area.tsx`)
   - Radix UI scroll area wrapper
   - Smooth scrolling with custom scrollbar
   - Used for event list and session sidebar

## Files Created

1. **Main Page**: `/app/(dashboard)/projects/[id]/live-preview/page.tsx` (729 lines)
2. **Badge Component**: `/components/ui/badge.tsx`
3. **ScrollArea Component**: `/components/ui/scroll-area.tsx`
4. **Documentation**: `/app/(dashboard)/projects/[id]/live-preview/README.md`
5. **Feature Summary**: `/app/(dashboard)/projects/[id]/live-preview/FEATURES.md`
6. **Updated**: `/package.json` (added @radix-ui/react-scroll-area)

## Responsive Design

### Desktop (md and above)
- 4-column stat cards
- 1-column sidebar + 3-column event feed
- Full control panel visible

### Mobile
- Stacked stat cards
- Full-width event feed
- Collapsible session sidebar
- Compact controls

## Accessibility Features

- ✅ Semantic HTML structure
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation support
- ✅ Screen reader friendly text
- ✅ Color contrast compliant
- ✅ Focus indicators

## Testing Recommendations

1. **Connection Testing**
   - Connect with valid token
   - Connect with invalid token
   - Test reconnection on disconnect
   - Test error states

2. **Event Reception**
   - Receive single events
   - Receive rapid burst of events
   - Test different event types
   - Verify event details display

3. **Filtering**
   - Filter by each event type
   - Filter by user ID
   - Filter by session ID
   - Combine multiple filters

4. **Controls**
   - Pause and resume
   - Clear events
   - Toggle auto-scroll
   - Toggle filters

5. **Performance**
   - Test with 500+ events
   - Test with multiple sessions
   - Verify memory limits
   - Check events/second calculation

6. **Responsive**
   - Test on mobile devices
   - Test on tablets
   - Test on desktop
   - Verify all breakpoints
