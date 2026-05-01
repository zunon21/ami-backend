const express = require('express');
const router = express.Router();
const ServiceItem = require('../models/ServiceItem');
const UserServiceCommitment = require('../models/UserServiceCommitment');
const User = require('../models/User');
const ServiceCategory = require('../models/ServiceCategory');
const authMiddleware = require('../middleware/authMiddleware');

// Liste des items supprimés (archives)
router.get('/items', authMiddleware, async (req, res) => {
  try {
    const items = await ServiceItem.findAll({
      where: { is_active: false },
      include: [{ model: ServiceCategory, as: 'category', attributes: ['name'] }],
      order: [['deleted_at', 'DESC']],
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Engagements archivés pour un item donné
router.get('/commitments/:itemId', authMiddleware, async (req, res) => {
  try {
    const commitments = await UserServiceCommitment.findAll({
      where: { item_id: req.params.itemId, is_archived: true },
      include: [{ model: User, attributes: ['id', 'phone', 'full_name'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(commitments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;