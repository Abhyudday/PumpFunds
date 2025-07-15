import express from 'express';
import { query, initDatabase } from '../services/database';

const router = express.Router();

/**
 * HTTP DATABASE SETUP ENDPOINT
 * 
 * This endpoint can be called via HTTP to set up the entire database.
 * Visit: https://your-app.railway.app/setup/database
 * 
 * This is perfect for Railway deployment where terminal access might be limited.
 */

let setupInProgress = false;
let setupCompleted = false;

// Main database setup endpoint
router.get('/database', async (req, res) => {
  if (setupInProgress) {
    return res.status(429).json({
      status: 'setup_in_progress',
      message: 'Database setup is already running. Please wait...',
      hint: 'Refresh this page in 30 seconds'
    });
  }

  if (setupCompleted) {
    return res.status(200).json({
      status: 'already_completed',
      message: '✅ Database setup was already completed successfully!',
      next_steps: [
        'Your PumpFunds application is ready to use',
        'Visit /api/funds to see available funds',
        'Visit /health to check application status'
      ]
    });
  }

  setupInProgress = true;

  try {
    console.log('🚀 Starting HTTP Database Setup...');
    
    // Step 1: Test database connection
    await initDatabase();
    console.log('✅ Database connection established');

    // Step 2: Run migrations
    await runMigrations();
    
    // Step 3: Seed database
    await seedDatabase();
    
    // Step 4: Verify setup
    await verifySetup();

    setupCompleted = true;
    setupInProgress = false;

    console.log('🎉 HTTP Database Setup Complete!');

    return res.status(200).json({
      status: 'success',
      message: '🎉 Database setup completed successfully!',
      summary: {
        tables_created: ['users', 'funds', 'investments', 'trade_replications'],
        funds_available: 3,
        sample_funds: [
          'PumpFi Alpha Fund (DeFi Focus)',
          'Moonshot Legends (Conservative Growth)',
          'Degen Diamond Hands (Aggressive Growth)'
        ],
        test_user: 'test@pumpfunds.com',
        indexes_created: true
      },
      next_steps: [
        '✅ Your PumpFunds application is now ready!',
        '🌐 Visit /api/funds to see available funds',
        '💰 Start using the investment platform',
        '📊 Check /health for application status'
      ]
    });

  } catch (error) {
    setupInProgress = false;
    const err = error as Error;
    console.error('❌ HTTP Database Setup failed:', err.message);

    return res.status(500).json({
      status: 'error',
      message: 'Database setup failed',
      error: err.message,
      troubleshooting: [
        'Check if DATABASE_URL environment variable is set',
        'Verify Railway Postgres service is running',
        'Check Railway deployment logs for more details',
        'Try again in a few minutes'
      ]
    });
  }
});

// Status endpoint to check setup progress
router.get('/status', async (req, res) => {
  try {
    // Check if database is accessible
    const result = await query('SELECT 1 as test');
    
    // Check if tables exist
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    const tableNames = tables.rows.map((row: any) => row.table_name);
    const requiredTables = ['users', 'funds', 'investments', 'trade_replications'];
    const tablesExist = requiredTables.every(table => tableNames.includes(table));

    let fundsCount = 0;
    if (tablesExist) {
      try {
        const fundsResult = await query('SELECT COUNT(*) as count FROM funds');
        fundsCount = parseInt(fundsResult.rows[0].count);
      } catch (e) {
        // Ignore error if funds table doesn't have proper structure yet
      }
    }

    return res.json({
      database_connected: true,
      tables_exist: tablesExist,
      tables_found: tableNames,
      funds_available: fundsCount,
      setup_completed: setupCompleted,
      setup_in_progress: setupInProgress,
      needs_setup: !tablesExist || fundsCount === 0,
      setup_url: '/setup/database'
    });

  } catch (error) {
    return res.status(500).json({
      database_connected: false,
      error: 'Cannot connect to database',
      setup_completed: false,
      needs_setup: true
    });
  }
});

