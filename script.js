/* ════════════════════════════════════════════════
   LUMIÈRE — LOVE LETTER GENERATOR
   Complete JavaScript — Fixed Share System
   ════════════════════════════════════════════════ */

'use strict';

// ══════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════
const state = {
  mood: 'romantic',
  mode: 'starry',
  font: 'cormorant',
  photos: [],
  voiceBlob: null,
  voiceURL: null,
  musicTrack: 'none',
  customAudioURL: null,
  togglePetals: true,
  toggleSparkle: true,
  toggleChars: true,
  heartCount: 0,
  letterData: null,
  shareLink: '',
};

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// ══════════════════════════════════════════════
//  SHARE STORAGE ENGINE
//  How it works:
//   - The entire letter JSON is base64-encoded into the URL #hash.
//   - The #hash is never sent to any server (browser spec).
//   - Any device that receives the complete URL can decode the letter.
//   - We also mirror to localStorage for fast same-device reloads.
//   - Voice recordings are converted to base64 data-URLs so they travel.
//   - There is NO demo/fallback letter. Missing data = honest error only.
// ══════════════════════════════════════════════

function encodeLetterData(obj) {
  try {
    const json = JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(json)));
  } catch(e) {
    console.error('encodeLetterData:', e);
    return null;
  }
}

function decodeLetterData(b64) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  } catch(e) {
    console.error('decodeLetterData:', e);
    return null;
  }
}

function persistLetter(id, data) {
  try {
    localStorage.setItem('lumiere_' + id, JSON.stringify(data));
  } catch(e) {
    console.warn('localStorage persist failed (storage may be full):', e);
  }
}

function loadLetterFromStorage(id) {
  try {
    const raw = localStorage.getItem('lumiere_' + id);
    return raw ? JSON.parse(raw) : null;
  } catch(e) { return null; }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ══════════════════════════════════════════════
//  CURSOR GLOW
// ══════════════════════════════════════════════
const cursorGlow = document.getElementById('cursor-glow');
let mouseX = 0, mouseY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  cursorGlow.style.left = mouseX + 'px';
  cursorGlow.style.top  = mouseY + 'px';
  if (state.toggleSparkle && currentScreen === 'screen-letter') spawnSparkle(mouseX, mouseY);
});
document.addEventListener('touchmove', e => {
  const t = e.touches[0];
  mouseX = t.clientX; mouseY = t.clientY;
  cursorGlow.style.left = mouseX + 'px';
  cursorGlow.style.top  = mouseY + 'px';
}, {passive:true});

// ══════════════════════════════════════════════
//  SPARKLE TRAIL
// ══════════════════════════════════════════════
let sparkleThrottle = 0;
function spawnSparkle(x, y) {
  const now = Date.now();
  if (now - sparkleThrottle < 40) return;
  sparkleThrottle = now;
  const s = document.createElement('div');
  s.className = 'sparkle';
  s.style.left = x + 'px';
  s.style.top  = y + 'px';
  s.style.width = (Math.random()*8+4) + 'px';
  s.style.height = s.style.width;
  document.body.appendChild(s);
  setTimeout(()=>s.remove(), 650);
}

// ══════════════════════════════════════════════
//  CANVAS — STARS / PETALS / PARTICLES
// ══════════════════════════════════════════════
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let W, H, particles = [];

function resizeCanvas() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function initParticles() {
  particles = [];
  const count = Math.min(120, Math.floor(W * H / 8000));
  for (let i = 0; i < count; i++) particles.push(createParticle());
}

function createParticle() {
  const mode = state.mode;
  let type = 'star';
  if (mode === 'rain') type = Math.random() < 0.85 ? 'rain' : 'star';
  else if (mode === 'candle') type = Math.random() < 0.5 ? 'spark' : 'star';
  else if (state.togglePetals && Math.random() < 0.3) type = 'petal';
  return {
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random()-0.5) * 0.4,
    vy: type==='rain' ? (Math.random()*8+4) : (Math.random()*-0.5-0.2),
    size: type==='star' ? Math.random()*2+0.5 : type==='petal' ? Math.random()*5+3 : Math.random()*1+0.5,
    alpha: Math.random()*0.7+0.3, alphaDelta: (Math.random()-0.5)*0.015,
    type, rot: Math.random()*Math.PI*2, rotSpeed: (Math.random()-0.5)*0.04,
    hue: Math.random()*40+330, twinklePhase: Math.random()*Math.PI*2,
  };
}

