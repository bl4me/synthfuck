// Bandcamp Link Finder Extension - Popup Script

class BandcampLinkPopup {
    constructor() {
        this.currentLinks = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadLinks();
    }

    setupEventListeners() {
        document.getElementById("refreshBtn").addEventListener("click", () => this.loadLinks());
        document.getElementById("highlightBtn").addEventListener("click", () => this.toggleHighlights());
        document.getElementById("exportBtn").addEventListener("click", () => this.exportLinks());
        document.getElementById("removeDungeonSynthBtn").addEventListener("click", () => this.removeDungeonSynth());
    }

    async loadLinks() {
        try {
            this.showLoading();
            console.log("Loading Bandcamp links...");

            // Get active tab
            const tabs = await browser.tabs.query({
                active: true,
                currentWindow: true,
            });
            const activeTab = tabs[0];
            console.log("Active tab:", activeTab.url);

            // Check if we're on a Bandcamp page
            if (!activeTab.url.includes("bandcamp.com")) {
                this.showError("This extension only works on Bandcamp pages.");
                return;
            }

            // Wait for manifest-injected content script to be ready
            console.log("Waiting for content script to be ready...");
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Get links directly through executeScript instead of sendMessage
            console.log("📤 Getting links directly...");
            try {
                const linksResult = await browser.tabs.executeScript(
                    activeTab.id,
                    {
                        code: `
                            // Execute the findBandcampLinks function directly but return only serializable data
                            if (typeof window.findBandcampLinks === 'function') {
                                const links = window.findBandcampLinks();
                                console.log('Direct execution found', links.length, 'links');
                                // Return only serializable data (no DOM elements)
                                links.map(link => ({
                                    href: link.href,
                                    title: link.title,
                                    subtitle: link.subtitle,
                                    fullText: link.fullText,
                                    domain: link.domain,
                                    isBandcamp: link.isBandcamp
                                }));
                            } else {
                                console.log('findBandcampLinks function not found');
                                [];
                            }
                        `,
                    },
                );

                const links = linksResult[0] || [];
                console.log("Direct result:", links.length, "links");

                if (links.length > 0) {
                    this.currentLinks = links;
                    this.updateStats();
                    this.displayLinks();
                    console.log("Found", links.length, "Bandcamp links");
                } else {
                    this.showEmptyState();
                }
            } catch (directError) {
                console.error("Direct execution error:", directError);
                throw new Error(
                    "Could not get links directly from content script",
                );
            }
        } catch (error) {
            console.error("Error loading links:", error);
            this.showError(
                "Failed to load links. Make sure you're on a Bandcamp page and try refreshing.",
            );
        }
    }

    updateStats() {
        const totalLinks = this.currentLinks.length;
        const bandcampLinks = totalLinks; // All links are Bandcamp links now

        const totalElement = document.getElementById("totalLinks");
        const bandcampElement = document.getElementById("bandcampLinks");

        if (totalElement) {
            totalElement.textContent = totalLinks;
        }
        if (bandcampElement) {
            bandcampElement.textContent = bandcampLinks;
        }

        console.log("Stats updated:", { totalLinks, bandcampLinks });
    }

    displayLinks() {
        const container = document.getElementById("linksContainer");

        if (this.currentLinks.length === 0) {
            this.showEmptyState();
            return;
        }

        const linksHTML = this.currentLinks
            .map((link, index) => {
                const title = this.escapeHtml(link.title || "Untitled");
                const subtitle = this.escapeHtml(link.subtitle || "");
                const domain = this.escapeHtml(link.domain);
                const url = this.escapeHtml(link.href);

                return `
                <div class="link-item bandcamp" data-index="${index}">
                    <div class="link-title">${title}</div>
                    ${subtitle ? `<div class="link-subtitle">${subtitle}</div>` : ""}
                    <div class="link-url">${url}</div>
                    <div class="link-domain">${domain}</div>
                </div>
            `;
            })
            .join("");

        container.innerHTML = linksHTML;

        // Add click listeners to link items
        container.querySelectorAll(".link-item").forEach((item) => {
            item.addEventListener("click", (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.handleLinkClick(index);
            });
        });
    }

    async handleLinkClick(index) {
        const link = this.currentLinks[index];
        if (!link) return;

        try {
            // Open link in new tab
            await browser.tabs.create({
                url: link.href,
                active: false,
            });
        } catch (error) {
            console.error("Error handling link click:", error);
        }
    }

    async toggleHighlights() {
        try {
            const tabs = await browser.tabs.query({
                active: true,
                currentWindow: true,
            });
            const activeTab = tabs[0];

            await browser.tabs.sendMessage(activeTab.id, {
                action: "toggleHighlights",
            });
            console.log("Highlights toggled");
        } catch (error) {
            console.error("Error toggling highlights:", error);
        }
    }

    exportLinks() {
        const data = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            totalLinks: this.currentLinks.length,
            bandcampLinks: this.currentLinks.length,
            links: this.currentLinks.map((link) => ({
                title: link.title,
                subtitle: link.subtitle,
                href: link.href,
                domain: link.domain,
                isBandcamp: true,
            })),
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `bandcamp-links-${new Date().toISOString().split("T")[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    async removeDungeonSynth() {
        try {
            this.showLoading("Removing dungeon synth albums...");

            const tabs = await browser.tabs.query({
                active: true,
                currentWindow: true,
            });
            const activeTab = tabs[0];

            const response = await browser.tabs.sendMessage(activeTab.id, {
                action: "removeDungeonSynth",
            });

            if (response && response.success) {
                alert(
                    alert(`Removed ${response.removedCount} dungeon synth albums!`);
                );
                // Refresh the link list
                this.loadLinks();
            } else {
                alert("Failed to remove dungeon synth albums");
            }
        } catch (error) {
            console.error("Error removing dungeon synth albums:", error);
            alert("Error removing dungeon synth albums");
        }
    }

    showLoading(message = "🎵 Scanning for Bandcamp links...") {
        const container = document.getElementById("linksContainer");
        container.innerHTML = `
            <div class="loading">
                <div>${message}</div>
            </div>
        `;
    }

    showEmptyState() {
        const container = document.getElementById("linksContainer");
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div>No Bandcamp links found on this page</div>
            </div>
        `;
    }

    showError(message) {
        const container = document.getElementById("linksContainer");
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❗</div>
                <div>${message}</div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize popup when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    console.log("Bandcamp popup loading...");
    new BandcampLinkPopup();
});

console.log("Bandcamp popup script loaded");
