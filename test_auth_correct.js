const axios = require('axios');

const CUSTOMER_ID = 'dd8a00a4-ed83-45f4-bed4-9588ef34f1b4';
const API_KEY = 'C-EA273A36BE5C4AB';

async function testAuth() {
  try {
    const url = 'https://cpaas.messagecentral.com/auth/v1/authentication/token';
    const params = new URLSearchParams();
    params.append('customerId', CUSTOMER_ID);
    params.append('key', API_KEY);
    params.append('scope', 'NEW');
    const response = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log('✅ Succès ! Token :', response.data.token);
  } catch (error) {
    console.log('❌ Erreur :', error.response?.data || error.message);
  }
}

testAuth();
