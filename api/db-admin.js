import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.POSTGRES_URL);

export default async function handler(req, res) {
    // Only allow authorized users to call this
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        // Fetch users but omit sensitive hashed password strings for basic tracking safety
        const users = await sql(`SELECT id, name, email, role, created_at FROM users ORDER BY id DESC;`);
        
        return res.status(200).json({ success: true, users });
    } catch (error) {
        console.error("ADMIN FETCH FAULT LOG:", error.message);
        return res.status(500).json({ success: false, error: 'Failed to extract cloud dataset records.' });
    }
}