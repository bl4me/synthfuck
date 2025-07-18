// Auto Dungeon Synth Remover - Background Script
// Handles cross-origin requests and extension lifecycle

console.log("🧹 Auto Dungeon Synth Remover background script loading...");

// Configuration
const CONFIG = {
    requestTimeout: 15000, // 15 seconds (increased)
    retryDelay: 5000, // 5 seconds (increased)
    maxRetries: 2, // Reduced retries
    rateLimitDelay: 30000, // 30 seconds after rate limit
    requestDelay: 2000, // 2 second between requests
};

// Statistics tracking
let globalStats = {
    totalChecked: 0,
    totalRemoved: 0,
    errors: 0,
    sessionsStarted: 0,
};

// Handle extension installation
browser.runtime.onInstalled.addListener((details) => {
    console.log("🧹 Auto Dungeon Synth Remover installed:", details.reason);

    // Initialize storage with default settings
    browser.storage.local.set({
        autoRemovalEnabled: true,
        checkDelay: 300,
        scrollDebounce: 1000,
        maxRetries: 3,
        batchSize: 5,
        debugMode: false,
    });

    // Show installation notification
    if (details.reason === "install") {
        browser.notifications.create({
            type: "basic",
            iconUrl: "icons/icon-48.png",
            title: "Auto Dungeon Synth Remover",
            message:
                "Extension installed! It will automatically remove dungeon synth albums from Bandcamp discover pages.",
        });
    }
});

// Handle messages from content scripts
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("📨 Background received message:", request.action);

    switch (request.action) {
        case "fetchAlbumPage":
            handleFetchAlbumPage(request, sender, sendResponse);
            break;
        case "updateStats":
            handleUpdateStats(request, sender, sendResponse);
            break;
        case "getStats":
            handleGetStats(request, sender, sendResponse);
            break;
        case "getSettings":
            handleGetSettings(request, sender, sendResponse);
            break;
        case "saveSettings":
            handleSaveSettings(request, sender, sendResponse);
            break;
        default:
            console.log("❓ Unknown message action:", request.action);
            sendResponse({ success: false, error: "Unknown action" });
    }

    // Return true to indicate we'll send a response asynchronously
    return true;
});

// Handle tab updates to track active sessions
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (
        changeInfo.status === "complete" &&
        tab.url &&
        tab.url.includes("bandcamp.com/discover")
    ) {
        console.log("🎵 Bandcamp discover page loaded:", tab.url);
        globalStats.sessionsStarted++;
        updateBadge(tabId);
    }
});

// Handle tab activation
browser.tabs.onActivated.addListener((activeInfo) => {
    updateBadge(activeInfo.tabId);
});

