import { createPool } from '@vercel/postgres';
import crypto from 'crypto';

const pool = createPool({ connectionString: process.env.POSTGRES_URL });

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        let { name, email, password, role, schoolCode } = req.body;

        // 1. INPUT STALENESS VALIDATION
        if (!name || !email || !password || !schoolCode) {
            return res.status(400).json({ success: false, error: 'All fields are mandatory.' });
        }

        // 2. PRIVILEGE ESCALATION PREVENTION
        // Enforce strict allowlist matching on user-provided roles
        const allowedRoles = ['Student', 'Teacher', 'Parent'];
        if (!allowedRoles.includes(role)) {
            role = 'Student'; // Automatically override rogue roles to lowest clearance
        }

        // 3. ISOLATE ENVIRONMENT ACCESS CODE
        // Reads from Vercel variables, with a fallback if you haven't deployed yet
        const systemRequiredCode = process.env.SCHOOL_CODE || "AMZN-TLEVEL"; 
        if (schoolCode !== systemRequiredCode) {
            return res.status(403).json({ success: false, error: 'Invalid School Authorization Code.' });
        }

        // 4. SECURE REPOS-PASS CRYPTOGRAPHIC HASHING LAYER (PBKDF2)
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        
        // Combine them into a secure compound string string payload to be saved
        const securePasswordDbPayload = `${salt}:${hash}`;

        // 5. PARAMETERIZED INSERTION
        await pool.query(
            `INSERT INTO users (fullname, email, password, role) VALUES ($1, $2, $3, $4);`,
            [name.trim(), email.trim().toLowerCase(), securePasswordDbPayload, role]
        );

        return res.status(200).json({ success: true, message: 'User registered successfully!' });

    } catch (error) {
        // Unique index collision error for Postgres (email duplication)
        if (error.code === '23505') { 
            return res.status(400).json({ success: false, error: 'This email is already registered.' });
        }
        
        // INFORMATION LEAK MITIGATION
        console.error("SECURE REGISTER BACKEND FAULT LOG:", error.message);
        return res.status(500).json({ success: false, error: 'An internal system registry exception occurred.' });
    }
}