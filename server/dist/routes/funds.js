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
router.get('/', async (req, res) => {
    try {
        const result = await (0, database_1.query)(`
      SELECT 
        f.*,
        COUNT(DISTINCT i.user_id) as investor_count,
        COALESCE(SUM(i.amount), 0) as total_invested
      FROM funds f
      LEFT JOIN investments i ON f.id = i.fund_id
      WHERE f.is_active = true
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `);
        const funds = result.rows.map((fund) => ({
            id: fund.id,
            name: fund.name,
            description: fund.description,
            logoUrl: fund.logo_url,
            traderWallets: fund.trader_wallets,
            isActive: fund.is_active,
            createdAt: fund.created_at,
            investorCount: parseInt(fund.investor_count),
            totalInvested: parseFloat(fund.total_invested),
            roi7d: Math.random() * 20 - 10,
            roi30d: Math.random() * 50 - 25
        }));
        res.json(funds);
    }
    catch (error) {
        console.error('Error fetching funds:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const fundId = parseInt(req.params.id);
        if (isNaN(fundId)) {
            return res.status(400).json({ message: 'Invalid fund ID' });
        }
        const result = await (0, database_1.query)(`
      SELECT 
        f.*,
        COUNT(DISTINCT i.user_id) as investor_count,
        COALESCE(SUM(i.amount), 0) as total_invested
      FROM funds f
      LEFT JOIN investments i ON f.id = i.fund_id
      WHERE f.id = $1
      GROUP BY f.id
    `, [fundId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Fund not found' });
        }
        const fund = result.rows[0];
        res.json({
            id: fund.id,
            name: fund.name,
            description: fund.description,
            logoUrl: fund.logo_url,
            traderWallets: fund.trader_wallets,
            isActive: fund.is_active,
            createdAt: fund.created_at,
            investorCount: parseInt(fund.investor_count),
            totalInvested: parseFloat(fund.total_invested),
            roi7d: Math.random() * 20 - 10,
            roi30d: Math.random() * 50 - 25
        });
    }
    catch (error) {
        console.error('Error fetching fund:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/', auth_1.authenticateToken, [
    (0, express_validator_1.body)('name').notEmpty().trim(),
    (0, express_validator_1.body)('description').notEmpty().trim(),
    (0, express_validator_1.body)('traderWallets').isArray().isLength({ min: 1 }),
    (0, express_validator_1.body)('logoUrl').optional().isURL()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
        }
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const { name, description, traderWallets, logoUrl } = req.body;
        const result = await (0, database_1.query)(`
      INSERT INTO funds (name, description, logo_url, trader_wallets, is_active)
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `, [name, description, logoUrl || null, traderWallets]);
        const fund = result.rows[0];
        res.status(201).json({
            message: 'Fund created successfully',
            fund: {
                id: fund.id,
                name: fund.name,
                description: fund.description,
                logoUrl: fund.logo_url,
                traderWallets: fund.trader_wallets,
                isActive: fund.is_active,
                createdAt: fund.created_at
            }
        });
    }
    catch (error) {
        console.error('Error creating fund:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/:id', auth_1.authenticateToken, [
    (0, express_validator_1.body)('name').optional().notEmpty().trim(),
    (0, express_validator_1.body)('description').optional().notEmpty().trim(),
    (0, express_validator_1.body)('traderWallets').optional().isArray(),
    (0, express_validator_1.body)('logoUrl').optional().isURL(),
    (0, express_validator_1.body)('isActive').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
        }
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const fundId = parseInt(req.params.id);
        if (isNaN(fundId)) {
            return res.status(400).json({ message: 'Invalid fund ID' });
        }
        const { name, description, traderWallets, logoUrl, isActive } = req.body;
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`);
            values.push(description);
        }
        if (traderWallets !== undefined) {
            updates.push(`trader_wallets = $${paramIndex++}`);
            values.push(traderWallets);
        }
        if (logoUrl !== undefined) {
            updates.push(`logo_url = $${paramIndex++}`);
            values.push(logoUrl);
        }
        if (isActive !== undefined) {
            updates.push(`is_active = $${paramIndex++}`);
            values.push(isActive);
        }
        if (updates.length === 0) {
            return res.status(400).json({ message: 'No updates provided' });
        }
        values.push(fundId);
        const updateQuery = `
      UPDATE funds 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
        const result = await (0, database_1.query)(updateQuery, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Fund not found' });
        }
        const fund = result.rows[0];
        res.json({
            message: 'Fund updated successfully',
            fund: {
                id: fund.id,
                name: fund.name,
                description: fund.description,
                logoUrl: fund.logo_url,
                traderWallets: fund.trader_wallets,
                isActive: fund.is_active,
                createdAt: fund.created_at
            }
        });
    }
    catch (error) {
        console.error('Error updating fund:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!(0, auth_1.isAuthenticatedRequest)(req)) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const fundId = parseInt(req.params.id);
        if (isNaN(fundId)) {
            return res.status(400).json({ message: 'Invalid fund ID' });
        }
        const investmentCheck = await (0, database_1.query)('SELECT COUNT(*) as count FROM investments WHERE fund_id = $1', [fundId]);
        if (parseInt(investmentCheck.rows[0].count) > 0) {
            return res.status(400).json({
                message: 'Cannot delete fund with active investments. Deactivate instead.'
            });
        }
        const result = await (0, database_1.query)('DELETE FROM funds WHERE id = $1 RETURNING *', [fundId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Fund not found' });
        }
        res.json({ message: 'Fund deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting fund:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=funds.js.map