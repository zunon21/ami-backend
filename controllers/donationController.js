const Donation = require('../models/Donation');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const paymentService = require('../services/payment.service');

/**
 * Récupérer tous les dons (public)
 */
exports.getAllDonations = async (req, res) => {
  try {
    const donations = await Donation.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Créer un don direct (test, sans authentification)
 */
exports.createDirectDonation = async (req, res) => {
  try {
    const { project_id, amount, is_anonymous, donation_type, description, payment_method, extra_data, user_id } = req.body;
    const finalUserId = user_id || '00000000-0000-0000-0000-000000000001';

    if (!project_id || !amount) {
      return res.status(400).json({ error: 'project_id et amount sont requis' });
    }

    const transaction_reference = uuidv4();
    const donation = await Donation.create({
      user_id: finalUserId,
      project_id,
      amount,
      is_anonymous: is_anonymous || false,
      donation_type: donation_type || 'one_time',
      status: 'success',
      transaction_reference,
      description: description || null,
      payment_method: payment_method || null,
      extra_data: extra_data || null
    });

    res.status(201).json(donation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Initier un paiement JEKO (nécessite authentification)
 */
exports.initiateJekoPayment = async (req, res) => {
  try {
    const { project_id, amount, is_anonymous, donation_type, paymentMethod, description, extra_data } = req.body;
    const user_id = req.userId; // défini par authMiddleware

    if (!project_id || !amount) {
      return res.status(400).json({ error: 'project_id et amount sont requis' });
    }

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    if (!user.phone) {
      return res.status(400).json({ error: 'Numéro de téléphone manquant pour le paiement' });
    }

    const transaction_reference = uuidv4();
    const donation = await Donation.create({
      user_id,
      project_id,
      amount,
      is_anonymous: is_anonymous || false,
      donation_type: donation_type || 'one_time',
      status: 'pending',
      transaction_reference,
      description: description || null,
      payment_method: paymentMethod || null,
      extra_data: extra_data || null
    });

    const paymentResult = await paymentService.initiatePayment({
      amount,
      description: description || `Don pour projet ${project_id}`,
      customerPhone: user.phone,
      userId: user_id,
      paymentMethod: paymentMethod || 'wave',
      reference: transaction_reference
    });

    if (paymentResult.transactionReference) {
      const currentExtra = donation.extra_data || {};
      currentExtra.jeko_transaction_id = paymentResult.transactionReference;
      await donation.update({ extra_data: currentExtra });
    }

    res.json({
      checkout_url: paymentResult.checkoutUrl,
      transaction_reference: donation.transaction_reference,
      internal_reference: paymentResult.internalReference
    });
  } catch (error) {
    console.error('Erreur initiation paiement:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'initiation du paiement' });
  }
};

/**
 * Récupérer les dons d’un utilisateur spécifique (pour le backoffice)
 */
exports.getDonationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const donations = await Donation.findAll({
      where: { user_id: userId, status: 'success' },
      order: [['createdAt', 'DESC']]
    });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupérer les dons par catégorie (basé sur le champ description)
 * Exemple de catégorie : "Fonctionnement de l'AMI", "Missionnaire", "Champs", etc.
 */
exports.getDonationsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    let whereCondition = { status: 'success' };

    if (category === 'Fonctionnement de l\'AMI') {
      whereCondition.description = 'Fonctionnement de l\'AMI';
    } else if (category === 'Missionnaire') {
      whereCondition.description = { [Op.startsWith]: 'Missionnaire - ' };
    } else if (category === 'Structures et Organisations') {
      whereCondition.description = 'Structures et Organisations';
    } else {
      // Pour les catégories dynamiques (Champs, Projets, etc.)
      whereCondition.description = { [Op.startsWith]: `${category} - ` };
    }

    const donations = await Donation.findAll({
      where: whereCondition,
      order: [['createdAt', 'DESC']]
    });
    res.json(donations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};