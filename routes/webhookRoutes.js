const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Donation = require('../models/Donation');

// Middleware de vérification de la signature HMAC-SHA256 de JEKO
const verifyJekoSignature = (req, res, next) => {
  const signature = req.headers['jeko-signature'];
  if (!signature) {
    console.log('Webhook: signature manquante');
    return res.status(401).send('Missing signature');
  }
  const payload = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', process.env.JEKO_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  if (signature !== expected) {
    console.log('Webhook: signature invalide');
    return res.status(401).send('Invalid signature');
  }
  next();
};

// Endpoint webhook pour les notifications de paiement JEKO
router.post('/payment/webhook', verifyJekoSignature, async (req, res) => {
  try {
    const { reference, status } = req.body;
    console.log('Webhook reçu de JEKO:', { reference, status });

    if (reference) {
      // Mise à jour du don correspondant (en utilisant transaction_reference)
      const [updated] = await Donation.update(
        { status: status === 'success' ? 'success' : 'failed' },
        { where: { transaction_reference: reference } }
      );
      if (updated) {
        console.log(`Don avec référence ${reference} mis à jour vers ${status}`);
      } else {
        console.log(`Aucun don trouvé avec la référence ${reference}`);
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur lors du traitement du webhook:', err);
    res.sendStatus(500);
  }
});

// Routes de callback pour les redirections (succès et erreur)
router.get('/payment/success', (req, res) => {
  const { ref } = req.query;
  console.log('Paiement réussi, référence:', ref);
  // Page HTML simple pour informer l'utilisateur
  res.send(`
    <html>
      <head><title>Paiement réussi</title></head>
      <body style="text-align:center; padding:50px;">
        <h1 style="color:green;">Merci pour votre don !</h1>
        <p>Votre transaction a été effectuée avec succès.</p>
        <p>Vous pouvez retourner à l'application.</p>
        <script>setTimeout(() => window.close(), 3000);</script>
      </body>
    </html>
  `);
});

router.get('/payment/error', (req, res) => {
  const { ref } = req.query;
  console.log('Paiement échoué, référence:', ref);
  res.send(`
    <html>
      <head><title>Paiement échoué</title></head>
      <body style="text-align:center; padding:50px;">
        <h1 style="color:red;">Paiement échoué</h1>
        <p>Une erreur est survenue. Veuillez réessayer.</p>
        <p>Vous pouvez retourner à l'application.</p>
        <script>setTimeout(() => window.close(), 3000);</script>
      </body>
    </html>
  `);
});

module.exports = router;