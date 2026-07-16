/* ============================================================
   DIGIT RECOGNITION — script.js
============================================================ */

/* ── ANIMATED BG DIGITS ─────────────────────────────────── */
const bgDigitsEl = document.getElementById('bgDigits');
for (let i = 0; i < 22; i++) {
  const d = document.createElement('div');
  d.className = 'bg-digit';
  d.textContent = Math.floor(Math.random() * 10);
  const fs = 32 + Math.random() * 90;
  d.style.cssText =
    `font-size:${fs}px;` +
    `left:${Math.random()*100}%;` +
    `bottom:-${fs + 10}px;` +
    `animation-duration:${10 + Math.random()*20}s;` +
    `animation-delay:${Math.random()*18}s;`;
  bgDigitsEl.appendChild(d);
}

/* ── THEME TOGGLE ────────────────────────────────────────── */
let lightMode = false;

function applyTheme() {
  document.body.classList.toggle('light', lightMode);
  const icon = lightMode ? '☾' : '☀';
  document.getElementById('themeBtn').textContent        = icon;
  document.getElementById('themeBtnLanding').textContent = icon;
}

document.getElementById('themeBtn').onclick        = () => { lightMode = !lightMode; applyTheme(); };
document.getElementById('themeBtnLanding').onclick = () => { lightMode = !lightMode; applyTheme(); };

/* ── VIEW SWITCHING ──────────────────────────────────────── */
let currentMode = null;

function showView(id) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.remove('active');
    v.style.display = 'none';
    v.style.opacity = '0';
  });
  const el = document.getElementById(id);
  el.style.display = 'flex';
  requestAnimationFrame(() => {
    el.classList.add('active');
    el.style.opacity = '1';
  });
  window.scrollTo(0, 0);
}

// Mode card clicks
document.querySelectorAll('.mode-card').forEach(card => {
  card.onclick = () => {
    currentMode = card.dataset.mode;
    openMode(currentMode);
  };
});

function openMode(mode) {
  // Hide all panels
  ['drawPanel','uploadPanel','cameraPanel'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById('resultPanel').style.display = 'none';

  // Show correct panel
  const titles = { draw: 'Draw a Digit', upload: 'Upload Image', camera: 'Live Camera' };
  document.getElementById('topbarTitle').textContent = titles[mode];

  if (mode === 'draw')   document.getElementById('drawPanel').style.display   = 'flex';
  if (mode === 'upload') document.getElementById('uploadPanel').style.display  = 'flex';
  if (mode === 'camera') document.getElementById('cameraPanel').style.display  = 'flex';

  showView('workView');
}

// Back button
document.getElementById('backBtn').onclick = () => {
  stopCamera();
  showView('landingView');
  resetResult();
};

// Retry button
document.getElementById('retryBtn').onclick = () => {
  document.getElementById('resultPanel').style.display = 'none';
  if (currentMode === 'draw') {
    document.getElementById('drawPanel').style.display = 'flex';
    clearCanvas();
  }
  if (currentMode === 'upload') {
    document.getElementById('uploadPanel').style.display       = 'flex';
    document.getElementById('uploadPreviewWrap').style.display = 'none';
    document.querySelector('.drop-zone').style.display         = 'flex';
    document.getElementById('uploadInput').value               = '';
  }
  if (currentMode === 'camera') {
    document.getElementById('cameraPanel').style.display = 'flex';
    document.getElementById('cameraPreview').style.display = 'none';
    document.getElementById('camStatus').style.display = 'block';
    camStatus.textContent = 'Open camera, hold up a digit, then capture';
  }
  resetResult();
};

/* ── CANVAS DRAWING ──────────────────────────────────────── */
const canvas     = document.getElementById('canvas');
const ctx        = canvas.getContext('2d');
const brushInput = document.getElementById('brush');

let strokes = [], currentStroke = [], drawing = false;

function clearCanvas() {
  ctx.fillStyle = '#05050a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  strokes = []; currentStroke = [];
}
clearCanvas();

function redrawAll() {
  clearCanvas();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  strokes.forEach(s => {
    if (s.length < 2) return;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s[0].w;
    ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y);
    s.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  });
}

function getPos(e) {
  const r = canvas.getBoundingClientRect();
  const sx = canvas.width / r.width, sy = canvas.height / r.height;
  if (e.touches) return { x:(e.touches[0].clientX-r.left)*sx, y:(e.touches[0].clientY-r.top)*sy };
  return { x:(e.clientX-r.left)*sx, y:(e.clientY-r.top)*sy };
}

