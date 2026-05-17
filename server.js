const express = require('express');
const sequelize = require('./database');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const donationRoutes = require('./routes/donationRoutes');
const serviceItemRoutes = require('./routes/serviceItemRoutes');
const archiveRoutes = require('./routes/archiveRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const User = require('./models/User');
const Project = require('./models/Project');
const Donation = require('./models/Donation');
const UserProfile = require('./models/UserProfile');
const UserCommitment = require('./models/UserCommitment');
const UserServiceCommitment = require('./models/UserServiceCommitment');
const Admin = require('./models/Admin');
const ServiceCategory = require('./models/ServiceCategory');
const ServiceItem = require('./models/ServiceItem');
const cors = require('cors');

const app = express();
const PORT = 5000;

// CORS
app.use(cors({ origin: '*' }));

// Middleware pour le webhook : body brut (Buffer) nécessaire pour vérifier la signature HMAC
app.use('/api/payment/webhook', express.raw({ type: 'application/json' }));

// Middleware JSON pour toutes les autres routes
app.use(express.json({ limit: '50mb' }));

// Synchronisation DB
sequelize.sync({ alter: true })
    .then(() => console.log('✅ Base de données synchronisée'))
    .catch(err => console.error('❌ Erreur sync:', err));

// Middleware noAuth pour désactiver l'authentification temporairement
const noAuth = (req, res, next) => next();

// Routes
app.use('/api/auth', noAuth, authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/service-items', serviceItemRoutes);
app.use('/api/archives', archiveRoutes);
app.use('/api', webhookRoutes); // contient /payment/webhook et /payment/success, /payment/error

app.get('/', (req, res) => {
    res.send('API AMI opérationnelle');
});

app.get('/api', (req, res) => {
    res.json({ message: 'API AMI opérationnelle' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur démarré sur http://0.0.0.0:${PORT}`);
});