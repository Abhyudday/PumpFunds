"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../utils/jwt");
const wallet_1 = require("../utils/wallet");
const database_1 = require("../utils/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/register', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 })
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
        const wallet = (0, wallet_1.generateSolanaWallet)();
        const result = await (0, database_1.query)(`INSERT INTO users (email, password_hash, solana_wallet_pubkey, solana_wallet_encrypted_privkey) 
       VALUES ($1, $2, $3, $4) RETURNING id, email, solana_wallet_pubkey, created_at`, [email, passwordHash, wallet.publicKey, wallet.encryptedPrivateKey]);
        const user = result.rows[0];
        const token = (0, jwt_1.generateToken)(user.id);
        return res.status(201).json({
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
        return res.status(500).json({ message: 'Internal server error' });
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
        const token = (0, jwt_1.generateToken)(user.id);
        return res.json({
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
        return res.status(500).json({ message: 'Internal server error' });
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
        const token = (0, jwt_1.generateToken)(user.id);
        return res.json({
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
        return res.status(500).json({ message: 'Internal server error' });
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
        return res.json({
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
        return res.status(500).json({ message: 'Internal server error' });
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
        return res.json({
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
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map