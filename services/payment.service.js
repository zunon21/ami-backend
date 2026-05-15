const axios = require('axios');

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
   * @param {number} params.amount - Montant en FCFA
   * @param {string} params.description - Description de la transaction
   * @param {string} params.customerPhone - Téléphone du client (optionnel pour redirect)
   * @param {string} params.userId - ID utilisateur
   * @param {string} params.paymentMethod - wave, orange, mtn, moov, djamo
   * @returns {Promise<{success: boolean, checkoutUrl: string, transactionReference: string}>}
   */
  async initiatePayment({ amount, description, customerPhone, userId, paymentMethod = 'wave' }) {
    try {
      const reference = `don_${userId}_${Date.now()}`;
      const successUrl = `${process.env.BASE_URL || 'https://ami-backend-gvuw.onrender.com'}/api/payment/success?ref=${reference}`;
      const errorUrl = `${process.env.BASE_URL || 'https://ami-backend-gvuw.onrender.com'}/api/payment/error?ref=${reference}`;

      const payload = {
        storeId: process.env.JEKO_STORE_ID,
        amountCents: amount * 100, // JEKO attend les montants en centimes (ex: 10000 pour 100 FCFA)
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
   * @param {Object} payload - Corps de la requête
   * @param {string} signature - Header de signature (optionnel)
   * @returns {Promise<{success: boolean}>}
   */
  async handleWebhook(payload, signature) {
    // La vérification de la signature est normalement faite dans un middleware
    // Ici on se contente de logger et de retourner un succès
    console.log('Webhook reçu:', payload);
    return { success: true };
  }
}

module.exports = new PaymentService();