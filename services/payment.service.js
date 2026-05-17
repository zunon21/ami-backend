const axios = require('axios');
const Donation = require('../models/Donation');

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
   * @param {Object} params
   * @param {number} params.amount
   * @param {string} params.description
   * @param {string} params.customerPhone
   * @param {string} params.userId
   * @param {string} params.paymentMethod
   * @param {string} params.reference - Référence du don (transaction_reference)
   */
  async initiatePayment({ amount, description, customerPhone, userId, paymentMethod = 'wave', reference = null }) {
    try {
      // Utiliser la référence fournie (celle du don) ou en générer une (fallback)
      const finalReference = reference || `don_${userId}_${Date.now()}`;
      const successUrl = `${process.env.BASE_URL || 'https://ami-backend-gvuw.onrender.com'}/api/payment/success?ref=${finalReference}`;
      const errorUrl = `${process.env.BASE_URL || 'https://ami-backend-gvuw.onrender.com'}/api/payment/error?ref=${finalReference}`;

      const payload = {
        storeId: process.env.JEKO_STORE_ID,
        amountCents: amount * 100,
        currency: 'XOF',
        reference: finalReference,
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
        internalReference: finalReference,
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
      const internalRef = payload.reference || payload.transaction_reference || payload.internalReference;

      if (!internalRef) {
        console.error('Webhook: référence manquante dans le payload');
        return { success: false, error: 'Référence manquante' };
      }

      const donation = await Donation.findOne({ where: { transaction_reference: internalRef } });
      if (!donation) {
        console.error(`Webhook: don non trouvé pour la référence ${internalRef}`);
        return { success: false, error: 'Don non trouvé' };
      }

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