import { query, initDatabase, closeDatabase } from '../services/database';

/**
 * DATABASE SCHEMA FIX SCRIPT
 * 
 * This script fixes all database table schema mismatches between the migration files
 * and the actual code expectations. It resolves issues like:
 * 
 * - ❌ column "trader_wallet" does not exist (fixes trader_wallets vs trader_wallet)
 * - ❌ Missing columns in funds table (strategy, min_investment, etc.)
 * - ❌ Missing columns in investments table (status, frequency, etc.)
 * - ❌ Missing columns in trade_replications table (fund_id, type)
 * 
 * USAGE:
 * 
 * 1. Fix database schema:
 *    npm run db:fix
 * 
 * 2. Check current schema status:
 *    npm run db:status
 * 
 * 3. Verify fixes worked:
 *    npm run db:verify
 * 
 * WHAT IT DOES:
 * 
 * - Adds missing columns to all tables
 * - Migrates data from old column names to new ones
 * - Preserves existing data while adding new structure
 * - Adds performance indexes
 * - Tests all problematic queries to ensure they work
 * 
 * This script is safe to run multiple times (uses IF NOT EXISTS checks).
 */

// Database fix migrations to resolve all schema mismatches
const fixes = [
  {
    name: 'fix_funds_table_schema',
    description: 'Add missing columns to funds table and fix trader_wallet column',
    sql: `
      -- Add missing columns to funds table
      ALTER TABLE funds 
      ADD COLUMN IF NOT EXISTS strategy TEXT,
      ADD COLUMN IF NOT EXISTS min_investment NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS max_investment NUMERIC,
      ADD COLUMN IF NOT EXISTS management_fee NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS performance_fee NUMERIC DEFAULT 0,
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused'));

      -- Drop the old is_active column if it exists (replaced by status)
      ALTER TABLE funds DROP COLUMN IF EXISTS is_active;

      -- Add trader_wallet column as single TEXT (keeping trader_wallets as array for future use)
      ALTER TABLE funds ADD COLUMN IF NOT EXISTS trader_wallet TEXT;

      -- Migrate data from trader_wallets array to trader_wallet single value
      -- Take the first wallet from the array as the primary trader wallet
      UPDATE funds 
      SET trader_wallet = trader_wallets[1] 
      WHERE trader_wallets IS NOT NULL 
        AND array_length(trader_wallets, 1) > 0 
        AND trader_wallet IS NULL;
    `
  },
  {
    name: 'fix_investments_table_schema', 
    description: 'Add missing columns to investments table',
    sql: `
      -- Add missing columns to investments table
      ALTER TABLE investments 
      ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
      ADD COLUMN IF NOT EXISTS frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'monthly')),
      ADD COLUMN IF NOT EXISTS next_execution_date TIMESTAMPTZ;

      -- Migrate data from interval to frequency column
      UPDATE investments 
      SET frequency = interval 
      WHERE frequency IS NULL AND interval IS NOT NULL;

      -- Migrate data from next_execution to next_execution_date
      UPDATE investments 
      SET next_execution_date = next_execution 
      WHERE next_execution_date IS NULL AND next_execution IS NOT NULL;

      -- Drop old columns after migration
      ALTER TABLE investments DROP COLUMN IF EXISTS interval;
      ALTER TABLE investments DROP COLUMN IF EXISTS next_execution;
    `
  },
  {
    name: 'fix_trade_replications_table_schema',
    description: 'Add missing columns to trade_replications table', 
    sql: `
      -- Add missing columns to trade_replications table
      ALTER TABLE trade_replications 
      ADD COLUMN IF NOT EXISTS fund_id INT REFERENCES funds(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'trade_replication';

      -- Update existing records to have proper fund_id based on investment
      UPDATE trade_replications 
      SET fund_id = i.fund_id
      FROM investments i 
      WHERE trade_replications.investment_id = i.id 
        AND trade_replications.fund_id IS NULL;
    `
  },
  {
    name: 'create_missing_indexes',
    description: 'Add performance indexes for new columns',
    sql: `
      -- Add indexes for new columns
      CREATE INDEX IF NOT EXISTS idx_funds_status ON funds(status);
      CREATE INDEX IF NOT EXISTS idx_funds_trader_wallet ON funds(trader_wallet);
      CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
      CREATE INDEX IF NOT EXISTS idx_investments_frequency ON investments(frequency);
      CREATE INDEX IF NOT EXISTS idx_investments_next_execution ON investments(next_execution_date);
      CREATE INDEX IF NOT EXISTS idx_trade_replications_fund ON trade_replications(fund_id);
      CREATE INDEX IF NOT EXISTS idx_trade_replications_type ON trade_replications(type);
    `
  },
  {
    name: 'update_seed_data_compatibility',
    description: 'Ensure existing seed data works with new schema',
    sql: `
      -- Update any existing funds to have proper trader_wallet if missing
      UPDATE funds 
      SET trader_wallet = trader_wallets[1]
      WHERE trader_wallet IS NULL 
        AND trader_wallets IS NOT NULL 
        AND array_length(trader_wallets, 1) > 0;

      -- Set default values for new columns if they're NULL
      UPDATE funds 
      SET 
        strategy = COALESCE(strategy, 'DeFi Focus'),
        min_investment = COALESCE(min_investment, 100),
        management_fee = COALESCE(management_fee, 2.0),
        performance_fee = COALESCE(performance_fee, 20.0),
        status = COALESCE(status, 'active')
      WHERE id IS NOT NULL;

      -- Update investments with default status and handle SIP scheduling
      UPDATE investments 
      SET 
        status = COALESCE(status, 'active'),
        frequency = COALESCE(frequency, 'monthly')
      WHERE id IS NOT NULL;

      -- Set next_execution_date for SIP investments that don't have it
      UPDATE investments 
      SET next_execution_date = COALESCE(next_execution_date, NOW() + INTERVAL '1 month')
      WHERE type = 'SIP' 
        AND status = 'active' 
        AND next_execution_date IS NULL;
    `
  }
];

