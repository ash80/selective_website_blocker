// Display the blocked URL
// Extract everything after "?url=" since the original URL is not encoded
// and may contain ? or & characters that would confuse URLSearchParams
const search = window.location.search;
const prefix = '?url=';
const originalUrl = search.startsWith(prefix) ? search.substring(prefix.length) : 'Unknown URL';
document.getElementById('blockedUrl').textContent = originalUrl;

// Update page title with blocked domain
try {
    const domain = new URL(originalUrl).hostname;
    document.title = `${domain} - Site Blocked`;
} catch (e) {
    // Keep default title if URL parsing fails
}

// Add event listener for the back button
document.getElementById('backButton').addEventListener('click', function() {
    history.back();
});