import cron from 'node-cron';
import { query } from './database';

// Process SIP investments that are due
async function processSIPInvestments() {
  try {
    console.log('🔄 Processing due SIP investments...');
    
    // Get all SIP investments that are due for execution
    const result = await query(`
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
      } catch (error) {
        console.error(`❌ Error processing SIP ${investment.id}:`, error);
      }
    }

    console.log('✅ SIP processing completed');
  } catch (error) {
    console.error('❌ Error in SIP scheduler:', error);
  }
}

// Process individual SIP investment
async function processIndividualSIP(investment: any) {
  console.log(`🎯 Processing SIP ${investment.id} for user ${investment.user_id}`);

  // Calculate next execution date
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

  // Update next execution date
  await query(
    'UPDATE investments SET next_execution = $1 WHERE id = $2',
    [nextExecution, investment.id]
  );

  // Create trade replication record
  // In a real implementation, this would:
  // 1. Monitor the trader wallets for new transactions
  // 2. Replicate those transactions proportionally to the user's wallet
  // 3. Record the transaction details
  
  // For now, create a mock trade replication entry
  const mockTxSignature = generateMockTransactionSignature();
  
  await query(`
    INSERT INTO trade_replications (investment_id, tx_signature, status, amount)
    VALUES ($1, $2, 'completed', $3)
  `, [investment.id, mockTxSignature, investment.amount]);

  console.log(`✅ SIP ${investment.id} processed successfully. Next execution: ${nextExecution.toISOString()}`);
}

// Generate mock transaction signature for development
function generateMockTransactionSignature(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 88; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Process trade replications for active funds
async function monitorTraderWallets() {
  try {
    console.log('👀 Monitoring trader wallets for new transactions...');
    
    // Get all active funds with trader wallets
    const result = await query(`
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
      } catch (error) {
        console.error(`❌ Error monitoring fund ${fund.id}:`, error);
      }
    }

    console.log('✅ Trader wallet monitoring completed');
  } catch (error) {
    console.error('❌ Error in trader wallet monitor:', error);
  }
}

// Monitor individual fund's trader wallets
async function monitorFundTraderWallets(fund: any) {
  // In a real implementation, this would:
  // 1. Connect to Solana RPC
  // 2. Get recent transactions for each trader wallet
  // 3. Identify new trades since last check
  // 4. Replicate those trades to all investors proportionally
  // 5. Record the replicated transactions
  
  // For development, we'll create mock trade replications occasionally
  const shouldCreateMockTrade = Math.random() < 0.1; // 10% chance
  
  if (shouldCreateMockTrade) {
    console.log(`🎲 Creating mock trade for fund ${fund.name}`);
    
    // Get all active investments for this fund
    const investments = await query(`
      SELECT id, user_id, amount, type
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      WHERE f.id = $1 AND f.is_active = true
    `, [fund.id]);

    // Create mock trade replications for each investment
    for (const investment of investments.rows) {
      const mockTxSignature = generateMockTransactionSignature();
      const tradeAmount = parseFloat(investment.amount) * (Math.random() * 0.1); // 0-10% of investment amount
      
      await query(`
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

// Clean up old completed trade replications
async function cleanupOldTrades() {
  try {
    console.log('🧹 Cleaning up old trade replications...');
    
    // Delete trade replications older than 90 days
    const result = await query(`
      DELETE FROM trade_replications 
      WHERE executed_at < NOW() - INTERVAL '90 days'
      RETURNING id
    `);

    console.log(`🗑️ Cleaned up ${result.rows.length} old trade replication(s)`);
  } catch (error) {
    console.error('❌ Error cleaning up old trades:', error);
  }
}

// Start the SIP scheduler
export function startSIPScheduler() {
  console.log('🚀 Starting SIP scheduler...');

  // Process SIP investments every 5 minutes
  cron.schedule('*/5 * * * *', processSIPInvestments, {
    scheduled: true,
    timezone: 'UTC'
  });

  // Monitor trader wallets every 2 minutes
  cron.schedule('*/2 * * * *', monitorTraderWallets, {
    scheduled: true,
    timezone: 'UTC'
  });

  // Cleanup old trades daily at 2 AM UTC
  cron.schedule('0 2 * * *', cleanupOldTrades, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('✅ SIP scheduler started successfully');
  console.log('⏰ SIP processing: every 5 minutes');
  console.log('👀 Wallet monitoring: every 2 minutes');
  console.log('🧹 Cleanup: daily at 2 AM UTC');
}

// Stop the scheduler (for graceful shutdown)
export function stopSIPScheduler() {
  cron.destroy();
  console.log('⏹️ SIP scheduler stopped');
} 