import { createPool } from '@vercel/postgres';

const pool = createPool({ connectionString: process.env.POSTGRES_URL });

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { name, email, password, role, schoolCode } = req.body;

    try {
        // Validate the registration passcode
        const systemRequiredCode = "AMZN-TLEVEL"; 
        if (schoolCode !== systemRequiredCode) {
            return res.status(400).json({ success: false, error: 'Invalid School Authorization Code.' });
        }

        // Insert the student profile directly into your live Vercel table
        await pool.query(
            `INSERT INTO users (fullname, email, password, role) VALUES ($1, $2, $3, $4);`,
            [name, email, password, role]
        );

        return res.status(200).json({ success: true, message: 'User registered successfully!' });
    } catch (error) {
        if (error.code === '23505') { 
            return res.status(400).json({ success: false, error: 'This email is already registered.' });
        }
        return res.status(500).json({ success: false, error: error.message });
    }
}