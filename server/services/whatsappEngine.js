const axios = require('axios');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const dmEngine = require('./dmEngine');

/**
 * Register a WhatsApp number for an avatar via Twilio
 */
async function registerNumber(avatarId) {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log('[whatsappEngine] Twilio not configured — using mock number');
      const mock = `+1555${Math.floor(Math.random()*9000000+1000000)}`;
      await pool.query('UPDATE influencers SET whatsapp_number=$1 WHERE id=$2', [mock, avatarId]);
      return { phone_number: mock, provider: 'mock' };
    }
    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const numbers = await client.incomingPhoneNumbers.list({ limit: 1 });
    let phoneNumber;
    if (numbers.length > 0) {
      phoneNumber = numbers[0].phoneNumber;
    } else {
      const available = await client.availablePhoneNumbers('US').local.list({ smsEnabled: true, limit: 1 });
      if (!available.length) throw new Error('No numbers available');
      const purchased = await client.incomingPhoneNumbers.create({
        phoneNumber: available[0].phoneNumber,
        smsUrl: `${process.env.BASE_URL}/api/webhooks/whatsapp`,
        voiceUrl: `${process.env.BASE_URL}/api/webhooks/voice`
      });
      phoneNumber = purchased.phoneNumber;
    }
    await pool.query('UPDATE influencers SET whatsapp_number=$1 WHERE id=$2', [phoneNumber, avatarId]);
    await pool.query(
      'UPDATE avatar_addons SET status=$1 WHERE avatar_id=$2 AND addon_type=$3',
      ['active', avatarId, 'whatsapp']
    );
    return { phone_number: phoneNumber, provider: 'twilio' };
  } catch (err) {
    console.error('[whatsappEngine] registerNumber error:', err.message);
    throw err;
  }
}

/**
 * Handle incoming WhatsApp message (called by Twilio webhook)
 */
async function handleIncoming(from, body, mediaUrl = null) {
  try {
    // Find which avatar owns this number
    const res = await pool.query(
      "SELECT id FROM influencers WHERE whatsapp_number=$1 AND status='active'",
      [from.replace('whatsapp:', '')]
    );
    // Check by recipient number — Twilio passes 'To' field
    if (!res.rows.length) {
      console.warn('[whatsappEngine] No avatar found for incoming number');
      return;
    }
    const avatarId = res.rows[0].id;
    const fanId = from.replace('whatsapp:', '');
    await dmEngine.processMessage('whatsapp', avatarId, fanId, body || '[Media message]');
  } catch (err) {
    console.error('[whatsappEngine] handleIncoming error:', err.message);
  }
}

/**
 * Send a WhatsApp text reply
 */
async function sendReply(to, avatarId, message) {
  try {
    const avatarRes = await pool.query('SELECT whatsapp_number FROM influencers WHERE id=$1', [avatarId]);
    const from = avatarRes.rows[0]?.whatsapp_number;
    if (!from) throw new Error('Avatar has no WhatsApp number');
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log(`[WhatsApp] ${from} → ${to}: ${message}`);
      return { mock: true };
    }
    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return await client.messages.create({
      from: `whatsapp:${from}`, to: `whatsapp:${to}`, body: message
    });
  } catch (err) {
    console.error('[whatsappEngine] sendReply error:', err.message);
  }
}

/**
 * Send a voice note (TTS-generated audio)
 */
async function sendVoiceNote(to, avatarId, text) {
  try {
    const voiceEngine = require('./voiceEngine');
    const audioPath = await voiceEngine.synthesize(text, avatarId);
    const avatarRes = await pool.query('SELECT whatsapp_number, name FROM influencers WHERE id=$1', [avatarId]);
    const from = avatarRes.rows[0]?.whatsapp_number;
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log(`[WhatsApp Voice Note] Generated audio at ${audioPath}`);
      return { mock: true, audio: audioPath };
    }
    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const publicUrl = `${process.env.BASE_URL}/audio/${require('path').basename(audioPath)}`;
    return await client.messages.create({
      from: `whatsapp:${from}`, to: `whatsapp:${to}`, mediaUrl: [publicUrl]
    });
  } catch (err) {
    console.error('[whatsappEngine] sendVoiceNote error:', err.message);
  }
}

/**
 * Broadcast message to ALL fans subscribed to this avatar\'s WhatsApp
 */
async function broadcastToAll(avatarId, message) {
  try {
    const fansRes = await pool.query(
      `SELECT DISTINCT fan_identifier FROM ai_communications
       WHERE avatar_id=$1 AND platform='whatsapp' AND session_start > NOW() - INTERVAL '30 days'`,
      [avatarId]
    );
    const results = [];
    for (const fan of fansRes.rows) {
      const result = await sendReply(fan.fan_identifier, avatarId, message);
      results.push({ fan: fan.fan_identifier, result });
      await new Promise(r => setTimeout(r, 500)); // rate limit
    }
    console.log(`[whatsappEngine] Broadcast sent to ${results.length} fans`);
    return results;
  } catch (err) {
    console.error('[whatsappEngine] broadcastToAll error:', err.message);
  }
}

/**
 * Send a Stripe payment link via WhatsApp
 */
async function sendPaymentLink(to, amount, description, avatarId) {
  try {
    let paymentUrl = `${process.env.BASE_URL}/pay?amount=${amount}&desc=${encodeURIComponent(description)}`;
    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.paymentLinks.create({
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: description },
            unit_amount: Math.round(amount * 100)
          },
          quantity: 1
        }]
      });
      paymentUrl = session.url;
    }
    const message = `💳 Here\'s your secure payment link for "${description}" ($${amount}):\n\n${paymentUrl}\n\nPay securely — expires in 24 hours 🔒`;
    await sendReply(to, avatarId, message);
    return { success: true, url: paymentUrl };
  } catch (err) {
    console.error('[whatsappEngine] sendPaymentLink error:', err.message);
  }
}

module.exports = { registerNumber, handleIncoming, sendReply, sendVoiceNote, broadcastToAll, sendPaymentLink };

