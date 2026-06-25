import { Resend } from 'resend';

// Initialize Resend with your hidden environment variable API key
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
    // Only allow POST requests (form submissions)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, name, pathway } = req.body;

    try {
        const data = await resend.emails.send({
            from: 'Placements Portal <onboarding@resend.dev>', // Free testing domain provided by Resend
            to: email,
            subject: ' Welcome to your T-Level Work Experience Portal!',
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #ff9900;">Hello ${name || 'Student'},</h2>
                    <p>Your account has been verified for the tracking portal.</p>
                    <p><strong>Selected Pathway:</strong> ${pathway || 'Digital Production'}</p>
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