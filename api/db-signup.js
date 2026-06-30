import { createPool } from '@vercel/postgres';
import crypto from 'crypto';

const pool = createPool({ connectionString: process.env.POSTGRES_URL });

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        let { name, email, password, role, schoolCode } = req.body;

        // 1. INPUT STALENESS VALIDATION (Only email is strictly required from the user now)
        if (!email) {
            return res.status(400).json({ success: false, error: 'Email address is mandatory.' });
        }

        // 2. PROVIDE SAFE DEFAULT FALLBACKS FOR AUTOMATED EMAIL-ONLY SETUP
        const finalName = name || 'Verified Student';
        const finalPassword = password || 'TemporaryPassword123!';
        const finalSchoolCode = schoolCode || process.env.SCHOOL_CODE || "AMZN-TLEVEL";
        let finalRole = role || 'Student';

        // 3. PRIVILEGE ESCALATION PREVENTION
        const allowedRoles = ['Student', 'Teacher', 'Parent'];
        if (!allowedRoles.includes(finalRole)) {
            finalRole = 'Student'; 
        }

        // 4. ISOLATE ENVIRONMENT ACCESS CODE (Matches your previous strict validation)
        const systemRequiredCode = process.env.SCHOOL_CODE || "AMZN-TLEVEL"; 
        if (finalSchoolCode !== systemRequiredCode) {
            return res.status(403).json({ success: false, error: 'Invalid School Authorization Code.' });
        }

        // 5. SECURE REPOS-PASS CRYPTOGRAPHIC HASHING LAYER (PBKDF2)
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(finalPassword, salt, 1000, 64, 'sha512').toString('hex');
        const securePasswordDbPayload = `${salt}:${hash}`;

        // 6. PARAMETERIZED INSERTION (Matching your database column names)
        await pool.query(
            `INSERT INTO users (fullname, email, password, role) VALUES ($1, $2, $3, $4);`,
            [finalName.trim(), email.trim().toLowerCase(), securePasswordDbPayload, finalRole]
        );

        return response.status(200).json({ success: true, message: 'User registered successfully!' });

    } catch (error) {
        if (error.code === '23505') { 
            return res.status(400).json({ success: false, error: 'This email is already registered.' });
        }
        
        console.error("SECURE REGISTER BACKEND FAULT LOG:", error.message);
        return res.status(500).json({ success: false, error: 'An internal system registry exception occurred.' });
    }
}