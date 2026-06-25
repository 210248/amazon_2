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

// Step 1: Handle account registration, School Code verification, and 2FA trigger
async function handlePortalRegistration() {
    const name = document.getElementById('signup-name').value.trim();
    const role = document.getElementById('signup-role').value;
    const user = document.getElementById('signup-username').value.trim().toLowerCase(); // Email Address
    const pass = document.getElementById('signup-password').value.trim();
    
    const schoolCodeField = document.getElementById('signup-school-code');
    const schoolCodeInput = schoolCodeField ? schoolCodeField.value.trim() : "";
    const errorBox = document.getElementById('login-error');

    // Basic Validation Check
    if (!name || !user || !pass || !schoolCodeInput) {
        errorBox.textContent = "Please fill in all registration fields, including your School Access Code.";
        errorBox.classList.remove('hidden');
        return;
    }

    // Generate a random 6-digit 2FA token
    const token2FA = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Temporarily save the registration state and token to combine with the database later
    const tempProfile = { fullName: name, role: role, email: user, password: pass, code: token2FA, schoolCode: schoolCodeInput };
    localStorage.setItem('pending_2fa_session', JSON.stringify(tempProfile));

    // Trigger the backend API function to deliver the verification code via Resend
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
            errorBox.textContent = "Email delivery failed: " + result.error;
            errorBox.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Failed to reach serverless email function:", error);
        errorBox.textContent = "Could not connect to the registration email service.";
        errorBox.classList.remove('hidden');
    }
}

// Step 2: Verify the 2FA Code and permanently commit to the Postgres DB
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
        alert("Session timed out. Please register again.");
        return;
    }

    const parsedData = JSON.parse(pendingData);

    // Verify 2FA code match locally first
    if (userInputCode.trim() !== parsedData.code) {
        alert("❌ Invalid verification code. Please check your spelling or try registering again.");
        localStorage.removeItem('pending_2fa_session');
        return;
    }

    // Code matches! Now post the verified parameters directly to your Postgres DB endpoint
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
            alert(`✨ 2FA Verified & Database Saved! Registered successfully as: ${parsedData.role}. You can now log in.`);
            toggleAuthView(false);
            document.getElementById('login-username').value = username;
        } else {
            errorBox.textContent = "Database Error: " + result.error;
            errorBox.classList.remove('hidden');
            localStorage.removeItem('pending_2fa_session');
        }
    } catch (error) {
        console.error("Database connection error during registration:", error);
        errorBox.textContent = "Could not connect to the database registry system.";
        errorBox.classList.remove('hidden');
    }
}

// Step 3: Handle signing into an account via Vercel Postgres
async function handlePortalLoginVerification() {
    const userInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passInput = document.getElementById('login-password').value.trim();
    const errorBox = document.getElementById('login-error');

    if (!userInput || !passInput) {
        errorBox.textContent = "Please enter both your email and password.";
        errorBox.classList.remove('hidden');
        return;
    }

    // Default static fallback structural credential check
    if (userInput === 'student' && passInput === 'password') {
        localStorage.setItem('activeSession', 'Alex Mercer');
        localStorage.setItem('activePathway', 'Digital Production (Student View)');
        window.location.href = './dashboard.html';
        return;
    }

    // Authenticate credentials against your live backend Postgres DB endpoint
    try {
        const response = await fetch('/api/db-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userInput, password: passInput })
        });

        const result = await response.json();

        if (result.success) {
            // Keep local temporary variables strictly for tracking active visual states on dashboards
            localStorage.setItem('activeSession', result.name);
            localStorage.setItem('activePathway', `Portal Role: ${result.role}`);
            window.location.href = './dashboard.html';
        } else {
            errorBox.textContent = result.error;
            errorBox.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Database authentication connection error:", error);
        errorBox.textContent = "Could not verify credentials with the database server.";
        errorBox.classList.remove('hidden');
    }
}