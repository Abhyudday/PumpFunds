"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSIPScheduler = startSIPScheduler;
exports.stopSIPScheduler = stopSIPScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = require("./database");
async function processSIPInvestments() {
    try {
        console.log('🔄 Processing due SIP investments...');
        const result = await (0, database_1.query)(`
      SELECT 
        i.*,
        f.name as fund_name,
        f.trader_wallets,
        u.solana_wallet_pubkey
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      JOIN users u ON i.user_id = u.id
      WHERE i.type = 'SIP'
        AND i.next_execution IS NOT NULL
        AND i.next_execution <= NOW()
        AND f.is_active = true
    `);
        if (result.rows.length === 0) {
            console.log('📭 No SIP investments due for execution');
            return;
        }
        console.log(`📊 Found ${result.rows.length} SIP investment(s) due for execution`);
        for (const investment of result.rows) {
            try {
                await processIndividualSIP(investment);
            }
            catch (error) {
                console.error(`❌ Error processing SIP ${investment.id}:`, error);
            }
        }
        console.log('✅ SIP processing completed');
    }
    catch (error) {
        console.error('❌ Error in SIP scheduler:', error);
    }
}
async function processIndividualSIP(investment) {
    console.log(`🎯 Processing SIP ${investment.id} for user ${investment.user_id}`);
    let nextExecution = null;
    const now = new Date();
    switch (investment.interval) {
        case 'daily':
            nextExecution = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
        case 'weekly':
            nextExecution = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
        case 'monthly':
            nextExecution = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
        default:
            console.error(`❌ Unknown interval: ${investment.interval}`);
            return;
    }
    await (0, database_1.query)('UPDATE investments SET next_execution = $1 WHERE id = $2', [nextExecution, investment.id]);
    const mockTxSignature = generateMockTransactionSignature();
    await (0, database_1.query)(`
    INSERT INTO trade_replications (investment_id, tx_signature, status, amount)
    VALUES ($1, $2, 'completed', $3)
  `, [investment.id, mockTxSignature, investment.amount]);
    console.log(`✅ SIP ${investment.id} processed successfully. Next execution: ${nextExecution.toISOString()}`);
}
function generateMockTransactionSignature() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 88; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
async function monitorTraderWallets() {
    try {
        console.log('👀 Monitoring trader wallets for new transactions...');
        const result = await (0, database_1.query)(`
      SELECT id, name, trader_wallets 
      FROM funds 
      WHERE is_active = true 
        AND trader_wallets IS NOT NULL 
        AND array_length(trader_wallets, 1) > 0
    `);
        console.log(`📊 Monitoring ${result.rows.length} active fund(s)`);
        for (const fund of result.rows) {
            try {
                await monitorFundTraderWallets(fund);
            }
            catch (error) {
                console.error(`❌ Error monitoring fund ${fund.id}:`, error);
            }
        }
        console.log('✅ Trader wallet monitoring completed');
    }
    catch (error) {
        console.error('❌ Error in trader wallet monitor:', error);
    }
}
async function monitorFundTraderWallets(fund) {
    const shouldCreateMockTrade = Math.random() < 0.1;
    if (shouldCreateMockTrade) {
        console.log(`🎲 Creating mock trade for fund ${fund.name}`);
        const investments = await (0, database_1.query)(`
      SELECT id, user_id, amount, type
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      WHERE f.id = $1 AND f.is_active = true
    `, [fund.id]);
        for (const investment of investments.rows) {
            const mockTxSignature = generateMockTransactionSignature();
            const tradeAmount = parseFloat(investment.amount) * (Math.random() * 0.1);
            await (0, database_1.query)(`
        INSERT INTO trade_replications (investment_id, tx_signature, status, amount, trade_type)
        VALUES ($1, $2, 'completed', $3, $4)
      `, [
                investment.id,
                mockTxSignature,
                tradeAmount,
                Math.random() > 0.5 ? 'buy' : 'sell'
            ]);
        }
        console.log(`✅ Created mock trade replications for ${investments.rows.length} investments`);
    }
}
async function cleanupOldTrades() {
    try {
        console.log('🧹 Cleaning up old trade replications...');
        const result = await (0, database_1.query)(`
      DELETE FROM trade_replications 
      WHERE executed_at < NOW() - INTERVAL '90 days'
      RETURNING id
    `);
        console.log(`🗑️ Cleaned up ${result.rows.length} old trade replication(s)`);
    }
    catch (error) {
        console.error('❌ Error cleaning up old trades:', error);
    }
}
function startSIPScheduler() {
    console.log('🚀 Starting SIP scheduler...');
    node_cron_1.default.schedule('*/5 * * * *', processSIPInvestments, {
        scheduled: true,
        timezone: 'UTC'
    });
    node_cron_1.default.schedule('*/2 * * * *', monitorTraderWallets, {
        scheduled: true,
        timezone: 'UTC'
    });
    node_cron_1.default.schedule('0 2 * * *', cleanupOldTrades, {
        scheduled: true,
        timezone: 'UTC'
    });
    console.log('✅ SIP scheduler started successfully');
    console.log('⏰ SIP processing: every 5 minutes');
    console.log('👀 Wallet monitoring: every 2 minutes');
    console.log('🧹 Cleanup: daily at 2 AM UTC');
}
function stopSIPScheduler() {
    node_cron_1.default.destroy();
    console.log('⏹️ SIP scheduler stopped');
}
//# sourceMappingURL=scheduler.js.map