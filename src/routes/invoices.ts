import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Invoices routes coming soon' });
});

export default router;