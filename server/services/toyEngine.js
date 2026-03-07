const axios = require('axios');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const LOVENSE_BASE = 'https://api.lovense-api.com/api/lan/v2';
const activeSessions = new Map(); // sessionId -> { toyToken, ws, avatarId, fanId }

// Vibration patterns by mood
const PATTERNS = {
  building:  [3,3,5,5,8,8,10,12,14,14,17,20],
  intense:   [20,15,20,15,20,0,20,0,20,20,20,20],
  teasing:   [5,0,5,0,8,0,8,0,5,0,3,0],
  climax:    [10,12,14,16,18,20,20,20,20,20,20,20],
  gentle:    [3,4,3,4,4,5,4,5,5,4,3,4],
  rhythm:    [10,0,10,0,10,0,10,0,10,0,10,0],
};

// Tip-to-vibration mapping (coins → intensity + duration)
const TIP_MAP = [
  { min: 10,  max: 49,  intensity: 5,  duration: 3000,  label: 'Tease' },
  { min: 50,  max: 99,  intensity: 10, duration: 8000,  label: 'Pulse' },
  { min: 100, max: 249, intensity: 15, duration: 15000, label: 'Surge' },
  { min: 250, max: 499, intensity: 18, duration: 20000, label: 'Storm' },
  { min: 500, max: Infinity, intensity: 20, duration: 30000, label: 'VIBE MAX 🔥' },
];

/**
 * Connect a toy via Lovense API
 */
async function connectToy(sessionId, toyToken) {
  try {
    if (!process.env.LOVENSE_API_KEY) {
      console.log(`[toyEngine] Mock toy connected: session ${sessionId}`);
      activeSessions.set(sessionId, { toyToken, mock: true });
      return { connected: true, mock: true };
    }
    const res = await axios.post(
      `${LOVENSE_BASE}/getQRCode`,
      { token: toyToken, apiVer: '2' },
      { headers: { 'X-LOVENSE-API-KEY': process.env.LOVENSE_API_KEY } }
    );
    if (res.data.result) {
      activeSessions.set(sessionId, { toyToken, connected: true });
      return { connected: true, qrCode: res.data.data?.qrCode };
    }
    throw new Error('Failed to connect toy');
  } catch (err) {
    console.error('[toyEngine] connectToy error:', err.message);
    // Fallback: allow mock session
    activeSessions.set(sessionId, { toyToken, mock: true });
    return { connected: true, mock: true, warning: 'Using simulation mode' };
  }
}

/**
 * Send vibration command to connected toy
 */
