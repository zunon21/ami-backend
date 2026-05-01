const axios = require('axios');

const CUSTOMER_ID = 'dd8a00a4-ed83-45f4-bed4-9588ef34f1b4';
const API_KEY = 'C-EA273A36BE5C4AB';

async function testAuth() {
  try {
    const url = `https://cpaas.messagecentral.com/auth/v1/authentication/token?customerId=${CUSTOMER_ID}&key=${API_KEY}&scope=NEW`;
    const response = await axios.get(url);
    console.log('✅ Authentification réussie !');
    console.log('Réponse complète :', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log('❌ Échec. Code:', error.response.status);
      console.log('Réponse :', error.response.data);
    } else {
      console.log('❌ Erreur:', error.message);
    }
  }
}

testAuth();
