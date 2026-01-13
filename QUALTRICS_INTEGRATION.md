# Qualtrics Integration Guide - Simple Setup

Complete guide for integrating Humanly Tracker with Qualtrics surveys to track user typing behavior and text provenance.

## ✨ Zero Configuration Required

**No user ID setup needed!** The system automatically generates anonymous user IDs. Just paste the code and start tracking.

## Quick Start (3 Steps)

### Step 1: Get Your Integration Code

1. Log in to **developer.humanly.art**
2. Go to your project
3. Click **"Tracking Code"** in the navigation
4. Select the **"Qualtrics Integration"** tab
5. Click the **Copy** button on the code snippet

### Step 2: Add to Your Qualtrics Survey

**Method 1: Survey Header (Recommended)**

1. In Qualtrics survey editor, click **"Look & Feel"** (paint brush icon at top)
2. Go to **"General"** tab
3. Click **"Edit"** in the Header section
4. Paste the entire Humanly code
5. Click **"Apply"** → **"Save"**

**Method 2: Question JavaScript**

1. Select a question in your survey
2. Click the gear icon (⚙️) → **"Add JavaScript"**
3. Paste the code in the `addOnload` section
4. **Save**

### Step 3: Test with Live Preview

1. In developer dashboard → Go to your project's **"Tracking Code"** page
2. Scroll to **"Test Your Integration"** section
3. Click **"Start Live Preview"** button → Status shows "Connected"
4. Open your Qualtrics survey in a **new tab**
5. Open browser **Developer Console** (press F12)
6. Look for `[Humanly] ✓` messages confirming tracker loaded
7. Type in any text field → Watch events appear in real-time!

---

## What Gets Tracked Automatically

The tracker captures:

- ✓ Every keystroke with timestamp
- ✓ Paste events (Ctrl+V)
- ✓ Copy/Cut operations
- ✓ Cursor position changes
- ✓ Text selection ranges
- ✓ Field focus/blur events

**All text inputs and textareas are tracked automatically** - no configuration needed!

---

## Complete Integration Code

Your personalized code is available at **developer.humanly.art** → Your Project → **Tracking Code** → **Qualtrics Integration** tab.

The code looks like this:

```javascript
// Debug flag - set to false to disable console logging in production
var DEBUG = true;

Qualtrics.SurveyEngine.addOnload(function() {
    var self = this;

    // Load Humanly tracking script
    var script = document.createElement('script');
    script.src = 'https://api.humanly.art/tracker/humanly-tracker.min.js';
    script.async = true;

    script.onload = function() {
        if (DEBUG) console.log('[Humanly] Tracker script loaded successfully');

        // Check if tracker is available
        if (typeof window.HumanlyTracker === 'undefined') {
            console.error('[Humanly] ✗ HumanlyTracker class not found!');
            console.error('[Humanly] Available objects:', Object.keys(window).filter(k => k.includes('Tracker') || k.includes('humanly')));
            return;
        }

        try {
            // Initialize tracker (no userId needed - auto-generated)
            var tracker = new window.HumanlyTracker({
                projectToken: 'YOUR_PROJECT_TOKEN',
                apiUrl: 'https://api.humanly.art',
                debug: DEBUG  // Use the same debug flag
            });

            // Start tracking
            tracker.init().then(function() {
                if (DEBUG) {
                    console.log('[Humanly] ✓ Tracker initialized successfully');
                    console.log('[Humanly] ✓ Tracking all text inputs and textareas');
                    console.log('[Humanly] ✓ Open browser DevTools to see tracking events');
                    console.log('[Humanly] ✓ Events will appear in real-time in your developer dashboard');
                }

                // Attach to text fields
                tracker.attach();
            }).catch(function(error) {
                console.error('[Humanly] ✗ Failed to initialize tracker:', error);
            });

            // Store tracker globally and on question context
            self.humanlyTracker = tracker;
            window.humanlyTrackerInstance = tracker;
            if (DEBUG) console.log('[Humanly] ✓ Tracker stored globally');
        } catch (error) {
            console.error('[Humanly] ✗ Failed to create tracker instance:', error);
        }
    };

    script.onerror = function() {
        console.error('[Humanly] ✗ Failed to load Humanly tracker script');
        console.error('[Humanly] Check that your survey is using HTTPS');
        console.error('[Humanly] Check that https://api.humanly.art is accessible');
    };

    document.head.appendChild(script);
});

// Mark as submitted on page submit (each page in multi-page surveys)
Qualtrics.SurveyEngine.addOnPageSubmit(function() {
    var tracker = this.humanlyTracker || window.humanlyTrackerInstance;
    if (tracker) {
        if (DEBUG) console.log('[Humanly] 📤 Marking session as submitted...');
        tracker.markSubmitted().then(function() {
            if (DEBUG) console.log('[Humanly] ✓ Session marked as submitted');
        }).catch(function(error) {
            console.error('[Humanly] ✗ Failed to mark as submitted:', error);
        });
    }
});

// Also handle browser unload (closing tab, navigating away, final submit)
window.addEventListener('beforeunload', function() {
    var tracker = window.humanlyTrackerInstance;
    if (tracker) {
        if (DEBUG) console.log('[Humanly] 🚪 Browser unload - flushing final events');
        // Tracker's built-in beforeunload handler will flush events using beacon API
    }
});
```

