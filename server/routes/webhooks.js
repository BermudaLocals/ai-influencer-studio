const router = require('express').Router();
const phoneEngine = require('../services/phoneEngine');
const dmEngine = require('../services/dmEngine');
const whatsappEngine = require('../services/whatsappEngine');
const toyEngine = require('../services/toyEngine');

// POST /api/webhooks/voice/:avatarId — Twilio incoming call
router.post('/voice/:avatarId', async (req, res) => {
  const { CallSid, From, To } = req.body;
  const twiml = await phoneEngine.handleIncomingCall(CallSid, From, To, req.params.avatarId);
  res.set('Content-Type', 'text/xml').send(twiml);
});

// POST /api/webhooks/voice-gather/:avatarId — Twilio speech input
router.post('/voice-gather/:avatarId', async (req, res) => {
  const { CallSid, SpeechResult, From } = req.body;
  const { twiml } = await phoneEngine.processAudio(CallSid, SpeechResult, req.params.avatarId);
  res.set('Content-Type', 'text/xml').send(twiml);
});

// POST /api/webhooks/voice-status — Twilio call status callback
router.post('/voice-status', async (req, res) => {
  const { CallSid, CallStatus, CallDuration, From, To } = req.body;
  if (CallStatus === 'completed' && CallDuration) {
    // Find avatar by phone number and end session
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const lineRes = await pool.query('SELECT avatar_id FROM phone_lines WHERE phone_number=$1', [To]);
    if (lineRes.rows.length) {
      await phoneEngine.endCall(CallSid, From, lineRes.rows[0].avatar_id, parseInt(CallDuration));
    }
  }
  res.sendStatus(200);
});

// POST /api/webhooks/whatsapp — Twilio WhatsApp incoming
router.post('/whatsapp', async (req, res) => {
  const { From, To, Body, MediaUrl0 } = req.body;
  // Find avatar by WhatsApp number (To field)
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const avatarRes = await pool.query(
    'SELECT id FROM influencers WHERE whatsapp_number=$1', [To.replace('whatsapp:','')]
  );
  if (avatarRes.rows.length) {
    await dmEngine.processMessage('whatsapp', avatarRes.rows[0].id, From.replace('whatsapp:',''), Body || '[Media]');
  }
  res.set('Content-Type', 'text/xml').send('<?xml version="1.0"?><Response></Response>');
});

// POST /api/webhooks/fanvue-dm — Fanvue DM webhook
router.post('/fanvue-dm', async (req, res) => {
  const { fan_id, avatar_id, message } = req.body;
  if (fan_id && avatar_id && message) {
    await dmEngine.processMessage('fanvue', avatar_id, fan_id, message);
  }
  res.json({ received: true });
});

// POST /api/webhooks/telegram — Telegram bot updates
router.post('/telegram/:avatarId', async (req, res) => {
  const { message } = req.body;
  if (message?.text && message?.from?.id) {
    await dmEngine.processMessage('telegram', req.params.avatarId, String(message.from.id), message.text);
  }
  res.json({ ok: true });
});

// POST /api/webhooks/toy-tip — live stream tip → toy vibration
router.post('/toy-tip', async (req, res) => {
  const { stream_id, fan_id, tip_amount } = req.body;
  const result = await toyEngine.processTip(stream_id, fan_id, tip_amount);
  res.json(result);
});

module.exports = router;

