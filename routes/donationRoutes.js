const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/authMiddleware');
const paymentService = require('../services/payment.service');
const User = require('../models/User');

// Appliquer l'authentification à toutes les routes de dons
router.use(authMiddleware);

// Route pour faire un don direct (simulation, paiement immédiatement réussi)
router.post('/', async (req, res) => {
    try {
        const { project_id, amount, is_anonymous, donation_type, description } = req.body;
        const user_id = req.userId;

        if (!project_id || !amount) {
            return res.status(400).json({ error: 'project_id et amount sont requis' });
        }

        const transaction_reference = uuidv4();

        const donation = await Donation.create({
            user_id,
            project_id,
            amount,
            is_anonymous: is_anonymous || false,
            donation_type: donation_type || 'one_time',
            status: 'success',
            transaction_reference,
            description: description || null
        });

        res.status(201).json(donation);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Route pour initier un don via JEKO (paiement réel)
router.post('/initiate', async (req, res) => {
    try {
        const { project_id, amount, is_anonymous, donation_type, paymentMethod, description } = req.body;
        const user_id = req.userId;

        if (!project_id || !amount) {
            return res.status(400).json({ error: 'project_id et amount sont requis' });
        }

        // Récupérer l'utilisateur depuis la base
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérifier que l'utilisateur a un numéro de téléphone
        if (!user.phone) {
            return res.status(400).json({ error: 'Numéro de téléphone manquant pour le paiement' });
        }

        // Créer un don en attente de paiement
        const transaction_reference = uuidv4();
        const donation = await Donation.create({
            user_id,
            project_id,
            amount,
            is_anonymous: is_anonymous || false,
            donation_type: donation_type || 'one_time',
            status: 'pending',
            transaction_reference,
            description: description || null
        });

        // Appeler le service JEKO pour initier le paiement
        const paymentResult = await paymentService.initiatePayment({
            amount: amount,
            description: description || `Don pour projet ${project_id}`,
            customerPhone: user.phone,
            userId: user_id,
            paymentMethod: paymentMethod || 'wave'
        });

        // Mettre à jour le don avec l'ID de transaction JEKO
        if (paymentResult.transactionReference) {
            await donation.update({ transaction_id: paymentResult.transactionReference });
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
});

// Récupérer l'historique des dons de l'utilisateur connecté
router.get('/', async (req, res) => {
    const donations = await Donation.findAll({ where: { user_id: req.userId } });
    res.json(donations);
});

module.exports = router;