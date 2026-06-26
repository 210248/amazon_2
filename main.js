// =========================================================================
// 1. UNIVERSAL ACCESSIBILITY LOGIC (Runs immediately on every page load)
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    applySavedAccessibilitySettings();
});

function applySavedAccessibilitySettings() {
    // High Contrast Check
    const highContrastActive = localStorage.getItem('accessibility_high_contrast') === 'true';
    if (highContrastActive) {
        document.body.classList.add('high-contrast-mode');
    } else {
        document.body.classList.remove('high-contrast-mode');
    }

    // Large Font Check
    const largeFontActive = localStorage.getItem('accessibility_large_font') === 'true';
    if (largeFontActive) {
        document.body.classList.add('text-lg-custom');
    } else {
        document.body.classList.remove('text-lg-custom');
    }
}

// Global window functions so settings buttons anywhere can call them
window.toggleAccessibilityFeature = function(featureKey) {
    const isCurrentlyActive = localStorage.getItem(featureKey) === 'true';
    localStorage.setItem(featureKey, !isCurrentlyActive);
    applySavedAccessibilitySettings();
};


// =========================================================================
// 2. VISUAL LAYOUT & NAVIGATION INTERFACES
// =========================================================================

window.toggleAuthView = function(showSignup) {
    const errorBox = document.getElementById('login-error');
    if(errorBox) errorBox.classList.add('hidden');
    
    if (showSignup) {
        document.getElementById('signin-section').classList.add('hidden');
        document.getElementById('signup-section').classList.remove('hidden');
    } else {
        document.getElementById('signup-section').classList.add('hidden');
        document.getElementById('signin-section').classList.remove('hidden');
    }
};


// =========================================================================
// 3. ACCOUNT REGISTRATION FLOW (WITH RESEND EMAIL 2FA & POSTGRES)
// =========================================================================

window.handlePortalRegistration = async function() {
    const name = document.getElementById('signup-name').value.trim();
    const role = document.getElementById('signup-role').value;
    const user = document.getElementById('signup-username').value.trim().toLowerCase(); // Email Address
    const pass = document.getElementById('signup-password').value.trim();
    const schoolCodeField = document.getElementById('signup-school-code');
    const schoolCodeInput = schoolCodeField ? schoolCodeField.value.trim() : "";
    const errorBox = document.getElementById('login-error');

    if (!name || !user || !pass || !schoolCodeInput) {
        errorBox.textContent = "Please fill in all registration fields, including your School Access Code.";
        errorBox.classList.remove('hidden');
        return;
    }

    // Generate random 6-digit 2FA token
    const token2FA = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save state temporarily in cache until token matching completes
    const tempProfile = { fullName: name, role: role, email: user, password: pass, code: token2FA, schoolCode: schoolCodeInput };
    localStorage.setItem('pending_2fa_session', JSON.stringify(tempProfile));

    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: user, 
                name: name,
                pathway: `Your 2FA Verification Security Code is: ${token2FA}`
            }),
        });

        const result = await response.json();
        if (result.success) {
            verifyPortal2FACode(user);
        } else {
            errorBox.textContent = "Email dispatch failed: " + result.error;
            errorBox.classList.remove('hidden');
        }
    } catch (error) {
        console.error(error);
        errorBox.textContent = "Could not connect to the registration email service.";
        errorBox.classList.remove('hidden');
    }
};

async function verifyPortal2FACode(username) {
    const userInputCode = prompt("🔒 A 6-digit verification code was sent to your email. Please enter it below to confirm your account:");
    const errorBox = document.getElementById('login-error');
    
    if (userInputCode === null) {
        alert("Registration canceled.");
        localStorage.removeItem('pending_2fa_session');
        return;
    }

    const pendingData = localStorage.getItem('pending_2fa_session');
    if (!pendingData) {
        alert("Session expired. Please attempt registration again.");
        return;
    }

    const parsedData = JSON.parse(pendingData);

    if (userInputCode.trim() !== parsedData.code) {
        alert("❌ Invalid verification token string match. Registration aborted.");
        localStorage.removeItem('pending_2fa_session');
        return;
    }

    // Push payload down to live serverless database route
    try {
        const response = await fetch('/api/db-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name: parsedData.fullName, 
                role: parsedData.role, 
                email: parsedData.email, 
                password: parsedData.password, 
                schoolCode: parsedData.schoolCode 
            })
        });

        const result = await response.json();

        if (result.success) {
            localStorage.removeItem('pending_2fa_session');
            alert(`✨ Account committed successfully to cloud Postgres DB! You can now log in.`);
            toggleAuthView(false);
            document.getElementById('login-username').value = username;
        } else {
            errorBox.textContent = "Cloud DB Sync Error: " + result.error;
            errorBox.classList.remove('hidden');
            localStorage.removeItem('pending_2fa_session');
        }
    } catch (error) {
        console.error(error);
        errorBox.textContent = "Failed connecting profile setup down to data registry services.";
        errorBox.classList.remove('hidden');
    }
}


// =========================================================================
// 4. SECURE AUTHENTICATION LOGIN HANDLER
// =========================================================================

window.handlePortalLoginVerification = async function() {
    const userInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passInput = document.getElementById('login-password').value.trim();
    const errorBox = document.getElementById('login-error');

    if (!userInput || !passInput) {
        errorBox.textContent = "Please fill in all tracking credentials.";
        errorBox.classList.remove('hidden');
        return;
    }

    // Fallback account layout bypass
    if (userInput === 'student' && passInput === 'password') {
        localStorage.setItem('activeSession', 'Alex Mercer');
        localStorage.setItem('activePathway', 'Digital Production (Student View)');
        window.location.href = './dashboard.html';
        return;
    }

    try {
        const response = await fetch('/api/db-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userInput, password: passInput })
        });

        const result = await response.json();

        if (result.success) {
            localStorage.setItem('activeSession', result.name);
            localStorage.setItem('activePathway', `Portal Role: ${result.role}`);
            window.location.href = './dashboard.html';
        } else {
            errorBox.textContent = result.error;
            errorBox.classList.remove('hidden');
        }
    } catch (error) {
        console.error(error);
        errorBox.textContent = "Could not authenticate your access records with the database.";
        errorBox.classList.remove('hidden');
    }
};