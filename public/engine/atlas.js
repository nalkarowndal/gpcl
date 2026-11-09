/**
 * G1 sprite atlas runtime. No dependencies, usable in browser and Node tests.
 *
 * Canonical metadata v1 is validated before use, so production scene code
 * never needs to guess frame coordinates, animation timing, or pivot.
 */
export const ATLAS_FORMAT = 'gpcl-atlas/v1';

function required(ok, message) {
  if (!ok) throw new Error('Invalid sprite atlas: ' + message);
}
function integer(n, min = 0, max = 16384) {
  return Number.isInteger(n) && n >= min && n <= max;
}
function dimensions(d, max = 8192) {
  return d && integer(d.w, 1, max) && integer(d.h, 1, max);
}
function isRecord(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

/**
 * Validate the public versioned art contract. Return the original metadata
 * so this can be used with the bundled PNG or Aseprite-transformed PNG.
 */
export function validateAtlas(atlas) {
  required(isRecord(atlas), 'metadata must be an object');
  required(atlas.format === ATLAS_FORMAT, 'unsupported format (expected ' + ATLAS_FORMAT + ')');
  required(typeof atlas.image === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]*\.png$/.test(atlas.image) &&
    !atlas.image.startsWith('.') && !atlas.image.includes('..'), 'image must be a local PNG filename');
  required(dimensions(atlas.size), 'invalid image dimensions');
  required(dimensions(atlas.frameSize, 512), 'invalid frameSize');
  required(isRecord(atlas.origin) && integer(atlas.origin.x, 0, atlas.frameSize.w) &&
    integer(atlas.origin.y, 0, atlas.frameSize.h), 'origin outside frame');
  required(Array.isArray(atlas.frames) && atlas.frames.length > 0 &&
    atlas.frames.length <= 2048, 'frames must contain 1–2048 items');

  const frameNames = new Set();
  for (const frame of atlas.frames) {
    required(isRecord(frame), 'frame must be an object');
    required(typeof frame.name === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$/.test(frame.name),
      'invalid frame name');
    required(!frameNames.has(frame.name), 'duplicate frame name ' + frame.name);
    frameNames.add(frame.name);
    const r = frame.rect;
    required(dimensions(r) && integer(r.x) && integer(r.y), 'invalid rectangle ' + frame.name);
    required(r.x + r.w <= atlas.size.w && r.y + r.h <= atlas.size.h,
      'frame outside atlas: ' + frame.name);
    required(r.w === atlas.frameSize.w && r.h === atlas.frameSize.h,
      'G1 requires untrimmed, uniformly sized frames: ' + frame.name);
    required(integer(frame.duration, 50, 2000), 'duration must be 50–2000ms: ' + frame.name);
  }
  required(isRecord(atlas.animations) && Object.keys(atlas.animations).length > 0,
    'animations must be a nonempty object');
  for (const [name, anim] of Object.entries(atlas.animations)) {
    required(/^[a-z][a-z0-9_-]{0,45}$/i.test(name), 'invalid animation name');
    required(isRecord(anim) && Array.isArray(anim.frames) && anim.frames.length > 0,
      'animation must contain frames: ' + name);
    required(typeof anim.loop === 'boolean', 'animation loop must be boolean');
    for (const frameName of anim.frames) {
      required(frameNames.has(frameName), 'animation refers to missing frame: ' + frameName);
    }
  }
  required(isRecord(atlas.credit) && typeof atlas.credit.creator === 'string' &&
    atlas.credit.creator.trim().length > 0 && typeof atlas.credit.license === 'string' &&
    atlas.credit.license.trim().length > 0, 'asset credit and redistribution license required');
  return atlas;
}

export function animationFrame(atlas, animationName, elapsedMs = 0) {
  const anim = atlas.animations[animationName];
  if (!anim) return null;
  const framesByName = new Map(atlas.frames.map(frame => [frame.name, frame]));
  const frames = anim.frames.map(name => framesByName.get(name));
  if (frames.some(frame => !frame)) return null;
  const total = frames.reduce((acc, f) => acc + f.duration, 0);
  if (!total) return null;
  let position = Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0);
  position = anim.loop ? position % total : Math.min(position, total - 1);
  for (const frame of frames) {
    if (position < frame.duration) return frame;
    position -= frame.duration;
  }
  return frames[frames.length - 1];
}

export function snapPixel(value) {
  return Number.isFinite(value) ? Math.round(value) : 0;
}
export function drawAtlasFrame(ctx, sheet, atlas, frame, worldX, worldY, scale = 1) {
  if (!ctx || !sheet || !frame || !integer(scale, 1, 8)) return false;
  const {x, y, w, h} = frame.rect;
  if (x < 0 || y < 0 || w <= 0 || h <= 0 ||
    x + w > atlas.size.w || y + h > atlas.size.h) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sheet, x, y, w, h,
    snapPixel(worldX - atlas.origin.x * scale),
    snapPixel(worldY - atlas.origin.y * scale),
    w * scale, h * scale
  );
  return true;
}
export function drawAnimation(ctx, sprites, name, elapsedMs, x, y, scale = 1) {
  if (!sprites?.image || !sprites?.atlas) return false;
  const frame = animationFrame(sprites.atlas, name, elapsedMs);
  return frame ? drawAtlasFrame(ctx, sprites.image, sprites.atlas, frame, x, y, scale) : false;
}

/**
 * Browser-only asset decoding is injected for unit tests.
 * Failed loads are intentionally nonfatal to preserve the existing procedural
 * art. No network activity outside the host's own origin.
 */
export async function loadAtlas(metadataUrl, {
  fetchFn = (...args) => fetch(...args),
  loadImage = url => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode sprite PNG'));
    image.src = url;
  }),
  baseUrl = (typeof location !== 'undefined' ? location.href : 'http://localhost:3333/')
} = {}) {
  const url = new URL(metadataUrl, baseUrl);
  const base = new URL(baseUrl);
  required(url.origin === base.origin, 'cross-origin atlas is not allowed');
  const resp = await fetchFn(url.href);
  if (!resp?.ok) throw new Error('Sprite atlas unavailable: ' + url.pathname);
  const atlas = validateAtlas(await resp.json());
  const imageUrl = new URL(atlas.image, url);
  required(imageUrl.origin === base.origin, 'sprite PNG must be same-origin');
  const image = await loadImage(imageUrl.href);
  required(image && image.width === atlas.size.w && image.height === atlas.size.h,
    'image dimensions do not match validated metadata');
  return {atlas, image};
}