---

## Verifying the Integration

### Browser Console Messages

When working correctly, you'll see:

```
[Humanly] Tracker loaded successfully
[Humanly] ✓ Tracker initialized successfully
[Humanly] ✓ Tracking all text inputs and textareas
[Humanly] ✓ Open browser DevTools to see tracking events
[Humanly] ✓ Events will appear in real-time in your developer dashboard
[Humanly] Attaching to X elements
[Humanly] Session initialized: ses_xxxxx
```

### Live Preview Dashboard

In the developer dashboard, the Live Preview shows:
- **User ID** (auto-generated like `anon_1735000000_abc123`)
- **Session ID**
- **Event Type** (keydown, keyup, paste, etc.)
- **Key pressed**
- **Target Element** (CSS selector)
- **Cursor position**
- **Text length**

---

## Troubleshooting

### ❌ Script not loading / Console shows errors

**Symptoms:**
- Console shows: `[Humanly] ✗ Failed to load Humanly tracker script`
- Network tab shows 404 or CORS errors

**Solutions:**
- Verify your survey uses **HTTPS** (Qualtrics requirement for external scripts)
- Check that `https://api.humanly.art` is accessible from your browser
- Look for "Mixed Content" errors in console
- Try accessing `https://api.humanly.art/tracker/humanly-tracker.min.js` directly

---

### ❌ No console messages appearing

**Symptoms:**
- No `[Humanly]` messages in browser console
- Tracker seems to do nothing

**Solutions:**
- Verify the code was pasted in the **correct location** (Header or Question JavaScript)
- Make sure you **saved** the changes in Qualtrics
- Try **refreshing** the survey preview
- Check browser console for **JavaScript errors** (red text)
- Verify code wasn't modified or cut off during pasting

---

### ❌ Events not showing in Live Preview

**Symptoms:**
- Console shows tracker initialized successfully
- But Live Preview shows no events

**Solutions:**
- Ensure **"Start Live Preview"** is clicked and shows **"Connected"** status
- Verify you're typing in a **text field** (tracker doesn't capture radio buttons/checkboxes/dropdowns)
- Check that the **correct project** is selected
- Try disconnecting and reconnecting Live Preview
- Check browser console for network errors when sending events

---

### ❌ Session not marked as complete after submit

**Symptoms:**
- Events are tracked correctly
- But session shows as "Incomplete" in dashboard after completing survey

**Solutions:**
- Check browser console for: `[Humanly] 📤 Marking session as submitted...`
- Should see: `[Humanly] ✓ Session marked as submitted` after each page submit
- If you see `⚠️ Tracker not found on page submit`, the tracker wasn't stored globally
- For multi-page surveys, session is marked submitted on EVERY page submit (by design)
- For final submit, the `beforeunload` handler also flushes remaining events

**Debugging:**
- Open browser console (F12) before submitting
- Look for the submit messages
- If missing, verify the integration code includes both:
  - `window.humanlyTrackerInstance = tracker;` (stores tracker globally)
  - `Qualtrics.SurveyEngine.addOnPageSubmit(...)` (handles page submit)

---

### ✅ Everything working correctly if you see:

