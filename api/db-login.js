import { createPool } from '@vercel/postgres';

const pool = createPool({ connectionString: process.env.POSTGRES_URL });

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email, password } = req.body;

    try {
        const { rows } = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND password = $2',
            [email, password]
        );

        if (rows.length > 0) {
            const user = rows[0];
            return res.status(200).json({ 
                success: true, 
                name: user.fullname, 
                role: user.role 
            });
        } else {
            return res.status(401).json({ success: false, error: 'Invalid email or password combination.' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}