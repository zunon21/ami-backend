const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Donation = require('../models/Donation');

// Middleware de vérification de la signature (TEMPORAIREMENT DÉSACTIVÉ)
const verifyJekoSignature = (req, res, next) => {
  console.log('Vérification signature ignorée temporairement');
  next();
  /* // Réactiver plus tard
  const signature = req.headers['jeko-signature'];
  if (!signature) {
    console.error('Webhook: signature manquante');
    return res.status(401).send('Missing signature');
  }
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
  */
};

// Endpoint webhook
router.post('/payment/webhook', express.raw({ type: 'application/json' }), verifyJekoSignature, async (req, res) => {
  try {
    const payload = JSON.parse(req.body.toString('utf8'));
    console.log('Webhook JEKO reçu (payload complet):', JSON.stringify(payload, null, 2));

    // ✅ Correction : la référence est dans transactionDetails.reference
    const reference = payload.transactionDetails?.reference;
    const status = payload.status;

    if (!reference) {
      console.error('Référence manquante dans transactionDetails');
      return res.status(400).send('Missing reference');
    }

    if (status === 'success') {
      const [updated] = await Donation.update(
        { status: 'success' },
        { where: { transaction_reference: reference } }
      );
      if (updated) {
        console.log(`✅ Don avec référence ${reference} mis à jour en success`);
      } else {
        console.log(`❌ Aucun don trouvé pour la référence ${reference}`);
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

// Routes de callback (succès/erreur)
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