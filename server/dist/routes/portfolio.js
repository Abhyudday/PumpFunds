"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../services/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const userId = req.user.userId;
        const investmentsResult = await (0, database_1.query)(`
      SELECT 
        i.*,
        f.name as fund_name,
        f.description as fund_description,
        f.logo_url as fund_logo_url,
        f.is_active as fund_is_active
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      WHERE i.user_id = $1
      ORDER BY i.created_at DESC
    `, [userId]);
        const investments = investmentsResult.rows.map((inv) => ({
            id: inv.id,
            userId: inv.user_id,
            fundId: inv.fund_id,
            type: inv.type,
            amount: parseFloat(inv.amount),
            interval: inv.interval,
            nextExecution: inv.next_execution,
            createdAt: inv.created_at,
            fund: {
                id: inv.fund_id,
                name: inv.fund_name,
                description: inv.fund_description,
                logoUrl: inv.fund_logo_url,
                isActive: inv.fund_is_active
            }
        }));
        const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
        const currentValue = totalInvested * (1 + (Math.random() * 0.4 - 0.2));
        const totalReturns = currentValue - totalInvested;
        const returnsPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;
        const activeSIPs = investments.filter(inv => inv.type === 'SIP' && inv.nextExecution != null).length;
        const portfolio = {
            totalInvested,
            currentValue,
            totalReturns,
            returnsPercentage,
            activeSIPs,
            investments
        };
        res.json(portfolio);
    }
    catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/trades', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit || '50');
        const offset = parseInt(req.query.offset || '0');
        const result = await (0, database_1.query)(`
      SELECT 
        tr.*,
        i.type as investment_type,
        i.amount as investment_amount,
        f.name as fund_name,
        f.logo_url as fund_logo_url
      FROM trade_replications tr
      JOIN investments i ON tr.investment_id = i.id
      JOIN funds f ON i.fund_id = f.id
      WHERE i.user_id = $1
      ORDER BY tr.executed_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);
        const trades = result.rows.map((trade) => ({
            id: trade.id,
            investmentId: trade.investment_id,
            txSignature: trade.tx_signature,
            executedAt: trade.executed_at,
            status: trade.status,
            amount: trade.amount ? parseFloat(trade.amount) : null,
            tokenAddress: trade.token_address,
            tradeType: trade.trade_type,
            investment: {
                id: trade.investment_id,
                type: trade.investment_type,
                amount: parseFloat(trade.investment_amount),
                fund: {
                    name: trade.fund_name,
                    logoUrl: trade.fund_logo_url
                }
            }
        }));
        res.json(trades);
    }
    catch (error) {
        console.error('Error fetching trade history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/performance', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const userId = req.user.userId;
        const period = req.query.period || '30d';
        const performanceData = [];
        const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const baseValue = 100;
            const variance = Math.sin(i * 0.1) * 10 + Math.random() * 5;
            const value = baseValue + variance;
            performanceData.push({
                date: date.toISOString().split('T')[0],
                value: value.toFixed(2),
                returns: ((value - baseValue) / baseValue * 100).toFixed(2)
            });
        }
        res.json({
            period,
            data: performanceData
        });
    }
    catch (error) {
        console.error('Error fetching performance data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/allocation', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const userId = req.user.userId;
        const result = await (0, database_1.query)(`
      SELECT 
        f.id,
        f.name,
        f.logo_url,
        SUM(i.amount) as total_invested,
        COUNT(i.id) as investment_count
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      WHERE i.user_id = $1
      GROUP BY f.id, f.name, f.logo_url
      ORDER BY total_invested DESC
    `, [userId]);
        const totalInvested = result.rows.reduce((sum, item) => sum + parseFloat(item.total_invested), 0);
        const allocation = result.rows.map((item) => {
            const invested = parseFloat(item.total_invested);
            return {
                fundId: item.id,
                fundName: item.name,
                fundLogoUrl: item.logo_url,
                totalInvested: invested,
                investmentCount: parseInt(item.investment_count),
                percentage: totalInvested > 0 ? (invested / totalInvested * 100) : 0
            };
        });
        res.json({
            totalInvested,
            allocation
        });
    }
    catch (error) {
        console.error('Error fetching portfolio allocation:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/upcoming-sips', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const userId = req.user.userId;
        const result = await (0, database_1.query)(`
      SELECT 
        i.*,
        f.name as fund_name,
        f.logo_url as fund_logo_url
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      WHERE i.user_id = $1 
        AND i.type = 'SIP' 
        AND i.next_execution IS NOT NULL
        AND i.next_execution > NOW()
      ORDER BY i.next_execution ASC
      LIMIT 10
    `, [userId]);
        const upcomingSIPs = result.rows.map((sip) => ({
            id: sip.id,
            fundName: sip.fund_name,
            fundLogoUrl: sip.fund_logo_url,
            amount: parseFloat(sip.amount),
            interval: sip.interval,
            nextExecution: sip.next_execution
        }));
        res.json(upcomingSIPs);
    }
    catch (error) {
        console.error('Error fetching upcoming SIPs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=portfolio.js.map