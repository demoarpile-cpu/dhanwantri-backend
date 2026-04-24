import { Router } from 'express';
import { getMenu } from '../controllers/menu.controller.js';
import { protect } from '../middlewares/auth.js';
const router = Router();
router.get('/:role', protect, getMenu);
router.get('/', protect, getMenu);
export default router;
