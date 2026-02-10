// Display the blocked URL
const urlParams = new URLSearchParams(window.location.search);
const originalUrl = urlParams.get('url') || document.referrer || 'Unknown URL';
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