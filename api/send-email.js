import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Maintain a global memory cache across serverless executions for checking tokens during signup
global.otpCache = global.otpCache || new Map();

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    if (!process.env.RESEND_API_KEY) {
        return res.status(500).json({ success: false, error: 'Email service configuration fault.' });
    }

    try {
        // 1. Generate a secure, random 6-digit verification code on the backend
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 2. Save it to the server cache linked to the email (expires in 10 minutes)
        global.otpCache.set(email.trim().toLowerCase(), {
            token: verificationCode,
            expires: Date.now() + 10 * 60 * 1000
        });

        // 3. Dispatch the email via Resend
        const result = await resend.emails.send({
            from: 'onboarding@resend.dev', 
            to: email.trim().toLowerCase(),
            subject: '🔒 Secure Academic Portal Verification Code',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 500px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #ff9900; margin-bottom: 4px;">Portal Verification Code</h2>
                    <p style="font-size: 14px; color: #555;">Hello, use the security key below to finalize your registration profile setup:</p>
                    
                    <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 16px; text-align: center; margin: 20px 0; border-radius: 6px;">
                        <span style="font-family: monospace; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #0f172a;">${verificationCode}</span>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 11px; color: #777;">This is an automated administrative transmission from your AmazonPlacements Dashboard.</p>
                </div>
            `
        });

        if (result.error) {
            console.error("Resend API Failure:", result.error);
            return res.status(400).json({ success: false, error: result.error.message });
        }

        return res.status(200).json({ success: true, id: result.data?.id });

    } catch (error) {
        console.error("EMAIL CRASH:", error.message);
        return res.status(500).json({ success: false, error: 'Internal distribution failure.' });
    }
}