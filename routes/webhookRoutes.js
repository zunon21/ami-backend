const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Donation = require('../models/Donation');

// Middleware de vérification de la signature HMAC-SHA256 avec raw body
const verifyJekoSignature = (req, res, next) => {
  const signature = req.headers['jeko-signature'];
  if (!signature) {
    console.error('Webhook: signature manquante');
    return res.status(401).send('Missing signature');
  }
  // Le body doit être un Buffer (grace à express.raw)
  const payloadBuffer = req.body;
  if (!Buffer.isBuffer(payloadBuffer)) {
    console.error('Webhook: body n\'est pas un buffer');
    return res.status(401).send('Invalid request');
  }
  const expected = crypto
    .createHmac('sha256', process.env.JEKO_WEBHOOK_SECRET)
    .update(payloadBuffer)
    .digest('hex');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) {
      console.error('Webhook: signature invalide');
      return res.status(401).send('Invalid signature');
    }
  } catch (err) {
    console.error('Erreur comparaison signature:', err);
    return res.status(401).send('Invalid signature');
  }
  next();
};

// Endpoint webhook - utilise express.raw pour accéder au buffer brut
router.post('/payment/webhook', express.raw({ type: 'application/json' }), verifyJekoSignature, async (req, res) => {
  try {
    const payload = JSON.parse(req.body.toString('utf8'));
    console.log('Webhook JEKO reçu:', JSON.stringify(payload, null, 2));

    // La référence se trouve dans apiTransactionableDetails.reference (doc JEKO)
    const reference = payload.apiTransactionableDetails?.reference;
    const status = payload.status; // 'success', 'pending', 'error'

    if (!reference) {
      console.error('Webhook: référence manquante dans apiTransactionableDetails');
      return res.status(400).send('Missing reference');
    }

    if (status === 'success') {
      const [updated] = await Donation.update(
        { status: 'success' },
        { where: { transaction_reference: reference } }
      );
      if (updated) {
        console.log(`Don avec référence ${reference} mis à jour vers success`);
      } else {
        console.log(`Aucun don trouvé avec la référence ${reference}`);
      }
    } else {
      console.log(`Statut ignoré: ${status} pour référence ${reference}`);
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('Erreur traitement webhook:', err);
    res.sendStatus(500);
  }
});

// Routes de callback - inchangées
router.get('/payment/success', (req, res) => {
  const { ref } = req.query;
  console.log('Paiement réussi, référence:', ref);
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