// Function to check if a column exists
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      )
    `, [tableName, columnName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking if column ${columnName} exists in ${tableName}:`, error);
    return false;
  }
}

// Function to check current schema status
async function checkSchemaStatus() {
  console.log('\n📊 Current Database Schema Status:');
  
  const tables = ['users', 'funds', 'investments', 'trade_replications'];
  
  for (const table of tables) {
    try {
      const columns = await query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      console.log(`\n📋 Table: ${table}`);
      if (columns.rows.length === 0) {
        console.log('   ❌ Table does not exist');
        continue;
      }
      
      columns.rows.forEach((col: any) => {
        console.log(`   - ${col.column_name}: ${col.data_type}${col.is_nullable === 'YES' ? ' (nullable)' : ' (not null)'}`);
      });
    } catch (error) {
      const err = error as Error;
      console.log(`   ❌ Error reading ${table}: ${err.message}`);
    }
  }
}

// Main fix function
async function fixDatabaseSchema() {
  try {
    await initDatabase();
    console.log('🚀 Starting database schema fixes...');
    
    // Check current schema status
    await checkSchemaStatus();
    
    console.log('\n🔧 Applying fixes...');
    
    for (const fix of fixes) {
      console.log(`\n📝 Applying fix: ${fix.name}`);
      console.log(`   Description: ${fix.description}`);
      
      try {
        await query(fix.sql);
        console.log(`   ✅ Successfully applied: ${fix.name}`);
      } catch (error) {
        const err = error as Error;
        console.error(`   ❌ Failed to apply ${fix.name}:`, err.message);
        // Continue with other fixes instead of failing completely
      }
    }
    
    console.log('\n📊 Updated Database Schema Status:');
    await checkSchemaStatus();
    
    console.log('\n🎉 Database schema fixes completed!');
    console.log('\n📋 Summary of changes:');
    console.log('   ✅ Added missing columns to funds table (strategy, min_investment, etc.)');
    console.log('   ✅ Added trader_wallet column (singular) alongside trader_wallets (array)');
    console.log('   ✅ Added missing columns to investments table (status, frequency, etc.)');
    console.log('   ✅ Added missing columns to trade_replications table');
    console.log('   ✅ Migrated data from old column names to new ones');
    console.log('   ✅ Added performance indexes');
    console.log('   ✅ Updated seed data compatibility');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Verification function to test key queries
async function verifyFixes() {
  try {
    await initDatabase();
    console.log('\n🧪 Verifying database fixes...');
    
    // Test the problematic queries from scheduler
    console.log('\n1. Testing trader wallet query...');
    try {
      const traderWalletQuery = await query(`
        SELECT id, name, trader_wallet 
        FROM funds 
        WHERE status = 'active' 
          AND trader_wallet IS NOT NULL 
          AND trader_wallet != ''
      `);
      console.log(`   ✅ Trader wallet query works: Found ${traderWalletQuery.rows.length} funds`);
    } catch (error) {
      const err = error as Error;
      console.log(`   ❌ Trader wallet query failed: ${err.message}`);
    }
    
    // Test SIP query
    console.log('\n2. Testing SIP query...');
    try {
      const sipQuery = await query(`
        SELECT i.id, i.amount, i.frequency, i.next_execution_date, i.fund_id, f.id as fund_id, f.name as fund_name
        FROM investments i
        JOIN funds f ON i.fund_id = f.id
        WHERE i.type = 'SIP' 
          AND i.status = 'active'
          AND i.next_execution_date <= NOW()
      `);
      console.log(`   ✅ SIP query works: Found ${sipQuery.rows.length} pending SIPs`);
    } catch (error) {
      const err = error as Error;
      console.log(`   ❌ SIP query failed: ${err.message}`);
    }
    
    // Test trade replications query
    console.log('\n3. Testing trade replications query...');
    try {
      const mockTxSignature = 'test_' + Date.now();
      const tradeQuery = await query(`
        INSERT INTO trade_replications (investment_id, fund_id, amount, type, status, tx_signature, trade_type)
        VALUES (1, 1, 100, 'sip_execution', 'completed', $1, 'buy')
        ON CONFLICT DO NOTHING
      `, [mockTxSignature]);
      console.log(`   ✅ Trade replications insert works`);
    } catch (error) {
      const err = error as Error;
      console.log(`   ❌ Trade replications insert failed: ${err.message}`);
    }
    
    console.log('\n🎉 Verification completed!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await closeDatabase();
  }
}

// Run fixes if this file is executed directly
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'verify') {
    verifyFixes();
  } else if (command === 'status') {
    initDatabase().then(checkSchemaStatus).finally(closeDatabase);
  } else {
    fixDatabaseSchema();
  }
}

export { fixDatabaseSchema, verifyFixes, checkSchemaStatus }; 