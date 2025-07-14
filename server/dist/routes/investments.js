"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../services/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/', auth_1.authenticateToken, [
    (0, express_validator_1.body)('fundId').isInt({ min: 1 }),
    (0, express_validator_1.body)('type').isIn(['SIP', 'Lumpsum']),
    (0, express_validator_1.body)('amount').isFloat({ min: 0.01 }),
    (0, express_validator_1.body)('interval').optional().isIn(['daily', 'weekly', 'monthly'])
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
        }
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const { fundId, type, amount, interval } = req.body;
        const userId = req.user.userId;
        const fundResult = await (0, database_1.query)('SELECT id, is_active FROM funds WHERE id = $1', [fundId]);
        if (fundResult.rows.length === 0) {
            return res.status(404).json({ message: 'Fund not found' });
        }
        if (!fundResult.rows[0].is_active) {
            return res.status(400).json({ message: 'Fund is not active' });
        }
        if (type === 'SIP' && !interval) {
            return res.status(400).json({ message: 'Interval is required for SIP investments' });
        }
        let nextExecution = null;
        if (type === 'SIP') {
            const now = new Date();
            switch (interval) {
                case 'daily':
                    nextExecution = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                    break;
                case 'weekly':
                    nextExecution = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'monthly':
                    nextExecution = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                    break;
            }
        }
        const result = await (0, database_1.query)(`
      INSERT INTO investments (user_id, fund_id, type, amount, interval, next_execution)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, fundId, type, amount, interval || null, nextExecution]);
        const investment = result.rows[0];
        res.status(201).json({
            message: 'Investment created successfully',
            investment: {
                id: investment.id,
                userId: investment.user_id,
                fundId: investment.fund_id,
                type: investment.type,
                amount: parseFloat(investment.amount),
                interval: investment.interval,
                nextExecution: investment.next_execution,
                createdAt: investment.created_at
            }
        });
    }
    catch (error) {
        console.error('Error creating investment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const userId = req.user.userId;
        const result = await (0, database_1.query)(`
      SELECT 
        i.*,
        f.name as fund_name,
        f.description as fund_description,
        f.logo_url as fund_logo_url
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      WHERE i.user_id = $1
      ORDER BY i.created_at DESC
    `, [userId]);
        const investments = result.rows.map((inv) => ({
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
                logoUrl: inv.fund_logo_url
            }
        }));
        res.json(investments);
    }
    catch (error) {
        console.error('Error fetching investments:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const investmentId = parseInt(req.params.id || '');
        const userId = req.user.userId;
        if (isNaN(investmentId)) {
            return res.status(400).json({ message: 'Invalid investment ID' });
        }
        const result = await (0, database_1.query)(`
      SELECT 
        i.*,
        f.name as fund_name,
        f.description as fund_description,
        f.logo_url as fund_logo_url
      FROM investments i
      JOIN funds f ON i.fund_id = f.id
      WHERE i.id = $1 AND i.user_id = $2
    `, [investmentId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Investment not found' });
        }
        const inv = result.rows[0];
        res.json({
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
                logoUrl: inv.fund_logo_url
            }
        });
    }
    catch (error) {
        console.error('Error fetching investment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/:id/pause', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const investmentId = parseInt(req.params.id || '');
        const userId = req.user.userId;
        if (isNaN(investmentId)) {
            return res.status(400).json({ message: 'Invalid investment ID' });
        }
        const result = await (0, database_1.query)(`
      UPDATE investments 
      SET next_execution = NULL
      WHERE id = $1 AND user_id = $2 AND type = 'SIP'
      RETURNING *
    `, [investmentId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'SIP investment not found' });
        }
        res.json({ message: 'SIP paused successfully' });
    }
    catch (error) {
        console.error('Error pausing SIP:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/:id/resume', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const investmentId = parseInt(req.params.id || '');
        const userId = req.user.userId;
        if (isNaN(investmentId)) {
            return res.status(400).json({ message: 'Invalid investment ID' });
        }
        const invResult = await (0, database_1.query)('SELECT * FROM investments WHERE id = $1 AND user_id = $2 AND type = \'SIP\'', [investmentId, userId]);
        if (invResult.rows.length === 0) {
            return res.status(404).json({ message: 'SIP investment not found' });
        }
        const investment = invResult.rows[0];
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
        }
        const result = await (0, database_1.query)(`
      UPDATE investments 
      SET next_execution = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [nextExecution, investmentId, userId]);
        res.json({ message: 'SIP resumed successfully' });
    }
    catch (error) {
        console.error('Error resuming SIP:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const investmentId = parseInt(req.params.id || '');
        const userId = req.user.userId;
        if (isNaN(investmentId)) {
            return res.status(400).json({ message: 'Invalid investment ID' });
        }
        const result = await (0, database_1.query)('DELETE FROM investments WHERE id = $1 AND user_id = $2 RETURNING *', [investmentId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Investment not found' });
        }
        res.json({ message: 'Investment cancelled successfully' });
    }
    catch (error) {
        console.error('Error cancelling investment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=investments.js.map