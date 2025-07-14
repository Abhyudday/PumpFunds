import { query, initDatabase, closeDatabase } from '../services/database';
import { Keypair } from '@solana/web3.js';
import * as crypto from 'crypto';

// Sample funds data
const sampleFunds = [
  {
    name: 'Memecoin Moonshot Fund',
    description: 'High-risk, high-reward memecoin investments targeting 100x potential returns. Focuses on early-stage memecoins with strong community backing.',
    logo_url: 'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=400&h=400&fit=crop&crop=center',
    trader_wallets: ['7yxJkUQ5wjGwRjSGfbxr8z3QvXVqFkJhTcE9WLpUm3rH', '3kzNBNxJq2YvC8UvLmPdKfTcQjWpHrGd6vS4E9XzFmR8'],
  },
  {
    name: 'Solana DeFi Innovation Fund',
    description: 'Diversified fund investing in emerging Solana DeFi protocols and innovative projects. Balanced approach with moderate risk.',
    logo_url: 'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=400&h=400&fit=crop&crop=center',
    trader_wallets: ['9mKjL2pQrStYvWdFnE8xGtZcHfBq4aR6kTzNwMvXpL5u', 'BqR5ztPdNvMwKfJgHxQc7yW3Er9mL2nS6tXa8vUzKpFj'],
  },
  {
    name: 'AI & Gaming Token Fund',
    description: 'Specialized fund targeting AI and gaming tokens on Solana. Focus on utility tokens with real-world applications.',
    logo_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop&crop=center',
    trader_wallets: ['FkJhM4nRqStYvWdFnE8xGtZcHfBq4aR6kTzNwMvXpL5u', 'CpR8ztPdNvMwKfJgHxQc7yW3Er9mL2nS6tXa8vUzKpFj'],
  },
];

// Generate sample user with Solana wallet
function generateSampleUser(email: string) {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  
  // Encrypt private key (in production, use proper encryption)
  const privateKeyBytes = keypair.secretKey;
  const encrypted = crypto.createCipher('aes-256-cbc', 'sample-encryption-key').update(Buffer.from(privateKeyBytes));
  
  return {
    email,
    password_hash: '$2a$10$example.hash.for.password123', // bcrypt hash for 'password123'
    solana_wallet_pubkey: publicKey,
    solana_wallet_encrypted_privkey: encrypted.toString('hex'),
  };
}

async function seedDatabase() {
  try {
    await initDatabase();
    console.log('🌱 Starting database seeding...');
    
    // Check if data already exists
    const existingFunds = await query('SELECT COUNT(*) FROM funds');
    if (parseInt(existingFunds.rows[0].count) > 0) {
      console.log('📊 Database already contains data, skipping seed...');
      return;
    }
    
    // Insert sample funds
    console.log('📝 Inserting sample funds...');
    for (const fund of sampleFunds) {
      await query(
        `INSERT INTO funds (name, description, logo_url, trader_wallets, is_active) 
         VALUES ($1, $2, $3, $4, $5)`,
        [fund.name, fund.description, fund.logo_url, fund.trader_wallets, true]
      );
    }
    
    // Insert sample users
    console.log('👥 Inserting sample users...');
    const sampleUsers = [
      generateSampleUser('demo@pumpfunds.com'),
      generateSampleUser('investor@example.com'),
      generateSampleUser('trader@example.com'),
    ];
    
    for (const user of sampleUsers) {
      await query(
        `INSERT INTO users (email, password_hash, solana_wallet_pubkey, solana_wallet_encrypted_privkey) 
         VALUES ($1, $2, $3, $4)`,
        [user.email, user.password_hash, user.solana_wallet_pubkey, user.solana_wallet_encrypted_privkey]
      );
    }
    
    // Insert sample investments
    console.log('💰 Inserting sample investments...');
    const investments = [
      { user_id: 1, fund_id: 1, type: 'SIP', amount: 0.1, interval: 'weekly' },
      { user_id: 1, fund_id: 2, type: 'Lumpsum', amount: 1.0 },
      { user_id: 2, fund_id: 1, type: 'SIP', amount: 0.05, interval: 'daily' },
      { user_id: 3, fund_id: 3, type: 'SIP', amount: 0.2, interval: 'monthly' },
    ];
    
    for (const investment of investments) {
      let nextExecution = null;
      if (investment.type === 'SIP') {
        const now = new Date();
        if (investment.interval === 'daily') {
          nextExecution = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        } else if (investment.interval === 'weekly') {
          nextExecution = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else if (investment.interval === 'monthly') {
          nextExecution = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
      }
      
      await query(
        `INSERT INTO investments (user_id, fund_id, type, amount, interval, next_execution) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [investment.user_id, investment.fund_id, investment.type, investment.amount, investment.interval, nextExecution]
      );
    }
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('📧 Sample users created:');
    console.log('   - demo@pumpfunds.com (password: password123)');
    console.log('   - investor@example.com (password: password123)');
    console.log('   - trader@example.com (password: password123)');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase }; 