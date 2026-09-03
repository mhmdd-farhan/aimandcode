import * as THREE from 'three';
import challengeData from './db.json';

const allChallenges = challengeData.challenges;
let challenges = allChallenges;
let currentChallenge = null;
let currentScore = 0;
let shotsFired = 0;
const MAX_SHOTS = 4;
let editor = null;
let canShoot = true;

// ===== PHASE MANAGEMENT =====
function showPhase(id) {
  document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ===== MISS / HIT PHRASES =====
const missPhrases = [
  "Mata lu picek bang? Ulang!",
  "Kayak jomblo deket gebetan, meleset mulu!",
  "Headshot? Lah lu aja ga ada head.",
  "Dikira CS:GO bang? Skill jelek.",
  "Meleset lagi? Gaji lu juga meleset.",
  "Pixel aja lebih presisi dari lu.",
  "Koordinat X Y lu kacau kayak lifecycle React.",
  "Nol besar. Nol presisi. Nol harapan.",
  "Lu kira ini Valorant? Skill issue banget.",
  "Papel sekalipun lebih jago nembak.",
];
function rndMiss() { return missPhrases[Math.floor(Math.random() * missPhrases.length)]; }

const hitRedPhrases = [
  "Kena merah! Siap-siap coding absurd!",
  "Target challenge ketembak. Semangat bang!",
  "Waduh, kena soal nih. Good luck!",
  "Dor! Soal gacha keluar. Awas jangan nyerah!",
];
function rndHitRed() { return hitRedPhrases[Math.floor(Math.random() * hitRedPhrases.length)]; }

// ====================================================================
//  PHASE 1: THREE.JS SHOOTING RANGE (4 targets)
// ====================================================================
let scene, camera, renderer;
let targetObjects = [];
let animId;

// Target positions (fixed Y values, X gets shuffled each round)
const BASE_POSITIONS = [
  { x: -2.2, y: 1.4 },
  { x: -0.7, y: 1.6 },
  { x:  0.7, y: 1.3 },
  { x:  2.2, y: 1.5 },
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTarget() {
  const group = new THREE.Group();

  // Pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x777777 })
  );
  pole.position.y = -0.4;
  pole.castShadow = true;
  group.add(pole);

  // Red target rings
  const ringColors = [0xff1744, 0xffffff, 0xff5252, 0xffffff, 0xff1744];
  const sizes = [0.55, 0.44, 0.33, 0.22, 0.12];

  for (let i = 0; i < ringColors.length; i++) {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(sizes[i], sizes[i], 0.04, 24),
      new THREE.MeshStandardMaterial({ color: ringColors[i] })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.z = 0.02;
    ring.castShadow = true;
    group.add(ring);
  }

  group.userData = { hit: false };
  return group;
}

function initLobby() {
  const canvas = document.getElementById('lobby-canvas');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0e1e);
  scene.fog = new THREE.Fog(0x0e0e1e, 12, 40);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.6, 4);
  camera.lookAt(0, 1.4, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  // Lights
  scene.add(new THREE.AmbientLight(0x404060, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(4, 8, 5);
  dir.castShadow = true;
  scene.add(dir);
  const purple = new THREE.PointLight(0x9900ff, 0.8, 25);
  purple.position.set(-5, 5, 3);
  scene.add(purple);
  const cyan = new THREE.PointLight(0x00cccc, 0.5, 20);
  cyan.position.set(5, 3, 2);
  scene.add(cyan);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.MeshStandardMaterial({ color: 0x111a11, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(40, 40, 0x1a3a1a, 0x0d1a0d);
  grid.position.y = 0.01;
  scene.add(grid);

  // Back wall
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 5),
    new THREE.MeshStandardMaterial({ color: 0x15152a, roughness: 0.9 })
  );
  wall.position.set(0, 2.5, -6);
  scene.add(wall);

  spawnTargets();
  animateLobby();
}

function spawnTargets() {
  // Remove old
  targetObjects.forEach(t => scene.remove(t));
  targetObjects = [];

  // Shuffle X positions, keep Y
  const shuffledX = shuffleArray(BASE_POSITIONS.map(p => p.x));

  for (let i = 0; i < BASE_POSITIONS.length; i++) {
    const t = buildTarget();
    t.position.set(shuffledX[i], BASE_POSITIONS[i].y, -4.5);
    scene.add(t);
    targetObjects.push(t);
  }
}

function animateLobby() {
  animId = requestAnimationFrame(animateLobby);
  const t = Date.now() * 0.001;
  targetObjects.forEach((tgt, i) => {
    if (!tgt.userData.hit) {
      tgt.position.y = BASE_POSITIONS[i].y + Math.sin(t * 1.2 + i) * 0.06;
      tgt.rotation.y = Math.sin(t * 0.8 + i * 0.5) * 0.12;
    }
  });
  renderer.render(scene, camera);
}

// ====================================================================
//  CROSSHAIR & HIT DETECTION (2D pixel-space)
// ====================================================================
let crosshairScreenX = 0; // visual offset in px from center
let crosshairScreenY = 0;
const HIT_RADIUS_PX = 55; // generous hit zone

function updateCrosshairVisual() {
  const ch = document.getElementById('crosshair');
  ch.style.transform = `translate(calc(-50% + ${crosshairScreenX}px), calc(-50% + ${crosshairScreenY}px))`;
}

// Get target's center in screen pixel coords (0,0 = top-left of viewport)
function getTargetScreenPos(tgt) {
  const v = new THREE.Vector3();
  tgt.getWorldPosition(v);
  v.project(camera); // -> NDC x,y in [-1,1], z depth
  return {
    x: (v.x + 1) / 2 * window.innerWidth,
    y: (1 - v.y) / 2 * window.innerHeight,
    z: v.z
  };
}

// Crosshair center in screen pixel coords
function getCrosshairScreenPos() {
  return {
    x: window.innerWidth / 2 + crosshairScreenX,
    y: window.innerHeight / 2 + crosshairScreenY
  };
}

// ====================================================================
//  FIRE SHOT
// ====================================================================
function fireShot() {
  if (!canShoot || shotsFired >= MAX_SHOTS) return;
  if (!document.getElementById('phase-lobby').classList.contains('active')) return;

  canShoot = false;
  shotsFired++;
  document.getElementById('shots-val').textContent = shotsFired;

  const ch = getCrosshairScreenPos();

  // Find nearest unhit target within pixel radius (in front of camera)
  let best = null;
  let bestDist = Infinity;
  for (const tgt of targetObjects) {
    if (tgt.userData.hit) continue;
    const sp = getTargetScreenPos(tgt);
    // Skip targets behind camera
    if (sp.z < 0 || sp.z > 1) continue;
    const dx = ch.x - sp.x;
    const dy = ch.y - sp.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < HIT_RADIUS_PX && d < bestDist) {
      bestDist = d;
      best = tgt;
    }
  }

  if (best) {
    onTargetHit(best);
    return;
  }

  // Miss
  showMissToast(rndMiss());
  setTimeout(() => { canShoot = true; }, 1200);
}

function onTargetHit(target) {
  target.userData.hit = true;

  // Flash
  const flash = document.createElement('div');
  flash.className = 'flash-overlay';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 600);

  showHitPopup('🎯', rndHitRed());
  setTimeout(() => {
    hideHitPopup();
    startGacha();
  }, 1800);
}

