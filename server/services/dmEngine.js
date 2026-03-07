const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const axios = require('axios');

// Platform API adapters
const PLATFORM_ADAPTERS = {
  fanvue:    { send: sendFanvue,    name: 'Fanvue' },
  onlyfans:  { send: sendOnlyFans,  name: 'OnlyFans' },
  glowx:     { send: sendGlowx,     name: 'GLOWX' },
  whatsapp:  { send: sendWhatsApp,  name: 'WhatsApp' },
  instagram: { send: sendInstagram, name: 'Instagram' },
  telegram:  { send: sendTelegram,  name: 'Telegram' },
};

/**
 * MAIN ENTRY POINT
 * Called by platform webhooks when a fan sends a message
 */
async function processMessage(platform, avatarId, fanId, message, mediaUrl = null) {
  try {
    // 1. Load avatar personality
    const avatarRes = await pool.query(
      'SELECT * FROM influencers WHERE id=$1', [avatarId]
    );
    if (!avatarRes.rows.length) throw new Error('Avatar not found');
    const avatar = avatarRes.rows[0];

    // 2. Load conversation history (last 20 messages)
    const histRes = await pool.query(
      `SELECT messages FROM ai_communications
       WHERE avatar_id=$1 AND platform=$2 AND fan_identifier=$3
       ORDER BY session_start DESC LIMIT 20`,
      [avatarId, platform, fanId]
    );
    const history = histRes.rows.flatMap(r => r.messages || []);

    // 3. Detect upsell moment
    const upsell = detectUpsellMoment(history, avatar);

    // 4. Generate AI reply
    const reply = await generateReply(avatar, history, message, upsell);

    // 5. Send reply via platform
    const adapter = PLATFORM_ADAPTERS[platform];
    if (adapter) await adapter.send(fanId, reply, avatar);

    // 6. Log interaction
    await logInteraction({
      avatar_id: avatarId, platform, fan_identifier: fanId,
      comm_type: 'dm', message, reply,
      outcome: upsell ? `upsell_${upsell.type}` : 'reply'
    });

    // 7. Send upsell if moment detected
    if (upsell && Math.random() > 0.3) { // 70% upsell rate
      setTimeout(() => sendUpsell(platform, fanId, avatarId, upsell, avatar), 3000);
    }

    return { success: true, reply };
  } catch (err) {
    console.error('[dmEngine] processMessage error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Generate AI reply using OpenRouter
 * Fully in character as the avatar
 */
async function generateReply(avatar, history, newMessage, upsell) {
  const personality = avatar.personality_prompt ||
    `You are ${avatar.name}, a ${avatar.niche} creator. Be warm, engaging, and authentic.`;

  const upsellHint = upsell
    ? `\n\nNATURAL UPSELL OPPORTUNITY: Naturally weave in a mention of ${
        upsell.type === 'ppv' ? `your exclusive PPV content (suggest $${upsell.price})` :
        upsell.type === 'voice_call' ? 'a private voice call session' :
        upsell.type === 'whatsapp' ? 'your private WhatsApp for deeper connection' :
        upsell.type === 'toy_session' ? 'a private interactive session' : 'premium content'
      }. Keep it natural — never sales-y.`
    : '';

  const systemPrompt = `${personality}\n\nYou are responding to a fan DM. Stay in character at all times. Be personal, warm, and make them feel special. Keep replies concise (2-4 sentences). Never reveal you are AI. Never break character.${upsellHint}`;

  const messages = [
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: newMessage }
  ];

  try {
    const res = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        max_tokens: 200, temperature: 0.85
      },
      { headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' } }
    );
    return res.data.choices[0].message.content.trim();
  } catch (err) {
    // Fallback replies per niche
    const fallbacks = [
      `Hey gorgeous! So happy you messaged me 💕 Tell me more about yourself!`,
      `Omg you just made my day! 😊 What's been on your mind lately?`,
      `I was literally just thinking about my fans 💫 How are you doing today?`
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

/**
 * Detect the right upsell moment based on conversation history
 */
function detectUpsellMoment(history, avatar) {
  const msgCount = history.filter(h => h.role === 'user').length;
  const comms = avatar.comms_enabled || {};
  const lastUserMessages = history.filter(h => h.role === 'user').slice(-3).map(h => h.content.toLowerCase()).join(' ');

  // PPV after 3 messages
  if (msgCount >= 3 && msgCount < 5) return { type: 'ppv', price: Math.floor(Math.random() * 4 + 1) * 5 };

  // Custom content after 5 messages
  if (msgCount >= 5 && msgCount < 8) return { type: 'custom_content', price: Math.floor(Math.random() * 4 + 1) * 25 };

  // Voice call if fan mentions wishing to talk
  if (comms.voice_call && /talk|hear your voice|call|phone|speak/.test(lastUserMessages)) {
    return { type: 'voice_call', price: 1.99 };
  }

  // WhatsApp after 8 messages
  if (comms.whatsapp && msgCount >= 8) return { type: 'whatsapp', price: 10 };

  // Toy session if toy enabled and high engagement
  if (comms.toy && msgCount >= 12) return { type: 'toy_session', price: 49 };

  return null;
}

/**
 * Send upsell message via platform
 */
async function sendUpsell(platform, fanId, avatarId, upsell, avatar) {
  const upsellMessages = {
    ppv: `Psst... I just uploaded something really special just for my close fans 🔒 It's only $${upsell.price} — I think you'd love it 💕`,
    custom_content: `You know what, I'd love to make something just for you 🎁 Custom content starting at $${upsell.price}... interested? 👀`,
    voice_call: `I'd actually love to hear your voice too! I do private voice chats... it's way more personal 🎙️ Want to book one? $1.99/min 💫`,
    whatsapp: `This is fun but I feel like we need a more private space to chat 💬 I have a private WhatsApp for my VIPs... want in? 🔐`,
    toy_session: `I have something really exciting I do with my closest fans... private interactive sessions 🔥 Want to know more? 👀`
  };
  const msg = upsellMessages[upsell.type] || `I have something special for you 💕`;
  const adapter = PLATFORM_ADAPTERS[platform];
  if (adapter) await adapter.send(fanId, msg, avatar);
}

/**
 * Log interaction to database
 */
async function logInteraction(data) {
  try {
    const messages = [
      { role: 'user', content: data.message, ts: new Date().toISOString() },
      { role: 'assistant', content: data.reply, ts: new Date().toISOString() }
    ];
    await pool.query(
      `INSERT INTO ai_communications (avatar_id, comm_type, platform, fan_identifier, outcome, messages, session_end)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
      [data.avatar_id, data.comm_type, data.platform, data.fan_identifier, data.outcome, JSON.stringify(messages)]
    );
  } catch (err) { console.warn('[dmEngine] logInteraction failed:', err.message); }
}

// ─── Platform Senders ───────────────────────────────────────────
async function sendFanvue(fanId, message, avatar) {
  if (!process.env.FANVUE_API_KEY) return console.log(`[Fanvue DM to ${fanId}]: ${message}`);
  await axios.post(`https://www.fanvue.com/api/messages`,
    { recipient_id: fanId, message },
    { headers: { Authorization: `Bearer ${process.env.FANVUE_API_KEY}` } }
  ).catch(e => console.warn('[Fanvue send failed]', e.message));
}

async function sendOnlyFans(fanId, message, avatar) {
  console.log(`[OnlyFans DM to ${fanId}]: ${message}`);
  // OnlyFans API requires approved partner access — log for now
}

async function sendGlowx(fanId, message, avatar) {
  if (!process.env.GLOWX_API_URL) return console.log(`[GLOWX DM to ${fanId}]: ${message}`);
  await axios.post(`${process.env.GLOWX_API_URL}/api/messages/internal`,
    { to: fanId, from_avatar: avatar.id, message },
    { headers: { 'x-internal-key': process.env.GLOWX_INTERNAL_KEY } }
  ).catch(e => console.warn('[GLOWX send failed]', e.message));
}

async function sendWhatsApp(fanId, message, avatar) {
  if (!process.env.TWILIO_ACCOUNT_SID) return console.log(`[WhatsApp to ${fanId}]: ${message}`);
  const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: `whatsapp:${avatar.whatsapp_number}`,
    to: `whatsapp:${fanId}`,
    body: message
  }).catch(e => console.warn('[WhatsApp send failed]', e.message));
}

async function sendInstagram(fanId, message, avatar) {
  if (!process.env.META_ACCESS_TOKEN) return console.log(`[Instagram DM to ${fanId}]: ${message}`);
  await axios.post(
    `https://graph.facebook.com/v18.0/me/messages`,
    { recipient: { id: fanId }, message: { text: message } },
    { params: { access_token: process.env.META_ACCESS_TOKEN } }
  ).catch(e => console.warn('[Instagram send failed]', e.message));
}

async function sendTelegram(fanId, message, avatar) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return console.log(`[Telegram to ${fanId}]: ${message}`);
  await axios.post(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    { chat_id: fanId, text: message, parse_mode: 'HTML' }
  ).catch(e => console.warn('[Telegram send failed]', e.message));
}

module.exports = { processMessage, generateReply, detectUpsellMoment, sendUpsell, logInteraction };

