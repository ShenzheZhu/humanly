# Tracker Debug Page - User Guide

## Overview

The Humory Tracker Debug Page is an interactive testing tool that allows you to test the tracking functionality with your own project token before integrating into Qualtrics or other platforms.

**URL:** `https://api.humanly.art/tracker/test-tracker-debug.html`

## Features

✅ **Project Token Input** - Paste your own project token  
✅ **Token Management** - Save token to localStorage or load from URL  
✅ **Token Validation** - Validates token format before initializing  
✅ **Real-time Event Logging** - See every keystroke captured  
✅ **Force Flush Button** - Send events immediately (no waiting)  
✅ **Network Monitoring** - Track all API requests  
✅ **Status Checker** - Inspect internal tracker state  
✅ **Faster Batching** - 5 events or 10 seconds (vs production's 20/30)

## Quick Start

### Method 1: From Developer Dashboard (Easiest)

1. Go to: https://developer.humanly.art
2. Navigate to: **Projects → Your Project → Tracking Code → Qualtrics Integration**
3. Click the **"🚀 Open Test Page"** button
4. The page will open with your project token already filled in!
5. Click **"Initialize Tracker"**
6. Type in the test fields and watch events in real-time

### Method 2: Manual URL with Token

1. Get your project token from: **Projects → Your Project → Settings**
2. Open URL with token parameter:
   ```
   https://api.humanly.art/tracker/test-tracker-debug.html?token=YOUR_TOKEN_HERE
   ```
3. Token will be auto-loaded from URL
4. Click **"Initialize Tracker"**

### Method 3: Manual Entry

1. Open: https://api.humanly.art/tracker/test-tracker-debug.html
2. Paste your project token in the input field
3. Click **"💾 Save Token"** (optional - remembers for next time)
4. Click **"🚀 Initialize Tracker"**

## Using the Test Page

### Configuration Section

**Buttons:**
- **🚀 Initialize Tracker** - Start tracking with the entered token
- **💾 Save Token** - Store token in localStorage for future visits
- **🗑️ Clear Saved Token** - Remove stored token

**Token Loading Priority:**
1. URL parameter (`?token=xxx`) - highest priority
2. localStorage (if previously saved)
3. Manual entry (if neither above)

### Test Fields Section

Only appears after successful initialization.

**Available test fields:**
- Text Input
- Text Area

**Action buttons:**
- **🚀 Force Flush Events Now** - Sends buffered events immediately
- **📊 Check Tracker Status** - Shows internal state in console
- **🗑️ Clear Console** - Clears the on-screen console output

### Console Output

Real-time console with color-coded messages:
- 🔵 **Blue (info)** - General logs and status updates
- 🟢 **Green (success)** - Successful operations
- 🔴 **Red (error)** - Errors and failures
- 🟡 **Yellow (warning)** - Warnings

## What to Watch For

### Successful Initialization

```
[Test] 🚀 Starting tracker initialization...
[Test] ✓ Tracker object created
[Humory] Tracker initialized with config: {...}
[Humory] Initializing session: {...}
[Humory] Session initialized: d250348c-f739-4052-b482-3e13c2e7702a  ← Valid UUID!
[Test] ✓ Backend health check passed
[Test] ✓ Found 2 text fields
[Test] ✓ All event listeners attached
```

### Events Being Captured

```
[Humory] Event buffered (1/5): {eventType: "keydown", keyChar: "h", ...}
[Humory] Event buffered (2/5): {eventType: "keydown", keyChar: "e", ...}
[Humory] Event buffered (3/5): {eventType: "keydown", keyChar: "l", ...}
[Humory] Event buffered (4/5): {eventType: "keydown", keyChar: "l", ...}
[Humory] Event buffered (5/5): {eventType: "keydown", keyChar: "o", ...}
```

### Events Being Sent

```
[Humory] Flushing 5 events
[Network] 📡 Fetch request to: https://api.humanly.art/api/v1/track/events
[Network] ✓ Response from: .../api/v1/track/events - Status: 200
[Humory] Events flushed successfully
```

## Troubleshooting

### ❌ "Session initialized: undefined"

**Problem:** Using old tracker library without sessionId fix  
**Solution:** Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### ❌ "Invalid token format"

**Problem:** Token is not valid
**Solution:** Copy the complete token from Settings. Valid formats:
- UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (36 characters with dashes)
- Hex: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (64 hex characters)

### ❌ "Invalid or inactive project token"

**Problem:** Token doesn't exist or project is inactive  
**Solution:** Verify the token in your developer dashboard Settings page

### ❌ "I'm typing but no events appear"

**Problem:** Events are buffered (by design)  
**Solution:** Either:
- Type 5 more characters (reaches batch limit)
- Wait 10 seconds (timer triggers flush)
- Click "Force Flush Events Now" button

### ❌ Token not loading from URL

**Problem:** Browser cache or incorrect URL format  
**Solution:** 
- Check URL has `?token=` parameter with your token
- Try hard refresh (Ctrl+Shift+R)

## Configuration Options

The test page uses optimized settings for faster testing:

| Setting | Test Page | Production |
|---------|-----------|------------|
| `maxBatchSize` | 5 events | 20 events |
| `maxBatchTime` | 10 seconds | 30 seconds |
| `debug` | true | false (default) |

This means events send much faster on the test page!

## Technical Details

### Token Storage

- **localStorage key:** `humory-test-token`
- **Persistence:** Until manually cleared or localStorage wiped
- **Scope:** Per-domain (only works on api.humanly.art)

### Network Requests

1. **Session Init:** `POST /api/v1/track/init`
   - Creates session and returns sessionId
   - Auto-generates anonymous user ID

2. **Event Batch:** `POST /api/v1/track/events`
   - Sends buffered events
   - Includes X-Session-Id header
   - Returns success/failure

3. **Health Check:** `GET /health`
   - Verifies backend connectivity
   - Logged in console but hidden from network monitor

### Event Batching

Events are buffered and sent when either condition is met:
- **Batch size reached:** 5 events (test page) or 20 (production)
- **Time elapsed:** 10 seconds (test page) or 30 seconds (production)
- **Manual flush:** "Force Flush" button clicked
- **Page unload:** Automatically flushes using `sendBeacon`

## Best Practices

1. **Test first** - Use this page before setting up Qualtrics
2. **Save token** - Click "Save Token" to avoid re-entering
3. **Check console** - Always have F12 console open while testing
4. **Force flush** - Use button for immediate verification
5. **Verify sessionId** - Make sure it's NOT `undefined`

## Getting Help

If you encounter issues:

1. **Check console logs** - Most issues show error messages
2. **Verify token** - Confirm it's correct in dashboard
3. **Check backend** - Verify https://api.humanly.art/health returns 200
4. **Try fresh page** - Clear localStorage and refresh
5. **Contact support** - Include console logs and sessionId

## Integration Workflow

Recommended testing workflow:

1. ✅ **Test on debug page** - Verify tracker works with your token
2. ✅ **Copy Qualtrics code** - From developer dashboard
3. ✅ **Paste in Qualtrics** - Add to survey header
4. ✅ **Open Live Preview** - In developer dashboard
5. ✅ **Test in Qualtrics** - Type and watch Live Preview
6. ✅ **Verify events** - Check they appear correctly

## Related Documentation

- **TESTING_GUIDE.md** - Complete testing procedures
- **QUALTRICS_INTEGRATION.md** - Qualtrics-specific setup
- **Developer Dashboard** - https://developer.humanly.art
