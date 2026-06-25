// Run this immediately when any HTML page loads
document.addEventListener('DOMContentLoaded', () => {
    applySavedAccessibilitySettings();
});

// Checks memory and injects classes onto the <body> element
function applySavedAccessibilitySettings() {
    // 1. High Contrast Check
    const highContrastActive = localStorage.getItem('accessibility_high_contrast') === 'true';
    if (highContrastActive) {
        document.body.classList.add('high-contrast-mode');
    } else {
        document.body.classList.remove('high-contrast-mode');
    }

    // 2. Large Font Check
    const largeFontActive = localStorage.getItem('accessibility_large_font') === 'true';
    if (largeFontActive) {
        document.body.classList.add('text-lg-custom');
    } else {
        document.body.classList.remove('text-lg-custom');
    }
}

// Call this function from your actual Settings toggles/buttons
function toggleAccessibilityFeature(featureKey, className) {
    const isCurrentlyActive = localStorage.getItem(featureKey) === 'true';
    
    // Flip the state in memory
    localStorage.setItem(featureKey, !isCurrentlyActive);
    
    // Update the current page view instantly
    applySavedAccessibilitySettings();
}