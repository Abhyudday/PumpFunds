import { Keypair } from '@solana/web3.js';
import * as crypto from 'crypto';

export interface WalletData {
  publicKey: string;
  encryptedPrivateKey: string;
}

export const generateSolanaWallet = (): WalletData => {
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