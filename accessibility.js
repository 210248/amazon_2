/**
 * Global Accessibility and Layout Device Sync Script
 * This script runs automatically across all connected platform pages to keep state changes synchronized.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Automatically run the token evaluation on load
    applyGlobalAccessibilityStateTokens();

    // 2. Set up a global window listener so if localStorage changes in another tab/view, it auto-refreshes
    window.addEventListener('storage', (e) => {
        if (['access_text_scale', 'access_contrast_mode', 'device_view'].includes(e.key)) {
            applyGlobalAccessibilityStateTokens();
        }
    });
});

/**
 * Reads settings from localStorage and applies the requested CSS utility class configurations
 */
function applyGlobalAccessibilityStateTokens() {
    const body = document.getElementById('dashboard-global-body');
    if (!body) return; // Safeguard if page hook isn't loaded yet

    // --- TEXT SCALE PROTOCOL ---
    const textScale = localStorage.getItem('access_text_scale') || 'small';
    
    // Reset any previously applied scale hooks
    body.classList.remove('text-sm', 'text-base', 'text-lg', 'text-xl');
    
    if (textScale === 'large') {
        body.classList.add('text-base');
    } else if (textScale === 'xlarge') {
        body.classList.add('text-lg');
    } else if (textScale === 'xxlarge') {
        body.classList.add('text-xl');
    } else {
        body.classList.add('text-sm'); // Default small configuration
    }

    // --- CONTRAST HIGHLIGHT MOOD PROTOCOL ---
    const contrastMode = localStorage.getItem('access_contrast_mode') === 'true';
    if (contrastMode) {
        body.style.filter = "contrast(1.20) saturate(1.10)";
        body.classList.add('high-contrast-active');
    } else {
        body.style.filter = "none";
        body.classList.remove('high-contrast-active');
    }

    // --- DEVICE PREVIEW RESOLUTION AUTO-SCALE PROTOCOL ---
    const wrapper = document.getElementById('page-wrapper');
    if (wrapper) {
        const currentView = localStorage.getItem('device_view') || 'desktop';
        
        // Clear layout alignment tags
        wrapper.classList.remove(
            'max-w-[375px]', 'max-w-[768px]', 'max-w-full', 
            'border-x', 'border-slate-800/40', 'shadow-2xl'
        );
        
        if (currentView === 'phone') {
            wrapper.classList.add('max-w-[375px]', 'border-x', 'border-slate-800/40', 'shadow-2xl');
        } else if (currentView === 'tablet') {
            wrapper.classList.add('max-w-[768px]', 'border-x', 'border-slate-800/40', 'shadow-2xl');
        } else {
            wrapper.classList.add('max-w-full');
        }
    }
}

/**
 * Helper Utility functions that your Settings panel buttons can trigger directly
 */
function setGlobalTextScale(scaleString) {
    // Expected values: 'small', 'large', 'xlarge', 'xxlarge'
    localStorage.setItem('access_text_scale', scaleString);
    applyGlobalAccessibilityStateTokens();
}

function toggleGlobalContrastMode() {
    const current = localStorage.getItem('access_contrast_mode') === 'true';
    localStorage.setItem('access_contrast_mode', !current);
    applyGlobalAccessibilityStateTokens();
}

function setDeviceViewMode(viewString) {
    // Expected values: 'desktop', 'tablet', 'phone'
    localStorage.setItem('device_view', viewString);
    applyGlobalAccessibilityStateTokens();
}