function drawParticle(p) {
  const a = Math.max(0, Math.min(1, p.alpha));
  if (p.type === 'star') {
    const twinkle = 0.5 + 0.5*Math.sin(p.twinklePhase);
    ctx.globalAlpha = a * twinkle;
    ctx.fillStyle = `hsl(${p.hue},70%,85%)`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    if (p.size > 1.2) {
      ctx.globalAlpha = a * twinkle * 0.3;
      const grd = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size*4);
      grd.addColorStop(0,`hsla(${p.hue},70%,85%,1)`);
      grd.addColorStop(1,'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*4,0,Math.PI*2); ctx.fill();
    }
  } else if (p.type === 'petal') {
    ctx.save(); ctx.globalAlpha = a * 0.65;
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = `hsl(${p.hue},60%,75%)`;
    ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size*0.55, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  } else if (p.type === 'rain') {
    ctx.globalAlpha = a * 0.25; ctx.strokeStyle = 'rgba(180,210,255,0.5)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx*3, p.y - p.size*8); ctx.stroke();
  } else if (p.type === 'spark') {
    ctx.globalAlpha = a; ctx.fillStyle = `hsl(40,100%,70%)`;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.5,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function updateParticle(p) {
  p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed;
  p.alpha += p.alphaDelta; p.twinklePhase += 0.03;
  if (p.alpha <= 0 || p.alpha > 1) p.alphaDelta *= -1;
  if (p.type === 'rain') {
    if (p.y > H + 20) { p.y = -10; p.x = Math.random()*W; }
  } else {
    if (p.y < -20) p.y = H + 20;
    if (p.y > H + 20) p.y = -20;
    if (p.x < -20) p.x = W + 20;
    if (p.x > W + 20) p.x = -20;
  }
}

function animateCanvas() {
  ctx.clearRect(0, 0, W, H);
  const grd = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, Math.max(W,H)*0.5);
  grd.addColorStop(0, `rgba(232,130,154,0.04)`);
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd; ctx.fillRect(0,0,W,H);
  for (const p of particles) { drawParticle(p); updateParticle(p); }
  requestAnimationFrame(animateCanvas);
}
initParticles();
animateCanvas();

// ══════════════════════════════════════════════
//  SCREEN TRANSITIONS
// ══════════════════════════════════════════════
let currentScreen = 'screen-landing';

function showScreen(id) {
  const old  = document.getElementById(currentScreen);
  const next = document.getElementById(id);
  old.classList.add('exiting');
  setTimeout(()=>{ old.classList.remove('active','exiting'); }, 700);
  setTimeout(()=>{ next.classList.add('active'); currentScreen = id; }, 350);
}

// ══════════════════════════════════════════════
//  LANDING
// ══════════════════════════════════════════════
document.getElementById('btnStartCreating').addEventListener('click', ()=>{
  playSfxClick();
  showScreen('screen-builder');
});

// ══════════════════════════════════════════════
//  STEP NAVIGATION
// ══════════════════════════════════════════════
function nextStep(n) {
  playSfxClick();
  document.querySelectorAll('.form-step').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.step').forEach((s,i)=>{
    s.classList.remove('active','done');
    if (i < n-1) s.classList.add('done');
    if (i === n-1) s.classList.add('active');
  });
  document.getElementById('step'+n).classList.add('active');
  document.getElementById('screen-builder').scrollTop = 0;
}
window.nextStep = nextStep;

// ══════════════════════════════════════════════
//  MOOD / MODE / FONT BUTTONS
// ══════════════════════════════════════════════
document.querySelectorAll('.mood-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.mood-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); state.mood = btn.dataset.mood;
  });
});
document.querySelectorAll('.mode-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.mode-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); state.mode = btn.dataset.mode;
    document.body.className = `mode-${state.mode}`;
    initParticles();
  });
});
document.getElementById('letterBody').addEventListener('input', function() {
  document.getElementById('charCount').textContent = this.value.length;
});
document.querySelectorAll('.font-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.font-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); state.font = btn.dataset.font;
  });
});

// ══════════════════════════════════════════════
//  PHOTO UPLOAD
// ══════════════════════════════════════════════
const photoDropZone = document.getElementById('photoDropZone');
const photoInput    = document.getElementById('photoInput');
const photoGrid     = document.getElementById('photoPreviewGrid');
const captionFields = document.getElementById('captionFields');

photoDropZone.addEventListener('click', ()=> photoInput.click());
photoDropZone.addEventListener('dragover', e=>{e.preventDefault();photoDropZone.style.borderColor='var(--rose)';});
photoDropZone.addEventListener('dragleave', ()=>photoDropZone.style.borderColor='');
photoDropZone.addEventListener('drop', e=>{
  e.preventDefault(); photoDropZone.style.borderColor=''; handlePhotos(e.dataTransfer.files);
});
photoInput.addEventListener('change', ()=> handlePhotos(photoInput.files));

function handlePhotos(files) {
  const arr = Array.from(files).slice(0, 6 - state.photos.length);
  arr.forEach(file=>{
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e=>{ state.photos.push({dataUrl:e.target.result, caption:''}); renderPhotoPreviews(); };
    reader.readAsDataURL(file);
  });
}

function renderPhotoPreviews() {
  photoGrid.innerHTML = ''; captionFields.innerHTML = '';
  state.photos.forEach((p, i)=>{
    const div = document.createElement('div'); div.className = 'photo-thumb';
    const img = document.createElement('img'); img.src = p.dataUrl;
    const rem = document.createElement('button'); rem.className = 'remove-photo'; rem.textContent = 'x';
    rem.onclick = ()=>{ state.photos.splice(i,1); renderPhotoPreviews(); };
    div.append(img, rem); photoGrid.appendChild(div);
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'fancy-input';
    inp.placeholder = `Caption for photo ${i+1}`; inp.value = p.caption;
    inp.oninput = ()=>{ state.photos[i].caption = inp.value; };
    captionFields.appendChild(inp);
  });
}

// ══════════════════════════════════════════════
//  MUSIC OPTIONS
// ══════════════════════════════════════════════
document.querySelectorAll('.music-opt').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.music-opt').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); state.musicTrack = btn.dataset.track;
  });
});
document.getElementById('customAudio').addEventListener('change', function() {
  if (this.files[0]) {
    document.getElementById('audioFileName').textContent = this.files[0].name;
    state.customAudioURL = URL.createObjectURL(this.files[0]);
    state.musicTrack = 'custom';
  }
});

// ══════════════════════════════════════════════
//  VOICE RECORDING
// ══════════════════════════════════════════════
let mediaRecorder, voiceChunks=[], voiceDuration=0, voiceTimerInterval;

