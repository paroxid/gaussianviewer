import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

const params       = new URLSearchParams(location.search);
const splatUrl     = params.get('url');
const camPosParam  = params.get('camPos');
const camLookParam = params.get('camLook');

const progressWrap = document.getElementById('progress-wrap');
const progressBar  = document.getElementById('progress-bar');
const hintEl       = document.getElementById('hint');
const errorEl      = document.getElementById('error-msg');

// Catch any errors (including those from workers) that escape the Promise chain
window.addEventListener('error', e => showError(`JS error:\n${e.message}`));
window.addEventListener('unhandledrejection', e =>
  showError(`Unhandled error:\n${e.reason?.message ?? e.reason}`)
);

function parseVec3(str, fallback) {
  if (!str) return fallback;
  const parts = str.split(',').map(Number);
  return parts.length === 3 && parts.every(isFinite) ? parts : fallback;
}

const isTouch = navigator.maxTouchPoints > 0;
hintEl.textContent = isTouch
  ? 'Drag to orbit · Pinch to zoom'
  : 'Drag to orbit · Scroll to zoom · Right-drag to pan';

if (!splatUrl) {
  showError('No ?url= parameter provided.\nAdd ?url=https://... to use this viewer.');
} else {
  init(splatUrl).catch(err => showError(`Could not load splat:\n${err.message}`));
}

async function init(url) {
  const options = {
    selfDrivenMode:     true,
    useBuiltInControls: true,
  };

  // Only override camera if URL params are explicitly provided;
  // otherwise let GaussianSplats3D use its own defaults which suit its demo data.
  const camPos  = parseVec3(camPosParam, null);
  const camLook = parseVec3(camLookParam, null);
  if (camPos)  options.initialCameraPosition = camPos;
  if (camLook) options.initialCameraLookAt   = camLook;

  const viewer = new GaussianSplats3D.Viewer(options);

  await viewer.addSplatScene(url, {
    splatAlphaRemovalThreshold: 5,
    onProgress: (progress) => {
      const pct = progress > 1 ? progress : progress * 100;
      progressBar.style.width = `${Math.min(Math.max(pct, 0), 100)}%`;
    },
  });

  progressBar.style.width = '100%';
  setTimeout(() => {
    progressWrap.style.opacity = '0';
    setTimeout(() => { progressWrap.hidden = true; }, 550);
  }, 350);

  viewer.start();

  const controls = viewer.controls;
  if (controls) {
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 0.8;
  }

  requestAnimationFrame(() => hintEl.classList.add('visible'));

  let interacted = false;
  const onInteract = () => {
    if (interacted) return;
    interacted = true;
    if (controls) controls.autoRotate = false;
    hintEl.classList.remove('visible');
    hintEl.classList.add('fade-out');
  };

  ['mousedown', 'touchstart', 'wheel', 'keydown'].forEach(evt =>
    window.addEventListener(evt, onInteract, { once: true, passive: true })
  );

  setTimeout(() => { if (!interacted) onInteract(); }, 4000);
}

function showError(msg) {
  progressWrap.hidden = true;
  hintEl.hidden       = true;
  errorEl.textContent = msg;
  errorEl.removeAttribute('hidden');
}
