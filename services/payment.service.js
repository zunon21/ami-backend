class PaymentService {
  async initiatePayment({ amount, description, customerName, projectId }) {
    const checkoutUrl = "https://gsgqutir.mychariow.store/prd_aonqgn/checkout";
    const transactionReference = `don_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    return {
      success: true,
      checkoutUrl: checkoutUrl,
      transactionReference: transactionReference
    };
  }
  async handleWebhook(payload, signature) {
    console.log("Webhook reçu (à connecter plus tard) :", payload);
    return { success: true };
  }
}
module.exports = new PaymentService();
