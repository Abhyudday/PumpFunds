"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const database_1 = require("../utils/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', async (req, res) => {
    try {
        const result = await (0, database_1.query)(`
      SELECT 
        f.*,
        COUNT(DISTINCT i.id) as investor_count,
        COALESCE(SUM(i.amount), 0) as total_invested
      FROM funds f
      LEFT JOIN investments i ON f.id = i.fund_id AND i.status = 'active'
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `);
        return res.json({ funds: result.rows });
    }
    catch (error) {
        console.error('Get funds error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const fundId = req.params.id;
        if (!fundId) {
            return res.status(400).json({ message: 'Fund ID is required' });
        }
        const fundIdNum = parseInt(fundId, 10);
        if (isNaN(fundIdNum)) {
            return res.status(400).json({ message: 'Invalid fund ID' });
        }
        const result = await (0, database_1.query)(`
      SELECT 
        f.*,
        COUNT(DISTINCT i.id) as investor_count,
        COALESCE(SUM(i.amount), 0) as total_invested
      FROM funds f
      LEFT JOIN investments i ON f.id = i.fund_id AND i.status = 'active'
      WHERE f.id = $1
      GROUP BY f.id
    `, [fundIdNum]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Fund not found' });
        }
        return res.json({ fund: result.rows[0] });
    }
    catch (error) {
        console.error('Get fund error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/', auth_1.authenticateToken, [
    (0, express_validator_1.body)('name').notEmpty().trim(),
    (0, express_validator_1.body)('description').notEmpty().trim(),
    (0, express_validator_1.body)('strategy').notEmpty().trim(),
    (0, express_validator_1.body)('trader_wallet').notEmpty().trim(),
    (0, express_validator_1.body)('min_investment').isNumeric(),
    (0, express_validator_1.body)('max_investment').optional().isNumeric(),
    (0, express_validator_1.body)('management_fee').isNumeric(),
    (0, express_validator_1.body)('performance_fee').isNumeric()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
        }
        const userId = req.user.userId;
        const userResult = await (0, database_1.query)('SELECT email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || !userResult.rows[0].email?.includes('admin')) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { name, description, strategy, trader_wallet, min_investment, max_investment, management_fee, performance_fee } = req.body;
        const result = await (0, database_1.query)(`
      INSERT INTO funds (
        name, description, strategy, trader_wallet, min_investment, 
        max_investment, management_fee, performance_fee, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
      RETURNING *
    `, [
            name, description, strategy, trader_wallet,
            parseFloat(min_investment), max_investment ? parseFloat(max_investment) : null,
            parseFloat(management_fee), parseFloat(performance_fee)
        ]);
        return res.status(201).json({
            message: 'Fund created successfully',
            fund: result.rows[0]
        });
    }
    catch (error) {
        console.error('Create fund error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.put('/:id', auth_1.authenticateToken, [
    (0, express_validator_1.body)('name').optional().notEmpty().trim(),
    (0, express_validator_1.body)('description').optional().notEmpty().trim(),
    (0, express_validator_1.body)('strategy').optional().notEmpty().trim(),
    (0, express_validator_1.body)('min_investment').optional().isNumeric(),
    (0, express_validator_1.body)('max_investment').optional().isNumeric(),
    (0, express_validator_1.body)('management_fee').optional().isNumeric(),
    (0, express_validator_1.body)('performance_fee').optional().isNumeric(),
    (0, express_validator_1.body)('status').optional().isIn(['active', 'paused', 'closed'])
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
        }
        const fundId = req.params.id;
        if (!fundId) {
            return res.status(400).json({ message: 'Fund ID is required' });
        }
        const fundIdNum = parseInt(fundId, 10);
        if (isNaN(fundIdNum)) {
            return res.status(400).json({ message: 'Invalid fund ID' });
        }
        const userId = req.user.userId;
        const userResult = await (0, database_1.query)('SELECT email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || !userResult.rows[0].email?.includes('admin')) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;
        const allowedFields = [
            'name', 'description', 'strategy', 'min_investment',
            'max_investment', 'management_fee', 'performance_fee', 'status'
        ];
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateFields.push(`${field} = $${paramCount}`);
                updateValues.push(req.body[field]);
                paramCount++;
            }
        }
        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }
        updateValues.push(fundIdNum);
        const result = await (0, database_1.query)(`
      UPDATE funds 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `, updateValues);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Fund not found' });
        }
        return res.json({
            message: 'Fund updated successfully',
            fund: result.rows[0]
        });
    }
    catch (error) {
        console.error('Update fund error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const userResult = await (0, database_1.query)('SELECT email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0 || !userResult.rows[0].email?.includes('admin')) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const fundId = req.params.id;
        if (!fundId) {
            return res.status(400).json({ message: 'Fund ID is required' });
        }
        const fundIdNum = parseInt(fundId, 10);
        if (isNaN(fundIdNum)) {
            return res.status(400).json({ message: 'Invalid fund ID' });
        }
        const investmentCheck = await (0, database_1.query)('SELECT COUNT(*) as count FROM investments WHERE fund_id = $1 AND status = \'active\'', [fundIdNum]);
        if (parseInt(investmentCheck.rows[0].count) > 0) {
            return res.status(400).json({
                message: 'Cannot delete fund with active investments. Please close the fund instead.'
            });
        }
        const result = await (0, database_1.query)('DELETE FROM funds WHERE id = $1 RETURNING *', [fundIdNum]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Fund not found' });
        }
        return res.json({ message: 'Fund deleted successfully' });
    }
    catch (error) {
        console.error('Delete fund error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=funds.js.map