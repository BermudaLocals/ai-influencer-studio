// widget.js — Empire AI Assistant
// Embed on every app: <script src="...widget.js" data-product="CREATRIX" data-color="#C9A84C"></script>
// Serves from Railway: GET /api/assistant/widget.js

(function() {
  const script = document.currentScript;
  const PRODUCT = script?.getAttribute('data-product') || 'EMPIRE';
  const GOLD    = script?.getAttribute('data-color') || '#C9A84C';
  const API     = 'https://ai-influencer-studio-production.up.railway.app';

  const PRODUCT_CONTEXT = {
    CREATRIX:   'CREATRIX Studio — 30 AI tools, videos in 20 seconds, songs in 30, 129 prompts, £13 for 300 tokens',
    GLOWX:      'GLOWX — post to TikTok, Instagram, Facebook, Snapchat simultaneously. 80% payout to creators',
    NVME:       'NVME.live — live stream and earn virtual gifts. Real money in real time.',
    AISTUDIO:   'AI Influencer Studio — build AI creators that post 9x daily and earn subscriptions while you sleep',
    AIGENERAL:  'AI Generalist — all empire tools in one place. Generate anything. Post everywhere.',
    AGROWTHHQ:  'AI Growth HQ — step-by-step system to build passive AI income. Start free.',
    EMPIRE:     'The Empire — CREATRIX Studio, AI Influencer Studio, GLOWX, NVME.live, AI Growth HQ',
  };

  // ── CSS ──────────────────────────────────────────────────────────
  const css = `
    #empire-widget-btn {
      position: fixed; bottom: 28px; right: 28px; z-index: 99999;
      width: 62px; height: 62px; border-radius: 50%;
      background: linear-gradient(135deg, ${GOLD}, #8a6f2e);
      border: 2px solid ${GOLD}; cursor: pointer;
      box-shadow: 0 0 22px ${GOLD}55, 0 4px 16px #0008;
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; transition: transform 0.2s, box-shadow 0.2s;
      animation: empire-pulse 2.5s infinite;
    }
    #empire-widget-btn:hover {
      transform: scale(1.12);
      box-shadow: 0 0 36px ${GOLD}88, 0 4px 20px #000a;
    }
    @keyframes empire-pulse {
      0%,100% { box-shadow: 0 0 22px ${GOLD}55, 0 4px 16px #0008; }
      50%      { box-shadow: 0 0 42px ${GOLD}99, 0 4px 24px #000a; }
    }
    #empire-widget-panel {
      position: fixed; bottom: 104px; right: 28px; z-index: 99998;
      width: 360px; max-height: 540px;
      background: #0d0d0d; border: 1.5px solid ${GOLD};
      border-radius: 16px; overflow: hidden;
      box-shadow: 0 0 40px ${GOLD}33, 0 8px 40px #000c;
      display: none; flex-direction: column;
      font-family: 'Arial', sans-serif;
    }
    #empire-widget-panel.open { display: flex; animation: empire-slide-up 0.22s ease; }
    @keyframes empire-slide-up {
      from { opacity:0; transform: translateY(18px); }
      to   { opacity:1; transform: translateY(0); }
    }
    #ewp-header {
      background: linear-gradient(90deg, #1a1200, #0d0d0d);
      border-bottom: 1px solid ${GOLD}55;
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
    }
    #ewp-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, ${GOLD}, #5a4000);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
      box-shadow: 0 0 10px ${GOLD}66;
    }
    #ewp-title { color: ${GOLD}; font-size: 13px; font-weight: bold; letter-spacing: 0.5px; }
    #ewp-sub   { color: #666; font-size: 11px; margin-top: 1px; }
    #ewp-close {
      margin-left: auto; cursor: pointer; color: #555; font-size: 18px; line-height: 1;
      padding: 4px; transition: color 0.15s;
    }
    #ewp-close:hover { color: ${GOLD}; }
    #ewp-messages {
      flex: 1; overflow-y: auto; padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
      scrollbar-width: thin; scrollbar-color: ${GOLD}33 transparent;
    }
    .ewp-msg {
      max-width: 88%; padding: 10px 13px; border-radius: 12px;
      font-size: 13px; line-height: 1.5;
    }
    .ewp-msg.ai {
      background: #1a1a1a; border: 1px solid ${GOLD}33;
      color: #e8e0d0; align-self: flex-start; border-radius: 4px 12px 12px 12px;
    }
    .ewp-msg.user {
      background: linear-gradient(135deg, #2a1f00, #1a1200);
      border: 1px solid ${GOLD}66; color: ${GOLD};
      align-self: flex-end; border-radius: 12px 4px 12px 12px;
    }
    .ewp-msg.typing {
      background: #1a1a1a; border: 1px solid ${GOLD}22;
      color: #666; font-style: italic;
    }
    #ewp-quick { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px 0; }
    .ewp-quick-btn {
      background: #1a1200; border: 1px solid ${GOLD}44; color: ${GOLD};
      border-radius: 20px; padding: 5px 11px; font-size: 11px;
      cursor: pointer; transition: all 0.15s;
    }
    .ewp-quick-btn:hover { background: ${GOLD}22; border-color: ${GOLD}; }
    #ewp-input-row {
      display: flex; gap: 8px; padding: 12px 14px;
      border-top: 1px solid ${GOLD}22;
      background: #0a0a0a;
    }
    #ewp-input {
      flex: 1; background: #1a1a1a; border: 1px solid ${GOLD}44;
      color: #e8e0d0; border-radius: 22px; padding: 9px 14px;
      font-size: 13px; outline: none; font-family: Arial, sans-serif;
      transition: border-color 0.15s;
    }
    #ewp-input:focus { border-color: ${GOLD}; }
    #ewp-input::placeholder { color: #444; }
    #ewp-send {
      width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, ${GOLD}, #8a6f2e);
      border: none; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.15s; box-shadow: 0 0 8px ${GOLD}44;
    }
    #ewp-send:hover { transform: scale(1.08); }
    #ewp-email-capture {
      background: #110e00; border: 1px solid ${GOLD}55;
      border-radius: 10px; padding: 12px; margin: 8px 14px;
      display: none;
    }
    #ewp-email-capture p { color: #ccc; font-size: 12px; margin: 0 0 8px; }
    #ewp-email-input {
      width: 100%; box-sizing: border-box;
      background: #1a1a1a; border: 1px solid ${GOLD}44; color: #e8e0d0;
      border-radius: 8px; padding: 7px 10px; font-size: 12px; outline: none;
      font-family: Arial; margin-bottom: 6px;
    }
    #ewp-email-btn {
      width: 100%; background: linear-gradient(135deg, ${GOLD}, #8a6f2e);
      border: none; color: #000; font-weight: bold; font-size: 12px;
      border-radius: 8px; padding: 7px; cursor: pointer;
    }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ── HTML ─────────────────────────────────────────────────────────
  const html = `
    <button id="empire-widget-btn" title="Ask your AI Assistant">🤖</button>
    <div id="empire-widget-panel">
      <div id="ewp-header">
        <div id="ewp-avatar">👑</div>
        <div>
          <div id="ewp-title">EMPIRE AI ASSISTANT</div>
          <div id="ewp-sub">${PRODUCT} · Powered by Claude</div>
        </div>
        <div id="ewp-close">✕</div>
      </div>
      <div id="ewp-messages"></div>
      <div id="ewp-quick">
        <button class="ewp-quick-btn" data-q="How do I make a video?">🎬 Make a video</button>
        <button class="ewp-quick-btn" data-q="How do tokens work?">💰 Tokens</button>
        <button class="ewp-quick-btn" data-q="What can I create?">✨ What's possible</button>
        <button class="ewp-quick-btn" data-q="How do I post to TikTok and Facebook?">📱 Post everywhere</button>
      </div>
      <div id="ewp-email-capture">
        <p>💌 Drop your email — I'll send you the full empire walkthrough free</p>
        <input id="ewp-email-input" type="email" placeholder="your@email.com" />
        <button id="ewp-email-btn">SEND ME THE WALKTHROUGH →</button>
      </div>
      <div id="ewp-input-row">
        <input id="ewp-input" placeholder="Ask me anything about ${PRODUCT}..." />
        <button id="ewp-send">➤</button>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);

  // ── LOGIC ─────────────────────────────────────────────────────────
  const panel    = document.getElementById('empire-widget-panel');
  const messages = document.getElementById('ewp-messages');
  const input    = document.getElementById('ewp-input');
  const emailCapture = document.getElementById('ewp-email-capture');
  let history = [];
  let emailCaptured = false;
  let msgCount = 0;

  document.getElementById('empire-widget-btn').onclick = () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open') && messages.children.length === 0) {
      addMsg('ai', `👑 Hey! I'm your ${PRODUCT} AI Assistant.\n\nI can help you make AI videos, music videos, set up your creators, buy tokens, post everywhere — anything. What do you need?`);
    }
  };
  document.getElementById('ewp-close').onclick = () => panel.classList.remove('open');

  document.querySelectorAll('.ewp-quick-btn').forEach(btn => {
    btn.onclick = () => sendMessage(btn.dataset.q);
  });

  document.getElementById('ewp-send').onclick = () => sendMessage(input.value);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(input.value); });

  document.getElementById('ewp-email-btn').onclick = async () => {
    const email = document.getElementById('ewp-email-input').value;
    if (!email || !email.includes('@')) return;
    emailCaptured = true;
    emailCapture.style.display = 'none';
    try {
      await fetch(`${API}/api/leads/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, product: PRODUCT, source: 'widget', page: location.href })
      });
    } catch(e) {}
    addMsg('ai', `✅ Got it! Check your inbox — sending the full empire walkthrough now.\n\nIn the meantime, what do you want to create first?`);
  };

  function addMsg(role, text) {
    const div = document.createElement('div');
    div.className = `ewp-msg ${role}`;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = addMsg('typing', '...');
    return div;
  }

  async function sendMessage(text) {
    if (!text?.trim()) return;
    input.value = '';
    addMsg('user', text);
    msgCount++;

    // Show email capture after 3 messages
    if (msgCount === 3 && !emailCaptured) {
      emailCapture.style.display = 'block';
    }

    const typing = showTyping();

    history.push({ role: 'user', content: text });

    const systemPrompt = `You are the AI assistant for ${PRODUCT_CONTEXT[PRODUCT] || PRODUCT_CONTEXT.EMPIRE}.
You are embedded in the ${PRODUCT} app. You are helpful, enthusiastic, and always guide people toward:
1. Making AI videos, music videos, product videos with singing/dancing AI creators
2. Buying token packs (Starter £4.99 / Creator £12.99 / Empire £34.99)
3. Understanding how CREATRIX Studio, AI Influencer Studio, GLOWX, NVME.live and AI Growth HQ work together
4. Posting content to TikTok, Instagram, Facebook, Snapchat, Threads simultaneously via GLOWX
5. Building AI creators that earn passive income

Keep responses SHORT (2-4 sentences max). Be conversational and enthusiastic. 
Use emojis sparingly. Gold on black is our vibe — confident, premium, direct.
If someone asks about pricing, the Empire Pack at £34.99 gives 300 tokens and is the best value.
If someone seems interested in getting started, mention the free trial and guide them to the buy button.
Never apologise. Never hedge. Be the most helpful AI assistant they have ever talked to.`;

    try {
      const res = await fetch(`${API}/api/assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: PRODUCT,
          system: systemPrompt,
          messages: history.slice(-8) // keep last 8 for context
        })
      });
      const data = await res.json();
      const reply = data.reply || data.message || "I'm having a moment — try again in a second!";
      history.push({ role: 'assistant', content: reply });
      typing.remove();
      addMsg('ai', reply);
    } catch(e) {
      typing.remove();
      addMsg('ai', `Ask me about making AI videos, buying tokens, or how to post your content everywhere. I'm here! 👑`);
    }
  }
})();