document.getElementById('voiceRecord').addEventListener('click', async function() {
  if (this.classList.contains('recording')) {
    mediaRecorder.stop();
    this.classList.remove('recording');
    this.textContent = 'Start Recording';
    clearInterval(voiceTimerInterval);
    document.getElementById('voiceTimer').textContent = '00:00';
  } else {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      mediaRecorder = new MediaRecorder(stream);
      voiceChunks = []; voiceDuration = 0;
      mediaRecorder.ondataavailable = e=> voiceChunks.push(e.data);
      mediaRecorder.onstop = ()=>{
        const blob = new Blob(voiceChunks, {type:'audio/webm'});
        state.voiceBlob = blob;
        state.voiceURL  = URL.createObjectURL(blob);
        document.getElementById('voicePlay').disabled = false;
        stream.getTracks().forEach(t=>t.stop());
        renderVoiceWaveform();
      };
      mediaRecorder.start();
      this.classList.add('recording');
      this.textContent = 'Stop Recording';
      voiceTimerInterval = setInterval(()=>{
        voiceDuration++;
        const m = String(Math.floor(voiceDuration/60)).padStart(2,'0');
        const s = String(voiceDuration%60).padStart(2,'0');
        document.getElementById('voiceTimer').textContent = m+':'+s;
      },1000);
    } catch(e) { alert('Microphone access required for voice recording.'); }
  }
});

document.getElementById('voicePlay').addEventListener('click', ()=>{
  if (state.voiceURL) {
    const a = document.getElementById('voiceAudio'); a.src = state.voiceURL; a.play();
  }
});

function renderVoiceWaveform() {
  const wf = document.getElementById('voiceWaveform'); wf.innerHTML = '';
  for (let i=0;i<30;i++){
    const s = document.createElement('span');
    s.style.height = (Math.random()*26+6)+'px';
    s.style.animationDelay = (i*0.04)+'s';
    s.style.animationDuration = (0.3+Math.random()*0.4)+'s';
    wf.appendChild(s);
  }
}

// ══════════════════════════════════════════════
//  TOGGLES
// ══════════════════════════════════════════════
document.getElementById('togglePetals').addEventListener('change', function() {
  state.togglePetals = this.checked; initParticles();
});
document.getElementById('toggleSparkle').addEventListener('change', function() {
  state.toggleSparkle = this.checked;
});
document.getElementById('toggleChars').addEventListener('change', function() {
  state.toggleChars = this.checked;
});

// ══════════════════════════════════════════════
//  GENERATE LETTER  (async — voice blob needs await)
// ══════════════════════════════════════════════
async function generateLetter() {
  playSfxGenerate();

  const senderFallback = document.getElementById('senderName').value.trim() || 'Someone who loves you';
  const signOffRaw     = document.getElementById('signOff').value.trim();

  const payload = {
    recipientName : document.getElementById('recipientName').value.trim() || 'My Love',
    senderName    : senderFallback,
    mood          : state.mood,
    mode          : state.mode,
    font          : state.font,
    subject       : document.getElementById('letterSubject').value.trim(),
    body          : document.getElementById('letterBody').value.trim(),
    loveReasons   : document.getElementById('loveReasons').value.trim(),
    secretMsg     : document.getElementById('secretMsg').value.trim(),
    loveDate      : document.getElementById('loveDate').value,
    openingQuote  : document.getElementById('openingQuote').value.trim(),
    signOff       : signOffRaw || `Forever yours,\n${senderFallback}`,
    lyrics        : document.getElementById('lyricsText').value.trim(),
    musicTrack    : state.musicTrack,
    // Note: customAudioURL is a blob:// URL which cannot survive cross-tab.
    // Custom music therefore only works on the creator's session (by design).
    photos        : state.photos,    // already base64 data-URLs
    togglePetals  : state.togglePetals,
    toggleSparkle : state.toggleSparkle,
    toggleChars   : state.toggleChars,
    voiceDataURL  : null,
  };

  // Convert voice blob to base64 so it survives the shared link
  if (state.voiceBlob) {
    try { payload.voiceDataURL = await blobToBase64(state.voiceBlob); }
    catch(e) { console.warn('Voice conversion failed:', e); }
  }

  // Unique, collision-proof letter ID (timestamp + random)
  const letterId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  payload.letterId = letterId;

  state.letterData = payload;

  // 1. Persist to localStorage for fast same-device reload
  persistLetter(letterId, payload);

  // 2. Encode full payload into URL hash (cross-device sharing)
  const encoded = encodeLetterData(payload);
  if (!encoded) {
    alert('Could not encode letter — it may be too large. Try reducing photo count or size.');
    return;
  }

  // The #hash never reaches any server. The full letter lives in the URL.
  const baseUrl   = location.href.split('?')[0].split('#')[0];
  state.shareLink = `${baseUrl}?letter=${letterId}#${encoded}`;

  document.getElementById('shareLinkDisplay').textContent = state.shareLink;

  showScreen('screen-share');
  setTimeout(()=>{ launchConfetti(); }, 600);
  setTimeout(()=>{ document.getElementById('shareEnvelope').style.display='block'; }, 300);
}
window.generateLetter = generateLetter;

// ══════════════════════════════════════════════
//  LINK READER — runs on every page load
//  Priority:
//    1. URL #hash  -> decode full payload  (any device, permanent)
//    2. localStorage keyed by ?letter=ID   (same device, fast)
//    3. Not found  -> honest error UI, NO demo/fake content ever
// ══════════════════════════════════════════════
window.addEventListener('load', () => {
  const params   = new URLSearchParams(location.search);
  const letterId = params.get('letter');

  // No ?letter= param means this is a normal landing-page visit — do nothing
  if (!letterId) return;

  let letterData = null;

  // --- Priority 1: URL hash contains the full encoded letter ---
  const hash = location.hash.slice(1);  // strip the leading '#'
  if (hash) {
    letterData = decodeLetterData(hash);
    if (letterData) {
      // Mirror to localStorage so future same-device reloads are instant
      // even if the user bookmarks the page without the hash
      persistLetter(letterId, letterData);
    }
  }

  // --- Priority 2: localStorage (same device, hash stripped or lost) ---
  if (!letterData) {
    letterData = loadLetterFromStorage(letterId);
  }

  // --- Priority 3: Nothing found — tell the user honestly ---
  if (!letterData) {
    showLetterNotFound();
    return;
  }

  // --- Success: load the exact letter ---
  state.letterData = letterData;
  state.photos     = letterData.photos || [];
  // Voice was stored as a base64 data-URL — usable directly as <audio> src
  if (letterData.voiceDataURL) {
    state.voiceURL = letterData.voiceDataURL;
  }

  showScreen('screen-letter');
  startCinematicIntro();
});