canvas.addEventListener('mousedown', e => {
  drawing = true;
  const p = getPos(e);
  currentStroke = [{x:p.x,y:p.y,w:+brushInput.value}];
  ctx.strokeStyle='#ffffff'; ctx.lineWidth=+brushInput.value;
  ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath(); ctx.moveTo(p.x,p.y);
});
canvas.addEventListener('mousemove', e => {
  if (!drawing) return;
  const p = getPos(e);
  currentStroke.push({x:p.x,y:p.y,w:+brushInput.value});
  ctx.lineTo(p.x,p.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x,p.y);
});
canvas.addEventListener('mouseup',    () => { drawing=false; if(currentStroke.length){strokes.push(currentStroke);currentStroke=[];} ctx.beginPath(); });
canvas.addEventListener('mouseleave', () => { drawing=false; if(currentStroke.length){strokes.push(currentStroke);currentStroke=[];} ctx.beginPath(); });
canvas.addEventListener('touchstart', e => { e.preventDefault(); drawing=true; const p=getPos(e); currentStroke=[{x:p.x,y:p.y,w:+brushInput.value}]; ctx.strokeStyle='#ffffff'; ctx.lineWidth=+brushInput.value; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); ctx.moveTo(p.x,p.y); }, {passive:false});
canvas.addEventListener('touchmove',  e => { e.preventDefault(); if(!drawing)return; const p=getPos(e); currentStroke.push({x:p.x,y:p.y,w:+brushInput.value}); ctx.lineTo(p.x,p.y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p.x,p.y); }, {passive:false});
canvas.addEventListener('touchend',   () => { drawing=false; if(currentStroke.length){strokes.push(currentStroke);currentStroke=[];} ctx.beginPath(); });

document.getElementById('undoBtn').onclick = () => { if(strokes.length){strokes.pop();redrawAll();} };
document.getElementById('clearBtn').onclick = () => { clearCanvas(); };
document.addEventListener('keydown', e => { if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();if(strokes.length){strokes.pop();redrawAll();}} });

document.getElementById('predictCanvas').onclick = function() {
  runPredict(canvas.toDataURL('image/png'));
};

/* ── UPLOAD ──────────────────────────────────────────────── */
document.getElementById('uploadInput').addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    document.getElementById('uploadPreview').src = dataUrl;
    document.getElementById('uploadPreviewWrap').style.display = 'flex';
    document.querySelector('.drop-zone').style.display = 'none';
  };
  reader.readAsDataURL(file);
  this.value = '';
});

document.getElementById('predictUpload').onclick = function() {
  const src = document.getElementById('uploadPreview').src;
  if (src) runPredict(src);
};

/* ── CAMERA ──────────────────────────────────────────────── */
const video         = document.getElementById('video');
const cameraCanvas  = document.getElementById('cameraCanvas');
const camCtx        = cameraCanvas.getContext('2d');
const cameraPreview = document.getElementById('cameraPreview');
const camStatus     = document.getElementById('camStatus');
const startCamBtn   = document.getElementById('startCamera');
const captureBtn    = document.getElementById('captureBtn');
let stream = null;

startCamBtn.onclick = async () => {
  if (stream) { stopCamera(); return; }
  camStatus.textContent = 'Starting camera...';
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode:'environment', width:{ideal:640}, height:{ideal:480} }
    });
    video.srcObject = stream;
    await video.play();
    video.style.display   = 'block';
    cameraPreview.style.display = 'none';
    camStatus.style.display     = 'none';
    startCamBtn.textContent = '⏹ Stop';
    captureBtn.disabled     = false;
  } catch {
    camStatus.textContent = '⚠️ Camera permission denied';
    camStatus.style.color = 'var(--red)';
  }
};

captureBtn.onclick = () => {
  if (!stream) return;
  cameraCanvas.width  = video.videoWidth  || 640;
  cameraCanvas.height = video.videoHeight || 480;
  camCtx.drawImage(video, 0, 0, cameraCanvas.width, cameraCanvas.height);
  const dataUrl = cameraCanvas.toDataURL('image/png');
  cameraPreview.src           = dataUrl;
  cameraPreview.style.display = 'block';
  video.style.display         = 'none';
  stopCamera();
  camStatus.style.display = 'none';
  runPredict(dataUrl);
};

function stopCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  video.style.display     = 'none';
  startCamBtn.textContent = '📷 Open Camera';
  captureBtn.disabled     = true;
}

/* ── CONFETTI ────────────────────────────────────────────── */
function launchConfetti() {
  const layer  = document.getElementById('confettiLayer');
  const colors = ['#6c63ff','#22c55e','#f59e0b','#ec4899','#38bdf8','#f87171'];
  for (let i = 0; i < 55; i++) {
    const c = document.createElement('div');
    c.className = 'confetti-piece';
    c.style.cssText =
      `left:${Math.random()*100}vw;` +
      `background:${colors[Math.floor(Math.random()*colors.length)]};` +
      `width:${5+Math.random()*8}px;height:${5+Math.random()*8}px;` +
      `border-radius:${Math.random()>.5?'50%':'2px'};` +
      `animation-duration:${1.4+Math.random()*1.8}s;` +
      `animation-delay:${Math.random()*0.5}s;`;
    layer.appendChild(c);
    c.addEventListener('animationend', () => c.remove());
  }
}

