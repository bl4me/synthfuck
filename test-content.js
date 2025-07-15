// Minimal test content script to isolate message listener issue
console.log("🧪 Test content script loading...");

// Check browser APIs immediately
console.log("🔍 Browser object:", typeof browser);
console.log("🔍 Browser runtime:", typeof browser?.runtime);
console.log("🔍 Window location:", window.location.href);

// Set up minimal message listener
if (typeof browser !== "undefined" && browser.runtime) {
    console.log("✅ Setting up minimal message listener...");

    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("🔥 MINIMAL TEST: Message received!", request);

        if (request.action === "test") {
            console.log("🎯 Test message received, sending response");
            sendResponse({ success: true, message: "Test message received!" });
            return true;
        }

        if (request.action === "getLinks") {
            console.log("🎯 getLinks message received");
            const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
                href: a.href,
                text: a.textContent?.trim() || 'No text'
            }));
            console.log("📊 Found links:", links.length);
            sendResponse({ links: links });
            return true;
        }

        return false;
    });

    console.log("✅ Minimal message listener set up successfully");

    // Test that we can access the page
    setTimeout(() => {
        console.log("🧪 Testing page access...");
        console.log("📊 Total links on page:", document.querySelectorAll('a[href]').length);
        console.log("📊 Page title:", document.title);

        // Make this available globally for testing
        window.testMessageListener = function() {
            console.log("🧪 Manual test function called");
            return "Test function works!";
        };

        console.log("✅ Test content script initialization complete");
    }, 100);

} else {
    console.log("❌ Browser runtime not available");
    console.log("❌ Browser type:", typeof browser);
    console.log("❌ This means the WebExtension API is not available");
}