function showLetterNotFound() {
  showScreen('screen-letter');
  const loader = document.getElementById('letter-loader');
  if (loader) loader.style.display = 'none';
  const content = document.getElementById('letter-content');
  content.classList.remove('hidden');
  content.classList.add('visible');
  content.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
      min-height:80vh;text-align:center;padding:2rem;">
      <div style="font-size:4rem;margin-bottom:1.5rem;">&#128140;</div>
      <h2 style="font-family:'DM Serif Display',serif;font-size:2rem;
        background:linear-gradient(135deg,#fdf6ee,#f0cfa0);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;
        margin-bottom:1rem;">Letter Not Found</h2>
      <p style="color:rgba(255,255,255,0.45);font-style:italic;max-width:440px;line-height:1.9;
        margin-bottom:2rem;font-family:'Cormorant Garamond',serif;font-size:1.05rem;">
        This link appears to be incomplete. The full letter data is stored in the
        <code style="color:#e8829a;background:rgba(232,130,154,0.1);padding:0 4px;border-radius:4px;">#</code>
        part of the URL (after the hash symbol).<br><br>
        Ask the sender to share the <strong>complete</strong> link &mdash;
        including everything after the <code style="color:#e8829a;">#</code> sign.
        Some messaging apps strip this part; try copy-pasting instead.
      </p>
      <button onclick="resetAll()" style="padding:0.85rem 2.2rem;border-radius:100px;
        background:linear-gradient(135deg,#c45c75,#a0305a);border:none;color:#fff;
        font-size:1rem;cursor:pointer;font-family:'Cormorant Garamond',serif;
        letter-spacing:0.08em;box-shadow:0 4px 20px rgba(196,92,117,0.4);">
        &#10022; Create Your Own Letter
      </button>
    </div>`;
}

// ══════════════════════════════════════════════
//  CONFETTI
// ══════════════════════════════════════════════
function launchConfetti() {
  const container = document.getElementById('shareConfetti');
  container.innerHTML = '';
  const colors = ['#e8829a','#d4a853','#b0c4de','#98d8c0','#f0cfa0','#c45c75'];
  for (let i=0;i<80;i++){
    const p = document.createElement('div'); p.className = 'confetti-piece';
    p.style.left = Math.random()*100+'%'; p.style.top = '0';
    p.style.background = colors[Math.floor(Math.random()*colors.length)];
    p.style.width = (Math.random()*10+4)+'px'; p.style.height = p.style.width;
    p.style.borderRadius = Math.random()>0.5?'50%':'2px';
    p.style.animationDuration = (Math.random()*3+2)+'s';
    p.style.animationDelay    = (Math.random()*1.5)+'s';
    container.appendChild(p);
  }
  for (let i=0;i<20;i++){
    const h = document.createElement('div'); h.className = 'float-heart';
    h.textContent = Math.random()>0.5?'&#9829;':'&#9825;';
    h.style.position = 'absolute'; h.style.left = Math.random()*100+'%';
    h.style.color = colors[Math.floor(Math.random()*2)];
    h.style.animationDelay = (Math.random()*3)+'s';
    h.style.animationDuration = (Math.random()*4+4)+'s';
    h.style.fontSize = (Math.random()*1.5+0.8)+'rem';
    container.appendChild(h);
  }
}

// ══════════════════════════════════════════════
//  SHARE BUTTONS
// ══════════════════════════════════════════════
document.getElementById('copyLinkBtn').addEventListener('click', ()=>{
  playSfxClick();
  const link = state.shareLink;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(markCopied).catch(()=>fallbackCopy(link));
  } else { fallbackCopy(link); }
});
function markCopied() {
  const btn = document.getElementById('copyLinkBtn');
  btn.textContent = 'Copied!'; btn.classList.add('copied');
  setTimeout(()=>{ btn.textContent='Copy'; btn.classList.remove('copied'); }, 2500);
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta); ta.select();
  document.execCommand('copy'); document.body.removeChild(ta);
  markCopied();
}

document.getElementById('shareWhatsapp').addEventListener('click', ()=>{
  window.open('https://wa.me/?text='+encodeURIComponent('I made something with love, just for you... ' + state.shareLink));
});
document.getElementById('shareTelegram').addEventListener('click', ()=>{
  window.open('https://t.me/share/url?url='+encodeURIComponent(state.shareLink)+'&text='+encodeURIComponent('I made this love letter for you'));
});
document.getElementById('shareInstagram').addEventListener('click', ()=>{
  if (navigator.clipboard) {
    navigator.clipboard.writeText(state.shareLink).then(()=>{
      alert('Link copied! Paste it in your Instagram bio or story.');
    });
  } else { fallbackCopy(state.shareLink); }
});

// ══════════════════════════════════════════════
//  OPEN LETTER PREVIEW (from share screen)
// ══════════════════════════════════════════════
function openLetterPreview() {
  playSfxClick();
  showScreen('screen-letter');
  startCinematicIntro();
}
window.openLetterPreview = openLetterPreview;

// ══════════════════════════════════════════════
//  CINEMATIC INTRO
// ══════════════════════════════════════════════
function startCinematicIntro() {
  const loader = document.getElementById('letter-loader');
  const bar    = document.getElementById('loaderBar');

  const starsEl = document.getElementById('loaderStars');
  starsEl.innerHTML = '';
  for (let i=0;i<120;i++){
    const s = document.createElement('div'); s.className='loader-star';
    s.style.left  = Math.random()*100+'%'; s.style.top = Math.random()*100+'%';
    s.style.width = s.style.height = (Math.random()*2.5+0.5)+'px';
    s.style.animationDelay = (Math.random()*3)+'s';
    starsEl.appendChild(s);
  }

  let prog = 0;
  const tick = setInterval(()=>{
    prog += Math.random()*4+1;
    if (prog > 100) prog = 100;
    bar.style.width = prog+'%';
    if (prog === 100) clearInterval(tick);
  },80);

  setTimeout(()=>{
    loader.classList.add('fade-out');
    setTimeout(()=>{ loader.style.display='none'; showEnvelope(); }, 1300);
  }, 3500);
}

function showEnvelope() {
  playSfxEnvelope();
  const env = document.getElementById('envelope-reveal');
  env.classList.remove('hidden'); env.classList.add('visible');
  env.addEventListener('click', ()=>{
    playSfxHeartPop();
    env.style.transition='opacity 0.8s, transform 0.8s';
    env.style.transform='scale(1.1)';
    setTimeout(()=>{ env.style.opacity='0'; env.style.transform='scale(0.8)'; }, 100);
    setTimeout(()=>{ env.classList.add('hidden'); env.classList.remove('visible'); revealLetter(); }, 900);
  }, {once:true});
}

function revealLetter() {
  buildLetterContent();
  const content = document.getElementById('letter-content');
  content.classList.remove('hidden'); content.classList.add('visible');
  startMusic();
  if (state.letterData && state.letterData.toggleChars) {
    document.getElementById('letterDog').classList.remove('hidden');
  }
  if (state.letterData && state.letterData.lyrics) {
    startFloatingLyrics(state.letterData.lyrics);
  }
}

// ══════════════════════════════════════════════
//  BUILD LETTER CONTENT
// ══════════════════════════════════════════════
function buildLetterContent() {
  const d = state.letterData;
  if (!d) return;

  document.body.className = `mode-${d.mode||'starry'}`;
  initParticles();

  const fontMap = {
    cormorant:'Cormorant Garamond,serif',
    playfair:'Playfair Display,serif',
    sacramento:'Sacramento,cursive',
    satisfy:'Satisfy,cursive'
  };
  document.getElementById('letterPaper').style.fontFamily = fontMap[d.font] || fontMap.cormorant;

  el('displayQuote').textContent     = d.openingQuote || '';
  el('displaySalutation').textContent = d.recipientName ? `Dear ${d.recipientName},` : '';
  el('displaySubject').textContent   = d.subject || '';
  el('displaySignOff').textContent   = d.signOff || '';

  typeText('displayBody', d.body || '', 18);

  if (d.loveDate) {
    const dt = new Date(d.loveDate+'T00:00:00');
    el('displayDate').textContent = dt.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  }

  if (d.loveReasons && d.loveReasons.trim()) {
    const lines = d.loveReasons.split('\n').filter(l=>l.trim());
    const cards = el('reasonsCards'); cards.innerHTML = '';
    lines.forEach((line,i)=>{
      const card = document.createElement('div'); card.className = 'reason-card';
      card.style.animationDelay = (0.5+i*0.15)+'s';
      const num = document.createElement('div'); num.className = 'reason-num'; num.textContent = i+1;
      const txt = document.createElement('span'); txt.textContent = line;
      card.append(num, txt); cards.appendChild(card);
    });
    el('loveReasonsSection').classList.remove('hidden');
  }

  if (d.photos && d.photos.length) {
    const grid = el('polaroidGrid'); grid.innerHTML = '';
    const rots = [-3,-1.5,0,2,3.5,-2.5];
    d.photos.forEach((photo,i)=>{
      const pol = document.createElement('div'); pol.className = 'polaroid';
      pol.style.setProperty('--rot', (rots[i%rots.length])+'deg');
      pol.style.animationDelay = (0.3+i*0.12)+'s';
      const img = document.createElement('img'); img.src = photo.dataUrl; img.alt = photo.caption || '';
      const cap = document.createElement('div'); cap.className = 'caption'; cap.textContent = photo.caption || '';
      pol.append(img, cap); grid.appendChild(pol);
    });
    el('memoriesSection').classList.remove('hidden');
  }

  if (d.secretMsg) {
    el('secretMessageDisplay').textContent = d.secretMsg;
    el('secretSection').classList.remove('hidden');
    el('secretRevealBtn').addEventListener('click', ()=>{
      playSfxSparkle();
      el('secretRevealBtn').style.display = 'none';
      el('secretMessageDisplay').classList.remove('hidden');
    }, {once:true});
  }

  if (d.loveDate) {
    el('countdownSection').classList.remove('hidden');
    updateCountdown(d.loveDate);
    setInterval(()=>updateCountdown(d.loveDate), 60000);
  }

  // Voice: use voiceDataURL (survived link) or voiceURL (same-session blob URL)
  const voiceSrc = d.voiceDataURL || state.voiceURL;
  if (voiceSrc) {
    const audio = document.getElementById('voiceAudio');
    audio.src = voiceSrc;
    el('voicePlayerSection').classList.remove('hidden');
    const wf = document.querySelector('.vp-waveform');
    for (let i=0;i<20;i++){
      const s=document.createElement('span');
      s.style.height=(Math.random()*18+4)+'px';
      s.style.animationDelay=(i*0.06)+'s';
      wf.appendChild(s);
    }
    document.getElementById('vpPlayBtn').addEventListener('click', ()=>{
      audio.paused ? audio.play() : audio.pause();
      document.getElementById('vpPlayBtn').textContent = audio.paused ? 'Play' : 'Pause';
    });
  }

  state.heartCount = 0;
  el('interactiveHeart').addEventListener('click', ()=>{
    state.heartCount++;
    el('heartCounter').textContent = state.heartCount + (state.heartCount===1?' heart':' hearts');
    el('interactiveHeart').classList.remove('pop');
    void el('interactiveHeart').offsetWidth;
    el('interactiveHeart').classList.add('pop');
    playSfxHeartPop();
    spawnHeartBurst(el('interactiveHeart'));
  });
}

function el(id){ return document.getElementById(id); }

function typeText(targetId, text, delay) {
  const target = document.getElementById(targetId);
  target.textContent = '';
  let i = 0;
  const type = ()=>{
    if (i < text.length) { target.textContent += text[i]; i++; setTimeout(type, delay + Math.random()*10); }
  };
  setTimeout(type, 1200);
}

function updateCountdown(dateStr) {
  const start = new Date(dateStr+'T00:00:00');
  const now   = new Date();
  const diff  = now - start;
  if (diff < 0) return;
  el('cdDays').textContent  = Math.floor(diff/(1000*60*60*24));
  el('cdHours').textContent = Math.floor((diff%(1000*60*60*24))/(1000*60*60));
  el('cdMins').textContent  = Math.floor((diff%(1000*60*60))/(1000*60));
}

function spawnHeartBurst(target) {
  const rect = target.getBoundingClientRect();
  const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
  for (let i=0;i<10;i++){
    const h = document.createElement('div');
    h.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;font-size:${Math.random()*14+10}px;color:var(--rose);pointer-events:none;z-index:9999;`;
    h.textContent = Math.random()>0.5?'heart':'o';
    document.body.appendChild(h);
    const angle = Math.random()*360, dist = Math.random()*80+40;
    h.animate([
      {transform:`translate(-50%,-50%) scale(0)`,opacity:1},
      {transform:`translate(calc(-50% + ${Math.cos(angle*Math.PI/180)*dist}px),calc(-50% + ${Math.sin(angle*Math.PI/180)*dist}px)) scale(1)`,opacity:0.8},
      {transform:`translate(calc(-50% + ${Math.cos(angle*Math.PI/180)*dist*1.5}px),calc(-50% + ${Math.sin(angle*Math.PI/180)*dist*1.5-40}px)) scale(0.5)`,opacity:0},
    ], {duration:900, easing:'ease-out'}).onfinish = ()=>h.remove();
  }
}

// ══════════════════════════════════════════════
//  FLOATING LYRICS
// ══════════════════════════════════════════════
function startFloatingLyrics(text) {
  const lines = text.split('\n').filter(l=>l.trim());
  if (!lines.length) return;
  let idx = 0;
  const spawn = ()=>{
    const container = document.getElementById('floatingLyrics');
    const p = document.createElement('div'); p.className = 'lyric-bubble';
    p.textContent = lines[idx % lines.length];
    p.style.left   = (Math.random()*70+5)+'%';
    p.style.bottom = '-60px';
    p.style.animationDuration = (Math.random()*5+9)+'s';
    container.appendChild(p); idx++;
    setTimeout(()=>p.remove(), 14000);
  };
  spawn();
  setInterval(spawn, 4500);
}

// ══════════════════════════════════════════════
//  MUSIC ENGINE (Web Audio API)
// ══════════════════════════════════════════════
let musicGain = null, isPlaying = true;

function startMusic() {
  const track = (state.letterData||{}).musicTrack || state.musicTrack;
  if (!track || track === 'none') {
    document.getElementById('musicPlayer').style.display = 'none';
    return;
  }
  document.getElementById('musicPlayer').style.display = 'flex';
  if (track === 'musicbox') { playGeneratedMusic('musicbox'); el('mpTrackName').textContent = 'Music Box'; }
  else if (track === 'piano')    { playGeneratedMusic('piano');    el('mpTrackName').textContent = 'Soft Piano'; }
  else if (track === 'rain')     { playRainAmbience(); playGeneratedMusic('piano'); el('mpTrackName').textContent = 'Rain and Piano'; }
  else if (track === 'custom' && state.letterData && state.letterData.customAudioURL) {
    const aud = document.getElementById('audioCustom');
    aud.src = state.letterData.customAudioURL; aud.volume = 0.4;
    aud.play().catch(()=>{});
    el('mpTrackName').textContent = 'Custom Track';
  }
}

function playGeneratedMusic(type) {
  const actx = getAudioCtx();
  musicGain = actx.createGain();
  musicGain.gain.setValueAtTime(0, actx.currentTime);
  musicGain.gain.linearRampToValueAtTime(0.18, actx.currentTime+3);

  const convolver = actx.createConvolver();
  convolver.buffer = createReverb(actx, 3.5, 2.5);
  const delay = actx.createDelay(2); delay.delayTime.value = 0.45;
  const delayGain = actx.createGain(); delayGain.gain.value = 0.25;

  musicGain.connect(convolver); convolver.connect(actx.destination);
  musicGain.connect(delay); delay.connect(delayGain); delayGain.connect(actx.destination);

  const schedule = type==='musicbox' ? getMusicBoxSchedule() : getPianoSchedule();

  const playNote = (freq, time, dur, vel=0.5)=>{
    const osc = actx.createOscillator(), gain = actx.createGain();
    osc.type = type==='musicbox' ? 'triangle' : 'sine';
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vel*(type==='musicbox'?0.8:0.5), time+(type==='musicbox'?0.008:0.04));
    gain.gain.exponentialRampToValueAtTime(0.001, time+dur*(type==='musicbox'?0.9:1.1));
    osc.frequency.value = freq;
    osc.connect(gain); gain.connect(musicGain);
    osc.start(time); osc.stop(time+dur+0.01);
  };

  let loopTime = actx.currentTime + 0.5;
  function scheduleLoop() {
    const loopDur = schedule[schedule.length-1][1] + schedule[schedule.length-1][2] + 0.5;
    schedule.forEach(([freq,t,d,v])=> playNote(freq, loopTime+t, d, v||0.5));
    loopTime += loopDur;
    if (isPlaying) setTimeout(scheduleLoop, (loopDur-1)*1000);
  }
  scheduleLoop();
}

