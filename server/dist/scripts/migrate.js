"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const database_1 = require("../services/database");
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
        is_active BOOLEAN DEFAULT true,
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
        type TEXT CHECK (type IN ('SIP','Lumpsum')) NOT NULL,
        amount NUMERIC NOT NULL,
        interval TEXT CHECK (interval IN ('daily','weekly','monthly')),
        next_execution TIMESTAMPTZ,
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
        tx_signature TEXT NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW(),
        status TEXT CHECK (status IN ('pending','completed','failed')) DEFAULT 'pending',
        amount NUMERIC,
        token_address TEXT,
        trade_type TEXT CHECK (trade_type IN ('buy','sell'))
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
      CREATE INDEX IF NOT EXISTS idx_trade_replications_investment ON trade_replications(investment_id);
      CREATE INDEX IF NOT EXISTS idx_trade_replications_status ON trade_replications(status);
    `
    }
];
async function runMigrations() {
    try {
        await (0, database_1.initDatabase)();
        console.log('🚀 Starting database migrations...');
        for (const migration of migrations) {
            console.log(`📝 Running migration: ${migration.name}`);
            await (0, database_1.query)(migration.sql);
            console.log(`✅ Completed migration: ${migration.name}`);
        }
        console.log('🎉 All migrations completed successfully!');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
    finally {
        await (0, database_1.closeDatabase)();
    }
}
if (require.main === module) {
    runMigrations();
}
//# sourceMappingURL=migrate.js.map