function showHitPopup(icon, text) {
  const popup = document.getElementById('hit-popup');
  popup.className = '';
  document.getElementById('hit-popup-icon').textContent = icon;
  document.getElementById('hit-popup-text').textContent = text;
  popup.classList.remove('hidden');
}

function hideHitPopup() {
  document.getElementById('hit-popup').classList.add('hidden');
}

// ====================================================================
//  MISS TOAST (closable + auto 2s)
// ====================================================================
function showMissToast(text) {
  const old = document.getElementById('miss-toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'miss-toast';
  toast.innerHTML = `
    <span id="miss-toast-text">${text}</span>
    <button id="miss-toast-close">&times;</button>
  `;
  document.body.appendChild(toast);

  const closeBtn = toast.querySelector('#miss-toast-close');
  closeBtn.addEventListener('click', () => {
    toast.remove();
    canShoot = true;
  });

  // Auto dismiss 2s
  const timer = setTimeout(() => {
    if (toast.parentNode) toast.remove();
    canShoot = true;
  }, 2000);

  closeBtn.addEventListener('click', () => clearTimeout(timer), { once: true });
}

function resetLobby() {
  shotsFired = 0;
  canShoot = true;
  document.getElementById('shots-val').textContent = '0';
  crosshairScreenX = 0;
  crosshairScreenY = 0;
  updateCrosshairVisual();

  // Remove any lingering toast
  const toast = document.getElementById('miss-toast');
  if (toast) toast.remove();

  spawnTargets();
}

// ====================================================================
//  ANALOG STICK CONTROLLER (MOBILE)
// ====================================================================
const ANALOG_MAX = 50;
const CROSSHAIR_SPEED = 6;
let analogActive = false;
let analogStartX = 0, analogStartY = 0;
let analogDX = 0, analogDY = 0;

function initAnalog() {
  const base = document.getElementById('analog-base');
  const stick = document.getElementById('analog-stick');

  function getXY(e) {
    const ev = e.touches ? e.touches[0] : e;
    return { x: ev.clientX, y: ev.clientY };
  }

  function onStart(e) {
    e.preventDefault();
    analogActive = true;
    const p = getXY(e);
    const rect = base.getBoundingClientRect();
    analogStartX = rect.left + rect.width / 2;
    analogStartY = rect.top + rect.height / 2;
  }

  function onMove(e) {
    if (!analogActive) return;
    e.preventDefault();
    const p = getXY(e);
    let dx = p.x - analogStartX;
    let dy = p.y - analogStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > ANALOG_MAX) {
      dx = (dx / dist) * ANALOG_MAX;
      dy = (dy / dist) * ANALOG_MAX;
    }
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    analogDX = dx / ANALOG_MAX;
    analogDY = dy / ANALOG_MAX;
  }

  function onEnd() {
    analogActive = false;
    stick.style.transform = 'translate(0,0)';
    analogDX = 0;
    analogDY = 0;
  }

  base.addEventListener('mousedown', onStart);
  base.addEventListener('touchstart', onStart, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);

  // Game loop: move crosshair continuously while analog held
  function tick() {
    if (analogActive && (analogDX !== 0 || analogDY !== 0)) {
      crosshairScreenX += analogDX * CROSSHAIR_SPEED;
      crosshairScreenY += analogDY * CROSSHAIR_SPEED;

      // Clamp to screen bounds
      const hw = window.innerWidth / 2 - 20;
      const hh = window.innerHeight / 2 - 20;
      crosshairScreenX = Math.max(-hw, Math.min(hw, crosshairScreenX));
      crosshairScreenY = Math.max(-hh, Math.min(hh, crosshairScreenY));

      updateCrosshairVisual();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ====================================================================
//  PHASE 2: GACHA RANDOMIZER
// ====================================================================
async function startGacha() {
  showPhase('phase-gacha');
  document.getElementById('gacha-spinner').classList.remove('hidden');
  document.getElementById('gacha-result').classList.add('hidden');

  await new Promise(r => setTimeout(r, 2000));

  currentChallenge = challenges[Math.floor(Math.random() * challenges.length)];

  document.getElementById('gacha-spinner').classList.add('hidden');
  document.getElementById('gacha-result').classList.remove('hidden');
  document.getElementById('gacha-title').textContent = currentChallenge.title;
  document.getElementById('gacha-desc').textContent = `Challenge #${currentChallenge.id} — Siap menulis kode absurd?`;
  document.getElementById('gacha-start-btn').onclick = () => startDashboard();
}

// ====================================================================
//  PHASE 3 & 4: CODING DASHBOARD
// ====================================================================
function startDashboard() {
  showPhase('phase-dashboard');

  document.getElementById('terminal-output').innerHTML = '';
  document.getElementById('next-round-btn').classList.add('hidden');
  document.getElementById('submit-btn').classList.remove('hidden');

  document.getElementById('explanation-content').innerHTML = `
    <div class="challenge-title">${currentChallenge.title}</div>
    <div class="challenge-narrative">${currentChallenge.explanation}</div>
  `;

  document.getElementById('sandbox-container').innerHTML = currentChallenge.html_blueprint;
  initMonaco();
  appendTerminal('info', `=== Challenge: ${currentChallenge.title} ===`);
  appendTerminal('info', `Tulis kode JS lalu tekan SUBMIT CODE.`);
}

function initMonaco() {
  const container = document.getElementById('monaco-container');
  if (editor) { editor.dispose(); container.innerHTML = ''; }
  if (typeof require === 'undefined' || typeof require.config === 'undefined') {
    container.innerHTML = '<pre style="color:red;padding:10px;">Monaco Editor gagal load.</pre>';
    return;
  }
  require(['vs/editor/editor.main'], () => {
    editor = window.monaco.editor.create(container, {
      value: currentChallenge.initial_code,
      language: 'javascript',
      theme: 'vs-dark',
      minimap: { enabled: false },
      fontSize: 14,
      // automaticLayout uses a ResizeObserver that's a known CPU hog;
      // we layout manually with a debounce only when the dashboard resizes.
      automaticLayout: false,
      scrollBeyondLastLine: false,
      scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      padding: { top: 10 },
      folding: false,
      links: false,
      renderLineHighlight: 'none',
      contextmenu: false,
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      wordBasedSuggestions: 'off',
    });
  });
}

// Debounced manual Monaco layout (replaces automaticLayout)
let monacoLayoutTimer = null;
function scheduleMonacoLayout() {
  if (!editor) return;
  clearTimeout(monacoLayoutTimer);
  monacoLayoutTimer = setTimeout(() => {
    try { editor.layout(); } catch (_) {}
  }, 100);
}

// ====================================================================
//  EVENT HANDLER TRACKING
//  Intercepts addEventListener/setAttribute so test checks can detect
//  handlers regardless of whether the user writes `el.onclick = fn`
//  or `el.addEventListener('click', fn)`.
// ====================================================================
const handlerRegistry = new WeakMap(); // element -> Set<eventType>

function trackElement(el) {
  if (!handlerRegistry.has(el)) handlerRegistry.set(el, new Set());
  return handlerRegistry.get(el);
}

function initHandlerTracking() {
  if (Element.prototype.__tracked) return;
  Element.prototype.__tracked = true;

  const origAdd = Element.prototype.addEventListener;
  const origRemove = Element.prototype.removeEventListener;
  const origSetAttr = Element.prototype.setAttribute;
  const originAdd = typeof window !== 'undefined' ? window.addEventListener : null;
  const originRemove = typeof window !== 'undefined' ? window.removeEventListener : null;
  const origDocAdd = typeof document !== 'undefined' ? document.addEventListener : null;
  const origDocRemove = typeof document !== 'undefined' ? document.removeEventListener : null;

  // Track window & document (not Elements, so patch separately)
  const autoTrack = (target, type) => {
    const set = trackElement(target);
    set.add(String(type).toLowerCase());
  };
  const autoUntrack = (target, type) => {
    const set = handlerRegistry.get(target);
    if (set) set.delete(String(type).toLowerCase());
  };

  if (originAdd) {
    window.addEventListener = function (type, ...rest) { autoTrack(window, type); return originAdd.call(this, type, ...rest); };
  }
  if (originRemove) {
    window.removeEventListener = function (type, ...rest) { autoUntrack(window, type); return originRemove.call(this, type, ...rest); };
  }
  if (origDocAdd) {
    document.addEventListener = function (type, ...rest) { autoTrack(document, type); return origDocAdd.call(this, type, ...rest); };
  }
  if (origDocRemove) {
    document.removeEventListener = function (type, ...rest) { autoUntrack(document, type); return origDocRemove.call(this, type, ...rest); };
  }

  Element.prototype.addEventListener = function (type, ...rest) {
    const set = trackElement(this);
    set.add(String(type).toLowerCase());
    return origAdd.call(this, type, ...rest);
  };

  Element.prototype.removeEventListener = function (type, ...rest) {
    const set = handlerRegistry.get(this);
    if (set) set.delete(String(type).toLowerCase());
    return origRemove.call(this, type, ...rest);
  };

  Element.prototype.setAttribute = function (name, ...rest) {
    if (typeof name === 'string' && /^on/i.test(name)) {
      const set = trackElement(this);
      set.add(name.slice(2).toLowerCase());
    }
    return origSetAttr.call(this, name, ...rest);
  };
}

// Does the element have a handler for `type` (e.g. 'click', 'input')?
function hasHandler(el, type) {
  if (!el) return false;
  const t = String(type).toLowerCase();
  // 1. currentTarget property set via el.onclick = fn
  if (typeof el['on' + t] === 'function') return true;
  // 2. inline attribute on<type> (may be set by earlier code)
  if (el.getAttribute && el.getAttribute('on' + t) !== null) return true;
  // 3. tracked addEventListener
  const set = handlerRegistry.get(el);
  if (set && set.has(t)) return true;
  return false;
}

// ====================================================================
//  CODE EXECUTION & TEST VALIDATION
// ====================================================================
function executeCode() {
  if (!editor) return;
  const code = editor.getValue();
  appendTerminal('info', '\n> Executing code...');

  try {
    const wrapped = `(function(){ ${code} if(typeof startChallenge==='function') startChallenge(); })();`;
    new Function(wrapped)();
    appendTerminal('warn', '> Code executed. Checking results...');
    setTimeout(() => validateTestCases(), 1500);
  } catch (err) {
    appendTerminal('error', `Runtime Error: ${err.message}`);
  }
}

function validateTestCases() {
  let allPass = true;
  currentChallenge.test_cases.forEach(tc => {
    let pass = false;
    try { pass = evaluateCheck(tc.check_logic); } catch { pass = false; }
    appendTerminal(pass ? 'success' : 'error', pass ? tc.success_msg : tc.error_msg);
    if (!pass) allPass = false;
  });

  if (allPass) {
    appendTerminal('success', '\n=== ALL TESTS PASSED! ===');
    document.getElementById('submit-btn').classList.add('hidden');
    document.getElementById('next-round-btn').classList.remove('hidden');
  } else {
    appendTerminal('error', '\n=== SOME TESTS FAILED. Coba lagi! ===');
  }
}

function evaluateCheck(logic) {
  const s = document.getElementById('sandbox-container');

  switch (logic) {
    case "document.getElementById('vol-slider').value == 0": {
      const el = s.querySelector('#vol-slider');
      return el && el.value == 0;
    }
    case "checkbox_position_changed_on_hover": {
      const cb = s.querySelector('#agree');
      if (!cb) return false;
      const st = cb.getAttribute('style') || '';
      return st.includes('left') && (cb.offsetLeft > 50 || cb.getBoundingClientRect().left > 150);
    }
    case "document.getElementById('bg-canvas').style.backgroundColor === 'rgb(0, 0, 0)' && document.getElementById('bg-canvas').style.cursor === 'none'": {
      const bg = s.id === 'bg-canvas' ? s : s.querySelector('#bg-canvas');
      if (!bg) return false;
      const bgOk = ['rgb(0, 0, 0)', '#000000', 'black', '#000'].includes(bg.style.backgroundColor) ||
                   getComputedStyle(bg).backgroundColor === 'rgb(0, 0, 0)';
      return bgOk && (bg.style.cursor === 'none' || getComputedStyle(bg).cursor === 'none');
    }
    case "regex_emoji_only_pass": {
      const inp = s.querySelector('#pass-input');
      if (!inp || !inp.value) return false;
      return /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2702}-\u{27B0}\u{24C2}-\u{1F251}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(inp.value);
    }
    case "button_inner_text_decrements": {
      const btn = s.querySelector('#captcha-btn');
      if (!btn) return false;
      const m = btn.textContent.match(/(\d+)/);
      return m && parseInt(m[1]) < 99;
    }
    case "is_moving_automatically": {
      const sl = s.querySelector('#dvd-slider');
      if (!sl) return false;
      const st = sl.getAttribute('style') || '';
      return st.includes('left') || st.includes('top') || st.includes('transform');
    }
    case "has_too_many_options": {
      const sel = s.querySelector('#hp-dropdown');
      if (!sel) return false;
      return sel.options.length > 100;
    }
    case "scrollTop_forces_to_zero": {
      const box = s.querySelector('#tnc-box');
      if (!box) return false;
      return hasHandler(box, 'scroll');
    }
    case "button_shrinks_on_hover": {
      const btn = s.querySelector('#shy-btn');
      if (!btn) return false;
      return hasHandler(btn, 'mouseenter') || hasHandler(btn, 'mouseover') ||
             (btn.getAttribute('style') || '').includes('transition');
    }
    case "password_length_decreases": {
      const inp = s.querySelector('#amnesia-pass');
      if (!inp) return false;
      return hasHandler(inp, 'input') || hasHandler(inp, 'change') || hasHandler(inp, 'keydown');
    }
    case "list_appears_above_button": {
      const list = s.querySelector('#drop-list');
      if (!list) return false;
      const st = list.getAttribute('style') || '';
      return st.includes('bottom') || st.includes('top');
    }
    case "force_grayscale_hex": {
      const inp = s.querySelector('#depressed-color');
      if (!inp) return false;
      return hasHandler(inp, 'input') || hasHandler(inp, 'change');
    }
    case "progress_value_decreases_below_zero": {
      const bar = s.querySelector('#loading-bar');
      if (!bar) return false;
      return hasHandler(bar, 'click') || hasHandler(bar, 'load') || hasHandler(bar, 'input') ||
             window.__progressIntervalStarted === true;
    }
    case "font_size_decreases_on_input": {
      const ta = s.querySelector('#stingy-text');
      if (!ta) return false;
      return hasHandler(ta, 'input');
    }
    case "body_opacity_changes": {
      const inp = s.querySelector('#fake-vol');
      if (!inp) return false;
      return hasHandler(inp, 'input') || hasHandler(inp, 'change');
    }
    case "inverse_coordinates": {
      const arena = s.querySelector('#mouse-arena');
      if (!arena) return false;
      return hasHandler(arena, 'mousemove') || hasHandler(document, 'mousemove');
    }
    case "input_is_randomized": {
      const inp = s.querySelector('#drunk-input');
      if (!inp) return false;
      return hasHandler(inp, 'keydown') || hasHandler(inp, 'keypress') ||
             hasHandler(inp, 'keyup') || hasHandler(inp, 'input');
    }
    case "closes_only_on_compliment": {
      const close = s.querySelector('#close-modal');
      const inp = s.querySelector('#compliment');
      if (!close || !inp) return false;
      return hasHandler(close, 'click') || hasHandler(inp, 'input') ||
             hasHandler(inp, 'keydown');
    }
    case "requires_camel_emoji": {
      const btn = s.querySelector('#check-pass');
      if (!btn) return false;
      return hasHandler(btn, 'click');
    }
    case "scroll_x_instead_of_y": {
      return hasHandler(s, 'wheel') || hasHandler(window, 'wheel') ||
             hasHandler(document, 'wheel') || hasHandler(document, 'scroll') ||
             hasHandler(window, 'scroll');
    }
    case "requires_10s_hold": {
      const ch = s.querySelector('#hold-check');
      if (!ch) return false;
      return hasHandler(ch, 'mousedown') || hasHandler(ch, 'mouseup') ||
             hasHandler(ch, 'pointerdown') || hasHandler(ch, 'pointerup');
    }
    case "blur_increases_on_hover": {
      const img = s.querySelector('#blur-img');
      if (!img) return false;
      return hasHandler(img, 'mouseenter') || hasHandler(img, 'mouseover') ||
             hasHandler(img, 'mousemove');
    }
    case "uses_db_logic": {
      const inp = s.querySelector('#db-vol');
      if (!inp) return false;
      return hasHandler(inp, 'input') || hasHandler(inp, 'change') ||
             hasHandler(inp, 'keyup') || hasHandler(inp, 'keydown');
    }
    case "form_rotates_on_input": {
      const form = s.querySelector('#spin-form');
      if (!form) return false;
      const inp = form.querySelector('input');
      return !!(inp && (hasHandler(inp, 'input') || hasHandler(form, 'input')));
    }
    case "all_radios_checked": {
      const radios = s.querySelectorAll('.greedy-radio');
      if (radios.length < 2) return false;
      return hasHandler(radios[0], 'change') || hasHandler(radios[0], 'click') ||
             hasHandler(document, 'change') || hasHandler(document, 'click');
    }
    case "forces_year_1999": {
      const dp = s.querySelector('#y2k-date');
      if (!dp) return false;
      return hasHandler(dp, 'change') || hasHandler(dp, 'input');
    }
    case "button_text_changes_language": {
      const btn = s.querySelector('#lang-btn');
      if (!btn) return false;
      return hasHandler(btn, 'click');
    }
    case "requires_guk_guk": {
      const inp = s.querySelector('#dog-captcha');
      if (!inp) return false;
      return hasHandler(inp, 'input');
    }
    case "submits_on_mouseleave": {
      const btn = s.querySelector('#oob-submit');
      if (!btn) return false;
      return hasHandler(btn, 'click') || hasHandler(document, 'mouseleave') ||
             hasHandler(document, 'mouseout') || hasHandler(window, 'mouseleave');
    }
    case "text_doubles_on_delete": {
      const btn = s.querySelector('#fake-del');
      if (!btn) return false;
      return hasHandler(btn, 'click');
    }
    case "always_weak": {
      const inp = s.querySelector('#str-pass');
      if (!inp) return false;
      return hasHandler(inp, 'input') || hasHandler(inp, 'keyup');
    }
    case "has_alert_loop": {
      const link = s.querySelector('#annoying-link');
      if (!link) return false;
      return hasHandler(link, 'click');
    }
    case "redirects_to_seblak": {
      const inp = s.querySelector('#search-nyasar');
      if (!inp) return false;
      return hasHandler(inp, 'keydown') || hasHandler(inp, 'keypress') ||
             hasHandler(inp, 'keyup') || hasHandler(inp, 'change');
    }
    case "always_replies_au_ah": {
      const inp = s.querySelector('#chat-input');
      if (!inp) return false;
      return hasHandler(inp, 'input') || hasHandler(inp, 'keydown') ||
             hasHandler(inp, 'keyup');
    }
    case "changes_name_on_logout": {
      const btn = s.querySelector('#logout-btn');
      if (!btn) return false;
      return hasHandler(btn, 'click');
    }
    case "buttons_toggle_disabled": {
      const b1 = s.querySelector('#btn-ping');
      const b2 = s.querySelector('#btn-pong');
      if (!b1 || !b2) return false;
      return hasHandler(b1, 'mouseenter') || hasHandler(b1, 'click') ||
             hasHandler(b2, 'mouseenter') || hasHandler(b2, 'click');
    }
    case "interval_is_500ms": {
      const clk = s.querySelector('#fast-clock');
      if (!clk) return false;
      return clk.textContent !== '00:00:00' || clk.getAttribute('data-started') !== null ||
             hasHandler(window, 'load');
    }
    case "grows_on_outside_click": {
      const noti = s.querySelector('#noti-box');
      if (!noti) return false;
      const initial = noti.offsetWidth;
      document.body.click();
      return noti.offsetWidth > initial || hasHandler(document, 'click') ||
             hasHandler(window, 'click');
    }
    case "pastes_reversed_text": {
      const ta = s.querySelector('#reverse-paste');
      if (!ta) return false;
      return hasHandler(ta, 'paste');
    }
    case "battery_drains_on_vol_up": {
      const sl = s.querySelector('#vol-sucker');
      if (!sl) return false;
      return hasHandler(sl, 'input') || hasHandler(sl, 'change');
    }
    case "options_rendered_randomly": {
      const sel = s.querySelector('#hide-seek-drop');
      if (!sel) return false;
      return hasHandler(sel, 'change') || hasHandler(sel, 'click') ||
             hasHandler(sel, 'focus');
    }
    case "bg_changes_on_input": {
      const inp = s.querySelector('#rave-input');
      if (!inp) return false;
      return hasHandler(inp, 'input');
    }
    case "text_appends_A_on_scroll": {
      return hasHandler(window, 'scroll') || hasHandler(document, 'scroll') ||
             hasHandler(s, 'scroll') || hasHandler(window, 'wheel') ||
             window.__screamHandler === true;
    }
    case "click_has_delay": {
      const btn = s.querySelector('#lag-btn');
      if (!btn) return false;
      return hasHandler(btn, 'click');
    }
    case "requires_konami_code": {
      return hasHandler(window, 'keydown') || hasHandler(document, 'keydown') ||
             hasHandler(document, 'keyup') || hasHandler(window, 'keyup');
    }
    case "mute_on_max_volume": {
      const aud = s.querySelector('#troll-audio');
      if (!aud) return false;
      return hasHandler(aud, 'volumechange') || hasHandler(aud, 'change') ||
             hasHandler(aud, 'input');
    }
    case "font_changes_on_input": {
      const ta = s.querySelector('#font-roulette');
      if (!ta) return false;
      return hasHandler(ta, 'input');
    }
    case "removes_odd_numbers": {
      const inp = s.querySelector('#even-only');
      if (!inp) return false;
      return hasHandler(inp, 'input') || hasHandler(inp, 'change') ||
             hasHandler(inp, 'keyup');
    }
    case "text_direction_rtl": {
      const inp = s.querySelector('#mirror-input');
      if (!inp) return false;
      return hasHandler(inp, 'input');
    }
    case "body_is_removed": {
      const btn = s.querySelector('#doomsday-btn');
      if (!btn) return false;
      return hasHandler(btn, 'click');
    }
    default: {
      try { return !!new Function('s', `return ${logic}`)(s); } catch { return false; }
    }
  }
}


function appendTerminal(type, text) {
  const t = document.getElementById('terminal-output');
  const d = document.createElement('div');
  d.className = `terminal-line ${type}`;
  d.textContent = text;
  t.appendChild(d);
  t.scrollTop = t.scrollHeight;
}

// ====================================================================
//  INIT
// ====================================================================
const isDesktop = !('ontouchstart' in window) && navigator.maxTouchPoints === 0;

document.addEventListener('DOMContentLoaded', () => {
  initLobby();
  initAnalog();
  initHandlerTracking();

  const controller = document.getElementById('controller');
  const lobbyEl = document.getElementById('phase-lobby');

  if (isDesktop) {
    // Desktop: hide analog, mouse moves crosshair, click to fire
    controller.classList.add('desktop-hidden');
    document.body.style.cursor = 'none';

    lobbyEl.addEventListener('mousemove', (e) => {
      if (!lobbyEl.classList.contains('active')) return;
      crosshairScreenX = e.clientX - window.innerWidth / 2;
      crosshairScreenY = e.clientY - window.innerHeight / 2;
      updateCrosshairVisual();
    });

    lobbyEl.addEventListener('click', (e) => {
      if (!lobbyEl.classList.contains('active')) return;
      fireShot();
    });
  } else {
    document.body.style.cursor = 'none';
  }

  document.getElementById('shoot-btn').addEventListener('click', (e) => {
    e.preventDefault();
    fireShot();
  });

  document.getElementById('submit-btn').addEventListener('click', executeCode);

  document.getElementById('next-round-btn').addEventListener('click', () => {
    showPhase('phase-lobby');
    resetLobby();
  });

  window.addEventListener('resize', () => {
    if (camera && renderer) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    scheduleMonacoLayout();
  });
});