function getMusicBoxSchedule() {
  const C4=261.63,E4=329.63,G4=392,A4=440,F4=349.23;
  const C5=523.25,D5=587.33,E5=659.25,G5=783.99;
  return [
    [C5,0,0.3,0.7],[E5,0.5,0.3,0.6],[G5,1,0.3,0.6],[E5,1.5,0.4,0.55],[D5,2,0.35,0.6],
    [C5,2.5,0.5,0.65],[A4,3,0.3,0.5],[G4,3.5,0.3,0.5],[A4,4,0.35,0.55],[C5,4.5,0.3,0.6],
    [E5,5,0.4,0.6],[D5,5.5,0.3,0.55],[C5,6,0.8,0.7],[E4,6.5,0.3,0.35],[G4,7,0.3,0.4],
    [C5,7.5,0.5,0.65],[E5,8,0.35,0.6],[G5,8.5,0.35,0.6],[E5,9,0.4,0.55],[C5,9.5,0.8,0.7],
    [C4,0,0.6,0.25],[G4,1,0.6,0.22],[A4,2,0.6,0.22],[F4,3,0.6,0.22],
    [C4,4,0.6,0.25],[G4,5,0.6,0.22],[A4,6,0.6,0.22],[G4,8,0.6,0.22],[C4,9,1,0.3],
  ];
}

