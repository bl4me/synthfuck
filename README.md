# 🧹 Auto Dungeon Synth Remover

A Firefox extension that automatically removes dungeon synth albums from Bandcamp discover pages. No user interaction required!

## Features

- **Automatic Detection**: Scans Bandcamp discover pages for album links
- **Smart Filtering**: Checks each album's tags for "dungeon synth" content
- **Seamless Removal**: Hides dungeon synth albums with smooth animations
- **Dynamic Content**: Handles infinite scroll and dynamically loaded content
- **Background Processing**: Works silently without popups or interruptions
- **Performance Optimized**: Batched processing to avoid overwhelming servers

## How It Works

1. **Page Detection**: Automatically activates on Bandcamp discover pages
2. **Album Scanning**: Finds all album links on the current page
3. **Tag Checking**: Fetches each album page to check for "dungeon synth" tags
4. **Automatic Removal**: Hides albums with dungeon synth tags using CSS animations
5. **Scroll Monitoring**: Detects when new content loads and processes it automatically
6. **Continuous Operation**: Runs in the background without user intervention

## Installation

### From Source

1. Clone or download this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from the extension folder
6. The extension will be installed and ready to use

### Permissions Required

- `activeTab`: To access the current Bandcamp page
- `storage`: To save extension settings and statistics
- `https://*.bandcamp.com/*`: To fetch album pages and check tags

## Usage

The extension works completely automatically:

1. Navigate to any Bandcamp discover page (e.g., `bandcamp.com/discover`)
2. The extension will automatically start scanning for albums
3. Albums with "dungeon synth" tags will be hidden automatically
4. As you scroll down and new content loads, it will be processed automatically
5. No user interaction is required!

## Visual Indicators

- **🔍 Checking**: Albums show a subtle loading indicator while being processed
- **✓ Processed**: Albums get a small checkmark when processing is complete
- **💀 Removed**: Albums briefly show a removal message before disappearing
- **Badge**: Browser extension icon shows "ON" when active on discover pages

## Technical Details

### Configuration

The extension uses these default settings:
- **Check Delay**: 300ms between album checks
- **Scroll Debounce**: 1000ms delay after scrolling stops
- **Batch Size**: 5 albums processed in parallel
- **Max Retries**: 3 attempts for failed requests

### Performance Features

- **Batched Processing**: Processes albums in groups to avoid server overload
- **Request Throttling**: Adds delays between requests to be respectful
- **Error Handling**: Retries failed requests with exponential backoff
- **Memory Management**: Tracks processed URLs to avoid duplicate checks
- **Responsive Design**: Works on desktop and mobile layouts

### Browser Compatibility

- **Firefox**: 57+ (WebExtensions API)
- **Chrome**: Should work with minimal modifications
- **Edge**: Should work with minimal modifications

## Development

### File Structure

```
synfuck/firefox-extension/
├── manifest.json          # Extension configuration
├── content.js            # Main content script (runs on Bandcamp pages)
├── background.js         # Background script (handles API requests)
├── styles.css           # CSS for visual effects and animations
├── icons/               # Extension icons
├── test-automatic.html  # Test page for development
└── README.md           # This file
```

### Key Components

1. **Content Script** (`content.js`):
   - Finds album links on the page
   - Monitors for new content via MutationObserver and scroll events
   - Manages the removal process with visual feedback
   - Handles batched processing for performance

2. **Background Script** (`background.js`):
   - Fetches album pages to check for tags
   - Parses HTML to find "dungeon synth" tags
   - Manages extension lifecycle and permissions
   - Tracks statistics and handles errors

3. **CSS Animations** (`styles.css`):
   - Smooth hiding animations for removed albums
   - Loading indicators for processing albums
   - Status overlays and notifications
   - Responsive design and accessibility features

### Testing

Use the included test page (`test-automatic.html`) to verify functionality:

1. Open `test-automatic.html` in Firefox
2. Follow the testing instructions on the page
3. Check the browser console for debug messages
4. Test on actual Bandcamp discover pages

### Debugging

Enable debug mode by checking the browser console:
1. Open Developer Tools (F12)
2. Go to the Console tab
3. Look for messages starting with "🧹" or "🔍"
4. The extension logs all major operations

## Statistics

The extension tracks:
- Total albums checked
- Total albums removed
- Processing errors
- Active sessions

Access stats by clicking the extension icon on discover pages.

## Privacy

This extension:
- ✅ Only processes public Bandcamp pages
- ✅ Does not store personal data
- ✅ Does not track user behavior
- ✅ Works entirely offline after installation
- ✅ Respects website rate limits

## Troubleshooting

### Extension Not Working

1. **Check URL**: Extension only works on `bandcamp.com/discover*` pages
2. **Reload Page**: Try refreshing the Bandcamp page
3. **Check Console**: Look for error messages in browser console
4. **Permissions**: Ensure extension has required permissions

### Albums Not Being Removed

1. **Wait Time**: Processing takes time, especially with many albums
2. **Network Issues**: Check internet connection
3. **Server Errors**: Bandcamp might be temporarily unavailable
4. **Tag Variations**: Some albums might use different dungeon synth tag formats

### Performance Issues

1. **Batch Size**: Extension processes 5 albums at once by default
2. **Request Delays**: Built-in delays prevent server overload
3. **Memory Usage**: Extension cleans up processed URLs periodically

## Contributing

1. Fork the repository
2. Make your changes
3. Test thoroughly on actual Bandcamp pages
4. Submit a pull request with a clear description

## License

This project is open source. Feel free to modify and distribute according to your needs.

## Version History

- **1.0.0**: Initial automatic version
  - Automatic album detection and removal
  - Dynamic content handling
  - Performance optimizations
  - Visual feedback system

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Look at browser console for error messages
3. Test with the included test page
4. Submit detailed bug reports with steps to reproduce

---

**Note**: This extension is designed to work respectfully with Bandcamp's servers. It includes rate limiting and error handling to avoid causing issues for the website.