import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../services/database';
import { authenticateToken, isAuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Get all active funds
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(`
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

    const funds = result.rows.map((fund: any) => ({
      id: fund.id,
      name: fund.name,
      description: fund.description,
      logoUrl: fund.logo_url,
      traderWallets: fund.trader_wallets,
      isActive: fund.is_active,
      createdAt: fund.created_at,
      investorCount: parseInt(fund.investor_count),
      totalInvested: parseFloat(fund.total_invested),
      // TODO: Calculate actual ROI from transaction data
      roi7d: Math.random() * 20 - 10, // Mock data for now
      roi30d: Math.random() * 50 - 25 // Mock data for now
    }));

    res.json(funds);
  } catch (error) {
    console.error('Error fetching funds:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get fund by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const fundId = parseInt(req.params.id);
    
    if (isNaN(fundId)) {
      return res.status(400).json({ message: 'Invalid fund ID' });
    }

    const result = await query(`
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
      roi7d: Math.random() * 20 - 10, // Mock data
      roi30d: Math.random() * 50 - 25 // Mock data
    });
  } catch (error) {
    console.error('Error fetching fund:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new fund (admin only - simplified for now)
router.post('/', authenticateToken, [
  body('name').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('traderWallets').isArray().isLength({ min: 1 }),
  body('logoUrl').optional().isURL()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    }

    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { name, description, traderWallets, logoUrl } = req.body;

    // Insert new fund
    const result = await query(`
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
  } catch (error) {
    console.error('Error creating fund:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update fund (admin only)
router.patch('/:id', authenticateToken, [
  body('name').optional().notEmpty().trim(),
  body('description').optional().notEmpty().trim(),
  body('traderWallets').optional().isArray(),
  body('logoUrl').optional().isURL(),
  body('isActive').optional().isBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    }

    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const fundId = parseInt(req.params.id);
    if (isNaN(fundId)) {
      return res.status(400).json({ message: 'Invalid fund ID' });
    }

    const { name, description, traderWallets, logoUrl, isActive } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
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

    const result = await query(updateQuery, values);

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
  } catch (error) {
    console.error('Error updating fund:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete fund (admin only)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const fundId = parseInt(req.params.id);
    if (isNaN(fundId)) {
      return res.status(400).json({ message: 'Invalid fund ID' });
    }

    // Check if fund has active investments
    const investmentCheck = await query(
      'SELECT COUNT(*) as count FROM investments WHERE fund_id = $1',
      [fundId]
    );

    if (parseInt(investmentCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete fund with active investments. Deactivate instead.' 
      });
    }

    const result = await query('DELETE FROM funds WHERE id = $1 RETURNING *', [fundId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Fund not found' });
    }

    res.json({ message: 'Fund deleted successfully' });
  } catch (error) {
    console.error('Error deleting fund:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 