1. **Console**: `[Humanly] ✓ Tracker initialized successfully`
2. **Console**: `[Humanly] ✓ Tracker stored globally`
3. **Live Preview**: "Connected" status (green badge)
4. **Events appearing**: As you type in text fields
5. **On Submit**: `[Humanly] 📤 Marking session as submitted...` and `[Humanly] ✓ Session marked as submitted`
6. **User ID shown**: In each event (like `anon_1735000000_abc123`)

---

## Advanced Configuration (Optional)

### Custom User Identification

If you want to use your own user IDs instead of auto-generated ones:

```javascript
var tracker = new HumanlyTracker({
    projectToken: 'YOUR_PROJECT_TOKEN',
    apiUrl: 'https://api.humanly.art',
    userIdSelector: '#QR~QID1',  // CSS selector for user ID field
    debug: true
});
```

### Finding Qualtrics Field IDs

1. In Survey Flow, add **"Embedded Data"** at the beginning
2. Create a field (e.g., `respondentId`)
3. Use the field ID: `#QR~QID{field_number}`
4. Or use Qualtrics built-in: `${e://Field/ResponseID}`

### All Configuration Options

```javascript
var tracker = new HumanlyTracker({
    projectToken: 'YOUR_PROJECT_TOKEN',    // Required
    apiUrl: 'https://api.humanly.art',     // Required
    userIdSelector: '#QR~QID1',            // Optional: CSS selector for user ID
    debounceMs: 100,                       // Optional: Debounce time (default: 100ms)
    maxBatchSize: 20,                      // Optional: Events per batch (default: 20)
    maxBatchTime: 30,                      // Optional: Max seconds before send (default: 30)
    retryAttempts: 3,                      // Optional: Number of retries (default: 3)
    debug: true                            // Optional: Enable logging (default: false)
});
```

---

## Best Practices

### 1. Privacy and Consent

- ✓ Inform participants about tracking in your consent form
- ✓ Only track after obtaining consent
- ✓ Follow your institution's IRB guidelines
- ✓ Comply with GDPR/privacy regulations

### 2. Testing

- ✓ Always test in **preview mode** before publishing
- ✓ Use **Live Preview** to verify events are captured
- ✓ Check console for error messages
- ✓ Test with different question types

### 3. Production

- ✓ Set `debug: false` in production to reduce console noise
- ✓ Monitor your dashboard regularly
- ✓ Keep your project tokens secure
- ✓ Document which surveys use tracking

---

## Technical Details

### API Endpoints Used

The tracker communicates with:

- `POST /api/v1/track/init` - Initialize tracking session
- `POST /api/v1/track/events` - Send event batches
- `POST /api/v1/track/submit` - Mark session as completed

### Network Requirements

- HTTPS required (Qualtrics security policy)
- Outbound connections to `api.humanly.art`
- WebSocket connection for Live Preview (developer dashboard only)

### Data Sent

Each event includes:
- Timestamp (millisecond precision)
- Event type (keydown, keyup, paste, etc.)
- Target element (CSS selector)
- Key pressed (if applicable)
- Cursor position
- Text length (not the actual text content)
- Selection range

---

## Support

Need help?

1. Check the **Troubleshooting** section above
2. Test with **Live Preview** to see real-time events
3. Open browser console (F12) to see debug messages
4. Contact support with:
   - Console error messages
   - Network tab screenshots
   - Project ID
   - Survey URL (if shareable)

---

## Example: Stanford Qualtrics Survey

For surveys hosted on Stanford's Qualtrics (stanforduniversity.qualtrics.com):

1. Get your integration code from **developer.humanly.art**
2. In your Stanford Qualtrics survey editor → **Look & Feel** → **General** → **Header**
3. Paste the code → **Apply** → **Save**
4. Preview your survey → Open console (F12)
5. Verify you see `[Humanly] ✓` messages
6. Type in text fields → See events in Live Preview!

**Note:** Requires HTTPS, which Stanford Qualtrics provides by default.

---

## Version History

- **v2.0.0** (Current)
  - Zero configuration - auto-generates user IDs
  - Enhanced debug logging with ✓/✗ indicators
  - Live Preview with detailed event information
  - Improved error messages and troubleshooting

- **v1.0.0**
  - Initial Qualtrics integration support
  - Required manual user ID configuration

---

## License

MIT License - See LICENSE file for details
