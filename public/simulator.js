(function () {
  'use strict';

  const authToken = localStorage.getItem('authToken');
  const guestId = localStorage.getItem('guestId');
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Simulator is only accessible from the practice page (or via guest sim_launch)
  const _simLaunchRaw = localStorage.getItem('sim_launch');
  if (!_simLaunchRaw) {
    window.location.replace('/practice');
    return;
  }

  // Require either an auth token or a guest ID
  if (!authToken && !guestId) {
    document.getElementById('auth-gate').hidden = false;
    return;
  }

  // Guest already used their free simulator trial — show signup CTA instead
  if (guestId && !authToken && localStorage.getItem('guest_simulate_used') === '1') {
    localStorage.removeItem('sim_launch');
    document.getElementById('setup-panel').hidden = true;
    document.getElementById('auth-gate').hidden = true;
    const container = document.getElementById('setup-panel').parentElement || document.body;
    const el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:16px;padding:40px 20px;text-align:center;';
    el.innerHTML = `
      <p style="font-size:1.1rem;color:var(--text-dim);margin:0 0 8px">You've completed your free simulator trial.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
        <a href="/signup" style="padding:14px 28px;background:var(--primary);color:#04231a;font-weight:700;border-radius:10px;text-decoration:none;font-size:1rem;">Create Free Account →</a>
        <a href="/pricing" style="padding:14px 24px;background:transparent;color:var(--primary);border:1px solid var(--primary);font-weight:600;border-radius:10px;text-decoration:none;font-size:0.95rem;">See Pricing</a>
      </div>`;
    document.body.appendChild(el);
    return;
  }

  document.getElementById('setup-panel').hidden = true;
  document.getElementById('auth-gate').hidden = true;

  // Pre-fill CV from user profile (skip if practice page already supplies it)
  if (false) {
    fetch('/api/resume', { headers: { 'Authorization': `Bearer ${authToken}` } })
      .then(r => r.json())
      .then(data => { if (data.success && data.content) els.cvInput.value = data.content; })
      .catch(() => {});

    // Pre-fill JD from last session
    const savedJd = localStorage.getItem('simulator_jd');
    if (savedJd) document.getElementById('jd-input').value = savedJd;
  }

  // ── Interview config ──────────────────────────────────────────────────────
  const simConfig = { type: 'general', difficulty: 'mid', pressure: 'standard', interviewers: '2', duration: '20', language: 'en', skipIntro: true, accent: 'american', role: '', experienceYears: '' };

  const langToSpeechLang = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', pt: 'pt-BR', it: 'it-IT', ar: 'ar-SA', zh: 'zh-CN' };

  document.querySelectorAll('.pill-group').forEach(group => {
    group.addEventListener('click', e => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      simConfig[group.dataset.group] = pill.dataset.value;
    });
  });

  const skipIntroToggle = document.getElementById('skip-intro-toggle');
  if (skipIntroToggle) {
    skipIntroToggle.addEventListener('change', () => { simConfig.skipIntro = skipIntroToggle.checked; });
  }

  // ── Personas ──────────────────────────────────────────────────────────────
  const personas = [
    { name: 'Daniel', initial: 'D', ttsVoice: 'onyx', avatarClass: '' },
    { name: 'Priya',  initial: 'P', ttsVoice: 'nova',  avatarClass: 'avatar-2' }
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  let state          = 'idle';
  let socket         = null;
  let ttsSpeaking    = false;
  let recognition    = null;
  let audioCtx       = null;
  let currentSrc     = null;
  let analyser       = null;
  let micStream      = null;
  let waveRaf        = null;
  let answerText     = '';
  let interimText    = '';
  let lastActivity   = 0;
  let lastTtsText    = '';
  let interruptTimer = null;
  let queuedQuestion = null;
  let browserVoices  = [null, null];
  let currentQData   = null;   // question currently being answered

  // Holds Q data while feedback arrives async in background
  let pendingFeedbackQ        = null;
  let pendingFeedbackAnswer   = '';
  let pendingFeedbackDelivery = null;
  let pendingInterruptIdx     = -1;  // sessionHistory index for interrupted answer awaiting feedback
  let pendingDebriefIdx       = -1;  // sessionHistory index for last question shown in debrief before feedback arrived
  let endedDueToQuota         = false; // session ended because free questions ran out — show upgrade CTA on debrief

  // Session history — filled per question, shown in debrief
  let sessionHistory = [];

  // Session timer
  let sessionStartTime  = 0;
  let sessionDurationMs = 0;
  let timerInterval     = null;

  // Delivery tracking
  let answerStartTime     = 0;
  let speechPauses        = [];
  let _inPause            = false;
  let _pauseStartedAt     = null;
  let lastDeliveryMetrics = null;
  let lastRawAnswer       = '';

  // ── DOM ───────────────────────────────────────────────────────────────────
  const els = {
    setupPanel:      document.getElementById('setup-panel'),
    iosReadyPanel:   document.getElementById('ios-ready-panel'),
    simPanel:        document.getElementById('simulator-panel'),
    cvInput:         document.getElementById('cv-input'),
    jdInput:         document.getElementById('jd-input'),
    startBtn:        document.getElementById('start-btn'),
    endBtn:          document.getElementById('end-btn'),
    nextBtn:         document.getElementById('next-btn'),
    avatar:          document.getElementById('sim-avatar'),
    name:            document.getElementById('sim-name'),
    badge:           document.getElementById('sim-badge'),
    question:        document.getElementById('sim-question'),
    deliveryStats:   document.getElementById('delivery-stats'),
    micDot:          document.getElementById('mic-dot'),
    ctrlStatus:      document.getElementById('controls-status'),
    statusChip:      document.getElementById('status-chip'),
    sessionTimer:    document.getElementById('session-timer'),
    debriefPanel:    document.getElementById('debrief-panel'),
    debriefSub:      document.getElementById('debrief-sub'),
    debriefOverall:  document.getElementById('debrief-overall'),
    debriefQuestions:document.getElementById('debrief-questions'),
    debriefRestart:  document.getElementById('debrief-restart'),
    loadingPanel:    document.getElementById('session-loading'),
  };

  // ── State machine ─────────────────────────────────────────────────────────
  function setState(s) {
    state = s;
    els.simPanel.dataset.state = s;
  }

  // ── Socket ────────────────────────────────────────────────────────────────
  function connectSocket() {
    socket = io({ auth: { token: authToken || null, guestId: guestId || null } });
    socket.on('connect', () => setChip('Live', 'live'));
    socket.on('disconnect', () => setChip('Disconnected', ''));
    socket.on('error', err => {
      if (err?.message?.includes('Authentication') && authToken) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    });
    socket.on('practice-question', onQuestion);
    socket.on('practice-feedback', onFeedback);
    socket.on('practice-audio', onPracticeAudio);
    socket.on('practice-error', onPracticeError);
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  const setupErrorEl = document.getElementById('setup-error');
  function showSetupError(msg) {
    if (setupErrorEl) { setupErrorEl.textContent = msg; setupErrorEl.hidden = false; }
  }

  // Stored during auto-launch so the ready button can use them without reading textareas
  let _launchCv = '';
  let _launchJd = '';
  let _launchAdditionalInfo = '';

  async function doStart(cv, jd, additionalInfo = '') {
    if (!cv || !jd) { showSetupError('Please add your CV and job description before starting.'); return; }
    if (setupErrorEl) setupErrorEl.hidden = true;

    // ── Everything below must stay SYNCHRONOUS until the first await ──────────
    // iOS's user-gesture window closes at the first await, so unlock audio and
    // start the mic BEFORE any async call.

    // Unlock speech synthesis (iOS Safari requires this in the gesture chain)
    try { if (window.speechSynthesis) speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch (_) {}

    // Create AudioContext synchronously (resume() is async — done later)
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}

    els.startBtn.disabled = true;
    const readyBtn = document.getElementById('ready-start-btn');
    if (readyBtn) readyBtn.disabled = true;

    localStorage.setItem('simulator_jd', jd);
    if (guestId && !authToken) localStorage.setItem('guest_simulate_used', '1');
    sessionHistory = [];

    // Hide whichever entry panel is visible, show sim panel IMMEDIATELY
    els.setupPanel.hidden = true;
    if (els.iosReadyPanel) els.iosReadyPanel.hidden = true;
    els.simPanel.hidden = false;
    setState('awaiting');
    setChip('Connecting…', '');
    setCtrl('Connecting…');
    setMic(false);

    sessionStartTime  = Date.now();
    sessionDurationMs = parseInt(simConfig.duration) * 60 * 1000;
    startSessionTimer();

    // Start mic NOW — synchronous call, still within the user gesture window on iOS
    startRecognition();
    startWaveform();

    // ── Async from here ──────────────────────────────────────────────────────
    // audioCtx.resume() hangs forever on iOS when called outside a user gesture.
    // Fire-and-forget with a race so we never block on it.
    try {
      if (audioCtx) {
        await Promise.race([audioCtx.resume(), new Promise(r => setTimeout(r, 300))]);
        const buf = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
        const src = audioCtx.createBufferSource();
        src.buffer = buf; src.connect(audioCtx.destination); src.start(0);
      }
    } catch (_) {}

    // Connect socket
    try {
      connectSocket();
    } catch (e) {
      setCtrl('Connection failed — please refresh and try again.');
      return;
    }

    // Wait for socket to connect (event-driven, 8s timeout)
    await new Promise(r => {
      if (socket?.connected) { r(); return; }
      const done = () => r();
      socket.once('connect', done);
      setTimeout(() => { try { socket?.off('connect', done); } catch (_) {} r(); }, 8000);
    });

    socket.emit('update-context', { cvContext: cv, jobDescription: jd });
    socket.emit('practice-start', {
      type:         simConfig.type,
      difficulty:   simConfig.difficulty,
      pressure:     simConfig.pressure,
      interviewers: parseInt(simConfig.interviewers),
      duration:     parseInt(simConfig.duration),
      language:     simConfig.language,
      skipIntro:    simConfig.skipIntro,
      role:         simConfig.role,
      experienceYears: simConfig.experienceYears,
      additionalInfo: additionalInfo || ''
    });

    setCtrl('Preparing first question…');
  }

  // Ready panel button (iOS auto-launch — uses stored cv/jd from sim_launch)
  const readyStartBtn = document.getElementById('ready-start-btn');
  if (readyStartBtn) {
    readyStartBtn.addEventListener('click', () => doStart(_launchCv, _launchJd, _launchAdditionalInfo));
  }

  els.startBtn.addEventListener('click', () => doStart(els.cvInput.value.trim(), els.jdInput.value.trim()));

  // ── End / Debrief ─────────────────────────────────────────────────────────
  els.endBtn.addEventListener('click', endAndDebrief);

  if (guestId && !authToken) {
    // Replace "Practice Again" with guest signup CTA
    const footer = els.debriefRestart.closest('.debrief-footer');
    if (footer) {
      footer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:10px;width:100%">
          <p style="margin:0;font-size:14px;color:var(--text-dim)">You've completed your free trial — both practice and simulator.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end">
            <a href="/signup" style="background:var(--primary);color:#04231a;font-weight:700;font-size:15px;padding:12px 24px;border-radius:8px;text-decoration:none;white-space:nowrap">Create Free Account →</a>
            <a href="/pricing" style="background:transparent;color:var(--primary);font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;text-decoration:none;border:1px solid var(--primary);white-space:nowrap">See Pricing</a>
          </div>
        </div>`;
    }
  } else {
    els.debriefRestart.addEventListener('click', () => { window.location.href = '/practice'; });
  }

  function endAndDebrief() {
    clearTimeout(interruptTimer);
    clearInterval(timerInterval);
    timerInterval = null;
    stopRecognition();
    stopAudio();
    stopWaveform();
    speechSynthesis.cancel();
    ttsSpeaking = false;
    queuedQuestion = null;
    sessionStartTime = 0;

    // Flush last answer — either waiting for feedback, or partial (< 8 words) still in answerText
    if (pendingFeedbackQ) {
      pendingDebriefIdx = sessionHistory.length;
      sessionHistory.push({
        question:    pendingFeedbackQ.text,
        kind:        pendingFeedbackQ.kind,
        interviewer: pendingFeedbackQ.interviewer,
        answer:      pendingFeedbackAnswer,
        delivery:    pendingFeedbackDelivery,
        feedback:    null
      });
      pendingFeedbackQ = null;
    } else if (currentQData && answerText.trim().split(/\s+/).filter(Boolean).length >= 1) {
      // Partial answer (too short for the tick loop) — capture it anyway
      const raw = answerText.trim();
      const delivery = computeDelivery(raw);
      pendingDebriefIdx = sessionHistory.length;
      sessionHistory.push({
        question:    currentQData.text,
        kind:        currentQData.kind,
        interviewer: currentQData.interviewer,
        answer:      raw,
        delivery:    delivery,
        feedback:    null
      });
      if (socket) socket.emit('practice-answer', { text: raw, finalAnswer: true });
    }

    if (socket) {
      socket.emit('practice-end');
      // If we're still waiting for a feedback response (pendingDebriefIdx is set),
      // keep the socket open so onFeedback can receive and backfill it.
      // onFeedback's pendingDebriefIdx branch will disconnect when done.
      if (pendingDebriefIdx < 0) {
        socket.disconnect();
        socket = null;
      } else {
        // Safety: disconnect and clear placeholder after 25 s if feedback never arrives
        setTimeout(() => {
          if (socket) { socket.disconnect(); socket = null; }
          if (pendingDebriefIdx >= 0) {
            const cards = els.debriefQuestions.querySelectorAll('.dq-card');
            const card = cards[pendingDebriefIdx];
            if (card) {
              const ph = card.querySelector('.dq-feedback-loading');
              if (ph) ph.textContent = 'Feedback unavailable.';
            }
            pendingDebriefIdx = -1;
          }
        }, 25000);
      }
    }

    els.simPanel.hidden = true;
    els.sessionTimer.hidden = true;

    els.loadingPanel.hidden = false;
    showDebrief();
  }

  function resetToSetup() {
    els.debriefPanel.hidden = true;
    els.simPanel.hidden = true;
    if (els.iosReadyPanel) els.iosReadyPanel.hidden = true;
    els.setupPanel.hidden = false;
    els.startBtn.disabled = false;
    setState('idle');
    setMic(false);
    els.statusChip.className = 'status-chip';
    els.sessionTimer.hidden = true;
    els.sessionTimer.className = '';
    els.question.textContent = 'Preparing your first question…';
    els.question.className = 'question-placeholder';
    els.badge.hidden = true;
    lastDeliveryMetrics = null;
    lastRawAnswer = '';
    sessionHistory = [];
    currentQData = null;
    timeExpired = false;
    pendingDebriefIdx = -1;
  }

  // ── Question received ─────────────────────────────────────────────────────
  function onQuestion(d) {
    if (timeExpired) return; // time is up — ignore next question, wait for debrief
    // Server may cap duration for trial users — sync the timer
    if (d.duration && d.duration !== parseInt(simConfig.duration)) {
      simConfig.duration = String(d.duration);
      sessionDurationMs = d.duration * 60 * 1000;
      clearInterval(timerInterval);
      startSessionTimer();
    }
    playQuestion(d);
  }

  function playQuestion(d) {
    setState('listening');
    queuedQuestion = null;
    currentQData = d;

    const p = personas[d.interviewer] || personas[0];
    els.avatar.textContent = p.initial;
    els.avatar.className   = 'avatar ' + (p.avatarClass || '');
    els.name.textContent   = p.name;

    const labels = { opener: 'Opening', next: 'New topic', followup: 'Follow-up', interrupt: '⚡ Interruption' };
    els.badge.textContent = labels[d.kind] || '';
    els.badge.className   = 'badge ' + (d.kind || '');
    els.badge.hidden      = false;

    // Question text is revealed inside speak() at the moment audio starts
    speak(d, p);
  }

  // ── Pre-generated TTS audio arrived after question was already displayed ──
  function onPracticeAudio(d) {
    // Audio arrived too late — client already fetched TTS via /api/tts or used browser TTS.
    // Nothing to do; this event is informational only.
  }

  // ── Server-side error generating the first question ───────────────────────
  function onPracticeError(err) {
    if (err && err.code === 'NO_QUESTIONS') {
      // Out of questions — the session is effectively over, so go straight to the
      // debrief instead of leaving the user stuck on this screen until the timer
      // runs out or they click "End & get debrief" manually.
      endedDueToQuota = true;
      endAndDebrief();
    } else if (err && err.code === 'GUEST_USED') {
      // Guest already used their free simulator trial — stop everything and show CTA
      clearTimeout(interruptTimer);
      clearInterval(timerInterval);
      timerInterval = null;
      stopRecognition();
      stopAudio();
      localStorage.setItem('guest_simulate_used', '1');
      localStorage.removeItem('sim_launch');
      els.simPanel.hidden = true;
      els.loadingPanel.hidden = true;
      const el = document.createElement('div');
      el.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:16px;padding:40px 20px;text-align:center;';
      el.innerHTML = `
        <p style="font-size:1.1rem;color:var(--text-dim);margin:0 0 8px">You've already used your free simulator trial.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
          <a href="/signup" style="padding:14px 28px;background:var(--primary);color:#04231a;font-weight:700;border-radius:10px;text-decoration:none;font-size:1rem;">Create Free Account →</a>
          <a href="/pricing" style="padding:14px 24px;background:transparent;color:var(--primary);border:1px solid var(--primary);font-weight:600;border-radius:10px;text-decoration:none;font-size:0.95rem;">See Pricing</a>
        </div>`;
      document.body.appendChild(el);
    } else {
      setCtrl((err && err.message) || 'Something went wrong. Please try again.');
      setChip('Error', '');
    }
  }

  // ── Feedback received — stored silently for debrief ──────────────────────
  function onFeedback(data) {
    if (pendingInterruptIdx >= 0) {
      // Backfill feedback into the interrupted answer entry already in sessionHistory
      sessionHistory[pendingInterruptIdx].feedback = data;
      pendingInterruptIdx = -1;
    } else if (pendingFeedbackQ) {
      sessionHistory.push({
        question:    pendingFeedbackQ.text,
        kind:        pendingFeedbackQ.kind,
        interviewer: pendingFeedbackQ.interviewer,
        answer:      pendingFeedbackAnswer,
        delivery:    pendingFeedbackDelivery,
        feedback:    data
      });
      pendingFeedbackQ = null;
    } else if (pendingDebriefIdx >= 0) {
      // Debrief already shown but feedback for last question arrived late — backfill it
      sessionHistory[pendingDebriefIdx].feedback = data;
      const idx = pendingDebriefIdx;
      pendingDebriefIdx = -1;
      // Re-render just the last debrief card with the now-complete feedback
      const cards = els.debriefQuestions.querySelectorAll('.dq-card');
      const card = cards[idx];
      if (card) {
        const h = sessionHistory[idx];
        const tips = Array.isArray(h.feedback?.tips) ? h.feedback.tips : [];
        const score = h.feedback?.score ?? null;
        const sColor = !score ? '#94a3b8' : score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#f87171';
        // Update score in header
        const scoreEl = card.querySelector('.dq-score');
        if (scoreEl) { scoreEl.textContent = `${score}/10`; scoreEl.style.color = sColor; }
        else if (score != null) {
          const chevron = card.querySelector('.dq-chevron');
          if (chevron) chevron.insertAdjacentHTML('beforebegin', `<span class="dq-score" style="color:${sColor}">${score}/10</span>`);
        }
        // Inject suggested answer and tips into the card body
        const body = card.querySelector('.dq-body');
        if (body) {
          // Remove any existing loading placeholder
          const placeholder = body.querySelector('.dq-feedback-loading');
          if (placeholder) placeholder.remove();
          if (h.feedback?.suggested_answer) {
            const divider = document.createElement('div'); divider.className = 'dq-divider';
            const sugDiv = document.createElement('div');
            sugDiv.innerHTML = `<p class="dq-section-label green">Suggested answer</p><p class="dq-suggested">${escHtml(h.feedback.suggested_answer)}</p>`;
            body.appendChild(divider);
            body.appendChild(sugDiv);
          }
          if (tips.length) {
            const tipsDiv = document.createElement('div');
            tipsDiv.innerHTML = `<p class="dq-section-label amber">What to improve</p><ul class="dq-tips">${tips.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>`;
            body.appendChild(tipsDiv);
          }
        }
      }
      // Socket was kept alive for this feedback — disconnect now that we're done
      if (socket) { socket.disconnect(); socket = null; }
      return; // already went to debrief, don't call endAndDebrief again
    }

    // Time expired final answer — go to debrief
    if (data.finalAnswer || timeExpired) {
      endAndDebrief();
    }
  }

  // ── TTS playback ──────────────────────────────────────────────────────────
  async function speak(d, p) {
    clearTimeout(interruptTimer);
    stopAudio();
    stopRecognition();

    ttsSpeaking = true;
    setMic(false);
    setCtrl(`${p.name} is speaking…`);
    setChip(`${p.name} speaking`, 'speaking');
    els.avatar.classList.add('speaking');

    const onDone = () => {
      if (!ttsSpeaking) return;
      ttsSpeaking    = false;
      currentSrc     = null;
      els.avatar.classList.remove('speaking');
      if (state !== 'listening') return;
      lastTtsText     = d.text;
      answerText      = '';
      interimText     = '';
      lastActivity    = Date.now();
      answerStartTime = Date.now();
      speechPauses    = [];
      _inPause        = false;
      _pauseStartedAt = null;
      setCtrl('Your turn — answer out loud');
      setChip('Listening', 'live');
      setMic(true);
      startRecognition();
      const interruptProb = { relaxed: 0, standard: 0.5, high: 0.85 }[simConfig.pressure] ?? 0.5;
      if (d.kind !== 'interrupt' && Math.random() < interruptProb) {
        interruptTimer = setTimeout(fireInterrupt, 8000 + Math.random() * 10000);
      }
    };

    const revealQuestion = () => {
      els.question.textContent = d.text;
      els.question.className   = 'question-text';
    };

    try {
      if (d.audio) {
        // Pre-generated audio included — decode then reveal text + play together
        const bytes = Uint8Array.from(atob(d.audio), c => c.charCodeAt(0));
        const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        audioCtx = ctx;
        await ctx.resume();
        const decoded = await ctx.decodeAudioData(bytes.buffer);
        const src = ctx.createBufferSource();
        src.buffer = decoded; src.connect(ctx.destination);
        currentSrc = src; src.onended = onDone;
        revealQuestion(); src.start(0);
      } else {
        // Fetch OpenAI TTS, then reveal text + play together when ready
        const r = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: d.text, voice: p.ttsVoice })
        });
        if (!r.ok) throw new Error('TTS ' + r.status);
        const ab = await r.arrayBuffer();
        if (!ttsSpeaking) return; // cancelled while fetching
        const ctx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        audioCtx = ctx;
        await ctx.resume();
        const decoded = await ctx.decodeAudioData(ab);
        if (!ttsSpeaking) return; // cancelled while decoding
        const src = ctx.createBufferSource();
        src.buffer = decoded; src.connect(ctx.destination);
        currentSrc = src; src.onended = onDone;
        revealQuestion(); src.start(0);
      }
    } catch (e) {
      console.warn('TTS error, falling back to browser TTS:', e);
      const u = new SpeechSynthesisUtterance(d.text);
      if (browserVoices[d.interviewer]) { u.voice = browserVoices[d.interviewer].voice; u.pitch = browserVoices[d.interviewer].pitch; }
      u.rate = 1.0; u.onend = onDone; u.onerror = onDone;
      revealQuestion(); speechSynthesis.speak(u);
    }
  }

  function stopAudio() {
    if (currentSrc) { try { currentSrc.stop(); } catch (_) {} currentSrc = null; }
    try { speechSynthesis.cancel(); } catch (_) {}
  }

  // ── Voice waveform visualizer ─────────────────────────────────────────────
  function startWaveform() {
    const canvas = document.getElementById('voice-canvas');
    if (!canvas) return;
    const ctx2 = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const BAR_COUNT = 20;
    const BAR_W = 2, GAP = 2;

    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(stream => {
      micStream = stream;
      const ac = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      audioCtx = ac;
      analyser = ac.createAnalyser();
      analyser.fftSize = 64;
      const src = ac.createMediaStreamSource(stream);
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      function draw() {
        waveRaf = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const isSpeaking = state === 'listening' && !ttsSpeaking;

        ctx2.clearRect(0, 0, W, H);
        if (!isSpeaking) { canvas.classList.remove('active'); return; }
        canvas.classList.add('active');

        for (let i = 0; i < BAR_COUNT; i++) {
          const val = data[Math.floor(i * data.length / BAR_COUNT)] / 255;
          const barH = Math.max(2, val * H);
          const x = i * (BAR_W + GAP);
          const y = (H - barH) / 2;
          ctx2.fillStyle = `rgba(16,185,129,${0.4 + val * 0.6})`;
          ctx2.beginPath();
          ctx2.roundRect(x, y, BAR_W, barH, 1);
          ctx2.fill();
        }
      }
      draw();
    }).catch(() => {}); // mic already in use via SpeechRecognition — silently ignore
  }

  function stopWaveform() {
    if (waveRaf) { cancelAnimationFrame(waveRaf); waveRaf = null; }
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    const canvas = document.getElementById('voice-canvas');
    if (canvas) canvas.classList.remove('active');
  }

  // Kill all audio + socket when user navigates away
  window.addEventListener('pagehide', () => {
    ttsSpeaking = false;
    try { speechSynthesis.cancel(); } catch (_) {}
    if (currentSrc) { try { currentSrc.stop(); } catch (_) {} currentSrc = null; }
    if (audioCtx) { try { audioCtx.close(); } catch (_) {} audioCtx = null; }
    if (socket) { try { socket.disconnect(); } catch (_) {} socket = null; }
    stopWaveform();
  });

  // ── Speech recognition ────────────────────────────────────────────────────
  function startRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    stopRecognition();
    recognition = new SR();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = langToSpeechLang[simConfig.language] || 'en-US';

    recognition.onresult = (event) => {
      if (state !== 'listening' || ttsSpeaking) return;
      const now = Date.now();
      if (_inPause && _pauseStartedAt) {
        const dur = now - _pauseStartedAt;
        if (dur > 1500) speechPauses.push({ duration: dur });
        _inPause = false; _pauseStartedAt = null;
      }
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const t = event.results[i][0].transcript;
          if (!isTtsEcho(t)) { answerText += t + ' '; lastActivity = now; }
          interimText = '';
        } else {
          interimText = event.results[i][0].transcript;
          if (interimText) lastActivity = now;
        }
      }
    };

    recognition.onerror = e => { if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('SR error:', e.error); };
    // Use setTimeout so iOS Safari allows the restart outside the original user gesture
    recognition.onend = () => { if (state === 'listening' && !ttsSpeaking) setTimeout(() => { try { recognition && recognition.start(); } catch (_) {} }, 100); };
    try { recognition.start(); } catch (_) {}
  }

  function stopRecognition() {
    if (recognition) { try { recognition.abort(); } catch (_) {} recognition = null; }
    interimText = '';
  }

  // ── Tick: detect answer complete ──────────────────────────────────────────
  setInterval(() => {
    if (state !== 'listening' || ttsSpeaking) return;
    if (!lastActivity) return;
    const now      = Date.now();
    const words    = answerText.trim().split(/\s+/).filter(Boolean).length;
    const silence  = now - lastActivity;
    const speaking = interimText.trim().length > 0;

    if (words > 0 && !speaking && !_inPause && silence > 1500) {
      _inPause = true; _pauseStartedAt = lastActivity;
    }

    const silenceMs = { relaxed: 4200, standard: 3000, high: 2200 }[simConfig.pressure] ?? 3000;
    // After time expires, use a shorter silence threshold so we don't keep them waiting
    const effectiveSilenceMs = timeExpired ? Math.min(silenceMs, 2000) : silenceMs;
    if (words >= 8 && !speaking && silence > effectiveSilenceMs) {
      clearTimeout(interruptTimer);
      const raw = answerText.trim();
      lastRawAnswer = raw;
      lastDeliveryMetrics = computeDelivery(raw);
      setState('processing');
      setCtrl(timeExpired ? 'Time\'s up — wrapping up…' : 'Reviewing your answer…');
      setChip('Thinking', 'thinking');
      setMic(false);
      stopRecognition();
      // Snapshot what we're submitting so onFeedback can store it even after currentQData moves on
      pendingFeedbackQ        = currentQData;
      pendingFeedbackAnswer   = raw;
      pendingFeedbackDelivery = lastDeliveryMetrics ? { ...lastDeliveryMetrics } : null;
      if (timeExpired) {
        socket.emit('practice-answer', { text: raw, finalAnswer: true });
      } else {
        socket.emit('practice-answer', { text: raw });
      }
      answerText = '';
    }
  }, 400);

  // ── Interrupt ─────────────────────────────────────────────────────────────
  function fireInterrupt() {
    if (timeExpired || state !== 'listening' || ttsSpeaking) return;
    const partial = (answerText + ' ' + interimText).trim();
    const words = partial.split(/\s+/).filter(Boolean).length;
    // Only interrupt while the user is actively speaking (interimText is live)
    if (words < 8 || interimText.trim().length === 0) {
      interruptTimer = setTimeout(fireInterrupt, 2000);
      return;
    }
    // Save interrupted Q+A with delivery metrics; feedback will backfill via pendingInterruptIdx
    if (currentQData) {
      pendingInterruptIdx = sessionHistory.length;
      sessionHistory.push({
        question:    currentQData.text,
        kind:        currentQData.kind,
        interviewer: currentQData.interviewer,
        answer:      partial,
        delivery:    computeDelivery(partial),
        feedback:    null
      });
    }
    setState('processing');
    setCtrl('⚡ Interrupted…');
    stopRecognition();
    socket.emit('practice-interrupt', { partial });
    answerText = '';
  }

  // ── TTS echo filter ───────────────────────────────────────────────────────
  function isTtsEcho(text) {
    if (!lastTtsText) return false;
    const ttsWords = new Set(lastTtsText.toLowerCase().split(/\s+/));
    const words = text.toLowerCase().split(/\s+/);
    if (!words.length || words.length > ttsWords.size * 1.5) return false;
    return words.filter(w => ttsWords.has(w)).length / words.length >= 0.7;
  }

  // ── Browser TTS fallback ──────────────────────────────────────────────────
  function pickBrowserVoices() {
    if (!window.speechSynthesis) return;
    const load = () => {
      const vs = speechSynthesis.getVoices().filter(v => v.lang?.toLowerCase().startsWith('en'));
      if (!vs.length) return;
      const find = (...names) => vs.find(v => names.some(n => v.name.toLowerCase().includes(n)));
      const male   = find('daniel', 'google uk english male', 'arthur', 'alex') || vs[0];
      const female = find('samantha', 'karen', 'serena', 'kate', 'moira')       || vs[Math.min(1, vs.length - 1)];
      const same = male === female;
      browserVoices[0] = { voice: male,   pitch: same ? 0.75 : 1.0  };
      browserVoices[1] = { voice: female, pitch: same ? 1.25 : 1.05 };
    };
    speechSynthesis.onvoiceschanged = load; load();
  }
  pickBrowserVoices();

  // ── Speech performance ────────────────────────────────────────────────────
  function computeDelivery(text) {
    const duration    = answerStartTime ? (Date.now() - answerStartTime) / 1000 : 0;
    const words       = text.split(/\s+/).filter(Boolean);
    const wordCount   = words.length;
    const wpm         = duration > 0 && wordCount > 0 ? Math.round((wordCount / duration) * 60) : null;
    const fillerPat   = /\b(um|uh|mmm|hmm|ah|well|like|you know|actually|basically|literally|so|right|okay|yeah)\b/gi;
    const fillerCount = (text.match(fillerPat) || []).length;
    const pauseCount  = speechPauses.length;
    const longestPause = pauseCount > 0 ? Math.max(...speechPauses.map(p => p.duration)) : 0;
    const fillerRatio  = wordCount > 0 ? fillerCount / wordCount : 0;
    const pausePenalty = (pauseCount * 0.03) + (longestPause > 4000 ? 0.05 : 0);
    const confidenceScore = fillerRatio + pausePenalty;

    // Repetition detection
    const stopWords = new Set([
      'i','me','my','we','our','you','your','he','she','it','they','them','the','a','an',
      'and','or','but','in','on','at','to','for','of','with','by','from','that','this',
      'is','was','are','were','be','been','have','has','had','do','does','did','will',
      'would','could','should','can','may','might','must','not','no','then','than','when',
      'where','how','what','who','which','if','up','out','about','into','just','also',
      'very','more','all','any','there','their','its','am','as','every','time','some',
      'get','got','go','make','one','two','him','her','his','mine','yours','ours',
      'these','those','while','after','before','because','since','until','even','too',
      'only','each','most','other','same','such','own','over','again','here','way','back','down'
    ]);
    const fillerSet = new Set(['um','uh','mmm','hmm','ah','well','like','know','actually','basically','literally','so','right','okay','yeah']);
    const wordFreq = {};
    (text.toLowerCase().match(/\b[a-z]+\b/g) || []).forEach(w => {
      if (w.length >= 4 && !stopWords.has(w) && !fillerSet.has(w)) {
        wordFreq[w] = (wordFreq[w] || 0) + 1;
      }
    });
    const repeatedWords = Object.keys(wordFreq).filter(w => wordFreq[w] >= 2);
    const repetitionCount = repeatedWords.length;
    const topRepeat = repetitionCount > 0 ? repeatedWords.sort((a, b) => wordFreq[b] - wordFreq[a])[0] : null;
    const topRepeatCount = topRepeat ? wordFreq[topRepeat] : 0;

    return { wpm, wordCount, fillerCount, pauseCount, longestPause, confidenceScore, duration, repetitionCount, topRepeat, topRepeatCount, wordFreq, repeatedWords };
  }

  function renderDeliveryStats(metrics) {
    if (!metrics) { els.deliveryStats.innerHTML = ''; return; }
    const { wpm, fillerCount, confidenceScore, repetitionCount, topRepeat, topRepeatCount } = metrics;
    const wpmRating = !wpm ? { label: '—', color: '#94a3b8' }
      : wpm < 100 ? { label: 'Too slow', color: '#f87171' }
      : wpm > 170 ? { label: 'Too fast',  color: '#f87171' }
      : wpm > 140 ? { label: 'Good',      color: '#10b981' }
      : { label: 'Ideal', color: '#10b981' };
    const confidence = confidenceScore > 0.10 ? { label: 'Low',    color: '#f87171' }
      : confidenceScore < 0.03              ? { label: 'High',   color: '#10b981' }
      : { label: 'Medium', color: '#f59e0b' };
    const fillerColor = fillerCount > 5 ? '#f87171' : fillerCount > 2 ? '#f59e0b' : '#10b981';
    const repColor = repetitionCount > 3 ? '#f87171' : repetitionCount > 1 ? '#f59e0b' : '#10b981';
    const repSub = topRepeat ? `"${topRepeat}" ×${topRepeatCount}` : null;

    els.deliveryStats.innerHTML = '';
    [[  'Pace',        wpm ? `${wpm} wpm` : '—', wpmRating.color,  wpmRating.label !== '—' ? wpmRating.label : null, '0ms'   ],
     [  'Fillers',     fillerCount,               fillerColor,      null,                                              '60ms'  ],
     [  'Repetitions', repetitionCount,            repColor,         repSub,                                           '120ms' ],
     [  'Confidence',  confidence.label,           confidence.color, null,                                             '180ms' ]
    ].forEach(([label, value, color, sub, delay]) => {
      const el = document.createElement('div');
      el.className = 'stat-card';
      el.style.setProperty('--stagger', delay);
      el.innerHTML = `<div class="stat-label">${label}</div><div class="stat-value" style="color:${color}">${value}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}`;
      els.deliveryStats.appendChild(el);
    });
  }

  function annotateTranscript(text) {
    const fillerPat = /\b(um|uh|mmm|hmm|ah|well|like|you know|actually|basically|literally|so|right|okay|yeah)\b/gi;
    const vaguePat  = /\b(kind of|sort of|i think|i guess|maybe|perhaps|might|probably|i feel like|i suppose|somewhat|fairly|quite|rather|a bit|stuff|things|something like)\b/gi;
    const strongPat = /\b(led|managed|delivered|achieved|increased|reduced|improved|built|launched|developed|created|designed|implemented|saved|grew|scaled|negotiated|resolved|exceeded|spearheaded|initiated|drove|mentored|\d+%|\$\d+|\d+ (?:years?|months?|people|team|projects?))\b/gi;

    // Build repetition pattern from the text
    const stopWords = new Set([
      'i','me','my','we','our','you','your','he','she','it','they','them','the','a','an',
      'and','or','but','in','on','at','to','for','of','with','by','from','that','this',
      'is','was','are','were','be','been','have','has','had','do','does','did','will',
      'would','could','should','can','may','might','must','not','no','then','than','when',
      'where','how','what','who','which','if','up','out','about','into','just','also',
      'very','more','all','any','there','their','its','am','as','every','time','some',
      'get','got','go','make','one','two','him','her','his','mine','yours','ours',
      'these','those','while','after','before','because','since','until','even','too',
      'only','each','most','other','same','such','own','over','again','here','way','back','down'
    ]);
    const fillerSet = new Set(['um','uh','mmm','hmm','ah','well','like','know','actually','basically','literally','so','right','okay','yeah']);
    const wf = {};
    (text.toLowerCase().match(/\b[a-z]+\b/g) || []).forEach(w => {
      if (w.length >= 4 && !stopWords.has(w) && !fillerSet.has(w)) wf[w] = (wf[w] || 0) + 1;
    });
    const repeated = Object.keys(wf).filter(w => wf[w] >= 2);
    const repPat = repeated.length > 0
      ? new RegExp(`\\b(${repeated.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')
      : null;

    const reps = []; let idx = 0; let out = text;
    if (repPat) {
      out = out.replace(repPat,   m => { const k = `__${idx++}__`; reps.push([k, `<mark class="mark-repeat">${m}</mark>`]);  return k; });
    }
    out = out.replace(fillerPat,  m => { const k = `__${idx++}__`; reps.push([k, `<mark class="mark-filler">${m}</mark>`]);  return k; });
    out = out.replace(vaguePat,   m => { const k = `__${idx++}__`; reps.push([k, `<mark class="mark-vague">${m}</mark>`]);   return k; });
    out = out.replace(strongPat,  m => { const k = `__${idx++}__`; reps.push([k, `<mark class="mark-strong">${m}</mark>`]);  return k; });
    reps.forEach(([k, h]) => { out = out.replace(k, h); });
    return out;
  }

  // ── Session timer ─────────────────────────────────────────────────────────
  let timeExpired = false;

  function startSessionTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!sessionStartTime) return;
      const remaining = Math.max(0, sessionDurationMs - (Date.now() - sessionStartTime));
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      els.sessionTimer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      els.sessionTimer.hidden = false;
      els.sessionTimer.className = remaining < 120000 ? (remaining < 60000 ? 'over' : 'warn') : '';

      if (remaining === 0 && !timeExpired) {
        timeExpired = true;
        clearInterval(timerInterval);
        clearTimeout(interruptTimer); // cancel any pending interrupt
        if (state === 'listening' && !ttsSpeaking) {
          // User is mid-answer — tick loop will submit it with finalAnswer:true then debrief
          setCtrl("Time's up — finish your thought…");
        } else if (state === 'processing') {
          // Already submitted — onFeedback/onQuestion will route to debrief via timeExpired flag
        } else {
          // Awaiting, speaking, or idle — end now
          endAndDebrief();
        }
      }
    }, 1000);
  }

  // ── Debrief ───────────────────────────────────────────────────────────────
  function makeStatHtml(label, value, color, sub) {
    return `<div class="stat-card" style="opacity:1;animation:none"><div class="stat-label">${label}</div><div class="stat-value" style="color:${color}">${value}</div>${sub ? `<div class="stat-sub">${sub}</div>` : ''}</div>`;
  }

  function maybeShowQuotaBanner() {
    if (!endedDueToQuota) {
      const existing = document.getElementById('debrief-quota-banner');
      if (existing) existing.hidden = true;
      return;
    }
    endedDueToQuota = false;
    let banner = document.getElementById('debrief-quota-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'debrief-quota-banner';
      banner.style.cssText = 'background:rgba(16,185,129,0.08);border:1px solid var(--primary);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:var(--text);display:flex;align-items:center;justify-content:space-between;gap:12px;';
      els.debriefSub.insertAdjacentElement('afterend', banner);
    }
    banner.hidden = false;
    banner.innerHTML =
      '<span>You\'ve used all your free questions for this mode.</span>' +
      '<a href="/pricing" style="background:var(--primary);color:#04231a;font-weight:700;font-size:13px;' +
      'padding:8px 16px;border-radius:6px;text-decoration:none;white-space:nowrap;">Purchase Questions</a>';
  }

  async function showDebrief() {
    if (sessionHistory.length === 0) {
      els.loadingPanel.hidden = true;
      els.debriefSub.textContent = '0 questions answered';
      els.debriefOverall.innerHTML = '<p style="color:var(--text-muted);font-size:14px;">No answers were recorded — your microphone may not have been detected. Please check your browser microphone permissions and try again.</p>';
      els.debriefQuestions.innerHTML = '';
      const summaryEl = document.getElementById('debrief-summary');
      if (summaryEl) summaryEl.hidden = true;
      maybeShowQuotaBanner();
      els.debriefPanel.hidden = false;
      return;
    }

    const personas_names = ['Daniel', 'Priya'];
    const kindLabels = { opener: 'Opening', next: 'New topic', followup: 'Follow-up', interrupt: 'Interruption' };

    // Overall stats
    const withMetrics    = sessionHistory.filter(h => h.delivery);
    const wpmValues      = withMetrics.filter(h => h.delivery.wpm).map(h => h.delivery.wpm);
    const avgWpm         = wpmValues.length ? Math.round(wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length) : null;
    const totalFillers   = withMetrics.reduce((a, h) => a + (h.delivery.fillerCount || 0), 0);
    const totalRepetitions = withMetrics.reduce((a, h) => a + (h.delivery.repetitionCount || 0), 0);
    const avgConf        = withMetrics.length ? withMetrics.reduce((a, h) => a + (h.delivery.confidenceScore || 0), 0) / withMetrics.length : 0;
    const confLabel      = avgConf > 0.10 ? { label: 'Low',    color: '#f87171' } : avgConf < 0.03 ? { label: 'High', color: '#10b981' } : { label: 'Medium', color: '#f59e0b' };
    const wpmRating      = !avgWpm ? { label: '—', color: '#94a3b8' } : avgWpm < 100 ? { label: 'Too slow', color: '#f87171' } : avgWpm > 170 ? { label: 'Too fast', color: '#f87171' } : avgWpm > 140 ? { label: 'Good', color: '#10b981' } : { label: 'Ideal', color: '#10b981' };
    const fillerColor    = totalFillers > 10 ? '#f87171' : totalFillers > 5 ? '#f59e0b' : '#10b981';
    const repOverallColor = totalRepetitions > 6 ? '#f87171' : totalRepetitions > 3 ? '#f59e0b' : '#10b981';

    const sessionMins  = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 60000) : parseInt(simConfig.duration);
    els.debriefSub.textContent = `${sessionHistory.length} question${sessionHistory.length !== 1 ? 's' : ''} · ~${sessionMins} min`;

    // Overall score average
    const scoredQs   = sessionHistory.filter(h => h.feedback?.score != null);
    const avgScore   = scoredQs.length ? Math.round(scoredQs.reduce((a, h) => a + h.feedback.score, 0) / scoredQs.length) : null;
    const scoreColor = !avgScore ? '#94a3b8' : avgScore >= 8 ? '#10b981' : avgScore >= 6 ? '#f59e0b' : '#f87171';

    els.debriefOverall.innerHTML =
      (avgScore != null ? makeStatHtml('Overall Score',    `${avgScore}/10`,              scoreColor,       avgScore >= 8 ? 'Excellent' : avgScore >= 6 ? 'Good' : 'Needs work') : '') +
      makeStatHtml('Avg Pace',         avgWpm ? `${avgWpm} wpm` : '—', wpmRating.color,  wpmRating.label !== '—' ? wpmRating.label : null) +
      makeStatHtml('Total Fillers',    totalFillers,                     fillerColor,      null) +
      makeStatHtml('Total Repetitions',totalRepetitions,                 repOverallColor,  null) +
      makeStatHtml('Confidence',       confLabel.label,                  confLabel.color,  null);

    // Per-question cards
    els.debriefQuestions.innerHTML = sessionHistory.map((h, i) => {
      const p       = personas_names[h.interviewer] || 'Daniel';
      const kind    = h.kind || 'next';
      const m       = h.delivery;
      const wpm     = m?.wpm;
      const wR      = !wpm ? { label: '—', color: '#94a3b8' } : wpm < 100 ? { label: 'Too slow', color: '#f87171' } : wpm > 170 ? { label: 'Too fast', color: '#f87171' } : wpm > 140 ? { label: 'Good', color: '#10b981' } : { label: 'Ideal', color: '#10b981' };
      const fc      = m?.fillerCount ?? 0;
      const rc      = m?.repetitionCount ?? 0;
      const rTop    = m?.topRepeat ?? null;
      const rTopN   = m?.topRepeatCount ?? 0;
      const cs      = m?.confidenceScore ?? 0;
      const cL      = cs > 0.10 ? { label: 'Low', color: '#f87171' } : cs < 0.03 ? { label: 'High', color: '#10b981' } : { label: 'Medium', color: '#f59e0b' };
      const fC      = fc > 5 ? '#f87171' : fc > 2 ? '#f59e0b' : '#10b981';
      const rC      = rc > 3 ? '#f87171' : rc > 1 ? '#f59e0b' : '#10b981';
      const tips    = Array.isArray(h.feedback?.tips) ? h.feedback.tips : [];
      const annotated = h.answer ? annotateTranscript(h.answer) : '<em style="color:var(--text-muted)">No answer recorded.</em>';
      const score   = h.feedback?.score ?? null;
      const sColor  = !score ? '#94a3b8' : score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#f87171';

      return `
        <div class="dq-card open">
          <div class="dq-header" onclick="this.closest('.dq-card').classList.toggle('open')">
            <span class="dq-num">Q${i + 1}</span>
            <span class="dq-badge ${kind}">${kindLabels[kind] || kind}</span>
            <span class="dq-interviewer">${p}</span>
            <span class="dq-question-preview">${escHtml(h.question)}</span>
            ${score != null ? `<span class="dq-score" style="color:${sColor}">${score}/10</span>` : ''}
            <span class="dq-chevron">▼</span>
          </div>
          <div class="dq-body">
            <p class="dq-question">${escHtml(h.question)}</p>

            ${m ? `<div class="dq-stats">
              ${makeStatHtml('Pace',        wpm ? `${wpm} wpm` : '—', wR.color, wR.label !== '—' ? wR.label : null)}
              ${makeStatHtml('Fillers',     fc, fC, null)}
              ${makeStatHtml('Repetitions', rc, rC, rTop ? `"${rTop}" ×${rTopN}` : null)}
              ${makeStatHtml('Confidence',  cL.label, cL.color, null)}
            </div>` : ''}

            ${h.answer ? `
            <div>
              <p class="dq-section-label muted">Your answer</p>
              <div class="dq-answer-legend">
                <span><mark class="mark-strong">strong</mark></span>
                <span><mark class="mark-vague">vague</mark></span>
                <span><mark class="mark-filler">filler</mark></span>
                <span><mark class="mark-repeat">repetition</mark></span>
              </div>
              <div class="dq-answer">${annotated}</div>
            </div>` : ''}

            ${h.feedback === null ? `
            <div class="dq-divider"></div>
            <p class="dq-feedback-loading" style="color:var(--text-muted);font-size:0.85rem;">Generating feedback…</p>` : ''}

            ${h.feedback?.suggested_answer ? `
            <div class="dq-divider"></div>
            <div>
              <p class="dq-section-label green">Suggested answer</p>
              <p class="dq-suggested">${escHtml(h.feedback.suggested_answer)}</p>
            </div>` : ''}

            ${tips.length ? `
            <div>
              <p class="dq-section-label amber">What to improve</p>
              <ul class="dq-tips">${tips.map(t => `<li>${escHtml(t)}</li>`).join('')}</ul>
            </div>` : ''}
          </div>
        </div>`;
    }).join('');

    // Overall AI summary — fetch async, insert when ready
    const summaryEl = document.getElementById('debrief-summary');
    if (summaryEl && sessionHistory.length > 0) {
      summaryEl.hidden = false;
      summaryEl.textContent = 'Generating your overall summary…';
      summaryEl.className = 'debrief-summary loading';
      try {
        const scoredQs = sessionHistory.filter(h => h.feedback?.score != null);
        const avgScore = scoredQs.length
          ? Math.round(scoredQs.reduce((a, h) => a + h.feedback.score, 0) / scoredQs.length)
          : null;
        const r = await fetch('/api/simulator-debrief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
          body: JSON.stringify({
            history: sessionHistory.map(h => ({ question: h.question, answer: h.answer, kind: h.kind })),
            meta: {
              questionCount: sessionHistory.length,
              avgScore,
              durationMins: sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 60000) : parseInt(simConfig.duration),
              type:       simConfig.type,
              difficulty: simConfig.difficulty,
              language:   simConfig.language,
              pressure:   simConfig.pressure
            }
          })
        });
        const d = await r.json();
        if (d.summary) {
          summaryEl.textContent = d.summary;
          summaryEl.className = 'debrief-summary';
        } else {
          summaryEl.hidden = true;
        }
      } catch (_) { summaryEl.hidden = true; }
    }

    maybeShowQuotaBanner();
    els.loadingPanel.hidden = true;
    els.debriefPanel.hidden = false;
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── UI helpers ────────────────────────────────────────────────────────────
  function setChip(text, cls) {
    const chip = els.statusChip = els.statusChip || document.getElementById('status-chip');
    if (!chip) return;
    chip.textContent = text;
    chip.className = 'status-chip visible ' + cls;
  }
  function setCtrl(text) { els.ctrlStatus.textContent = text; }
  function setMic(on) { els.micDot.className = 'mic-dot' + (on ? '' : ' off'); }

  // ── Auto-start when launched from practice page ───────────────────────────
  (function tryLaunchFromPractice() {
    if (!_simLaunchRaw) return;
    try {
      const cfg = JSON.parse(_simLaunchRaw);
      localStorage.removeItem('sim_launch');
      if (cfg.type)              simConfig.type         = cfg.type;
      if (cfg.difficulty)        simConfig.difficulty   = cfg.difficulty;
      if (cfg.pressure)          simConfig.pressure     = cfg.pressure;
      if (cfg.interviewers)      simConfig.interviewers = String(cfg.interviewers);
      if (cfg.duration)          simConfig.duration     = String(cfg.duration);
      if (cfg.language)          simConfig.language     = cfg.language;
      if (cfg.skipIntro != null) simConfig.skipIntro    = cfg.skipIntro;
      if (cfg.accent)            simConfig.accent       = cfg.accent;
      if (cfg.role)              simConfig.role           = cfg.role;
      if (cfg.experienceYears != null) simConfig.experienceYears = String(cfg.experienceYears);
      // Apply accent → voice mapping for Daniel (index 0)
      personas[0].ttsVoice = simConfig.accent === 'british' ? 'fable' : 'onyx';

      // Always populate textareas (used by setup panel / startBtn fallback)
      if (cfg.cv  && els.cvInput) els.cvInput.value = cfg.cv;
      if (cfg.jd  && els.jdInput) els.jdInput.value = cfg.jd;

      // Mic permission was pre-warmed on the practice page (in the user's tap gesture),
      // so iOS Safari allows auto-start here without another tap.
      _launchCv = (cfg.cv || '').trim();
      _launchJd = (cfg.jd || '').trim();
      _launchAdditionalInfo = (cfg.additionalInfo || '').trim();
      setTimeout(() => doStart(_launchCv, _launchJd, _launchAdditionalInfo), 100);
    } catch (e) { console.warn('[sim] launch parse error', e); }
  })();

}());
