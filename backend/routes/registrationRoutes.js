import express from 'express';
import { registerForEvent, getRegistrations } from '../controllers/registrationController.js';

const router = express.Router();

router.post('/', registerForEvent);
router.get('/', getRegistrations);

export default router;
