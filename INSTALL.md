# Installation and Testing Guide

## Quick Start

### 1. Install in Firefox (Developer Mode)

1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on..."
5. Navigate to this extension folder and select `manifest.json`
6. The extension should now appear in your toolbar

### 2. Test the Extension

1. Open the included `test-page.html` in Firefox
2. You should see links highlighted automatically:
   - Green highlights for regular links
   - Orange highlights with music note badges (🎵) for Bandcamp links
3. Click the extension icon in the toolbar to open the popup
4. The popup should show:
   - Link count statistics
   - Search and filter options
   - List of all found links

### 3. Test on Real Websites

Try visiting websites with many links, such as:
- Bandcamp discovery pages
- Reddit
- News websites
- Any page with multiple links

## Troubleshooting

### Extension Not Working?

1. **Check the Browser Console:**
   - Press F12 → Console tab
   - Look for any red error messages
   - Look for messages starting with "Content script" or "Link Finder"

2. **Reload the Extension:**
   - Go to `about:debugging`
   - Find "Link Finder" and click "Reload"
   - Refresh the web page after reloading

3. **Content Script Not Injected:**
   - The extension should inject automatically
   - Try refreshing the web page
   - Check if the website blocks content scripts (like `about:` pages)

### Popup Not Showing Link Count?

This is the most common issue. Try these steps in order:

1. **Check Console for Errors:**
   - Press F12 → Console tab
   - Look for messages like "Content script received message" or "Failed to load links"

2. **Verify Content Script is Loaded:**
   - In the console, type: `window.linkFinder`
   - If it returns `undefined`, the content script isn't loaded

3. **Force Content Script Injection:**
   - Open the popup
   - Click the "Refresh" button in the popup
   - This will attempt to inject the content script

4. **Test on Different Pages:**
   - Try on simple pages like the included `test-page.html`
   - Some complex websites may interfere with the extension

5. **Check Specific Error Messages:**
   - "Cannot access this tab" - Try a different website (not `about:` pages)
   - "Content script not responding" - Refresh the page and try again
   - "No active tab found" - Make sure you're on a web page

### Links Not Highlighted?

1. **Check if highlights are enabled** - click the "Highlight" button in popup
2. **Some websites may override CSS** - this is normal for sites with strong CSS
3. **Dynamic content** - the extension should detect new links automatically after 500ms
4. **Test with simple pages first** - use the included `test-page.html`

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Links are highlighted on page load
- [ ] Popup opens and shows correct link count
- [ ] Search functionality works
- [ ] Filter tabs work (All, Bandcamp, Other)
- [ ] Clicking links in popup opens them in new tabs
- [ ] Export functionality works
- [ ] Highlights can be toggled on/off
- [ ] Extension works on different websites

## Development Testing

### Using the Test Page

The included `test-page.html` contains:
- Static Bandcamp links
- Static regular links
- Dynamic link addition buttons
- Various link structures

### Browser Developer Tools

1. **Content Script Debugging:**
   - Open F12 → Console
   - Type `window.linkFinder` to access the LinkFinder instance
   - Use `window.linkFinder.getLinks()` to see found links

2. **Popup Debugging:**
   - Right-click on popup → "Inspect Element"
   - This opens popup developer tools

3. **Background Script Debugging:**
   - Go to `about:debugging` → Extension → "Inspect"
   - This opens background script console

### Manual Testing Commands

In the browser console on any page:
```javascript
// Check if content script is loaded
window.linkFinder

// Get all found links
window.linkFinder.getLinks()

// Get only Bandcamp links
window.linkFinder.getBandcampLinks()

// Manually trigger scan
window.linkFinder.scanForLinks()
```

## Common Issues

### 1. "Failed to load links. Try refreshing the page."
**Most common issue - follow these steps:**
- Open browser console (F12)
- Check for JavaScript errors
- Verify the page URL is not an `about:` page or extension page
- Try on a simple website like Google or Wikipedia first
- Click "Refresh" button in the popup
- If still failing, reload the extension in `about:debugging`

### 2. "Content script not responding"
- The content script failed to initialize
- Refresh the page and wait 2-3 seconds
- Check if the website blocks content scripts
- Try a different website

### 3. "No links found" but links exist on page
- Check if page has `<a>` tags with `href` attributes
- Some single-page apps use JavaScript routing instead of real links
- Try the test page first to verify extension works
- Open console and type: `document.querySelectorAll('a[href]').length`

### 4. "Popup shows 0 links" consistently
- Most likely content script injection failure
- Go to `about:debugging` → Find "Link Finder" → Click "Inspect"
- Check background script console for errors
- Try uninstalling and reinstalling the extension

### 5. "Highlights not visible"
- Website CSS might be overriding extension styles
- Try toggling highlights off and on
- Check if links are actually being found (popup should show count)
- Some websites use `!important` CSS rules that override extension styles

## Performance Notes

- The extension scans pages automatically
- Large pages (1000+ links) may take a moment to process
- Dynamic content is detected with a 500ms delay
- Highlights use CSS transforms for smooth animations

## Detailed Debugging Steps

If you're still having issues, try these detailed steps:

### Step 1: Test Extension Loading
1. Go to `about:debugging`
2. Click "This Firefox"
3. Find "Link Finder" in the list
4. Click "Inspect" to open background script console
5. Look for "Background script setup complete" message

### Step 2: Test Content Script Injection
1. Open any simple website (like Google)
2. Press F12 to open console
3. Look for "Content script loading..." message
4. If not found, the content script isn't injecting

### Step 3: Test Message Passing
1. Open the popup
2. Right-click on popup → "Inspect Element"
3. In popup console, you should see "Popup DOM loaded"
4. Click "Refresh" button and watch for messages

### Step 4: Manual Testing
1. Open the included `debug.html` page
2. Follow the instructions on that page
3. Use the debug buttons to test each component

## Browser Compatibility

- **Firefox 57+** (WebExtensions API)
- **Manifest V2** format
- Uses standard web APIs (no experimental features)
- Not compatible with Chrome (uses browser.* APIs instead of chrome.*)

## Security Notes

- Extension only reads page content locally
- No data is sent to external servers
- All processing happens in your browser
- Export files are saved locally to your computer
- Extension requires "activeTab" permission to read page content