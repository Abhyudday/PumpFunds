"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../utils/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const investments = await (0, database_1.query)(`
      SELECT 
        i.*,
        f.name as fund_name,
        f.strategy as fund_strategy
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      WHERE i.user_id = $1 AND i.status IN ('active', 'paused')
    `, [userId]);
        const activeInvestments = investments.rows;
        const totalInvestments = activeInvestments.length;
        const totalInvested = investments.rows.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        const currentValue = totalInvested * (1 + (Math.random() * 0.2 - 0.1));
        const totalROI = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;
        const activeSIPs = investments.rows.filter((inv) => inv.type === 'sip' && inv.status === 'active').length;
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
    }
    catch (error) {
        console.error('Portfolio overview error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/trades', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const result = await (0, database_1.query)(`
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
        const countResult = await (0, database_1.query)(`
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
    }
    catch (error) {
        console.error('Trade history error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/performance', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await (0, database_1.query)(`
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
        const performanceData = result.rows.map((investment) => ({
            investmentId: investment.id,
            fundName: investment.fund_name,
            investedAmount: parseFloat(investment.amount),
            currentValue: parseFloat(investment.amount) * (1 + Math.random() * 0.4 - 0.2),
            roi: (Math.random() * 40 - 20).toFixed(2),
            tradeCount: parseInt(investment.trade_count),
            totalTradesAmount: parseFloat(investment.total_trades_amount)
        }));
        const totalInvested = performanceData.reduce((sum, inv) => sum + inv.investedAmount, 0);
        const totalCurrentValue = performanceData.reduce((sum, inv) => sum + inv.currentValue, 0);
        const overallROI = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;
        return res.json({
            overallROI: overallROI.toFixed(2),
            totalInvested,
            totalCurrentValue,
            investments: performanceData
        });
    }
    catch (error) {
        console.error('Performance analytics error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/allocation', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await (0, database_1.query)(`
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
        const totalInvested = result.rows.reduce((sum, fund) => sum + parseFloat(fund.total_invested), 0);
        const allocation = result.rows.map((fund) => {
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
    }
    catch (error) {
        console.error('Allocation breakdown error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/upcoming-sips', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await (0, database_1.query)(`
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
    }
    catch (error) {
        console.error('Upcoming SIPs error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=portfolio.js.map