// Fetch album page and check for dungeon synth tags
async function handleFetchAlbumPage(request, sender, sendResponse) {
    try {
        console.log("🔍 Fetching album page:", request.url);

        // Add delay before request to avoid rate limiting
        await new Promise((resolve) =>
            setTimeout(resolve, CONFIG.requestDelay),
        );

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(
            () => controller.abort(),
            CONFIG.requestTimeout,
        );

        const response = await fetch(request.url, {
            signal: controller.signal,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
                "Accept-Encoding": "gzip, deflate",
                DNT: "1",
                Connection: "keep-alive",
                "Upgrade-Insecure-Requests": "1",
                "Cache-Control": "no-cache",
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            // Special handling for rate limit errors
            if (response.status === 429) {
                console.log("🚫 Rate limited by Bandcamp, backing off...");
                throw new Error(
                    `HTTP ${response.status}: Too Many Requests - Rate Limited`,
                );
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        console.log("📄 Received HTML response, parsing...");

        // Parse HTML to find dungeon synth tags
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Look for tag links containing "dungeon synth"
        const hasDungeonSynth = checkForDungeonSynthTags(doc);

        console.log(
            `${hasDungeonSynth ? "💀" : "✅"} Album ${request.url} ${hasDungeonSynth ? "has" : "doesn't have"} dungeon synth tag`,
        );

        globalStats.totalChecked++;

        sendResponse({
            success: true,
            hasDungeonSynth: hasDungeonSynth,
            url: request.url,
        });
    } catch (error) {
        console.error("❌ Error fetching album page:", error);
        globalStats.errors++;

        // Add extra delay for rate limit errors
        if (error.message && error.message.includes("429")) {
            console.log(
                `⏳ Rate limited - waiting ${CONFIG.rateLimitDelay / 1000} seconds`,
            );
            await new Promise((resolve) =>
                setTimeout(resolve, CONFIG.rateLimitDelay),
            );
        }

        sendResponse({
            success: false,
            error: error.message,
            url: request.url,
            rateLimited: error.message && error.message.includes("429"),
        });
    }
}

// Check for dungeon synth tags in the parsed HTML
function checkForDungeonSynthTags(doc) {
    const selectors = [
        "a.tag",
        ".tag",
        'a[href*="/tag/"]',
        ".tralbum-tags a",
        ".tags a",
    ];

    for (const selector of selectors) {
        const tagElements = doc.querySelectorAll(selector);
        for (const tagElement of tagElements) {
            const tagText = tagElement.textContent.trim().toLowerCase();
            if (
                tagText.includes("dungeon synth") ||
                tagText.includes("dungeonsynth")
            ) {
                return true;
            }
        }
    }

    // Also check for dungeon synth in meta tags or other locations
    const metaTags = doc.querySelectorAll(
        'meta[name="keywords"], meta[name="description"]',
    );
    for (const meta of metaTags) {
        const content = meta.getAttribute("content");
        if (content && content.toLowerCase().includes("dungeon synth")) {
            return true;
        }
    }

    return false;
}

// Update statistics
async function handleUpdateStats(request, sender, sendResponse) {
    try {
        if (request.stats) {
            if (request.stats.removed)
                globalStats.totalRemoved += request.stats.removed;
            if (request.stats.checked)
                globalStats.totalChecked += request.stats.checked;
            if (request.stats.errors)
                globalStats.errors += request.stats.errors;
        }

        // Store stats in local storage
        await browser.storage.local.set({ globalStats });

        sendResponse({ success: true });
    } catch (error) {
        console.error("Error updating stats:", error);
        sendResponse({ success: false, error: error.message });
    }
}

// Get statistics
async function handleGetStats(request, sender, sendResponse) {
    try {
        const stored = await browser.storage.local.get(["globalStats"]);
        const stats = stored.globalStats || globalStats;

        sendResponse({
            success: true,
            stats: stats,
        });
    } catch (error) {
        console.error("Error getting stats:", error);
        sendResponse({ success: false, error: error.message });
    }
}

// Get settings
async function handleGetSettings(request, sender, sendResponse) {
    try {
        const settings = await browser.storage.local.get([
            "autoRemovalEnabled",
            "checkDelay",
            "scrollDebounce",
            "maxRetries",
            "batchSize",
            "debugMode",
        ]);

        sendResponse({ success: true, settings });
    } catch (error) {
        console.error("Error getting settings:", error);
        sendResponse({ success: false, error: error.message });
    }
}

// Save settings
async function handleSaveSettings(request, sender, sendResponse) {
    try {
        await browser.storage.local.set(request.settings);
        console.log("⚙️ Settings saved:", request.settings);

        // Update CONFIG if performance settings changed
        if (request.settings.requestDelay) {
            CONFIG.requestDelay = request.settings.requestDelay;
        }
        if (request.settings.rateLimitDelay) {
            CONFIG.rateLimitDelay = request.settings.rateLimitDelay;
        }

        sendResponse({ success: true });
    } catch (error) {
        console.error("Error saving settings:", error);
        sendResponse({ success: false, error: error.message });
    }
}

// Update extension badge
async function updateBadge(tabId) {
    try {
        const tab = await browser.tabs.get(tabId);

        if (tab.url && tab.url.includes("bandcamp.com/discover")) {
            // Show that extension is active on discover pages
            browser.browserAction.setBadgeText({
                text: "ON",
                tabId: tabId,
            });

            browser.browserAction.setBadgeBackgroundColor({
                color: "#FF6B35",
                tabId: tabId,
            });

            browser.browserAction.setTitle({
                title: `Auto Dungeon Synth Remover: Active on ${tab.url}`,
                tabId: tabId,
            });
        } else {
            // Clear badge on non-discover pages
            browser.browserAction.setBadgeText({
                text: "",
                tabId: tabId,
            });

            browser.browserAction.setTitle({
                title: "Auto Dungeon Synth Remover: Not active on this page",
                tabId: tabId,
            });
        }
    } catch (error) {
        // Tab might not exist anymore, ignore
        console.log("Could not update badge for tab:", tabId);
    }
}

// Handle browser action click (since there's no popup, show info)
browser.browserAction.onClicked.addListener(async (tab) => {
    try {
        if (tab.url && tab.url.includes("bandcamp.com/discover")) {
            // Show status notification
            browser.notifications.create({
                type: "basic",
                iconUrl: "icons/icon-48.png",
                title: "Auto Dungeon Synth Remover",
                message: `Extension is active on this page. Removed: ${globalStats.totalRemoved}, Checked: ${globalStats.totalChecked}`,
            });
        } else {
            // Show info that extension only works on discover pages
            browser.notifications.create({
                type: "basic",
                iconUrl: "icons/icon-48.png",
                title: "Auto Dungeon Synth Remover",
                message:
                    "This extension only works on Bandcamp discover pages. Navigate to bandcamp.com/discover to use it.",
            });
        }
    } catch (error) {
        console.error("Error handling browser action click:", error);
    }
});

// Initialize statistics from storage
async function initializeStats() {
    try {
        const stored = await browser.storage.local.get(["globalStats"]);
        if (stored.globalStats) {
            globalStats = { ...globalStats, ...stored.globalStats };
        }
        console.log("📊 Initialized stats:", globalStats);
    } catch (error) {
        console.error("Error initializing stats:", error);
    }
}

// Clean up resources when extension is suspended
browser.runtime.onSuspend.addListener(() => {
    console.log("🧹 Auto Dungeon Synth Remover suspended");

    // Save final stats
    browser.storage.local.set({ globalStats });
});

// Initialize
initializeStats();

console.log("🧹 Auto Dungeon Synth Remover background script ready");
