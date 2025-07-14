import { query, initDatabase, closeDatabase } from '../services/database';

/**
 * RAILWAY COMPLETE DATABASE SETUP SCRIPT
 * 
 * This script sets up the entire database for Railway deployment:
 * 1. Runs initial migrations
 * 2. Applies schema fixes 
 * 3. Seeds with initial data
 * 4. Verifies everything works
 * 
 * Usage on Railway:
 * npm run railway:setup
 */

console.log('🚀 Starting Railway Database Setup...');
console.log('📝 This will set up your entire database for production use');

// Step 1: Run Migrations
async function runMigrations() {
  console.log('\n📋 Step 1: Running Database Migrations...');
  
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
          name TEXT NOT NULL,
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
    try {
      console.log(`   📝 Running: ${migration.name}`);
      await query(migration.sql);
      console.log(`   ✅ Completed: ${migration.name}`);
    } catch (error) {
      const err = error as Error;
      console.error(`   ❌ Failed: ${migration.name} - ${err.message}`);
      throw error;
    }
  }
}

// Step 2: Seed Initial Data
async function seedDatabase() {
  console.log('\n🌱 Step 2: Seeding Database with Initial Data...');

  // Sample fund data
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

  try {
    console.log('   📝 Inserting fund data...');
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
    console.log('   ✅ Fund data inserted successfully');

    // Create a test user
    console.log('   📝 Creating test user...');
    await query(`
      INSERT INTO users (email, password_hash, solana_wallet_pubkey, solana_wallet_encrypted_privkey)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, [
      'test@pumpfunds.com',
      '$2a$10$rOFl1FXrgTUBCaNLXxKZfO.7VYnqvR/4LGdkOJJJKaT3KOK3KOK3K', // "password123"
      'TestWallet123456789123456789123456789123456',
      'encrypted_test_private_key_placeholder'
    ]);
    console.log('   ✅ Test user created');

  } catch (error) {
    const err = error as Error;
    console.error(`   ❌ Seeding failed: ${err.message}`);
    throw error;
  }
}

// Step 3: Verify Everything Works
async function verifySetup() {
  console.log('\n🧪 Step 3: Verifying Database Setup...');

  try {
    // Test 1: Check fund queries
    console.log('   📝 Testing fund queries...');
    const fundsResult = await query(`
      SELECT id, name, trader_wallet, status
      FROM funds 
      WHERE status = 'active' 
        AND trader_wallet IS NOT NULL 
        AND trader_wallet != ''
    `);
    console.log(`   ✅ Found ${fundsResult.rows.length} active funds with trader wallets`);

    // Test 2: Check table structure
    console.log('   📝 Testing table structure...');
    const tables = ['users', 'funds', 'investments', 'trade_replications'];
    for (const table of tables) {
      const result = await query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_name = $1
      `, [table]);
      
      if (result.rows[0].count > 0) {
        console.log(`   ✅ Table '${table}' exists`);
      } else {
        throw new Error(`Table '${table}' missing`);
      }
    }

    // Test 3: Test trade replications insert
    console.log('   📝 Testing trade replications...');
    const mockTxSignature = 'setup_test_' + Date.now();
    await query(`
      INSERT INTO trade_replications (investment_id, fund_id, amount, type, status, tx_signature, trade_type)
      VALUES (1, 1, 100, 'test', 'completed', $1, 'buy')
      ON CONFLICT DO NOTHING
    `, [mockTxSignature]);
    console.log('   ✅ Trade replications table working');

    console.log('\n🎉 Database setup verification completed successfully!');
    
  } catch (error) {
    const err = error as Error;
    console.error(`   ❌ Verification failed: ${err.message}`);
    throw error;
  }
}

// Step 4: Display Summary
async function displaySummary() {
  console.log('\n📊 Setup Summary:');
  
  try {
    const fundsCount = await query('SELECT COUNT(*) as count FROM funds');
    const usersCount = await query('SELECT COUNT(*) as count FROM users');
    
    console.log(`   📋 Tables created: users, funds, investments, trade_replications`);
    console.log(`   💰 Funds available: ${fundsCount.rows[0].count}`);
    console.log(`   👥 Users created: ${usersCount.rows[0].count}`);
    console.log(`   🔧 All indexes created for performance`);
    console.log(`   ✅ Database ready for production use`);
    
  } catch (error) {
    console.log('   ⚠️  Could not fetch summary data');
  }
}

// Main setup function
async function setupRailwayDatabase() {
  try {
    await initDatabase();
    console.log('✅ Database connection established');
    
    await runMigrations();
    await seedDatabase();
    await verifySetup();
    await displaySummary();
    
    console.log('\n🚀 Railway Database Setup Complete!');
    console.log('🌐 Your PumpFunds application is ready to use');
    
  } catch (error) {
    const err = error as Error;
    console.error('\n❌ Setup failed:', err.message);
    console.error('💡 Check your DATABASE_URL and try again');
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupRailwayDatabase();
}

export { setupRailwayDatabase }; 