async function sendVibration(toyToken, intensity, durationMs) {
  const clampedIntensity = Math.min(20, Math.max(0, intensity));
  try {
    if (!process.env.LOVENSE_API_KEY) {
      console.log(`[toyEngine] VIBE: intensity=${clampedIntensity}, duration=${durationMs}ms`);
      return { sent: true, mock: true };
    }
    await axios.post(
      `${LOVENSE_BASE}/command`,
      { token: toyToken, command: 'Vibrate', timeSec: Math.ceil(durationMs/1000), loopRunningSec: 0, apiVer: '2', v: clampedIntensity },
      { headers: { 'X-LOVENSE-API-KEY': process.env.LOVENSE_API_KEY } }
    );
    return { sent: true, intensity: clampedIntensity, duration: durationMs };
  } catch (err) {
    console.error('[toyEngine] sendVibration error:', err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Enable tip-to-vibe on a live stream
 */
async function startTipControl(avatarId, streamId) {
  const session = `stream_${streamId}`;
  activeSessions.set(session, { avatarId, streamId, tipControl: true, totalTips: 0 });
  console.log(`[toyEngine] Tip control enabled for stream ${streamId}`);
  return { success: true, session, message: 'Tip-to-vibe is now LIVE 🔥' };
}

/**
 * Process a live tip and send vibration
 */
async function processTip(streamId, fanId, tipAmount) {
  const session = activeSessions.get(`stream_${streamId}`);
  if (!session) return { processed: false, reason: 'No active toy session' };
  const level = TIP_MAP.find(t => tipAmount >= t.min && tipAmount <= t.max) || TIP_MAP[0];
  if (session.toyToken) {
    await sendVibration(session.toyToken, level.intensity, level.duration);
  }
  session.totalTips = (session.totalTips || 0) + tipAmount;
  await pool.query(
    `INSERT INTO toy_sessions (avatar_id, fan_identifier, platform, commands_sent, total_tips)
     VALUES ($1,$2,'live_stream',1,$3)
     ON CONFLICT DO NOTHING`,
    [session.avatarId, fanId, tipAmount]
  ).catch(() => {});
  return {
    processed: true,
    label: level.label,
    intensity: level.intensity,
    duration: level.duration,
    announcement: `🔥 ${fanId} sent ${tipAmount} coins — ${level.label}!`
  };
}

/**
 * Start a private remote-control session
 */
async function startPrivateSession(avatarId, fanId, toyToken, durationMinutes) {
  const sessionId = `priv_${Date.now()}_${avatarId.slice(0,8)}`;
  const price = durationMinutes <= 15 ? 29 : durationMinutes <= 30 ? 49 : 89;
  await connectToy(sessionId, toyToken);
  const dbRes = await pool.query(
    `INSERT INTO toy_sessions (avatar_id, fan_identifier, toy_device_id, revenue)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [avatarId, fanId, toyToken, price]
  );
  activeSessions.set(sessionId, { avatarId, fanId, toyToken, dbId: dbRes.rows[0].id, commands: 0 });
  // Auto-end after duration
  setTimeout(() => endSession(sessionId), durationMinutes * 60 * 1000);
  return { sessionId, price, durationMinutes, message: `Private session started. Duration: ${durationMinutes} min. Cost: $${price}` };
}

/**
 * Sync two toys together
 */
async function syncToys(toy1Token, toy2Token, pattern) {
  const steps = PATTERNS[pattern] || PATTERNS.rhythm;
  let i = 0;
  const interval = setInterval(async () => {
    if (i >= steps.length) { clearInterval(interval); return; }
    await Promise.all([
      sendVibration(toy1Token, steps[i], 900),
      sendVibration(toy2Token, steps[i], 900)
    ]);
    i++;
  }, 1000);
  return { synced: true, pattern, steps: steps.length };
}

/**
 * Generate AI vibration pattern based on conversation mood
 */
async function generatePattern(mood) {
  const pattern = PATTERNS[mood] || PATTERNS.rhythm;
  return { mood, pattern, description: `${mood} pattern — ${pattern.length} steps` };
}

/**
 * End a toy session, log stats, charge fan
 */
async function endSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return { ended: false, reason: 'Session not found' };
  try {
    if (session.toyToken) await sendVibration(session.toyToken, 0, 100); // stop
    if (session.dbId) {
      await pool.query(
        `UPDATE toy_sessions SET session_end=NOW(), commands_sent=$1 WHERE id=$2`,
        [session.commands || 0, session.dbId]
      );
    }
    activeSessions.delete(sessionId);
    console.log(`[toyEngine] Session ${sessionId} ended`);
    return { ended: true, sessionId };
  } catch (err) {
    console.error('[toyEngine] endSession error:', err.message);
    activeSessions.delete(sessionId);
    return { ended: true, error: err.message };
  }
}

/**
 * Emergency stop all toys for an avatar
 */
async function emergencyStop(avatarId) {
  const stopped = [];
  for (const [sid, session] of activeSessions.entries()) {
    if (session.avatarId === avatarId && session.toyToken) {
      await sendVibration(session.toyToken, 0, 100);
      activeSessions.delete(sid);
      stopped.push(sid);
    }
  }
  console.log(`[toyEngine] EMERGENCY STOP — stopped ${stopped.length} sessions`);
  return { stopped: stopped.length, sessions: stopped };
}

module.exports = { connectToy, sendVibration, startTipControl, processTip, startPrivateSession, syncToys, generatePattern, endSession, emergencyStop, TIP_MAP, PATTERNS };

