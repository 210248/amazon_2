import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'mock_key');

// Safer global variable initialization for serverless contexts
if (!global.otpCache) {
    global.otpCache = new Map();
}

export default async function handler(req, res) {
    // Enable CORS headers so your frontend is never blocked
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    // Check if API key exists
    if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({ success: false, error: 'Email service missing environment variable configuration.' });
    }

    try {
        // Generate code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save to cache
        global.otpCache.set(email.trim().toLowerCase(), {
            token: verificationCode,
            expires: Date.now() + 10 * 60 * 1000
        });

        // Send email
        const result = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email.trim().toLowerCase(),
            subject: '🔒 Secure Academic Portal Verification Code',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 500px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #ff9900; margin-bottom: 4px;">Portal Verification Code</h2>
                    <p style="font-size: 14px; color: #555;">Use the security key below to finalize your registration profile setup:</p>
                    <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 16px; text-align: center; margin: 20px 0; border-radius: 6px;">
                        <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #0f172a;">${verificationCode}</span>
                    </div>
                    <hr style="border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 11px; color: #777;">Automated transmission from your AmazonPlacements Dashboard.</p>
                </div>
            `
        });

        if (result.error) {
            return res.status(400).json({ success: false, error: result.error.message || "Resend transmission error." });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        return res.status(500).json({ success: false, error: error.message || 'Internal distribution failure.' });
    }
}