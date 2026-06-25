// Toggle between Login and Signup fields on the main screen
function toggleAuthView(showSignup) {
    const errorBox = document.getElementById('login-error');
    if(errorBox) errorBox.classList.add('hidden');
    
    if (showSignup) {
        document.getElementById('signin-section').classList.add('hidden');
        document.getElementById('signup-section').classList.remove('hidden');
    } else {
        document.getElementById('signup-section').classList.add('hidden');
        document.getElementById('signin-section').classList.remove('hidden');
    }
}

// Step 1: Handle account registration + School Auth Code + Resend 2FA
async function handlePortalRegistration() {
    const name = document.getElementById('signup-name').value.trim();
    const role = document.getElementById('signup-role').value;
    const user = document.getElementById('signup-username').value.trim().toLowerCase(); // Email Address
    const pass = document.getElementById('signup-password').value.trim();
    
    // Target your school code input field from your signup form layout
    const schoolCodeField = document.getElementById('signup-school-code');
    const schoolCodeInput = schoolCodeField ? schoolCodeField.value.trim() : "";
    const errorBox = document.getElementById('login-error');

    // Basic Validation Check
    if (!name || !user || !pass || !schoolCodeInput) {
        errorBox.textContent = "Please fill in all registration fields, including your School Access Code.";
        errorBox.classList.remove('hidden');
        return;
    }

    // Validate the entering school code against admin's saved credentials
    const systemRequiredCode = localStorage.getItem('valid_school_auth_code') || "AMZN-TLEVEL"; 
    if (schoolCodeInput !== systemRequiredCode) {
        errorBox.textContent = "❌ Invalid School Access Code. Please consult your administrator.";
        errorBox.classList.remove('hidden');
        return;
    }

    // Generate a random 6-digit 2FA token
    const token2FA = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Temporarily save registration state and code for verification
    const tempProfile = { fullName: name, role: role, email: user, password: pass, code: token2FA };
    localStorage.setItem('pending_2fa_session', JSON.stringify(tempProfile));

    // Trigger the Resend backend API function to deliver the verification code
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: user, 
                name: name,
                pathway: `Your 2FA Verification Security Code is: ${token2FA}`
            }),
        });

        const result = await response.json();
        
        if (result.success) {
            // Prompt user for verification code immediately after successful dispatch
            verifyPortal2FACode(user);
        } else {
            alert("Email delivery failed: " + result.error);
        }
    } catch (error) {
        console.error("Failed to reach serverless email function:", error);
        alert("Could not connect to the registration service.");
    }
}

// Step 2: Verify the 2FA Code
function verifyPortal2FACode(username) {
    const userInputCode = prompt("🔒 A 6-digit verification code was sent to your email. Please enter it below to confirm your account:");
    
    if (userInputCode === null) {
        alert("Registration canceled.");
        localStorage.removeItem('pending_2fa_session');
        return;
    }

    const pendingData = localStorage.getItem('pending_2fa_session');
    if (!pendingData) {
        alert("Session timed out. Please register again.");
        return;
    }

    const parsedData = JSON.parse(pendingData);

    // Verify code match
    if (userInputCode.trim() === parsedData.code) {
        // Code matches! Clean up verification code and commit profile to storage
        const finalProfile = { 
            fullName: parsedData.fullName, 
            role: parsedData.role, 
            email: parsedData.email, 
            password: parsedData.password 
        };
        
        // Stored matching your profile layout syntax prefix ("user_email_")
        localStorage.setItem(`user_email_${username}`, JSON.stringify(finalProfile));
        localStorage.removeItem('pending_2fa_session');

        alert(`✨ 2FA Verified! Registered successfully as: ${parsedData.role}. You can now log in.`);
        toggleAuthView(false);
        document.getElementById('login-username').value = username;
    } else {
        alert("❌ Invalid verification code. Please check your spelling or try registering again.");
        localStorage.removeItem('pending_2fa_session');
    }
}

// Handle signing into an account
function handlePortalLoginVerification() {
    const userInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passInput = document.getElementById('login-password').value.trim();
    const errorBox = document.getElementById('login-error');

    // Default structural fallback account (Defaults to Student role)
    if (userInput === 'student' && passInput === 'password') {
        localStorage.setItem('activeSession', 'Alex Mercer');
        localStorage.setItem('activePathway', 'Digital Production (Student View)');
        window.location.href = './dashboard.html';
        return;
    }

    // Search local database profiles matching registration layout format
    const savedUser = localStorage.getItem(`user_email_${userInput}`);
    if (savedUser) {
        const parsedProfile = JSON.parse(savedUser);
        if (parsedProfile.password === passInput) {
            localStorage.setItem('activeSession', parsedProfile.fullName);
            localStorage.setItem('activePathway', `Portal Role: ${parsedProfile.role}`);
            window.location.href = './dashboard.html';
            return;
        }
    }

    // Handle invalid combinations
    errorBox.textContent = "Invalid tracking username or password combination.";
    errorBox.classList.remove('hidden');
}