export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { text } = req.body;

        // Example integration connecting directly to OpenAI's free moderation api layer
        const response = await fetch('https://api.openai.com/v1/moderations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` // Pulled securely from your Vercel Environment Settings
            },
            body: JSON.stringify({ input: text })
        });

        const data = await response.json();
        const results = data.results?.[0];

        if (results?.flagged) {
            return res.status(200).json({ 
                success: true, 
                flagged: true, 
                reason: "Automated analysis flagged this message as inappropriate or against portal guidelines." 
            });
        }

        return res.status(200).json({ success: true, flagged: false });

    } catch (error) {
        return res.status(500).json({ success: false, error: "Content scanning system failure." });
    }
}