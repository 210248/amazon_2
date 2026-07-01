import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

const sql = neon(process.env.POSTGRES_URL);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        let { name, email, password, role } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email address is mandatory.' });
        }

        const finalName = name || 'Master Administrator';
        const finalPassword = password || 'supersecret';
        
        // 🔓 TEMPORARILY ALLOW IT STAFF REGISTRATION DIRECTLY
        let finalRole = role || 'IT Staff'; 

        // Cryptographic hashing (Matches your login system 1:1)
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(finalPassword, salt, 1000, 64, 'sha512').toString('hex');
        const securePasswordDbPayload = `${salt}:${hash}`;

        // Insert into the database using 'fullname'
        await sql(
            `INSERT INTO users (fullname, email, password, role) VALUES ($1, $2, $3, $4);`,
            [finalName.trim(), email.trim().toLowerCase(), securePasswordDbPayload, finalRole]
        );

        return res.status(200).json({ success: true, message: 'Admin registered successfully!' });

    } catch (error) {
        if (error.code === '23505') { 
            return res.status(400).json({ success: false, error: 'This email is already registered.' });
        }
        console.error("SECURE REGISTER BACKEND FAULT LOG:", error.message);
        return res.status(500).json({ success: false, error: 'An internal system registry exception occurred.' });
    }
}