import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

const params       = new URLSearchParams(location.search);
const splatUrl     = params.get('url');
const camPosParam  = params.get('camPos');
const camLookParam = params.get('camLook');

const progressWrap = document.getElementById('progress-wrap');
const progressBar  = document.getElementById('progress-bar');
const hintEl       = document.getElementById('hint');
const errorEl      = document.getElementById('error-msg');

function parseVec3(str, fallback) {
  if (!str) return fallback;
  const parts = str.split(',').map(Number);
  return parts.length === 3 && parts.every(isFinite) ? parts : fallback;
}

const initialCameraPosition = parseVec3(camPosParam,  [-1, -4, 6]);
const initialCameraLookAt   = parseVec3(camLookParam, [0, 0, 0]);

// Show the appropriate controls hint for the device type
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
  const viewer = new GaussianSplats3D.Viewer({
    selfDrivenMode:        true,
    useBuiltInControls:    true,
    sharedMemoryForWorkers: false, // required for cross-origin iframe compatibility
    dynamicScene:          false,
    cameraUp:              [0, -1, 0],
    initialCameraPosition,
    initialCameraLookAt,
  });

  await viewer.addSplatScene(url, {
    splatAlphaRemovalThreshold: 5,
    onProgress: (progress) => {
      // progress may be 0–100 or 0–1 depending on the library version
      const pct = (progress > 1 ? progress : progress * 100);
      progressBar.style.width = `${Math.min(Math.max(pct, 0), 100)}%`;
    },
  });

  // Animate progress bar to full, then fade it out
  progressBar.style.width = '100%';
  setTimeout(() => {
    progressWrap.style.opacity = '0';
    setTimeout(() => { progressWrap.hidden = true; }, 550);
  }, 350);

  viewer.start();

  // Enable slow auto-orbit via OrbitControls.autoRotate
  const controls = viewer.controls;
  if (controls) {
    controls.autoRotate      = true;
    controls.autoRotateSpeed = 0.8;
  }

  // Trigger resize so the canvas fills the viewport on load
  handleResize(viewer);
  window.addEventListener('resize', () => handleResize(viewer));

  // Show hint once rendering begins
  requestAnimationFrame(() => hintEl.classList.add('visible'));

  // On first user interaction: stop orbit, hide hint
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

  // Auto-hide hint after 4 s even without interaction
  setTimeout(() => { if (!interacted) onInteract(); }, 4000);
}

function handleResize(viewer) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (viewer.renderer) {
    viewer.renderer.setSize(w, h);
    viewer.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  if (viewer.camera) {
    viewer.camera.aspect = w / h;
    viewer.camera.updateProjectionMatrix();
  }
}

function showError(msg) {
  progressWrap.hidden = true;
  hintEl.hidden       = true;
  errorEl.textContent = msg;
  errorEl.removeAttribute('hidden');
}
