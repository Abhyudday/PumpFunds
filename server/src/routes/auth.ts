import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { Keypair } from '@solana/web3.js';
import * as crypto from 'crypto';
import { query } from '../services/database';
import { authenticateToken, isAuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Helper function to generate and encrypt Solana wallet
const generateWallet = () => {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  
  // Encrypt private key (in production, use stronger encryption)
  const privateKeyBytes = keypair.secretKey;
  const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';
  const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
  const encrypted = cipher.update(Buffer.from(privateKeyBytes)) + cipher.final('hex');
  
  return {
    publicKey,
    encryptedPrivateKey: encrypted
  };
};

// Helper function to generate JWT token
const generateToken = (userId: number) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'default-secret',
    { expiresIn: '7d' }
  );
};

// Register with email and password
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate Solana wallet
    const wallet = generateWallet();

    // Insert user
    const result = await query(
      `INSERT INTO users (email, password_hash, solana_wallet_pubkey, solana_wallet_encrypted_privkey) 
       VALUES ($1, $2, $3, $4) RETURNING id, email, solana_wallet_pubkey, created_at`,
      [email, passwordHash, wallet.publicKey, wallet.encryptedPrivateKey]
    );

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
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login with email and password
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const result = await query(
      'SELECT id, email, password_hash, solana_wallet_pubkey, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Wallet login (login with just public key)
router.post('/wallet-login', [
  body('publicKey').notEmpty().isLength({ min: 32, max: 44 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid wallet public key' });
    }

    const { publicKey } = req.body;

    // Find or create user by wallet public key
    let result = await query(
      'SELECT id, email, solana_wallet_pubkey, created_at FROM users WHERE solana_wallet_pubkey = $1',
      [publicKey]
    );

    let user;
    if (result.rows.length === 0) {
      // Create new wallet-only user
      const insertResult = await query(
        `INSERT INTO users (solana_wallet_pubkey, solana_wallet_encrypted_privkey) 
         VALUES ($1, $2) RETURNING id, email, solana_wallet_pubkey, created_at`,
        [publicKey, ''] // Empty encrypted private key for external wallets
      );
      user = insertResult.rows[0];
    } else {
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
  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    const result = await query(
      'SELECT id, email, solana_wallet_pubkey, created_at FROM users WHERE id = $1',
      [userId]
    );

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
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile
router.patch('/profile', authenticateToken, [
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    }

    const userId = (req as any).user.userId;
    const { email } = req.body;

    if (email) {
      // Check if email is already taken
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'Email already taken' });
      }

      await query('UPDATE users SET email = $1 WHERE id = $2', [email, userId]);
    }

    // Get updated user info
    const result = await query(
      'SELECT id, email, solana_wallet_pubkey, created_at FROM users WHERE id = $1',
      [userId]
    );

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
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 