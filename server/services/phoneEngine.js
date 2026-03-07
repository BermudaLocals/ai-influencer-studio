const axios = require('axios');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

/**
 * Provision a Twilio phone line for an avatar
 */
async function provisionLine(avatarId) {
  try {
    const avatarRes = await pool.query('SELECT name FROM influencers WHERE id=$1', [avatarId]);
    const name = avatarRes.rows[0]?.name || 'AI Creator';
    let phoneNumber;
    if (!process.env.TWILIO_ACCOUNT_SID) {
      phoneNumber = `+1555${Math.floor(Math.random()*9000000+1000000)}`;
      console.log(`[phoneEngine] Mock line provisioned: ${phoneNumber} for ${name}`);
    } else {
      const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const available = await client.availablePhoneNumbers('US').local.list({ voiceEnabled: true, limit: 1 });
      if (!available.length) throw new Error('No phone numbers available');
      const purchased = await client.incomingPhoneNumbers.create({
        phoneNumber: available[0].phoneNumber,
        voiceUrl: `${process.env.BASE_URL}/api/webhooks/voice/${avatarId}`,
        statusCallback: `${process.env.BASE_URL}/api/webhooks/voice-status`
      });
      phoneNumber = purchased.phoneNumber;
    }
    await pool.query('UPDATE influencers SET phone_number=$1 WHERE id=$2', [phoneNumber, avatarId]);
    await pool.query(
      `INSERT INTO phone_lines (avatar_id, phone_number, per_minute_rate) VALUES ($1,$2,$3)
       ON CONFLICT DO NOTHING`,
      [avatarId, phoneNumber, parseFloat(process.env.PHONE_PER_MINUTE_RATE || '1.99')]
    );
    console.log(`[phoneEngine] ✅ Line provisioned: ${phoneNumber} for avatar ${avatarId}`);
    return { phone_number: phoneNumber };
  } catch (err) {
    console.error('[phoneEngine] provisionLine error:', err.message);
    throw err;
  }
}

/**
 * Handle incoming call from Twilio webhook
 * Returns TwiML response to stream audio
 */
async function handleIncomingCall(callSid, from, to, avatarId) {
  try {
    const avatarRes = await pool.query(
      'SELECT name, personality_prompt, niche FROM influencers WHERE id=$1', [avatarId]
    );
    const avatar = avatarRes.rows[0];
    if (!avatar) return generateTwiML('Sorry, this line is currently unavailable. Please try again later.');
    // Start session in DB
    await pool.query(
      `INSERT INTO ai_communications (avatar_id, comm_type, platform, fan_identifier, session_start)
       VALUES ($1,'phone_call','phone',$2,NOW())`,
      [avatarId, from]
    );
    const greeting = `Hey! So glad you called. This is ${avatar.name}. I love that you reached out. Tell me, what\'s on your mind today?`;
    return generateTwiML(greeting, callSid, avatarId);
  } catch (err) {
    console.error('[phoneEngine] handleIncomingCall error:', err.message);
    return generateTwiML('Thanks for calling! I\'ll be right with you.');
  }
}

/**
 * Process transcribed audio — generate AI response and stream back
 */
async function processAudio(callSid, transcript, avatarId) {
  try {
    if (!transcript?.trim()) return { twiml: generateTwiML('I didn\'t quite catch that. Can you say that again?', callSid, avatarId) };
    const avatarRes = await pool.query(
      'SELECT name, personality_prompt, niche FROM influencers WHERE id=$1', [avatarId]
    );
    const avatar = avatarRes.rows[0];
    // Build conversation history from recent DB entries
    const histRes = await pool.query(
      `SELECT messages FROM ai_communications WHERE avatar_id=$1 AND comm_type='phone_call'
       ORDER BY session_start DESC LIMIT 5`,
      [avatarId]
    );
    const history = histRes.rows.flatMap(r => r.messages || []);
    const personality = avatar?.personality_prompt ||
      `You are ${avatar?.name}, a ${avatar?.niche} creator. You are on a phone call with a fan. Be warm, flirty, engaging. Keep responses SHORT — this is a phone call, not an essay. Max 2-3 sentences.`;
    let reply;
    try {
      const res = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku',
          messages: [
            { role: 'system', content: personality },
            ...history.slice(-6),
            { role: 'user', content: transcript }
          ],
          max_tokens: 100, temperature: 0.85
        },
        { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
      );
      reply = res.data.choices[0].message.content.trim();
    } catch { reply = `Mmm, tell me more about that... I\'m all yours right now.`; }
    // Log exchange
    await pool.query(
      `UPDATE ai_communications SET messages = messages || $1::jsonb
       WHERE avatar_id=$2 AND comm_type='phone_call' AND session_end IS NULL`,
      [JSON.stringify([{role:'user',content:transcript},{role:'assistant',content:reply}]), avatarId]
    );
    return { reply, twiml: generateTwiML(reply, callSid, avatarId) };
  } catch (err) {
    console.error('[phoneEngine] processAudio error:', err.message);
    return { reply: 'I\'m here... keep talking.', twiml: generateTwiML('I\'m here, keep going...', callSid, avatarId) };
  }
}

