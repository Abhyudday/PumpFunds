import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../services/database';
import { authenticateToken, isAuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Create new investment (SIP or Lumpsum)
router.post('/', authenticateToken, [
  body('fundId').isInt({ min: 1 }),
  body('type').isIn(['SIP', 'Lumpsum']),
  body('amount').isFloat({ min: 0.01 }),
  body('interval').optional().isIn(['daily', 'weekly', 'monthly'])
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
    }

    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { fundId, type, amount, interval } = req.body;
    const userId = req.user.userId;

    // Validate fund exists and is active
    const fundResult = await query(
      'SELECT id, is_active FROM funds WHERE id = $1',
      [fundId]
    );

    if (fundResult.rows.length === 0) {
      return res.status(404).json({ message: 'Fund not found' });
    }

    if (!fundResult.rows[0].is_active) {
      return res.status(400).json({ message: 'Fund is not active' });
    }

    // Validate SIP requirements
    if (type === 'SIP' && !interval) {
      return res.status(400).json({ message: 'Interval is required for SIP investments' });
    }

    // Calculate next execution date for SIP
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

    // Insert investment
    const result = await query(`
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
  } catch (error) {
    console.error('Error creating investment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's investments
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user.userId;

    const result = await query(`
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

    const investments = result.rows.map((inv: any) => ({
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
  } catch (error) {
    console.error('Error fetching investments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get investment by ID
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const investmentId = parseInt(req.params.id || '');
    const userId = req.user.userId;

    if (isNaN(investmentId)) {
      return res.status(400).json({ message: 'Invalid investment ID' });
    }

    const result = await query(`
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
  } catch (error) {
    console.error('Error fetching investment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Pause SIP investment
router.patch('/:id/pause', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const investmentId = parseInt(req.params.id || '');
    const userId = req.user.userId;

    if (isNaN(investmentId)) {
      return res.status(400).json({ message: 'Invalid investment ID' });
    }

    const result = await query(`
      UPDATE investments 
      SET next_execution = NULL
      WHERE id = $1 AND user_id = $2 AND type = 'SIP'
      RETURNING *
    `, [investmentId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'SIP investment not found' });
    }

    res.json({ message: 'SIP paused successfully' });
  } catch (error) {
    console.error('Error pausing SIP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Resume SIP investment
router.patch('/:id/resume', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const investmentId = parseInt(req.params.id || '');
    const userId = req.user.userId;

    if (isNaN(investmentId)) {
      return res.status(400).json({ message: 'Invalid investment ID' });
    }

    // Get investment details
    const invResult = await query(
      'SELECT * FROM investments WHERE id = $1 AND user_id = $2 AND type = \'SIP\'',
      [investmentId, userId]
    );

    if (invResult.rows.length === 0) {
      return res.status(404).json({ message: 'SIP investment not found' });
    }

    const investment = invResult.rows[0];

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
    }

    const result = await query(`
      UPDATE investments 
      SET next_execution = $1
      WHERE id = $2 AND user_id = $3
      RETURNING *
    `, [nextExecution, investmentId, userId]);

    res.json({ message: 'SIP resumed successfully' });
  } catch (error) {
    console.error('Error resuming SIP:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Cancel investment
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isAuthenticatedRequest(req)) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const investmentId = parseInt(req.params.id || '');
    const userId = req.user.userId;

    if (isNaN(investmentId)) {
      return res.status(400).json({ message: 'Invalid investment ID' });
    }

    const result = await query(
      'DELETE FROM investments WHERE id = $1 AND user_id = $2 RETURNING *',
      [investmentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Investment not found' });
    }

    res.json({ message: 'Investment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling investment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 