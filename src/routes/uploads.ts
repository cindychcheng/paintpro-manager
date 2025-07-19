import express from 'express';
const router = express.Router();

router.post('/', (req, res) => {
  res.json({ success: true, message: 'File upload routes coming soon' });
});

export default router;