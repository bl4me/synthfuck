// Auto Dungeon Synth Remover - Content Script for Bandcamp Pages
// Automatically removes dungeon synth albums from discover pages

console.log("🧹 Auto Dungeon Synth Remover loading...");

let isProcessing = false;
let processedUrls = new Set();
let processingQueue = [];
let isScrolling = false;
let scrollTimeout;

// Configuration
const CONFIG = {
    checkDelay: 1000, // Delay between album checks (ms) - 1 second
    scrollDebounce: 2000, // Debounce time for scroll events (ms) - 2 seconds
    initialDelay: 2000, // Initial delay before first scan (ms)
    maxRetries: 2, // Max retries for failed requests
    batchSize: 4, // Number of albums to process in parallel - 4 requests
    retryBaseDelay: 2000, // Base delay for retries (ms)
    rateLimitDelay: 30000, // Delay after rate limit error (ms) - 30 seconds
};

// Statistics
let stats = {
    totalChecked: 0,
    totalRemoved: 0,
    errors: 0,
};

// Function to find new Bandcamp album links that haven't been processed
function findNewBandcampLinks() {
    const links = [];
    const selectors = [
        'a[href*="bandcamp.com"][href*="/album/"]',
        'a[href*="/album/"]', // For relative links on bandcamp.com
        '.meta a[href*="/album/"]', // New discover page structure
    ];

    selectors.forEach((selector) => {
        const linkElements = document.querySelectorAll(selector);
        linkElements.forEach((link) => {
            const href = link.getAttribute("href");
            if (!href) return;

            // Convert relative URLs to absolute
            const fullUrl = href.startsWith("http")
                ? href
                : href.startsWith("/")
                  ? `https://bandcamp.com${href}`
                  : `https://${href}`;

            // Skip if already processed or not a valid album URL
            if (processedUrls.has(fullUrl) || !fullUrl.includes("/album/")) {
                return;
            }

            // Find the album container element - look for the discover page structure
            const albumContainer =
                link.closest(".discover-item") ||
                link.closest(".discover-results-item") ||
                link.closest(".item-details") ||
                link.closest(".art") ||
                link.closest(".discover-detail-inner") ||
                // New discover page structure - look for the whole album card
                link.closest(".meta")?.parentElement ||
                link.closest("[data-v-e0760e9e]")?.parentElement ||
                // Look for section with image-carousel (the whole album block)
                (() => {
                    const metaDiv = link.closest(".meta");
                    if (metaDiv) {
                        const prevSection = metaDiv.previousElementSibling;
                        if (
                            prevSection &&
                            prevSection.classList.contains("image-carousel")
                        ) {
                            return metaDiv.parentElement;
                        }
                    }
                    return null;
                })() ||
                link.parentElement?.parentElement; // Fallback to grandparent

            if (!albumContainer) return;

            // Extract album info - updated for new structure
            const titleElement =
                albumContainer.querySelector(".discover-item-title") ||
                albumContainer.querySelector(".discover-title") ||
                albumContainer.querySelector("strong") ||
                link.querySelector("strong");

            const artistElement =
                albumContainer.querySelector(".discover-item-artist") ||
                albumContainer.querySelector(".discover-artist") ||
                albumContainer.querySelector(".subhead") ||
                albumContainer.querySelector("span") ||
                link.querySelector("span");

            // Debug logging
            console.log("🔍 Found album link:", {
                href: fullUrl,
                title: titleElement
                    ? titleElement.textContent.trim()
                    : "Unknown Title",
                artist: artistElement
                    ? artistElement.textContent.trim()
                    : "Unknown Artist",
                containerClass: albumContainer.className,
                containerTag: albumContainer.tagName,
            });

            links.push({
                href: fullUrl,
                title: titleElement
                    ? titleElement.textContent.trim()
                    : "Unknown Title",
                artist: artistElement
                    ? artistElement.textContent.trim()
                    : "Unknown Artist",
                element: link,
                container: albumContainer,
            });
        });
    });

    console.log(`📊 Found ${links.length} total album links`);
    return links;
}

