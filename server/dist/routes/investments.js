"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_1 = require("../utils/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticateToken, [
    (0, express_validator_1.body)('fund_id').isInt({ min: 1 }),
    (0, express_validator_1.body)('amount').isFloat({ min: 0.01 }),
    (0, express_validator_1.body)('type').isIn(['sip', 'lumpsum']),
    (0, express_validator_1.body)('frequency').optional().isIn(['daily', 'weekly', 'monthly'])
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
        }
        const userId = req.user.userId;
        const { fund_id, amount, type, frequency } = req.body;
        const fundResult = await (0, database_1.query)('SELECT * FROM funds WHERE id = $1 AND status = \'active\'', [fund_id]);
        if (fundResult.rows.length === 0) {
            return res.status(404).json({ message: 'Active fund not found' });
        }
        const fund = fundResult.rows[0];
        if (amount < fund.min_investment) {
            return res.status(400).json({
                message: `Minimum investment is ${fund.min_investment}`
            });
        }
        if (fund.max_investment && amount > fund.max_investment) {
            return res.status(400).json({
                message: `Maximum investment is ${fund.max_investment}`
            });
        }
        if (type === 'sip' && !frequency) {
            return res.status(400).json({ message: 'Frequency is required for SIP investments' });
        }
        const result = await (0, database_1.query)(`
      INSERT INTO investments (
        user_id, fund_id, amount, type, frequency, status, next_execution_date
      ) VALUES ($1, $2, $3, $4, $5, 'active', $6)
      RETURNING *
    `, [
            userId,
            fund_id,
            amount,
            type,
            frequency || null,
            type === 'sip' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
        ]);
        if (type === 'lumpsum') {
            await (0, database_1.query)(`
        INSERT INTO trade_replications (
          investment_id, fund_id, amount, type, status
        ) VALUES ($1, $2, $3, 'investment', 'completed')
      `, [result.rows[0].id, fund_id, amount]);
        }
        return res.status(201).json({
            message: 'Investment created successfully',
            investment: result.rows[0]
        });
    }
    catch (error) {
        console.error('Create investment error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await (0, database_1.query)(`
      SELECT 
        i.*,
        f.name as fund_name,
        f.description as fund_description,
        COUNT(tr.id) as transaction_count,
        COALESCE(SUM(tr.amount), 0) as total_invested
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      LEFT JOIN trade_replications tr ON i.id = tr.investment_id
      WHERE i.user_id = $1
      GROUP BY i.id, f.id
      ORDER BY i.created_at DESC
    `, [userId]);
        return res.json({ investments: result.rows });
    }
    catch (error) {
        console.error('Get investments error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const investmentIdParam = req.params.id;
        if (!investmentIdParam) {
            return res.status(400).json({ message: 'Investment ID is required' });
        }
        const investmentId = parseInt(investmentIdParam);
        if (isNaN(investmentId)) {
            return res.status(400).json({ message: 'Invalid investment ID' });
        }
        const result = await (0, database_1.query)(`
      SELECT 
        i.*,
        f.name as fund_name,
        f.description as fund_description,
        f.strategy as fund_strategy
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      WHERE i.id = $1 AND i.user_id = $2
    `, [investmentId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Investment not found' });
        }
        const transactionResult = await (0, database_1.query)(`
      SELECT * FROM trade_replications 
      WHERE investment_id = $1 
      ORDER BY created_at DESC
    `, [investmentId]);
        return res.json({
            investment: result.rows[0],
            transactions: transactionResult.rows
        });
    }
    catch (error) {
        console.error('Get investment error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/:id/pause', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const investmentIdParam = req.params.id;
        if (!investmentIdParam) {
            return res.status(400).json({ message: 'Investment ID is required' });
        }
        const investmentId = parseInt(investmentIdParam);
        if (isNaN(investmentId)) {
            return res.status(400).json({ message: 'Invalid investment ID' });
        }
        const result = await (0, database_1.query)(`
      UPDATE investments 
      SET status = 'paused', updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND type = 'sip' AND status = 'active'
      RETURNING *
    `, [investmentId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Active SIP investment not found'
            });
        }
        return res.json({
            message: 'SIP investment paused successfully',
            investment: result.rows[0]
        });
    }
    catch (error) {
        console.error('Pause investment error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/:id/resume', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const investmentIdParam = req.params.id;
        if (!investmentIdParam) {
            return res.status(400).json({ message: 'Investment ID is required' });
        }
        const investmentId = parseInt(investmentIdParam);
        if (isNaN(investmentId)) {
            return res.status(400).json({ message: 'Invalid investment ID' });
        }
        const getNextExecutionDate = (frequency) => {
            const now = new Date();
            switch (frequency) {
                case 'daily':
                    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
                case 'weekly':
                    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                case 'monthly':
                    const nextMonth = new Date(now);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    return nextMonth;
                default:
                    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
            }
        };
        const investmentResult = await (0, database_1.query)('SELECT frequency FROM investments WHERE id = $1 AND user_id = $2 AND type = \'sip\'', [investmentId, userId]);
        if (investmentResult.rows.length === 0) {
            return res.status(404).json({ message: 'SIP investment not found' });
        }
        const nextExecutionDate = getNextExecutionDate(investmentResult.rows[0].frequency);
        const result = await (0, database_1.query)(`
      UPDATE investments 
      SET status = 'active', next_execution_date = $3, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND type = 'sip' AND status = 'paused'
      RETURNING *
    `, [investmentId, userId, nextExecutionDate]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Paused SIP investment not found'
            });
        }
        return res.json({
            message: 'SIP investment resumed successfully',
            investment: result.rows[0]
        });
    }
    catch (error) {
        console.error('Resume investment error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const investmentIdParam = req.params.id;
        if (!investmentIdParam) {
            return res.status(400).json({ message: 'Investment ID is required' });
        }
        const investmentId = parseInt(investmentIdParam);
        if (isNaN(investmentId)) {
            return res.status(400).json({ message: 'Invalid investment ID' });
        }
        const result = await (0, database_1.query)(`
      UPDATE investments 
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND status IN ('active', 'paused')
      RETURNING *
    `, [investmentId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Investment not found or already cancelled' });
        }
        return res.json({
            message: 'Investment cancelled successfully',
            investment: result.rows[0]
        });
    }
    catch (error) {
        console.error('Cancel investment error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=investments.js.map