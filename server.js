const express = require('express');
const sequelize = require('./database');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const donationRoutes = require('./routes/donationRoutes');
const User = require('./models/User');
const Project = require('./models/Project');
const Donation = require('./models/Donation');
const UserProfile = require('./models/UserProfile');
const UserCommitment = require('./models/UserCommitment');
const Admin = require('./models/Admin');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());

// Webhook avec limite de taille augmentée (50 MB)
app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '50mb' }));
app.post('/api/webhooks/chariow', async (req, res) => {
    console.log('Webhook reçu (body brut) :', req.body.toString());
    res.sendStatus(200);
});

// Augmentation de la limite pour les requêtes JSON (50 MB)
app.use(express.json({ limit: '50mb' }));

sequelize.sync({ alter: true })
    .then(() => console.log('✅ Base de données synchronisée'))
    .catch(err => console.error('❌ Erreur sync:', err));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/donations', donationRoutes);

app.get('/', (req, res) => {
    res.send('API AMI opérationnelle');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur démarré sur http://0.0.0.0:${PORT}`);
});