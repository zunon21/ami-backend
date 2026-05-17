const express = require('express');
const router = express.Router();
const Donation = require('../models/Donation');
const { v4: uuidv4 } = require('uuid');
const authMiddleware = require('../middleware/authMiddleware');
const paymentService = require('../services/payment.service');
const User = require('../models/User');

// ========== ROUTES PUBLIQUES (sans authentification) ==========
// Récupérer l'historique des dons (utilisé par le backoffice)
router.get('/', async (req, res) => {
    try {
        const donations = await Donation.findAll();
        res.json(donations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========== ROUTES PROTÉGÉES (authentification requise) ==========
router.use(authMiddleware);

// Route pour faire un don direct (simulation, paiement immédiatement réussi)
router.post('/', async (req, res) => {
    try {
        const { project_id, amount, is_anonymous, donation_type, description, payment_method, extra_data } = req.body;
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
            description: description || null,
            payment_method: payment_method || null,
            extra_data: extra_data || null
        });

        res.status(201).json(donation);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Route pour initier un don via JEKO (paiement réel)
router.post('/initiate', async (req, res) => {
    try {
        const { project_id, amount, is_anonymous, donation_type, paymentMethod, description, extra_data } = req.body;
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
            description: description || null,
            payment_method: paymentMethod || null,
            extra_data: extra_data || null
        });

        // Appeler le service JEKO pour initier le paiement, en lui passant la référence du don
        const paymentResult = await paymentService.initiatePayment({
            amount: amount,
            description: description || `Don pour projet ${project_id}`,
            customerPhone: user.phone,
            userId: user_id,
            paymentMethod: paymentMethod || 'wave',
            reference: transaction_reference  // <-- AJOUT ESSENTIEL
        });

        // Stocker l'ID de transaction JEKO dans extra_data
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
});

module.exports = router;