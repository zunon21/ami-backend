const axios = require('axios');
const Donation = require('../models/Donation'); // Ajout de l'import

class PaymentService {
  constructor() {
    this.jekoApi = axios.create({
      baseURL: process.env.JEKO_API_URL,
      headers: {
        'X-API-KEY': process.env.JEKO_API_KEY,
        'X-API-KEY-ID': process.env.JEKO_API_KEY_ID,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Initie un paiement via JEKO (redirection)
   */
  async initiatePayment({ amount, description, customerPhone, userId, paymentMethod = 'wave' }) {
    try {
      const reference = `don_${userId}_${Date.now()}`;
      const successUrl = `${process.env.BASE_URL || 'https://ami-backend-gvuw.onrender.com'}/api/payment/success?ref=${reference}`;
      const errorUrl = `${process.env.BASE_URL || 'https://ami-backend-gvuw.onrender.com'}/api/payment/error?ref=${reference}`;

      const payload = {
        storeId: process.env.JEKO_STORE_ID,
        amountCents: amount * 100,
        currency: 'XOF',
        reference: reference,
        paymentDetails: {
          type: 'redirect',
          data: {
            paymentMethod: paymentMethod,
            successUrl: successUrl,
            errorUrl: errorUrl,
          },
        },
      };

      const response = await this.jekoApi.post('/partner_api/payment_requests', payload);
      const { redirectUrl, id } = response.data;

      return {
        success: true,
        checkoutUrl: redirectUrl,
        transactionReference: id,
        internalReference: reference,
      };
    } catch (error) {
      console.error('Erreur JEKO:', error.response?.data || error.message);
      throw new Error('Impossible d’initier le paiement');
    }
  }

  /**
   * Gère le webhook de confirmation de paiement (appelé par JEKO)
   * Met à jour le statut du don en 'success'
   */
  async handleWebhook(payload, signature) {
    console.log('Webhook reçu:', payload);

    try {
      // Le payload de JEKO contient probablement la référence interne (celle qu'on a envoyée)
      // ou un identifiant de transaction. Adaptez selon la doc JEKO.
      const internalRef = payload.reference || payload.transaction_reference || payload.internalReference;

      if (!internalRef) {
        console.error('Webhook: référence manquante dans le payload');
        return { success: false, error: 'Référence manquante' };
      }

      // Chercher le don par transaction_reference (champ stocké lors de la création)
      const donation = await Donation.findOne({ where: { transaction_reference: internalRef } });
      if (!donation) {
        console.error(`Webhook: don non trouvé pour la référence ${internalRef}`);
        return { success: false, error: 'Don non trouvé' };
      }

      // Mettre à jour le statut
      await donation.update({ status: 'success' });
      console.log(`Don ${donation.id} mis à jour en success`);

      return { success: true };
    } catch (error) {
      console.error('Erreur lors du traitement du webhook:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PaymentService();