// Helper functions (same as railway-setup.ts but adapted for HTTP)
async function runMigrations() {
  console.log('📋 Running Database Migrations...');
  
  const migrations = [
    {
      name: 'create_users_table',
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE,
          password_hash TEXT,
          solana_wallet_pubkey TEXT UNIQUE NOT NULL,
          solana_wallet_encrypted_privkey TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'create_funds_table',
      sql: `
        CREATE TABLE IF NOT EXISTS funds (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          logo_url TEXT,
          trader_wallets TEXT[] DEFAULT '{}',
          strategy TEXT DEFAULT 'DeFi Focus',
          min_investment NUMERIC DEFAULT 100,
          max_investment NUMERIC,
          management_fee NUMERIC DEFAULT 2.0,
          performance_fee NUMERIC DEFAULT 20.0,
          trader_wallet TEXT,
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'create_investments_table',
      sql: `
        CREATE TABLE IF NOT EXISTS investments (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE CASCADE,
          fund_id INT REFERENCES funds(id) ON DELETE CASCADE,
          type TEXT CHECK (type IN ('SIP','sip','Lumpsum','lumpsum')) NOT NULL,
          amount NUMERIC NOT NULL,
          frequency TEXT CHECK (frequency IN ('daily','weekly','monthly')),
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
          next_execution_date TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    },
    {
      name: 'create_trade_replications_table',
      sql: `
        CREATE TABLE IF NOT EXISTS trade_replications (
          id SERIAL PRIMARY KEY,
          investment_id INT REFERENCES investments(id) ON DELETE CASCADE,
          fund_id INT REFERENCES funds(id) ON DELETE CASCADE,
          tx_signature TEXT NOT NULL,
          executed_at TIMESTAMPTZ DEFAULT NOW(),
          status TEXT CHECK (status IN ('pending','completed','failed')) DEFAULT 'pending',
          amount NUMERIC,
          token_address TEXT,
          trade_type TEXT CHECK (trade_type IN ('buy','sell')),
          type TEXT DEFAULT 'trade_replication'
        );
      `
    },
    {
      name: 'create_indexes',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(solana_wallet_pubkey);
        CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);
        CREATE INDEX IF NOT EXISTS idx_investments_fund ON investments(fund_id);
        CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
        CREATE INDEX IF NOT EXISTS idx_investments_frequency ON investments(frequency);
        CREATE INDEX IF NOT EXISTS idx_investments_next_execution ON investments(next_execution_date);
        CREATE INDEX IF NOT EXISTS idx_trade_replications_investment ON trade_replications(investment_id);
        CREATE INDEX IF NOT EXISTS idx_trade_replications_fund ON trade_replications(fund_id);
        CREATE INDEX IF NOT EXISTS idx_trade_replications_status ON trade_replications(status);
        CREATE INDEX IF NOT EXISTS idx_trade_replications_type ON trade_replications(type);
        CREATE INDEX IF NOT EXISTS idx_funds_status ON funds(status);
        CREATE INDEX IF NOT EXISTS idx_funds_trader_wallet ON funds(trader_wallet);
      `
    }
  ];

  for (const migration of migrations) {
    console.log(`📝 Running: ${migration.name}`);
    await query(migration.sql);
    console.log(`✅ Completed: ${migration.name}`);
  }
}

async function seedDatabase() {
  console.log('🌱 Seeding Database with Initial Data...');

  const funds = [
    {
      name: 'PumpFi Alpha Fund',
      description: 'High-growth memecoin investments managed by top DeFi traders',
      logo_url: 'https://via.placeholder.com/100x100/6366f1/ffffff?text=PA',
      trader_wallets: ['7yxJkUQ5wjGwRjSGfbxr8z3QvXVqFkJhTcE9WLpUm3rH', '3kzNBNxJq2YvC8UvLmPdKfTcQjWpHrGd6vS4E9XzFmR8'],
      strategy: 'DeFi Focus',
      trader_wallet: '7yxJkUQ5wjGwRjSGfbxr8z3QvXVqFkJhTcE9WLpUm3rH'
    },
    {
      name: 'Moonshot Legends',
      description: 'Conservative memecoin portfolio with proven track record',
      logo_url: 'https://via.placeholder.com/100x100/8b5cf6/ffffff?text=ML', 
      trader_wallets: ['9mKjL2pQrStYvWdFnE8xGtZcHfBq4aR6kTzNwMvXpL5u', 'BqR5ztPdNvMwKfJgHxQc7yW3Er9mL2nS6tXa8vUzKpFj'],
      strategy: 'Conservative Growth',
      trader_wallet: '9mKjL2pQrStYvWdFnE8xGtZcHfBq4aR6kTzNwMvXpL5u'
    },
    {
      name: 'Degen Diamond Hands',
      description: 'Aggressive memecoin strategy for maximum gains',
      logo_url: 'https://via.placeholder.com/100x100/10b981/ffffff?text=DD',
      trader_wallets: ['FkJhM4nRqStYvWdFnE8xGtZcHfBq4aR6kTzNwMvXpL5u', 'CpR8ztPdNvMwKfJgHxQc7yW3Er9mL2nS6tXa8vUzKpFj'],
      strategy: 'Aggressive Growth',
      trader_wallet: 'FkJhM4nRqStYvWdFnE8xGtZcHfBq4aR6kTzNwMvXpL5u'
    }
  ];

  for (const fund of funds) {
    await query(`
      INSERT INTO funds (name, description, logo_url, trader_wallets, strategy, trader_wallet, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        logo_url = EXCLUDED.logo_url,
        trader_wallets = EXCLUDED.trader_wallets,
        strategy = EXCLUDED.strategy,
        trader_wallet = EXCLUDED.trader_wallet
    `, [fund.name, fund.description, fund.logo_url, fund.trader_wallets, fund.strategy, fund.trader_wallet]);
  }

  // Create test user
  await query(`
    INSERT INTO users (email, password_hash, solana_wallet_pubkey, solana_wallet_encrypted_privkey)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO NOTHING
  `, [
    'test@pumpfunds.com',
    '$2a$10$rOFl1FXrgTUBCaNLXxKZfO.7VYnqvR/4LGdkOJJJKaT3KOK3KOK3K',
    'TestWallet123456789123456789123456789123456',
    'encrypted_test_private_key_placeholder'
  ]);
}

async function verifySetup() {
  console.log('🧪 Verifying Database Setup...');

  // Test fund queries
  const fundsResult = await query(`
    SELECT id, name, trader_wallet, status
    FROM funds 
    WHERE status = 'active' 
      AND trader_wallet IS NOT NULL 
      AND trader_wallet != ''
  `);

  if (fundsResult.rows.length === 0) {
    throw new Error('No active funds found after setup');
  }

  // Test trade replications
  const mockTxSignature = 'setup_test_' + Date.now();
  await query(`
    INSERT INTO trade_replications (investment_id, fund_id, amount, type, status, tx_signature, trade_type)
    VALUES (1, 1, 100, 'test', 'completed', $1, 'buy')
    ON CONFLICT DO NOTHING
  `, [mockTxSignature]);

  console.log('✅ Database verification completed');
}

export default router; 