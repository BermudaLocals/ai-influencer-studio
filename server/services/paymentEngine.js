const PLATFORM_FEE = 0.065;
function applyPlatformFee(amount) { return parseFloat((amount / (1 - PLATFORM_FEE)).toFixed(2)); }
const PAYMENT_METHODS = {
  coinbase: { name:'Coinbase Commerce', available:true, priority:1 },
  paypal:   { name:'PayPal',            available:true, priority:2 },
  stripe:   { name:'Stripe',            available:false,priority:3 },
  ton:      { name:'TON Crypto',        available:true, priority:4 },
  mtn:      { name:'MTN Mobile Money',  available:true, priority:5 },
  opay:     { name:'OPay',              available:true, priority:6 },
  bank:     { name:'Bank Transfer',     available:true, priority:7 },
};
async function createCoinbaseCharge({amount,currency='GBP',name,description,metadata={}}) {
  const fetch=require('node-fetch');
  if(!process.env.COINBASE_COMMERCE_API_KEY) throw new Error('COINBASE_COMMERCE_API_KEY not set');
  const finalAmount=applyPlatformFee(amount);
  const res=await fetch('https://api.commerce.coinbase.com/charges',{method:'POST',headers:{'Content-Type':'application/json','X-CC-Api-Key':process.env.COINBASE_COMMERCE_API_KEY,'X-CC-Version':'2018-03-22'},body:JSON.stringify({name,description,pricing_type:'fixed_price',local_price:{amount:finalAmount.toString(),currency},metadata:{...metadata},redirect_url:`${process.env.BASE_URL}/payment/success`,cancel_url:`${process.env.BASE_URL}/payment/cancel`})});
  const data=await res.json();
  if(!res.ok) throw new Error(data.error?.message||'Coinbase failed');
  return {method:'coinbase',chargeId:data.data.id,checkoutUrl:data.data.hosted_url,amount:finalAmount,currency};
}
async function createPayPalOrder({amount,currency='GBP',description,metadata={}}) {
  const fetch=require('node-fetch');
  const finalAmount=applyPlatformFee(amount);
  const tokenRes=await fetch('https://api-m.paypal.com/v1/oauth2/token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
  const {access_token}=await tokenRes.json();
  const orderRes=await fetch('https://api-m.paypal.com/v2/checkout/orders',{method:'POST',headers:{Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'},body:JSON.stringify({intent:'CAPTURE',purchase_units:[{amount:{currency_code:currency,value:finalAmount.toFixed(2)},description}],application_context:{return_url:`${process.env.BASE_URL}/payment/success?method=paypal`,cancel_url:`${process.env.BASE_URL}/payment/cancel`,brand_name:'Dollar Double Empire',user_action:'PAY_NOW'}})});
  const orderData=await orderRes.json();
  const approveUrl=orderData.links?.find(l=>l.rel==='approve')?.href;
  return {method:'paypal',orderId:orderData.id,checkoutUrl:approveUrl,amount:finalAmount,currency};
}
async function capturePayPalOrder(orderId) {
  const fetch=require('node-fetch');
  const tokenRes=await fetch('https://api-m.paypal.com/v1/oauth2/token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
  const {access_token}=await tokenRes.json();
  const res=await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderId}/capture`,{method:'POST',headers:{Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'}});
  return res.json();
}
async function verifyCoinbaseWebhook(rawBody,signature) {
  const crypto=require('crypto');
  const secret=process.env.COINBASE_WEBHOOK_SECRET;
  if(!secret) return false;
  const computed=crypto.createHmac('sha256',secret).update(rawBody).digest('hex');
  return computed===signature;
}
async function createTONPayment({amount,currency='USD'}) {
  const finalAmount=applyPlatformFee(amount);
  const memo=`DDM-${Date.now()}`;
  return {method:'ton',walletAddress:process.env.TON_WALLET_ADDRESS||'Set TON_WALLET_ADDRESS',memo,amount:finalAmount,currency};
}
async function createBankTransferDetails({amount,currency='GBP'}) {
  const finalAmount=applyPlatformFee(amount);
  const reference=`DDM-${Date.now()}`;
  return {method:'bank',amount:finalAmount,currency,reference,bankDetails:{accountName:process.env.BANK_ACCOUNT_NAME||'Dollar Double Marketing Ltd',accountNumber:process.env.BANK_ACCOUNT_NUMBER||'Configure in Railway',sortCode:process.env.BANK_SORT_CODE||'Configure in Railway',reference}};
}
async function createPayment({method,amount,currency,plan,description,userId,metadata={}}) {
  const use=method&&PAYMENT_METHODS[method]?.available?method:'coinbase';
  switch(use) {
    case 'coinbase': return createCoinbaseCharge({amount,currency,name:plan,description:description||plan,metadata:{...metadata,userId}});
    case 'paypal':   return createPayPalOrder({amount,currency,description:description||plan,metadata:{...metadata,userId}});
    case 'ton':      return createTONPayment({amount,currency});
    case 'bank':     return createBankTransferDetails({amount,currency});
    default:         return createCoinbaseCharge({amount,currency,name:plan,description:description||plan,metadata:{...metadata,userId}});
  }
}
function getAvailableMethods() {
  return Object.entries(PAYMENT_METHODS).filter(([,v])=>v.available).map(([key,v])=>({key,name:v.name}));
}
async function logPayment(pool,{userId,method,amount,currency,status,reference,metadata={}}) {
  try { await pool.query(`INSERT INTO revenue_events (user_id,amount,stream,description) VALUES ($1,$2,$3,$4)`,[userId,amount,method,`Payment via ${method}`]); } catch(e) { console.error('[PaymentEngine] Log failed:',e.message); }
}
module.exports = {createPayment,createCoinbaseCharge,createPayPalOrder,capturePayPalOrder,createTONPayment,createBankTransferDetails,verifyCoinbaseWebhook,logPayment,getAvailableMethods,applyPlatformFee,PAYMENT_METHODS};
