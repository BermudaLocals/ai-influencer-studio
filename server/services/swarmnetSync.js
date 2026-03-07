const axios = require('axios');
const SWARMNET_URL = process.env.SWARMNET_URL || 'http://localhost:3001';
const postIntel = async (data) => { try { await axios.post(`${SWARMNET_URL}/api/intel/internal`,data,{timeout:5000}); return {success:true}; } catch(e){return{success:false};} };
const logIncome = async (amount,source,description) => { try { await axios.post(`${SWARMNET_URL}/api/income/internal`,{amount,source,description},{timeout:5000}); return {success:true}; } catch(e){return{success:false};} };
module.exports = { postIntel, logIncome };