// Function to check if an album has "dungeon synth" tag
async function checkAlbumForDungeonSynth(albumUrl, retryCount = 0) {
    try {
        console.log(`🔍 Checking album (attempt ${retryCount + 1}):`, albumUrl);

        const response = await browser.runtime.sendMessage({
            action: "fetchAlbumPage",
            url: albumUrl,
        });

        if (response && response.success) {
            stats.totalChecked++;
            if (response.hasDungeonSynth) {
                console.log("💀 Found dungeon synth tag in:", albumUrl);
                return true;
            } else {
                console.log("✅ No dungeon synth tag found in:", albumUrl);
                return false;
            }
        } else {
            throw new Error(response?.error || "Failed to fetch album page");
        }
    } catch (error) {
        console.error(
            `❌ Error checking album (attempt ${retryCount + 1}):`,
            albumUrl,
            error,
        );
        stats.errors++;

        // Retry logic with exponential backoff
        if (retryCount < CONFIG.maxRetries) {
            let retryDelay = CONFIG.retryBaseDelay * Math.pow(2, retryCount);

            // Special handling for rate limit errors
            if (error.message && error.message.includes("429")) {
                console.log(
                    `🚫 Rate limited! Waiting ${CONFIG.rateLimitDelay / 1000} seconds before retry...`,
                );
                retryDelay = CONFIG.rateLimitDelay;
            }

            console.log(`🔄 Retrying in ${retryDelay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            return checkAlbumForDungeonSynth(albumUrl, retryCount + 1);
        }

        return false;
    }
}

// Function to hide an album
function hideAlbum(albumData) {
    if (albumData.container) {
        console.log("🎯 Hiding album container:", {
            title: albumData.title,
            artist: albumData.artist,
            containerClass: albumData.container.className,
            containerTag: albumData.container.tagName,
        });

        // Add the removal animation class first
        albumData.container.classList.add("dungeon-synth-removed");

        // After a short delay, hide the element
        setTimeout(() => {
            albumData.container.style.display = "none";
            albumData.container.classList.add("dungeon-synth-hidden");
        }, 2000);

        console.log(
            `🚫 Hidden album: ${albumData.title} by ${albumData.artist}`,
        );
        stats.totalRemoved++;
        return true;
    }
    console.log("❌ No container found for album:", albumData.title);
    return false;
}

// Process albums in batches to avoid overwhelming the server
async function processAlbumBatch(albumBatch) {
    const promises = albumBatch.map(async (albumData) => {
        try {
            processedUrls.add(albumData.href);

            const isDungeonSynth = await checkAlbumForDungeonSynth(
                albumData.href,
            );

            if (isDungeonSynth) {
                hideAlbum(albumData);
            }

            // Add delay between requests - longer for rate limit safety
            await new Promise((resolve) =>
                setTimeout(resolve, CONFIG.checkDelay),
            );

            return { success: true, album: albumData };
        } catch (error) {
            console.error("Error processing album:", albumData.href, error);

            // If it's a rate limit error, add extra delay
            if (error.message && error.message.includes("429")) {
                console.log("🚫 Rate limit detected, adding extra delay...");
                await new Promise((resolve) =>
                    setTimeout(resolve, CONFIG.rateLimitDelay),
                );
            }

            return { success: false, album: albumData, error };
        }
    });

    return Promise.all(promises);
}

// Main processing function
async function processNewAlbums() {
    if (isProcessing) {
        console.log("⏳ Already processing albums, skipping...");
        return;
    }

    isProcessing = true;
    console.log("🧹 Starting automatic dungeon synth removal...");

    try {
        const newAlbumLinks = findNewBandcampLinks();
        console.log(
            `📊 Found ${newAlbumLinks.length} new album links to check`,
        );

        if (newAlbumLinks.length === 0) {
            console.log("📭 No new albums to process");
            return;
        }

        // Process albums in batches
        const batches = [];
        for (let i = 0; i < newAlbumLinks.length; i += CONFIG.batchSize) {
            batches.push(newAlbumLinks.slice(i, i + CONFIG.batchSize));
        }

        console.log(
            `📦 Processing ${batches.length} batches of albums (4 at a time)`,
        );

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`🔄 Processing batch ${i + 1}/${batches.length}`);

            await processAlbumBatch(batch);

            // Wait between batches
            if (i < batches.length - 1) {
                console.log(
                    `⏳ Waiting ${CONFIG.checkDelay / 1000} seconds before next batch...`,
                );
                await new Promise((resolve) =>
                    setTimeout(resolve, CONFIG.checkDelay),
                );
            }
        }

        console.log(
            `🧹 Processing complete! Stats: ${stats.totalRemoved} removed, ${stats.totalChecked} checked, ${stats.errors} errors`,
        );
    } catch (error) {
        console.error("❌ Error during album processing:", error);
    } finally {
        isProcessing = false;
    }
}

// Enhanced scroll detection for dynamic content
function setupScrollWatcher() {
    let lastScrollY = window.scrollY;
    let scrollDirection = "down";

    const scrollHandler = () => {
        const currentScrollY = window.scrollY;
        scrollDirection = currentScrollY > lastScrollY ? "down" : "up";
        lastScrollY = currentScrollY;

        isScrolling = true;

        // Clear existing timeout
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }

        // Check if we're near the bottom of the page (for infinite scroll)
        const isNearBottom =
            window.innerHeight + window.scrollY >=
            document.body.offsetHeight - 1000;

        if (scrollDirection === "down" && isNearBottom) {
            console.log(
                "🔄 Near bottom of page, preparing to check for new content...",
            );

            scrollTimeout = setTimeout(() => {
                isScrolling = false;
                // Only process if we're not already processing
                if (!isProcessing) {
                    console.log("📜 Scroll ended, checking for new albums...");
                    processNewAlbums();
                }
            }, CONFIG.scrollDebounce);
        } else {
            scrollTimeout = setTimeout(() => {
                isScrolling = false;
            }, CONFIG.scrollDebounce / 2);
        }
    };

    window.addEventListener("scroll", scrollHandler, { passive: true });
    console.log("📜 Scroll watcher set up");
}

// Set up MutationObserver to watch for new content
function setupMutationWatcher() {
    const observer = new MutationObserver((mutations) => {
        let hasNewContent = false;

        mutations.forEach((mutation) => {
            if (
                mutation.type === "childList" &&
                mutation.addedNodes.length > 0
            ) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if new album links were added
                        const hasAlbumLinks =
                            node.tagName === "A" &&
                            node.href &&
                            node.href.includes("/album/");

                        const containsAlbumLinks =
                            node.querySelector &&
                            node.querySelector('a[href*="/album/"]');

                        if (hasAlbumLinks || containsAlbumLinks) {
                            hasNewContent = true;
                        }
                    }
                });
            }
        });

        if (hasNewContent && !isScrolling) {
            console.log(
                "🔄 New content detected via DOM changes, processing albums...",
            );
            clearTimeout(window.processTimeout);
            window.processTimeout = setTimeout(() => {
                processNewAlbums();
            }, CONFIG.scrollDebounce);
        }
    });

    // Watch for changes in the main content areas
    const targetNodes = [
        document.querySelector(".discover-results"),
        document.querySelector(".discover-items"),
        document.querySelector("#discover-content"),
        // Target the main content area where albums are loaded
        document.querySelector("main"),
        document.querySelector("[data-v-app]"),
        document.body,
    ].filter(Boolean);

    targetNodes.forEach((node) => {
        observer.observe(node, {
            childList: true,
            subtree: true,
        });
    });

    console.log("👁️ DOM mutation watcher set up");
}

// Initialize the extension
function initialize() {
    console.log("🚀 Initializing Auto Dungeon Synth Remover...");

    // Set up watchers
    setupScrollWatcher();
    setupMutationWatcher();

    // Initial scan after page loads
    setTimeout(() => {
        console.log("🎬 Starting initial scan...");
        processNewAlbums();
    }, CONFIG.initialDelay);

    console.log("🧹 Auto Dungeon Synth Remover ready!");
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
} else {
    initialize();
}

// Periodic check for new content (fallback)
setInterval(() => {
    if (!isProcessing && !isScrolling) {
        const newLinks = findNewBandcampLinks();
        if (newLinks.length > 0) {
            console.log("⏰ Periodic check found new albums, processing...");
            processNewAlbums();
        }
    }
}, 60000); // Check every 1 minute

// Add some CSS to hide processed albums smoothly
const style = document.createElement("style");
style.textContent = `
    .dungeon-synth-hidden {
        transition: opacity 0.3s ease-out;
        opacity: 0;
    }
`;
document.head.appendChild(style);

console.log("🧹 Auto Dungeon Synth Remover script loaded");
