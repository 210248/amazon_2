import { createPool } from '@vercel/postgres';
import crypto from 'crypto';

const pool = createPool({ connectionString: process.env.POSTGRES_URL });

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Credentials cannot be blank.' });
        }

        // 1. QUERY RECORDS BY USER ID (EMAIL KEY) ONLY
        const { rows } = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email.trim().toLowerCase()]
        );

        // Account doesn't exist
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid email or password combination.' });
        }

        const user = rows[0];
        const dbStoredString = user.password; // This holds the "salt:hash" combo payload

        // 2. DECONSTRUCT STORED COMPOUND MATRIX DATA
        const parts = dbStoredString.split(':');
        if (parts.length !== 2) {
            return res.status(500).json({ success: false, error: 'Account integrity verification fault. Structure corrupted.' });
        }

        const [salt, originalHash] = parts;

        // 3. RE-HASH INCOMING GUESS
        const verificationHashGuess = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

        // 4. SECURE VERIFICATION EVALUATION
        if (verificationHashGuess === originalHash) {
            return res.status(200).json({ 
                success: true, 
                name: user.fullname, 
                role: user.role 
            });
        } else {
            return res.status(401).json({ success: false, error: 'Invalid email or password combination.' });
        }

    } catch (error) {
        // INFORMATION LEAK MITIGATION
        console.error("SECURE AUTH BACKEND FAULT LOG:", error.message);
        return res.status(500).json({ success: false, error: 'An internal authentication database connection fault occurred.' });
    }
}