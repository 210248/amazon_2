import { Resend } from 'resend';

// Keep this exactly as process.env.RESEND_API_KEY. Do not paste your raw key here!
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, name, pathway } = req.body;

    try {
        const data = await resend.emails.send({
            // Force this layout string format to comply with Resend unverified domain safety guardrails
            from: 'onboarding@resend.dev', 
            to: email,
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

        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}