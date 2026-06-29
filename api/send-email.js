import { Resend } from 'resend';

// Keep this exactly as process.env.RESEND_API_KEY. Do not paste your raw key here!
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, name, pathway } = req.body;

    // Security Check: Verify environment variable is readable
    if (!process.env.RESEND_API_KEY) {
        console.error("CRITICAL BACKEND ERROR: process.env.RESEND_API_KEY is undefined.");
        return res.status(500).json({ success: false, error: 'Email service configuration fault.' });
    }

    try {
        const result = await resend.emails.send({
            from: 'onboarding@resend.dev', 
            to: email.trim().toLowerCase(),
            subject: 'Welcome to your T-Level Work Experience Portal!',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #ff9900;">Hello ${name || 'Student'},</h2>
                    <p>Your account has been verified for the tracking portal.</p>
                    <p><strong>Status Update:</strong> ${pathway || 'Digital Production'}</p>
                    <hr style="border: none; border-top: 1px solid #eee;" />
                    <p style="font-size: 11px; color: #777;">This is an automated notification from your AmazonPlacements Dashboard.</p>
                </div>
            `
        });

        // --- NEW CRITICAL CHECK: Look into the response object payload ---
        if (result.error) {
            console.error("Resend API rejected delivery:", result.error);
            return res.status(400).json({ 
                success: false, 
                error: `Mail delivery rejected: ${result.error.message}` 
            });
        }

        return res.status(200).json({ success: true, id: result.data?.id });

    } catch (error) {
        // Information leak mitigation - log detailed logs server-side, mask from client
        console.error("CRITICAL EMAIL SYSTEM EXCEPTION:", error.message);
        return res.status(500).json({ success: false, error: 'An unexpected email dispatch failure occurred.' });
    }
}