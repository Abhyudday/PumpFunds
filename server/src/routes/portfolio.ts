import { Router, Request, Response } from 'express';
import { query } from '../utils/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get portfolio overview
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // Get user investments
    const investments = await query(`
      SELECT 
        i.*,
        f.name as fund_name,
        f.strategy as fund_strategy
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      WHERE i.user_id = $1 AND i.status IN ('active', 'paused')
    `, [userId]);

    // Calculate portfolio metrics
    const activeInvestments = investments.rows;
    const totalInvestments = activeInvestments.length;

    // Calculate total invested amount
    const totalInvested = investments.rows.reduce((sum: number, inv: any) => sum + parseFloat(inv.amount), 0);

    // Mock current value (in production, calculate from actual trade data)
    const currentValue = totalInvested * (1 + (Math.random() * 0.2 - 0.1)); // +/- 10% variation
    const totalROI = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

    // Get active SIPs
    const activeSIPs = investments.rows.filter((inv: any) => 
      inv.type === 'sip' && inv.status === 'active'
    ).length;

    // Mock performance data
    const monthlyReturns = Array.from({ length: 12 }, () => Math.random() * 20 - 10);

    return res.json({
      totalInvestments,
      totalInvested,
      currentValue,
      totalROI,
      activeSIPs,
      monthlyReturns,
      investments: activeInvestments
    });
  } catch (error) {
    console.error('Portfolio overview error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get trade history
router.get('/trades', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT 
        tr.*,
        f.name as fund_name,
        i.type as investment_type
      FROM trade_replications tr
      JOIN investments i ON tr.investment_id = i.id
      JOIN funds f ON tr.fund_id = f.id
      WHERE i.user_id = $1
      ORDER BY tr.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM trade_replications tr
      JOIN investments i ON tr.investment_id = i.id
      WHERE i.user_id = $1
    `, [userId]);

    const totalTrades = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalTrades / limit);

    return res.json({
      trades: result.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalTrades,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Trade history error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get performance analytics
router.get('/performance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    // Get user investments with trade data
    const result = await query(`
      SELECT 
        i.id,
        i.fund_id,
        i.amount,
        i.created_at,
        f.name as fund_name,
        COUNT(tr.id) as trade_count,
        COALESCE(SUM(tr.amount), 0) as total_trades_amount
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      LEFT JOIN trade_replications tr ON i.id = tr.investment_id
      WHERE i.user_id = $1
      GROUP BY i.id, f.id
      ORDER BY i.created_at DESC
    `, [userId]);

    // Generate mock performance data
    const performanceData = result.rows.map((investment: any) => ({
      investmentId: investment.id,
      fundName: investment.fund_name,
      investedAmount: parseFloat(investment.amount),
      currentValue: parseFloat(investment.amount) * (1 + Math.random() * 0.4 - 0.2),
      roi: (Math.random() * 40 - 20).toFixed(2),
      tradeCount: parseInt(investment.trade_count),
      totalTradesAmount: parseFloat(investment.total_trades_amount)
    }));

         // Calculate overall metrics
     const totalInvested = performanceData.reduce((sum: number, inv: any) => sum + inv.investedAmount, 0);
     const totalCurrentValue = performanceData.reduce((sum: number, inv: any) => sum + inv.currentValue, 0);
    const overallROI = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;

    return res.json({
      overallROI: overallROI.toFixed(2),
      totalInvested,
      totalCurrentValue,
      investments: performanceData
    });
  } catch (error) {
    console.error('Performance analytics error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get allocation breakdown
router.get('/allocation', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const result = await query(`
      SELECT 
        f.id,
        f.name as fund_name,
        f.strategy,
        SUM(i.amount) as total_invested,
        COUNT(i.id) as investment_count
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      WHERE i.user_id = $1 AND i.status IN ('active', 'paused')
      GROUP BY f.id
      ORDER BY total_invested DESC
    `, [userId]);

    const totalInvested = result.rows.reduce((sum: number, fund: any) => sum + parseFloat(fund.total_invested), 0);

    const allocation = result.rows.map((fund: any) => {
      const amount = parseFloat(fund.total_invested);
      return {
        fundId: fund.id,
        fundName: fund.fund_name,
        strategy: fund.strategy,
        amount,
        percentage: totalInvested > 0 ? ((amount / totalInvested) * 100).toFixed(1) : '0',
        investmentCount: parseInt(fund.investment_count)
      };
    });

    return res.json({
      totalInvested,
      allocation
    });
  } catch (error) {
    console.error('Allocation breakdown error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get upcoming SIP executions
router.get('/upcoming-sips', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const result = await query(`
      SELECT 
        i.id,
        i.amount,
        i.frequency,
        i.next_execution_date,
        f.name as fund_name,
        f.id as fund_id
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      WHERE i.user_id = $1 
        AND i.type = 'sip' 
        AND i.status = 'active'
        AND i.next_execution_date IS NOT NULL
      ORDER BY i.next_execution_date ASC
      LIMIT 10
    `, [userId]);

    return res.json({
      upcomingSIPs: result.rows
    });
  } catch (error) {
    console.error('Upcoming SIPs error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 