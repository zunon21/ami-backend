const express = require('express');
const router = express.Router();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');
const UserServiceCommitment = require('../models/UserServiceCommitment');
const sequelize = require('../database');
const authMiddleware = require('../middleware/authMiddleware');

// Obtenir toutes les catégories avec leurs items actifs
router.get('/categories', async (req, res) => {
  try {
    const categories = await ServiceCategory.findAll({
      where: { is_active: true },
      order: [['display_order', 'ASC']],
      include: [{
        model: ServiceItem,
        as: 'items',
        where: { is_active: true, deleted_at: null },
        required: false,
      }],
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter un item
router.post('/items', authMiddleware, async (req, res) => {
  try {
    const { category_id, name } = req.body;
    if (!category_id || !name) {
      return res.status(400).json({ error: 'category_id et name requis' });
    }
    const existing = await ServiceItem.findOne({
      where: { category_id, name, deleted_at: null }
    });
    if (existing) {
      return res.status(400).json({ error: 'Cet item existe déjà' });
    }
    const item = await ServiceItem.create({
      category_id,
      name,
      is_active: true
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modifier un item
router.put('/items/:id', authMiddleware, async (req, res) => {
  try {
    const item = await ServiceItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item non trouvé' });
    }
    await item.update({ name: req.body.name });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un item (soft delete + archive des engagements)
router.delete('/items/:id', authMiddleware, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const item = await ServiceItem.findByPk(req.params.id);
    if (!item) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Item non trouvé' });
    }
    await UserServiceCommitment.update(
      { is_archived: true },
      { where: { item_id: item.id }, transaction }
    );
    await item.update({
      is_active: false,
      deleted_at: new Date()
    }, { transaction });
    await transaction.commit();
    res.json({ message: 'Item supprimé et engagements archivés' });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;