import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../utils/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get all funds
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(`
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
  } catch (error) {
    console.error('Get funds error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single fund by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const fundId = req.params.id;
    if (!fundId) {
      return res.status(400).json({ message: 'Fund ID is required' });
    }
    
    const fundIdNum = parseInt(fundId, 10);
    if (isNaN(fundIdNum)) {
      return res.status(400).json({ message: 'Invalid fund ID' });
    }

    const result = await query(`
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
  } catch (error) {
    console.error('Get fund error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new fund (admin only)
router.post('/', authenticateToken, [
  body('name').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('strategy').notEmpty().trim(),
  body('trader_wallet').notEmpty().trim(),
  body('min_investment').isNumeric(),
  body('max_investment').optional().isNumeric(),
  body('management_fee').isNumeric(),
  body('performance_fee').isNumeric()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    }

    const userId = (req as any).user.userId;
    
    // Check if user is admin (simplified check - in production, use proper role system)
    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0 || !userResult.rows[0].email?.includes('admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const {
      name,
      description,
      strategy,
      trader_wallet,
      min_investment,
      max_investment,
      management_fee,
      performance_fee
    } = req.body;

    const result = await query(`
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
  } catch (error) {
    console.error('Create fund error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update fund (admin only)
router.put('/:id', authenticateToken, [
  body('name').optional().notEmpty().trim(),
  body('description').optional().notEmpty().trim(),
  body('strategy').optional().notEmpty().trim(),
  body('min_investment').optional().isNumeric(),
  body('max_investment').optional().isNumeric(),
  body('management_fee').optional().isNumeric(),
  body('performance_fee').optional().isNumeric(),
  body('status').optional().isIn(['active', 'paused', 'closed'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
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

    const userId = (req as any).user.userId;
    
    // Check if user is admin
    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
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
    
    const result = await query(`
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
  } catch (error) {
    console.error('Update fund error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete fund (admin only)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    // Check if user is admin
    const userResult = await query('SELECT email FROM users WHERE id = $1', [userId]);
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

    // Check if fund has active investments
    const investmentCheck = await query(
      'SELECT COUNT(*) as count FROM investments WHERE fund_id = $1 AND status = \'active\'',
      [fundIdNum]
    );

    if (parseInt(investmentCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete fund with active investments. Please close the fund instead.' 
      });
    }

    const result = await query('DELETE FROM funds WHERE id = $1 RETURNING *', [fundIdNum]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Fund not found' });
    }

    return res.json({ message: 'Fund deleted successfully' });
  } catch (error) {
    console.error('Delete fund error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 