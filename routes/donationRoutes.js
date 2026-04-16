const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/authMiddleware');
const paymentService = require('../services/payment.service');
const User = require('../models/User'); // <-- AJOUT pour récupérer le nom

// Appliquer l'authentification à toutes les routes de dons
router.use(authMiddleware);

// Route pour faire un don direct (simulation, paiement immédiatement réussi)
router.post('/', async (req, res) => {
    try {
        const { project_id, amount, is_anonymous, donation_type } = req.body;
        const user_id = req.user.id;

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
            transaction_reference
        });

        res.status(201).json(donation);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// NOUVELLE ROUTE : Initier un don via Chariow (paiement réel)
router.post('/initiate', async (req, res) => {
    try {
        const { project_id, amount, is_anonymous, donation_type } = req.body;
        const user_id = req.user.id;

        if (!project_id || !amount) {
            return res.status(400).json({ error: 'project_id et amount sont requis' });
        }

        // Récupérer le nom complet de l'utilisateur depuis la base
        const user = await User.findByPk(user_id);
        const customerName = user ? user.full_name : 'Partenaire AMI';

        // Créer un don en attente de paiement
        const transaction_reference = uuidv4();
        const donation = await Donation.create({
            user_id,
            project_id,
            amount,
            is_anonymous: is_anonymous || false,
            donation_type: donation_type || 'one_time',
            status: 'pending',
            transaction_reference
        });

        // Demander l'URL de paiement au service Chariow
        const paymentResult = await paymentService.initiatePayment({
            amount,
            description: `Don pour projet ${project_id}`,
            customerName: customerName,
            projectId: project_id
        });

        if (!paymentResult.success) {
            throw new Error(paymentResult.error);
        }

        // Retourner l'URL de paiement à l'application mobile
        res.json({
            checkout_url: paymentResult.checkoutUrl,
            transaction_reference: donation.transaction_reference
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
});

// Récupérer l'historique des dons de l'utilisateur connecté
router.get('/', async (req, res) => {
    const donations = await Donation.findAll({ where: { user_id: req.user.id } });
    res.json(donations);
});

module.exports = router;