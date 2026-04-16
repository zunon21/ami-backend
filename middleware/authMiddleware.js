require('dotenv').config();
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Accès non autorisé. Token manquant.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // contient { id, phone, iat, exp }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token invalide ou expiré.' });
    }
};

module.exports = authMiddleware;