"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
const web3_js_1 = require("@solana/web3.js");
const crypto = __importStar(require("crypto"));
const database_1 = require("../services/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const generateWallet = () => {
    const keypair = web3_js_1.Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const privateKeyBytes = keypair.secretKey;
    const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';
    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    const encrypted = cipher.update(Buffer.from(privateKeyBytes)) + cipher.final('hex');
    return {
        publicKey,
        encryptedPrivateKey: encrypted
    };
};
const generateToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET || 'default-secret', { expiresIn: '7d' });
};
router.post('/register', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 8 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
        }
        const { email, password } = req.body;
        const existingUser = await (0, database_1.query)('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        const wallet = generateWallet();
        const result = await (0, database_1.query)(`INSERT INTO users (email, password_hash, solana_wallet_pubkey, solana_wallet_encrypted_privkey) 
       VALUES ($1, $2, $3, $4) RETURNING id, email, solana_wallet_pubkey, created_at`, [email, passwordHash, wallet.publicKey, wallet.encryptedPrivateKey]);
        const user = result.rows[0];
        const token = generateToken(user.id);
        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                solanaWalletPubkey: user.solana_wallet_pubkey,
                createdAt: user.created_at
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
        }
        const { email, password } = req.body;
        const result = await (0, database_1.query)('SELECT id, email, password_hash, solana_wallet_pubkey, created_at FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const user = result.rows[0];
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const token = generateToken(user.id);
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                solanaWalletPubkey: user.solana_wallet_pubkey,
                createdAt: user.created_at
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/wallet-login', [
    (0, express_validator_1.body)('publicKey').notEmpty().isLength({ min: 32, max: 44 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Invalid wallet public key' });
        }
        const { publicKey } = req.body;
        let result = await (0, database_1.query)('SELECT id, email, solana_wallet_pubkey, created_at FROM users WHERE solana_wallet_pubkey = $1', [publicKey]);
        let user;
        if (result.rows.length === 0) {
            const insertResult = await (0, database_1.query)(`INSERT INTO users (solana_wallet_pubkey, solana_wallet_encrypted_privkey) 
         VALUES ($1, $2) RETURNING id, email, solana_wallet_pubkey, created_at`, [publicKey, '']);
            user = insertResult.rows[0];
        }
        else {
            user = result.rows[0];
        }
        const token = generateToken(user.id);
        res.json({
            message: 'Wallet login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                solanaWalletPubkey: user.solana_wallet_pubkey,
                createdAt: user.created_at
            }
        });
    }
    catch (error) {
        console.error('Wallet login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await (0, database_1.query)('SELECT id, email, solana_wallet_pubkey, created_at FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const user = result.rows[0];
        res.json({
            user: {
                id: user.id,
                email: user.email,
                solanaWalletPubkey: user.solana_wallet_pubkey,
                createdAt: user.created_at
            }
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/profile', auth_1.authenticateToken, [
    (0, express_validator_1.body)('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
        }
        const userId = req.user.userId;
        const { email } = req.body;
        if (email) {
            const existingUser = await (0, database_1.query)('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
            if (existingUser.rows.length > 0) {
                return res.status(400).json({ message: 'Email already taken' });
            }
            await (0, database_1.query)('UPDATE users SET email = $1 WHERE id = $2', [email, userId]);
        }
        const result = await (0, database_1.query)('SELECT id, email, solana_wallet_pubkey, created_at FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];
        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                email: user.email,
                solanaWalletPubkey: user.solana_wallet_pubkey,
                createdAt: user.created_at
            }
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map