/**
 * Generate TwiML response with voice
 */
function generateTwiML(text, callSid = null, avatarId = null) {
  const voiceName = process.env.TWILIO_VOICE || 'Polly.Joanna';
  const gatherAction = callSid ? `${process.env.BASE_URL}/api/webhooks/voice-gather/${avatarId}` : null;
  let twiml = `<?xml version="1.0" encoding="UTF-8"?><Response>`;
  twiml += `<Say voice="${voiceName}">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Say>`;
  if (gatherAction) {
    twiml += `<Gather input="speech" action="${gatherAction}" speechTimeout="3" timeout="10">`;
    twiml += `<Say voice="${voiceName}">I\'m listening...</Say></Gather>`;
    twiml += `<Say voice="${voiceName}">I didn\'t hear anything. Call back anytime!</Say>`;
  }
  twiml += `</Response>`;
  return twiml;
}

/**
 * End a call session and log revenue
 */
async function endCall(callSid, from, avatarId, durationSeconds) {
  try {
    const lineRes = await pool.query('SELECT per_minute_rate FROM phone_lines WHERE avatar_id=$1', [avatarId]);
    const rate = parseFloat(lineRes.rows[0]?.per_minute_rate || 1.99);
    const minutes = Math.ceil(durationSeconds / 60);
    const revenue = parseFloat((minutes * rate).toFixed(2));
    await pool.query(
      `UPDATE ai_communications SET session_end=NOW(), duration_seconds=$1, revenue_generated=$2
       WHERE avatar_id=$3 AND comm_type='phone_call' AND fan_identifier=$4 AND session_end IS NULL`,
      [durationSeconds, revenue, avatarId, from]
    );
    await pool.query(
      `UPDATE phone_lines SET total_minutes=total_minutes+$1, total_revenue=total_revenue+$2 WHERE avatar_id=$3`,
      [minutes, revenue, avatarId]
    );
    await pool.query(
      `INSERT INTO revenue_events (avatar_id, amount, stream, description) VALUES ($1,$2,'phone_line',$3)`,
      [avatarId, revenue, `Phone call ${minutes} min from ${from}`]
    );
    console.log(`[phoneEngine] Call ended. ${minutes} min = $${revenue}`);
    return { minutes, revenue };
  } catch (err) { console.error('[phoneEngine] endCall error:', err.message); }
}

/**
 * Book a scheduled voice call session
 */
async function bookSession(avatarId, fanId, fanPhone, durationMinutes, scheduledAt) {
  const prices = { 15: 29, 30: 49, 60: 89 };
  const price = prices[durationMinutes] || durationMinutes * 2;
  try {
    const result = await pool.query(
      `INSERT INTO phone_bookings (avatar_id, fan_id, fan_phone, duration_minutes, scheduled_at, amount_paid)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [avatarId, fanId, fanPhone, durationMinutes, scheduledAt, price]
    );
    return { booking: result.rows[0], price, message: `Session booked for $${price}. You will receive a call at ${scheduledAt}.` };
  } catch (err) { console.error('[phoneEngine] bookSession error:', err.message); throw err; }
}

/**
 * Initiate outbound call to fan for scheduled session
 */
async function startScheduledCall(bookingId) {
  try {
    const res = await pool.query(
      'SELECT pb.*, i.name as avatar_name FROM phone_bookings pb JOIN influencers i ON pb.avatar_id=i.id WHERE pb.id=$1',
      [bookingId]
    );
    const booking = res.rows[0];
    if (!booking) throw new Error('Booking not found');
    if (!process.env.TWILIO_ACCOUNT_SID) {
      console.log(`[phoneEngine] Mock outbound call to ${booking.fan_phone} for booking ${bookingId}`);
      return { mock: true };
    }
    const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const lineRes = await pool.query('SELECT phone_number FROM phone_lines WHERE avatar_id=$1', [booking.avatar_id]);
    const call = await client.calls.create({
      to: booking.fan_phone,
      from: lineRes.rows[0]?.phone_number,
      url: `${process.env.BASE_URL}/api/webhooks/voice/${booking.avatar_id}?booking=${bookingId}`
    });
    await pool.query("UPDATE phone_bookings SET status='active' WHERE id=$1", [bookingId]);
    return call;
  } catch (err) { console.error('[phoneEngine] startScheduledCall error:', err.message); throw err; }
}

module.exports = { provisionLine, handleIncomingCall, processAudio, generateTwiML, endCall, bookSession, startScheduledCall };

