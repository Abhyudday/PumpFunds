import { Router } from 'express';
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import { generateSolanaWallet } from '../utils/wallet';
import { query } from '../utils/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Register with email and password
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate Solana wallet
    const wallet = generateSolanaWallet();

    // Create user
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
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Login with email and password
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req: Request, res: Response) => {
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
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Wallet login (login with just public key)
router.post('/wallet-login', [
  body('publicKey').notEmpty().isLength({ min: 32, max: 44 })
], async (req: Request, res: Response) => {
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
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
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
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        solanaWalletPubkey: user.solana_wallet_pubkey,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile
router.patch('/profile', authenticateToken, [
  body('email').optional().isEmail().normalizeEmail()
], async (req: Request, res: Response) => {
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
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 