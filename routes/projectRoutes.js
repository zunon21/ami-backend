const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const authMiddleware = require('../middleware/authMiddleware');

// Ajouter un projet (protégé par authentification)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, description, type, target_amount, image_url } = req.body;
        const project = await Project.create({
            name,
            description,
            type,
            target_amount,
            image_url,
            is_active: true
        });
        res.status(201).json(project);
    } catch (error) {
        console.error('Erreur POST projet :', error);
        res.status(400).json({ error: error.message });
    }
});

// Récupérer tous les projets actifs (public)
router.get('/', async (req, res) => {
    try {
        const projects = await Project.findAll({ where: { is_active: true } });
        res.json(projects);
    } catch (error) {
        console.error('Erreur GET projets :', error);
        res.status(500).json({ error: error.message });
    }
});

// Mettre à jour un projet (protégé)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, type, target_amount, image_url, is_active } = req.body;
        const project = await Project.findByPk(id);
        if (!project) {
            return res.status(404).json({ error: 'Projet non trouvé' });
        }
        await project.update({ name, description, type, target_amount, image_url, is_active });
        res.json(project);
    } catch (error) {
        console.error('Erreur PUT projet :', error);
        res.status(400).json({ error: error.message });
    }
});

// Supprimer un projet (protégé)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const project = await Project.findByPk(id);
        if (!project) {
            return res.status(404).json({ error: 'Projet non trouvé' });
        }
        await project.destroy();
        res.json({ message: 'Projet supprimé' });
    } catch (error) {
        console.error('Erreur DELETE projet :', error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;