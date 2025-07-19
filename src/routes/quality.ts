import express from 'express';
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: [], message: 'Quality control routes coming soon' });
});

export default router;