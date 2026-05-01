require('dotenv').config();

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const UserProfile = require('../models/UserProfile');
const UserCommitment = require('../models/UserCommitment');
const UserServiceCommitment = require('../models/UserServiceCommitment');
const Admin = require('../models/Admin');
const authMiddleware = require('../middleware/authMiddleware');

const otpStore = {};

// 1. Demander un code OTP (simulation – code renvoyé directement)
router.post('/request-otp', async (req, res) => {
    const { phone, full_name } = req.body;
    if (!phone) {
        return res.status(400).json({ error: 'Le numéro de téléphone est requis' });
    }

    let user = await User.findOne({ where: { phone } });
    if (!user) {
        user = await User.create({
            phone,
            full_name: null,
            is_verified: false
        });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 5 * 60000;
    otpStore[phone] = { code, expires, user_id: user.id };
    console.log(`🔐 Code OTP pour ${phone} : ${code}`);

    res.json({ message: 'Code OTP', code: code });
});

// 2. Vérifier le code OTP
router.post('/verify-otp', async (req, res) => {
    const { phone, code } = req.body;
    const stored = otpStore[phone];

    if (!stored || stored.code !== code || stored.expires < Date.now()) {
        return res.status(401).json({ error: 'Code invalide ou expiré' });
    }

    await User.update({ is_verified: true }, { where: { phone } });
    const user = await User.findOne({ where: { phone } });

    const token = jwt.sign(
        { id: user.id, phone: user.phone },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );

    delete otpStore[phone];

    const needsName = !user.full_name || user.full_name.trim() === '';

    res.json({
        token,
        user: {
            id: user.id,
            full_name: user.full_name,
            phone: user.phone
        },
        needs_name: needsName
    });
});

// 3. Mettre à jour le nom de l'utilisateur
router.put('/update-name', async (req, res) => {
    const { name } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        await User.update({ full_name: name }, { where: { id: userId } });
        res.json({ message: 'Nom mis à jour avec succès' });
    } catch (err) {
        res.status(401).json({ error: 'Token invalide' });
    }
});

// 4. Compléter le profil utilisateur
router.post('/complete-profile', async (req, res) => {
    const { first_name, gender, age, city, profession, church_org } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        await UserProfile.upsert({
            user_id: userId,
            first_name,
            gender,
            age,
            city,
            profession,
            church_org
        });

        res.json({ message: 'Profil complété avec succès' });
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: 'Token invalide' });
    }
});

