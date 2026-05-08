const express = require('express');
const router = express.Router();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');
const UserServiceCommitment = require('../models/UserServiceCommitment');
const sequelize = require('../database');
const authMiddleware = require('../middleware/authMiddleware');

// Obtenir toutes les catégories avec leurs items actifs (triés par display_order)
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
        separate: true,
        order: [['display_order', 'ASC']]
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
    // Déterminer le prochain display_order (max + 1)
    const maxOrder = await ServiceItem.max('display_order', { where: { category_id } });
    const newOrder = (maxOrder !== null ? maxOrder + 1 : 0);
    const item = await ServiceItem.create({
      category_id,
      name,
      is_active: true,
      display_order: newOrder
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

// Réordonner les items d'une catégorie (drag & drop)
router.post('/reorder', authMiddleware, async (req, res) => {
  const { category_id, item_ids } = req.body;
  if (!category_id || !item_ids || !Array.isArray(item_ids)) {
    return res.status(400).json({ error: 'category_id et item_ids (tableau) requis' });
  }
  const transaction = await sequelize.transaction();
  try {
    for (let i = 0; i < item_ids.length; i++) {
      await ServiceItem.update(
        { display_order: i },
        { where: { id: item_ids[i], category_id }, transaction }
      );
    }
    await transaction.commit();
    res.json({ message: 'Ordre mis à jour' });
  } catch (err) {
    await transaction.rollback();
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;