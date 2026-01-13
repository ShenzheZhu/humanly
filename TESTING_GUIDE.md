# Humory Tracker Testing Guide

## Current Status

✅ **Tracker built successfully** - sessionId bug fixed
✅ **Backend running** on port 3001  
✅ **WebSocket working** - emitting 'event-received' events
⚠️ **Events are batched** - wait for 20 events OR 30 seconds

## Testing Options

### Option 1: Quick Test with Debug Page (Recommended)

1. **Get your project token:**
   - Go to: https://developer.humanly.art
   - Navigate to: Projects → Your Project → Settings
   - Copy your Project Token (UUID or hex format)

2. **Open the test page:**
   ```
   https://api.humanly.art/tracker/test-tracker-debug.html
   ```

   **Or use URL parameter to auto-fill token:**
   ```
   https://api.humanly.art/tracker/test-tracker-debug.html?token=YOUR_TOKEN_HERE
   ```

3. **Configure and initialize:**
   - Paste your project token in the input field
   - Click "Initialize Tracker" (or "Save Token" to remember for next time)
   - Test fields will appear once initialized

4. **What you'll see:**
   - Token validation and loading (from URL or saved)
   - Tracker initialization logs
   - Real-time event capture as you type
   - Batch size is 5 (faster testing)
   - "Force Flush" button to send immediately

5. **Watch for these console messages:**
   ```
   [Humory] Session initialized: <valid-session-id>
   [Humory] Event buffered (1/5): {...}
   [Humory] Event buffered (2/5): {...}
   ...
   [Humory] Flushing 5 events
   [Network] Fetch request to: .../api/v1/track/events
   [Humory] Events flushed successfully
   ```

### Option 2: Test in Qualtrics

1. **Copy UPDATED code from developer dashboard:**
   - Go to: https://developer.humanly.art
   - Navigate to: Your Project → Tracking Code → Qualtrics Integration
   - Copy the code (includes sessionId fix + diagnostics)

2. **Paste in Qualtrics:**
   - Method 1: Survey Header (Look & Feel → General → Header)
   - Method 2: Question JavaScript (Gear icon → Add JavaScript)

3. **Open TWO browser windows side-by-side:**
   - Window 1: Developer dashboard (Tracking Code → Live Preview)
   - Window 2: Qualtrics survey

4. **Test:**
   - Type in Qualtrics text fields
   - Watch console for: `[Humory] Event buffered (X/20): ...`
   - Wait 30 seconds OR type 20 keystrokes
   - Events will appear in Live Preview window

### Option 3: Force Immediate Flushing

If you want to see events immediately, modify the tracker config:

```javascript
const tracker = new HumoryTracker({
    projectToken: 'YOUR_TOKEN',
    apiUrl: 'https://api.humanly.art',
    debug: true,
    maxBatchSize: 1,    // Send after every event
    maxBatchTime: 5     // Or send after 5 seconds
});
```

## Diagnostic Checklist

### In Browser Console (F12)

✅ **Session initialization:**
```
[Humory] Session initialized: d250348c-f739-4052-b482-3e13c2e7702a
```
❌ If you see `undefined`, you need to update your code

✅ **Events being captured:**
```
[Humory] Event buffered (1/20): {eventType: "keydown", ...}
```
❌ If you don't see this when typing, elements might not be attached

✅ **Events being sent:**
```
[Humory] Flushing 20 events
[Humory] Events flushed successfully
```
❌ If events never flush, check network connectivity

✅ **Backend response:**
```
[Network] Response from: .../api/v1/track/events - Status: 200
```

### In Developer Dashboard Live Preview

Once events are flushed, you should see them appear in real-time:
- Session ID
- External User ID  
- Event type (keydown, keyup, paste, etc.)
- Key pressed
- Text content
- Cursor position
- Timestamp

## Common Issues

### Issue: "Session initialized: undefined"
**Solution:** Update your code from the developer dashboard (sessionId bug is fixed)

### Issue: "I'm typing but seeing no events"
**Solution:** Events are buffered. Either:
- Type 20 characters (triggers batch send)
- Wait 30 seconds (triggers time-based send)
- Use the test page with "Force Flush" button

### Issue: "Events not appearing in Live Preview"
**Check:**
1. Is Live Preview window open while you're typing?
2. Are you connected to the same project?
3. Check WebSocket connection in Network tab (should show "101 Switching Protocols")

### Issue: "Tracker not loading in Qualtrics"
**Check:**
- Is your API URL using HTTPS? (Qualtrics requires it)
- Open console and look for errors
- Verify you copied the complete code snippet

## Next Steps

1. **Test with the debug page first:**
   ```
   https://api.humanly.art/test-tracker-debug.html
   ```

2. **Verify the full pipeline works:**
   - Type a few characters
   - Click "Force Flush Events Now"
   - Check backend logs for POST /api/v1/track/events
   - Verify 200 response

3. **Then test in Qualtrics:**
   - Update your code with the latest version
   - Open Live Preview in developer dashboard
   - Type in Qualtrics survey
   - Watch for events (remember: batched!)

## Backend Verification

To see events being received, monitor backend logs:

```bash
# Should see these when events are sent:
Session initialized: <sessionId>
Event ingestion request completed: {eventCount: 20, ...}
POST /init 201
POST /api/v1/track/events 200
```

## Questions?

- Events are working correctly - they're just batched!
- Use the debug page with "Force Flush" for immediate testing
- Lower batch sizes (maxBatchSize: 5) for faster iteration
