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
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const database_1 = require("../services/database");
const web3_js_1 = require("@solana/web3.js");
const crypto = __importStar(require("crypto"));
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
function generateSampleUser(email) {
    const keypair = web3_js_1.Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const privateKeyBytes = keypair.secretKey;
    const encrypted = crypto.createCipher('aes-256-cbc', 'sample-encryption-key').update(Buffer.from(privateKeyBytes));
    return {
        email,
        password_hash: '$2a$10$example.hash.for.password123',
        solana_wallet_pubkey: publicKey,
        solana_wallet_encrypted_privkey: encrypted.toString('hex'),
    };
}
async function seedDatabase() {
    try {
        await (0, database_1.initDatabase)();
        console.log('🌱 Starting database seeding...');
        const existingFunds = await (0, database_1.query)('SELECT COUNT(*) FROM funds');
        if (parseInt(existingFunds.rows[0].count) > 0) {
            console.log('📊 Database already contains data, skipping seed...');
            return;
        }
        console.log('📝 Inserting sample funds...');
        for (const fund of sampleFunds) {
            await (0, database_1.query)(`INSERT INTO funds (name, description, logo_url, trader_wallets, is_active) 
         VALUES ($1, $2, $3, $4, $5)`, [fund.name, fund.description, fund.logo_url, fund.trader_wallets, true]);
        }
        console.log('👥 Inserting sample users...');
        const sampleUsers = [
            generateSampleUser('demo@pumpfunds.com'),
            generateSampleUser('investor@example.com'),
            generateSampleUser('trader@example.com'),
        ];
        for (const user of sampleUsers) {
            await (0, database_1.query)(`INSERT INTO users (email, password_hash, solana_wallet_pubkey, solana_wallet_encrypted_privkey) 
         VALUES ($1, $2, $3, $4)`, [user.email, user.password_hash, user.solana_wallet_pubkey, user.solana_wallet_encrypted_privkey]);
        }
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
                }
                else if (investment.interval === 'weekly') {
                    nextExecution = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                }
                else if (investment.interval === 'monthly') {
                    nextExecution = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                }
            }
            await (0, database_1.query)(`INSERT INTO investments (user_id, fund_id, type, amount, interval, next_execution) 
         VALUES ($1, $2, $3, $4, $5, $6)`, [investment.user_id, investment.fund_id, investment.type, investment.amount, investment.interval, nextExecution]);
        }
        console.log('🎉 Database seeding completed successfully!');
        console.log('📧 Sample users created:');
        console.log('   - demo@pumpfunds.com (password: password123)');
        console.log('   - investor@example.com (password: password123)');
        console.log('   - trader@example.com (password: password123)');
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
    finally {
        await (0, database_1.closeDatabase)();
    }
}
if (require.main === module) {
    seedDatabase();
}
//# sourceMappingURL=seed.js.map