'use strict';

/** Pure, testable geometry and persistence helpers for floating taskbar widgets. */
const LAYOUTS = Object.freeze({
  room: Object.freeze({width: 592, height: 442, minWidth: 470, minHeight: 360}),
  bar: Object.freeze({width: 610, height: 188, minWidth: 440, minHeight: 145}),
});
const DEFAULTS = Object.freeze({
  layout: 'room', alwaysOnTop: true, docked: true,
  clickThrough: false, opacity: 1,
  roomTheme: 'dusk', customBounds: null,
});
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function sanitizePreferences(input = {}) {
  const prefs = {...DEFAULTS};
  if (!input || typeof input !== 'object') return prefs;
  if (input.layout === 'room' || input.layout === 'bar') prefs.layout = input.layout;
  if (typeof input.alwaysOnTop === 'boolean') prefs.alwaysOnTop = input.alwaysOnTop;
  if (typeof input.docked === 'boolean') prefs.docked = input.docked;
  if (typeof input.clickThrough === 'boolean') prefs.clickThrough = input.clickThrough;
  if (typeof input.opacity === 'number' && Number.isFinite(input.opacity)) {
    prefs.opacity = Math.round(clamp(input.opacity, 0.55, 1) * 100) / 100;
  }
  if (['dusk','sunrise','forest'].includes(input.roomTheme)) prefs.roomTheme = input.roomTheme;
  if (input.customBounds && typeof input.customBounds === 'object') {
    const {x, y, width, height} = input.customBounds;
    if ([x,y,width,height].every(Number.isFinite) && width >= 280 && height >= 120) {
      prefs.customBounds = {x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height)};
    }
  }
  return prefs;
}
function layoutSize(layout) {
  return LAYOUTS[layout] || LAYOUTS.room;
}
function dockBounds(workArea, layout = 'room', options = {}) {
  const size = layoutSize(layout);
  const margin = 10;
  const width = Math.min(size.width, Math.max(320, workArea.width - 12));
  const height = Math.min(size.height, Math.max(120, workArea.height - 12));
  return {
    x: Math.round(workArea.x + Math.max(0, workArea.width - width - margin)),
    y: Math.round(workArea.y + Math.max(0, workArea.height - height - margin)),
    width: Math.round(width), height: Math.round(height),
  };
}
function visibleBounds(bounds, workArea) {
  const width = Math.min(bounds.width, workArea.width);
  const height = Math.min(bounds.height, workArea.height);
  return {
    x: Math.round(clamp(bounds.x, workArea.x, workArea.x + workArea.width - width)),
    y: Math.round(clamp(bounds.y, workArea.y, workArea.y + workArea.height - height)),
    width: Math.round(width), height: Math.round(height),
  };
}
module.exports = {DEFAULTS, LAYOUTS, sanitizePreferences, layoutSize, dockBounds, visibleBounds};
