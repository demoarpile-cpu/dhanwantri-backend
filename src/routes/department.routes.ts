import { Router } from 'express';
import * as departmentController from '../controllers/department.controller.js';
import { protect, restrictTo, ensureClinicContext } from '../middlewares/auth.js';

const router = Router();

router.use(protect);
router.use(ensureClinicContext);

router.get('/', departmentController.getDepartments);
router.post('/', restrictTo('ADMIN'), departmentController.createDepartment);
router.delete('/:id', restrictTo('ADMIN'), departmentController.deleteDepartment);
router.get('/notifications', departmentController.getNotifications);
router.get('/unread-count', departmentController.getUnreadCount);
router.patch('/notifications/:id', departmentController.updateNotificationStatus);

export default router;