function getPianoSchedule() {
  const C4=261.63,D4=293.66,E4=329.63,F4=349.23,G4=392,A4=440,B4=493.88;
  const C5=523.25,D5=587.33,E5=659.25;
  return [
    [E5,0,0.8,0.55],[D5,0.9,0.7,0.5],[C5,1.7,0.6,0.5],[B4,2.4,0.5,0.45],
    [A4,3,0.8,0.5],[G4,3.9,0.7,0.45],[A4,4.7,0.5,0.5],[C5,5.3,0.6,0.55],
    [E5,6,1,0.6],[D5,7.1,0.7,0.5],[C5,7.9,1.2,0.55],
    [C4,0,0.4,0.2],[E4,0,0.4,0.18],[G4,0,0.4,0.18],
    [C4,1,0.4,0.2],[F4,1,0.4,0.18],[A4,1,0.4,0.18],
    [C4,2,0.4,0.2],[E4,2,0.4,0.18],[G4,2,0.4,0.18],
    [B4,3,0.4,0.18],[D5,3,0.4,0.18],
    [C4,4,0.4,0.2],[E4,4,0.4,0.18],[A4,4,0.4,0.18],
    [C4,5,0.4,0.2],[F4,5,0.4,0.18],[C5,5,0.4,0.18],
    [G4,6,0.4,0.2],[B4,6,0.4,0.18],[D5,6,0.4,0.18],
    [C4,7,0.4,0.2],[E4,7,0.4,0.18],[G4,7,0.4,0.18],
    [C4,8,0.4,0.2],[E4,8,0.4,0.18],[G4,8,0.4,0.18],
  ];
}

