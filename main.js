// =========================================================================
// 1. UNIVERSAL ACCESSIBILITY LOGIC (Runs immediately on every page load)
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    applySavedAccessibilitySettings();
});

function applySavedAccessibilitySettings() {
    const highContrastActive = localStorage.getItem('accessibility_high_contrast') === 'true';
    if (highContrastActive) {
        document.body.classList.add('high-contrast-mode');
    } else {
        document.body.classList.remove('high-contrast-mode');
    }

    const largeFontActive = localStorage.getItem('accessibility_large_font') === 'true';
    if (largeFontActive) {
        document.body.classList.add('text-lg-custom');
    } else {
        document.body.classList.remove('text-lg-custom');
    }
}

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
    if (errorBox) errorBox.classList.add('hidden');
    
    if (showSignup) {
        window.location.href = './signup.html';
    } else {
        window.location.href = './index.html';
    }
};

// =========================================================================
// 3. ACCOUNT REGISTRATION FLOW (EMAIL-ONLY MINIMAL STEP WITH VERIFICATION)
// =========================================================================

window.handlePortalRegistration = async function() {
    const emailInput = document.getElementById('signup-username');
    const errorBox = document.getElementById('login-error');

    if (!emailInput || !emailInput.value.trim()) {
        if (errorBox) {
            errorBox.textContent = "Please enter a valid institutional email address.";
            errorBox.classList.remove('hidden');
        }
        return;
    }

    const userEmail = emailInput.value.trim().toLowerCase();
    
    // Generate an automated secure random 6-digit number string
    const token2FA = Math.floor(100000 + Math.random() * 900000).toString();

    // Prepare default structured data values for the database profile
    const temporaryProfile = {
        fullName: "Verified Student",
        role: "Student",
        email: sanitizeInputHTML(userEmail),
        password: "TemporaryPassword123!", // Standard initial placeholder pass
        code: token2FA,
        schoolCode: "TL-DEFAULT"
    };

    // Cache to state parameters
    localStorage.setItem('pending_2fa_session', JSON.stringify(temporaryProfile));

    try {
        if (errorBox) {
            errorBox.textContent = "Dispatching token to your email... Please wait.";
            errorBox.className = "mb-4 p-3 rounded-xl text-xs font-medium border bg-amber-50 border-amber-200 text-amber-800 block";
        }

        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userEmail,
                name: "T-Level Placement Candidate",
                verificationCode: token2FA
            }),
        });

        const result = await response.json();
        if (result.success) {
            if (errorBox) errorBox.classList.add('hidden');
            verifyPortal2FACode(userEmail);
        } else {
            if (errorBox) {
                errorBox.textContent = "Email dispatch failed: " + result.error;
                errorBox.className = "mb-4 p-3 rounded-xl text-xs font-medium border bg-red-50 border-red-200 text-red-800 block";
            }
        }
    } catch (error) {
        console.error(error);
        if (errorBox) {
            errorBox.textContent = "Could not connect to the registration email service.";
            errorBox.className = "mb-4 p-3 rounded-xl text-xs font-medium border bg-red-50 border-red-200 text-red-800 block";
        }
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

    // Push the clean, verified dataset down to the database route
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
            window.location.href = './index.html';
        } else {
            if (errorBox) {
                errorBox.textContent = "Cloud DB Sync Error: " + result.error;
                errorBox.classList.remove('hidden');
            }
            localStorage.removeItem('pending_2fa_session');
        }
    } catch (error) {
        console.error(error);
        if (errorBox) {
            errorBox.textContent = "Failed connecting profile setup down to data registry services.";
            errorBox.classList.remove('hidden');
        }
    }
}

// =========================================================================
// 4. SECURE AUTHENTICATION LOGIN HANDLER (WITH INBUILT TESTING BYPASS)
// =========================================================================

window.handlePortalLoginVerification = async function() {
    const usernameElement = document.getElementById('login-username') || document.getElementById('login-email');
    const passwordElement = document.getElementById('login-password');
    const errorBox = document.getElementById('login-error');

    if (!usernameElement || !passwordElement) return;

    const userInput = usernameElement.value.trim().toLowerCase();
    const passInput = passwordElement.value.trim();

    if (!userInput || !passInput) {
        if (errorBox) {
            errorBox.textContent = "Please fill in all tracking credentials.";
            errorBox.classList.remove('hidden');
        }
        return;
    }

    // -------------------------------------------------------------------------
    // 🔒 ABSOLUTE LOCAL BYPASS (No Database Call Allowed For This Account)
    // -------------------------------------------------------------------------
    if (userInput === 'admin@school.uk' && passInput === 'supersecret') {
        if (errorBox) errorBox.classList.add('hidden');
        
        // Populate the exact security credentials the admin.html Guard expects
        localStorage.setItem('activeSession', 'Master Administrator');
        localStorage.setItem('activePathway', 'Portal Role: IT Staff');
        localStorage.setItem('system_auth_checksum', 'sec_tok_0a4f6d'); 
        
        alert("✨ Logged in successfully via Master Admin Local Overrides!");
        window.location.href = './admin.html';
        return; // 🛑 CRITICAL: Stops the function here so the database is never called!
    }

    // -------------------------------------------------------------------------
    // 🌐 LIVE DATABASE FALLBACK (For regular users/students)
    // -------------------------------------------------------------------------
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
            
            if (result.role === 'Teacher') localStorage.setItem('system_auth_checksum', 'sec_tok_7d1e94');
            else if (result.role === 'IT Staff') localStorage.setItem('system_auth_checksum', 'sec_tok_0a4f6d');
            else if (result.role === 'Parent') localStorage.setItem('system_auth_checksum', 'sec_tok_3c5b8e');
            else localStorage.setItem('system_auth_checksum', 'sec_tok_8f92a1');

            if (result.role === 'IT Staff' || result.role === 'Teacher') {
                window.location.href = './admin.html';
            } else {
                window.location.href = './dashboard.html';
            }
        } else {
            if (errorBox) {
                errorBox.textContent = result.error;
                errorBox.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error(error);
        if (errorBox) {
            errorBox.textContent = "Could not authenticate your access records with the database.";
            errorBox.classList.remove('hidden');
        }
    }
};
// =========================================================================
// 5. SECURE FRONT-END INPUT PROTECTION UTILITIES (XSS DEFENSE)
// =========================================================================
window.sanitizeInputHTML = function(unsafeString) {
    if (!unsafeString || typeof unsafeString !== 'string') return unsafeString;
    return unsafeString
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
};