// 5. Obtenir les informations de l'utilisateur connecté
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'full_name', 'phone', 'is_verified', 'createdAt']
        });
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Obtenir le profil utilisateur (prénom, etc.)
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const profile = await UserProfile.findOne({
            where: { user_id: req.user.id },
            attributes: ['first_name', 'gender', 'age', 'city', 'profession', 'church_org']
        });
        if (!profile) {
            return res.json({ first_name: null });
        }
        res.json(profile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Obtenir l'engagement mensuel de l'utilisateur
router.get('/commitment', authMiddleware, async (req, res) => {
    try {
        const commitment = await UserCommitment.findOne({ where: { user_id: req.user.id } });
        if (!commitment) {
            return res.status(404).json({ error: 'Aucun engagement trouvé' });
        }
        res.json(commitment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Créer ou mettre à jour l'engagement mensuel (avec périodicité)
router.post('/commitment', authMiddleware, async (req, res) => {
    const { amount, day_of_month, periodicity, reason } = req.body;
    if (!amount || !day_of_month) {
        return res.status(400).json({ error: 'Le montant et le jour sont requis' });
    }
    try {
        const [commitment, created] = await UserCommitment.upsert({
            user_id: req.user.id,
            amount,
            day_of_month,
            periodicity: periodicity || 'mensuel',
            reason: reason || null
        });
        res.json({ message: 'Engagement enregistré', commitment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. Login administrateur simplifié (mot de passe fixe)
router.post('/admin/login', async (req, res) => {
    const { password } = req.body;
    if (password === 'AMI1990') {
        const token = jwt.sign(
            { id: 'admin-fixed', role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        return res.json({ token, admin: { role: 'admin' } });
    }
    return res.status(401).json({ error: 'Mot de passe incorrect' });
});

// 10. Obtenir la liste des utilisateurs (pour le backoffice) avec les informations du profil
router.get('/users', authMiddleware, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'full_name', 'phone', 'is_verified', 'createdAt']
        });
        const usersWithProfiles = await Promise.all(users.map(async (user) => {
            const profile = await UserProfile.findOne({ where: { user_id: user.id } });
            return {
                ...user.toJSON(),
                UserProfile: profile ? profile.toJSON() : null
            };
        }));
        res.json(usersWithProfiles);
    } catch (err) {
        console.error('Erreur lors de la récupération des utilisateurs :', err);
        res.status(500).json({ error: err.message });
    }
});

// 11. Obtenir tous les engagements mensuels (pour le backoffice)
router.get('/commitments/all', authMiddleware, async (req, res) => {
    try {
        const commitments = await UserCommitment.findAll();
        const enriched = await Promise.all(commitments.map(async (c) => {
            const user = await User.findByPk(c.user_id, { attributes: ['id', 'full_name', 'phone'] });
            const profile = await UserProfile.findOne({ where: { user_id: c.user_id }, attributes: ['first_name'] });
            return {
                ...c.toJSON(),
                User: user ? user.toJSON() : null,
                UserProfile: profile ? profile.toJSON() : null
            };
        }));
        res.json(enriched);
    } catch (err) {
        console.error('Erreur récupération engagements :', err);
        res.status(500).json({ error: err.message });
    }
});

// 12. Obtenir tous les engagements de service de l'utilisateur connecté
router.get('/service-commitments', authMiddleware, async (req, res) => {
    try {
        const commitments = await UserServiceCommitment.findAll({ where: { user_id: req.user.id } });
        res.json(commitments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 13. Créer un engagement de service
router.post('/service-commitments', authMiddleware, async (req, res) => {
    const { service_name, item_name, amount, day_of_month, periodicity, reason } = req.body;
    if (!service_name || !item_name || !amount || !day_of_month) {
        return res.status(400).json({ error: 'Champs requis manquants' });
    }
    try {
        const commitment = await UserServiceCommitment.create({
            user_id: req.user.id,
            service_name,
            item_name,
            amount,
            day_of_month,
            periodicity: periodicity || 'mensuel',
            reason: reason || null
        });
        res.status(201).json(commitment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 14. Supprimer un engagement de service (de l'utilisateur)
router.delete('/service-commitments/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const commitment = await UserServiceCommitment.findOne({ where: { id, user_id: req.user.id } });
        if (!commitment) {
            return res.status(404).json({ error: 'Engagement non trouvé' });
        }
        await commitment.destroy();
        res.json({ message: 'Engagement supprimé' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 15. Modifier un engagement de service (PUT)
router.put('/service-commitments/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { amount, day_of_month, periodicity, item_name, reason } = req.body;

    try {
        const commitment = await UserServiceCommitment.findOne({
            where: { id, user_id: req.user.id }
        });

        if (!commitment) {
            return res.status(404).json({ error: 'Engagement non trouvé' });
        }

        const updateData = {};
        if (amount !== undefined) updateData.amount = amount;
        if (day_of_month !== undefined) updateData.day_of_month = day_of_month;
        if (periodicity) updateData.periodicity = periodicity;
        if (item_name) updateData.item_name = item_name;
        if (reason !== undefined) updateData.reason = reason;

        await commitment.update(updateData);

        res.json({ message: 'Engagement modifié', commitment });
    } catch (err) {
        console.error('Erreur modification engagement :', err);
        res.status(500).json({ error: err.message });
    }
});

// 16. Supprimer l'engagement mensuel de l'utilisateur (Fonctionnement de l'AMI)
router.delete('/commitment', authMiddleware, async (req, res) => {
    try {
        const commitment = await UserCommitment.findOne({ where: { user_id: req.user.id } });
        if (!commitment) {
            return res.status(404).json({ error: 'Aucun engagement trouvé' });
        }
        await commitment.destroy();
        res.json({ message: 'Engagement supprimé' });
    } catch (err) {
        console.error('Erreur suppression engagement :', err);
        res.status(500).json({ error: err.message });
    }
});

// 17. Récupérer tous les engagements de service (pour le backoffice admin)
router.get('/service-commitments/all', authMiddleware, async (req, res) => {
    try {
        const commitments = await UserServiceCommitment.findAll({
            include: [{ model: User, attributes: ['id', 'phone', 'full_name'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(commitments);
    } catch (err) {
        console.error('Erreur récupération engagements service :', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;