function playRainAmbience() {
  const actx = getAudioCtx();
  const bufSize = actx.sampleRate * 3;
  const buf = actx.createBuffer(1, bufSize, actx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i=0;i<bufSize;i++) data[i]=(Math.random()*2-1)*0.4;
  const src = actx.createBufferSource(); src.buffer = buf; src.loop = true;
  const filter = actx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=1200;
  const gain = actx.createGain(); gain.gain.value = 0.12;
  src.connect(filter); filter.connect(gain); gain.connect(actx.destination);
  src.start();
}

function createReverb(actx, duration, decay) {
  const sr = actx.sampleRate, len = sr * duration;
  const buf = actx.createBuffer(2, len, sr);
  for (let ch=0;ch<2;ch++){
    const d = buf.getChannelData(ch);
    for (let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay);
  }
  return buf;
}

document.getElementById('mpToggle').addEventListener('click', ()=>{
  isPlaying = !isPlaying;
  document.getElementById('mpToggle').textContent = isPlaying ? 'Pause' : 'Play';
  document.querySelectorAll('.eq-bar').forEach(b=>b.classList.toggle('paused',!isPlaying));
  if (musicGain) {
    const actx = getAudioCtx();
    musicGain.gain.linearRampToValueAtTime(isPlaying?0.18:0, actx.currentTime+0.5);
  }
  const ca = document.getElementById('audioCustom');
  if (ca.src) { isPlaying ? ca.play() : ca.pause(); }
});

document.getElementById('mpVolume').addEventListener('input', function() {
  if (musicGain) {
    const actx = getAudioCtx();
    musicGain.gain.linearRampToValueAtTime(parseFloat(this.value)*0.3, actx.currentTime+0.1);
  }
  document.getElementById('audioCustom').volume = this.value;
});