/* ── RESULT ──────────────────────────────────────────────── */
function resetResult() {
  document.getElementById('digit').textContent = '—';
  document.getElementById('confidence').textContent = '—';
  document.getElementById('confFill').style.width = '0%';
  document.getElementById('probBars').innerHTML = '';
  document.getElementById('debugWrap').style.display = 'none';
  document.getElementById('histSection').style.display = 'none';
  document.getElementById('streakBadge').style.display = 'none';
  document.querySelector('.feedback-row').style.display = 'flex';
  document.getElementById('fbYes').className = 'fb-btn';
  document.getElementById('fbNo').className  = 'fb-btn';
  document.getElementById('fbYes').onclick   = null;
  document.getElementById('fbNo').onclick    = null;
}

function showResult(data, debugPreview) {
  const { prediction, confidence, all_probs } = data;

  // Digit
  const digitEl = document.getElementById('digit');
  digitEl.textContent = prediction;
  digitEl.style.animation = 'none';
  void digitEl.offsetWidth;
  digitEl.style.animation = '';

  // Confidence
  document.getElementById('confidence').textContent = `${confidence}%`;
  requestAnimationFrame(() => {
    document.getElementById('confFill').style.width = confidence + '%';
  });

  // Debug preview
  if (debugPreview) {
    document.getElementById('debugImg').src = debugPreview;
    document.getElementById('debugWrap').style.display = 'flex';
  }

  // Prob chart
  const barsEl = document.getElementById('probBars');
  barsEl.innerHTML = '';
  if (all_probs && all_probs.length === 10) {
    all_probs.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      const isTop = i === prediction;
      row.innerHTML =
        `<div class="bar-label ${isTop?'top':''}">${i}</div>` +
        `<div class="bar-bg"><div class="bar-fill ${isTop?'top':''}" id="bf${i}"></div></div>` +
        `<div class="bar-pct">${p}%</div>`;
      barsEl.appendChild(row);
    });
    requestAnimationFrame(() => {
      all_probs.forEach((p, i) => setTimeout(() => {
        const el = document.getElementById('bf' + i);
        if (el) el.style.width = p + '%';
      }, i * 50));
    });
  }

  // Feedback
  attachFeedback();
  addHistory(prediction, confidence);
  if (confidence >= 70) launchConfetti();

  // Show result, hide current panel
  ['drawPanel','uploadPanel','cameraPanel'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById('resultPanel').style.display = 'flex';
}

/* ── STREAK & FEEDBACK ───────────────────────────────────── */
let streak = 0;

function attachFeedback() {
  const yes = document.getElementById('fbYes');
  const no  = document.getElementById('fbNo');
  yes.className = 'fb-btn'; no.className = 'fb-btn';

  yes.onclick = () => {
    streak++;
    yes.classList.add('yes-active');
    no.classList.remove('no-active');
    yes.onclick = null; no.onclick = null;
    updateStreak();
    if (streak >= 3) launchConfetti();
  };
  no.onclick = () => {
    streak = 0;
    no.classList.add('no-active');
    yes.classList.remove('yes-active');
    yes.onclick = null; no.onclick = null;
    updateStreak();
  };
}

function updateStreak() {
  const badge = document.getElementById('streakBadge');
  if (streak > 0) {
    badge.textContent = `🔥 ${streak} correct in a row`;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

/* ── HISTORY ─────────────────────────────────────────────── */
let histList = [];
function addHistory(digit, conf) {
  histList.unshift({ digit, conf });
  if (histList.length > 6) histList.pop();
  const sec = document.getElementById('histSection');
  const strip = document.getElementById('histStrip');
  strip.innerHTML = histList.map(h =>
    `<div class="hist-card"><div class="hist-digit">${h.digit}</div><div class="hist-conf">${h.conf}%</div></div>`
  ).join('');
  sec.style.display = 'block';
}

/* ── CORE PREDICT ────────────────────────────────────────── */
let isPredicting = false;

async function runPredict(imageDataUrl) {
  if (isPredicting) return;
  isPredicting = true;

  // Show loading state in result area
  ['drawPanel','uploadPanel','cameraPanel'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  const rp = document.getElementById('resultPanel');
  rp.style.display = 'flex';
  document.getElementById('digit').innerHTML = '<div class="spinner"></div>';
  document.getElementById('confidence').textContent = '';
  document.getElementById('confFill').style.width = '0%';
  document.getElementById('probBars').innerHTML = '';
  document.getElementById('debugWrap').style.display = 'none';
  document.querySelector('.feedback-row').style.display = 'none';
  document.getElementById('streakBadge').style.display = 'none';
  document.getElementById('histSection').style.display = 'none';

  try {
    const [predRes, debugRes] = await Promise.all([
      fetch('/predict', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({image:imageDataUrl}) }),
      fetch('/debug',   { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({image:imageDataUrl}) })
    ]);

    if (!predRes.ok) throw new Error('Server error ' + predRes.status);
    const data = await predRes.json();
    if (data.error) throw new Error(data.error);

    let debugPreview = null;
    if (debugRes.ok) {
      const dbg = await debugRes.json();
      debugPreview = dbg.preview;
    }

    showResult(data, debugPreview);

  } catch (err) {
    document.getElementById('digit').textContent = '⚠';
    document.getElementById('confidence').textContent = err.message || 'Something went wrong';
    document.querySelector('.feedback-row').style.display = 'none';
  }

  isPredicting = false;
}