// ══════════════════════════════════════════════
//  SOUND EFFECTS
// ══════════════════════════════════════════════
function playSfxClick() {
  try {
    const a=getAudioCtx(),o=a.createOscillator(),g=a.createGain();
    o.type='sine'; o.frequency.setValueAtTime(800,a.currentTime);
    o.frequency.exponentialRampToValueAtTime(1200,a.currentTime+0.08);
    g.gain.setValueAtTime(0.08,a.currentTime); g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+0.12);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+0.13);
  } catch(e){}
}
function playSfxHeartPop() {
  try {
    const a=getAudioCtx(),o=a.createOscillator(),g=a.createGain();
    o.type='sine'; o.frequency.setValueAtTime(440,a.currentTime);
    o.frequency.exponentialRampToValueAtTime(880,a.currentTime+0.05);
    o.frequency.exponentialRampToValueAtTime(660,a.currentTime+0.15);
    g.gain.setValueAtTime(0.12,a.currentTime); g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+0.25);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+0.26);
  } catch(e){}
}
function playSfxEnvelope() {
  try {
    const a=getAudioCtx(),o=a.createOscillator(),g=a.createGain();
    o.type='triangle'; o.frequency.setValueAtTime(220,a.currentTime);
    o.frequency.exponentialRampToValueAtTime(440,a.currentTime+0.3);
    g.gain.setValueAtTime(0.1,a.currentTime); g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+0.5);
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+0.5);
  } catch(e){}
}
function playSfxSparkle() {
  try {
    const a=getAudioCtx();
    [880,1100,1320,1760].forEach((f,i)=>{
      const o=a.createOscillator(),g=a.createGain(); o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(0,a.currentTime+i*0.06);
      g.gain.linearRampToValueAtTime(0.06,a.currentTime+i*0.06+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+i*0.06+0.2);
      o.connect(g); g.connect(a.destination);
      o.start(a.currentTime+i*0.06); o.stop(a.currentTime+i*0.06+0.21);
    });
  } catch(e){}
}
function playSfxGenerate() {
  try {
    const a=getAudioCtx();
    [523,659,784,1047].forEach((f,i)=>{
      const o=a.createOscillator(),g=a.createGain(); o.type='triangle'; o.frequency.value=f;
      g.gain.setValueAtTime(0,a.currentTime+i*0.12);
      g.gain.linearRampToValueAtTime(0.1,a.currentTime+i*0.12+0.05);
      g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+i*0.12+0.35);
      o.connect(g); g.connect(a.destination);
      o.start(a.currentTime+i*0.12); o.stop(a.currentTime+i*0.12+0.36);
    });
  } catch(e){}
}

// ══════════════════════════════════════════════
//  RESET
// ══════════════════════════════════════════════
function resetAll() {
  playSfxClick();
  state.photos=[]; state.voiceURL=null; state.voiceBlob=null;
  state.musicTrack='none'; state.customAudioURL=null; state.letterData=null;
  ['recipientName','senderName','letterSubject','letterBody','loveReasons',
   'secretMsg','loveDate','openingQuote','signOff','lyricsText'].forEach(id=>{
    const e=document.getElementById(id); if(e) e.value='';
  });
  el('charCount').textContent='0';
  el('photoPreviewGrid').innerHTML='';
  el('captionFields').innerHTML='';
  el('audioFileName').textContent='No file chosen';
  el('voiceWaveform').innerHTML='';
  el('voicePlay').disabled=true;
  el('voiceTimer').textContent='00:00';
  document.querySelectorAll('.mood-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  document.querySelectorAll('.mode-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  document.querySelectorAll('.music-opt').forEach((b,i)=>b.classList.toggle('active',i===0));
  document.querySelectorAll('.font-btn').forEach((b,i)=>b.classList.toggle('active',i===0));
  isPlaying=false;
  ['audioMusicBox','audioPiano','audioRain','audioCustom'].forEach(id=>{
    const a=document.getElementById(id); if(a){a.pause();a.src='';}
  });
  if (musicGain) { try{musicGain.disconnect();}catch(e){} musicGain=null; }
  document.body.className='mode-starry';
  initParticles();
  nextStep(1);
  showScreen('screen-builder');
}
window.resetAll = resetAll;

// ══════════════════════════════════════════════
//  ROMANTIC QUOTE AUTO-FILL
// ══════════════════════════════════════════════
const quotes = [
  '"In a sea of people, my eyes will always search for you."',
  '"You are my today and all of my tomorrows."',
  '"I love you not only for what you are, but for what I am when I am with you."',
  '"Every love story is beautiful, but ours is my favourite."',
  '"I want all of my lasts to be with you."',
  '"Whatever our souls are made of, his and mine are the same."',
  '"You are my sun, my moon, and all of my stars."',
  '"To love and be loved is to feel the sun from both sides."',
];
let quoteIdx = 0;
document.getElementById('openingQuote')?.addEventListener('focus', function(){
  if (!this.value) { this.value = quotes[quoteIdx % quotes.length]; quoteIdx++; }
});

// ══════════════════════════════════════════════
//  PARALLAX
// ══════════════════════════════════════════════
document.addEventListener('mousemove', e=>{
  const x = (e.clientX/window.innerWidth - 0.5)*20;
  const y = (e.clientY/window.innerHeight - 0.5)*20;
  document.getElementById('aurora').style.transform = `translate(${x*0.5}px,${y*0.5}px)`;
});

// ══════════════════════════════════════════════
//  TOUCH
// ══════════════════════════════════════════════
if ('ontouchstart' in window) {
  cursorGlow.style.display = 'none';
  document.body.style.cursor = 'auto';
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
document.getElementById('screen-landing').classList.add('active');
document.getElementById('screen-builder').style.overflowY = 'auto';
document.getElementById('screen-letter').style.overflowY  = 'auto';

console.log('%c✦ Lumiere Love Letters — share system v2 ✦','font-family:Georgia;font-size:16px;color:#e8829a;');
