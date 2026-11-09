const W = 480;
const H = 320;
const stationPositions = [[101, 137], [233, 137], [363, 137], [101, 235], [233, 235], [363, 235]];
const outfits = ['#86d5bf', '#e5ad8d', '#b6a9ef', '#e8cb85', '#9ebfdf', '#ef9daa'];
const hairColors = ['#29364c', '#713f4c', '#d6a36c', '#45526d', '#352c40', '#a76a50'];
const positionCache = new Map();

function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}
function line(ctx, x, y, w, h, color) { rect(ctx, x, y, w, h, color); }
function text(ctx, string, x, y, color = '#f4f2dc', font = 'bold 7px monospace') {
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(15, 22, 35, .9)';
  ctx.fillText(string, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(string, x, y);
}
function roundPanel(ctx, x, y, w, h, color, border) {
  rect(ctx, x + 2, y, w - 4, h, color);
  rect(ctx, x, y + 2, w, h - 4, color);
  if (border) {
    line(ctx, x + 3, y, w - 6, 1, border);
    line(ctx, x, y + 3, 1, h - 6, border);
    line(ctx, x + w - 1, y + 3, 1, h - 6, border);
    line(ctx, x + 3, y + h - 1, w - 6, 1, border);
  }
}
function glow(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function drawPlant(ctx, x, y, phase) {
  rect(ctx, x - 7, y, 14, 3, '#0d1a28');
  rect(ctx, x - 5, y - 10, 10, 12, '#ad775d');
  rect(ctx, x - 4, y - 9, 8, 7, '#c28e6e');
  rect(ctx, x - 1, y - 23, 2, 17, '#42685e');
  rect(ctx, x - 8, y - 27 + Math.sin(phase) * 1, 8, 7, '#5ca484');
  rect(ctx, x + 1, y - 28, 9, 6, '#7ec3a1');
  rect(ctx, x - 5, y - 34, 10, 8, '#80c6a1');
  rect(ctx, x - 3, y - 32, 3, 3, '#b4dfb4');
}
function drawWall(ctx, t) {
  rect(ctx, 0, 0, W, 98, '#26344a');
  rect(ctx, 0, 0, W, 8, '#1b283b');
  for (let x = 0; x < W; x += 32) line(ctx, x, 8, 1, 88, '#2b3b50');
  for (let x = 0; x < W; x += 32) line(ctx, x + 18, 8, 1, 88, '#29394c');
  rect(ctx, 0, 91, W, 8, '#18283a');
  rect(ctx, 0, 95, W, 3, '#b18871');
  rect(ctx, 0, 98, W, H - 98, '#293a49');
  for (let y = 100; y < H; y += 22) {
    line(ctx, 0, y, W, 1, '#314657');
    for (let x = (Math.floor(y / 22) % 2) * 22; x < W; x += 44) {
      line(ctx, x, y + 1, 1, 21, '#304454');
    }
  }
  // Night-sky windows with parallax city lights.
  for (const wx of [49, 327]) {
    rect(ctx, wx - 5, 11, 115, 72, '#142331');
    rect(ctx, wx, 14, 105, 64, '#405c76');
    rect(ctx, wx, 14, 105, 34, '#354e6d');
    for (let i = 0; i < 11; i++) {
      const sx = wx + 5 + (i * 19) % 99;
      const sy = 21 + (i * 13) % 24;
      rect(ctx, sx, sy, 2, 2, i % 3 ? '#8aa1ba' : '#e4ccab');
    }
    for (let i = 0; i < 9; i++) {
      const bx = wx + i * 13;
      const by = 48 + (i * 17) % 22;
      rect(ctx, bx, by, 12, 78 - by, i % 2 ? '#1f3448' : '#233c50');
      for (let j = by + 5; j < 75; j += 7) {
        rect(ctx, bx + 3, j, 2, 2, (i + j) % 3 === 0 ? '#ffcd88' : '#54748a');
        rect(ctx, bx + 8, j, 2, 2, (i + j) % 4 === 0 ? '#ffcd88' : '#537187');
      }
    }
    rect(ctx, wx - 2, 12, 3, 69, '#9b7e75');
    rect(ctx, wx + 104, 12, 3, 69, '#9b7e75');
    rect(ctx, wx + 51, 14, 3, 64, '#9a7e79');
    rect(ctx, wx - 2, 45, 109, 3, '#9a7e79');
    rect(ctx, wx - 4, 79, 112, 5, '#d6af8f');
    glow(ctx, wx + 52, 34, 55, 'rgba(180,190,230,.08)');
  }
  // Work-of-the-day board.
  rect(ctx, 173, 16, 135, 62, '#14232f');
  rect(ctx, 177, 20, 127, 54, '#36504d');
  rect(ctx, 181, 24, 119, 46, '#26423f');
  text(ctx, 'TODAY IN THE OFFICE', 241, 34, '#c3e1ca', 'bold 8px monospace');
  line(ctx, 193, 40, 97, 1, '#618b79');
  for (let i = 0; i < 4; i++) {
    rect(ctx, 192, 47 + i * 6, 3, 3, i === 0 ? '#b2dbab' : '#e5bb80');
    line(ctx, 199, 47 + i * 6, 44 + i * 9, 2, '#739c91');
  }
  // Hanging lights.
  for (let x of [178, 315]) {
    rect(ctx, x, 0, 2, 16, '#6b7581');
    rect(ctx, x - 9, 16, 20, 5, '#d8b28b');
    rect(ctx, x - 7, 21, 16, 2, '#fff0bd');
    glow(ctx, x + 1, 23, 38, 'rgba(255,211,148,.18)');
  }
  // Blue, polished side trims.
  rect(ctx, 0, 94, 12, H - 94, '#1e2e40');
  rect(ctx, W - 12, 94, 12, H - 94, '#1e2e40');
  for (let y = 105; y < H; y += 17) {
    rect(ctx, 4, y, 3, 3, '#3b5262');
    rect(ctx, W - 7, y, 3, 3, '#3b5262');
  }
}
function drawDecoration(ctx, t) {
  // Library nook and books.
  rect(ctx, 16, 109, 31, 73, '#152633');
  rect(ctx, 19, 110, 26, 67, '#865f59');
  for (const y of [129, 149, 169]) {
    line(ctx, 19, y, 26, 3, '#d2ac82');
    for (let i = 0; i < 6; i++) {
      rect(ctx, 21 + i * 4, y - 13, 3, 13, ['#accfba','#d4a18f','#99afcc','#e6bd75'][i%4]);
    }
  }
  drawPlant(ctx, 46, 289, t * 0.8);
  drawPlant(ctx, 434, 190, t * 0.6);
  // Server rack.
  rect(ctx, 434, 106, 30, 71, '#14212f');
  rect(ctx, 438, 109, 23, 65, '#3b4d60');
  for (let i = 0; i < 5; i++) {
    rect(ctx, 441, 113 + i * 12, 17, 8, '#1b2e40');
    rect(ctx, 443, 116 + i * 12, 3, 2, i % 2 ? '#e4ba85' : '#7adab9');
    rect(ctx, 450, 116 + i * 12, 5, 2, '#546d79');
  }
  rect(ctx, 430, 179, 34, 3, '#182738');
  // Coffee bar and miniature mugs.
  rect(ctx, 423, 252, 45, 34, '#815f55');
  rect(ctx, 424, 249, 44, 8, '#d6b28f');
  rect(ctx, 436, 234, 17, 17, '#26374c');
  rect(ctx, 439, 237, 10, 10, '#a7c2bf');
  rect(ctx, 441, 229, 5, 7, '#e7d0a1');
  rect(ctx, 460, 239, 6, 11, '#f2e4cf');
  rect(ctx, 466, 241, 3, 6, '#f2e4cf');
  // Rug in the lounge.
  rect(ctx, 167, 279, 148, 31, '#3a5158');
  for (let i = 0; i < 6; i++) rect(ctx, 174 + i * 23, 286, 13, 2, '#506f6e');
  // Small central coffee table.
  rect(ctx, 215, 285, 51, 16, '#aa8169');
  rect(ctx, 219, 286, 43, 8, '#cfa982');
  rect(ctx, 225, 282, 8, 5, '#f3d7b5');
  rect(ctx, 243, 280, 5, 8, '#7ec5a8');
}
function drawDesk(ctx, x, y, t, status, index) {
  rect(ctx, x - 35, y + 17, 70, 9, '#182735');
  rect(ctx, x - 34, y + 11, 68, 13, '#8c6b61');
  rect(ctx, x - 32, y + 9, 64, 11, '#d3aa83');
  rect(ctx, x - 32, y + 9, 64, 2, '#f4cca0');
  rect(ctx, x - 29, y + 23, 5, 15, '#5c4c50');
  rect(ctx, x + 24, y + 23, 5, 15, '#5c4c50');
  // Computer monitor.
  rect(ctx, x - 18, y - 5, 36, 23, '#18212f');
  rect(ctx, x - 16, y - 3, 32, 19, status === 'error' ? '#733f53' : '#285d65');
  rect(ctx, x - 14, y - 1, 28, 15, '#192f43');
  for (let i = 0; i < 3; i++) {
    const c = status === 'done' ? '#89d5ad' : (status === 'error' ? '#f19a9b' : '#64c7b5');
    rect(ctx, x - 11, y + 2 + i * 4, 10 + ((i * 7 + index * 3) % 15), 2, i === 2 ? '#7083c8' : c);
  }
  if (status === 'working') rect(ctx, x + 6 + Math.round(Math.sin(t * 4) * 3), y + 10, 2, 3, '#f5d18c');
  rect(ctx, x - 2, y + 18, 4, 4, '#344555');
  rect(ctx, x - 10, y + 22, 20, 3, '#e4c5aa');
  // Note and mug.
  rect(ctx, x + 22, y + 12, 7, 8, '#d9e5df');
  rect(ctx, x + 29, y + 14, 3, 4, '#d9e5df');
  rect(ctx, x - 29, y + 15, 8, 6, '#f0d9b4');
  rect(ctx, x - 27, y + 17, 4, 1, '#b08e76');
}
function drawCharacter(ctx, x, y, t, index, state, name, active) {
  const bob = state === 'working' ? Math.round(Math.sin(t * 7 + index * 2)) : 0;
  const coat = outfits[index % outfits.length];
  const hair = hairColors[index % hairColors.length];
  const skin = ['#e3ba9c','#c69079','#e8c3ad','#ae7d68'][index % 4];
  const px = Math.round(x), py = Math.round(y + bob);
  rect(ctx, px - 10, py + 13, 20, 3, '#1a2734');
  // Legs, shoes, hands.
  rect(ctx, px - 7, py + 6, 5, 8, '#39465e');
  rect(ctx, px + 2, py + 6, 5, 8, '#39465e');
  rect(ctx, px - 8, py + 12, 7, 3, '#1c2637');
  rect(ctx, px + 2, py + 12, 7, 3, '#1c2637');
  rect(ctx, px - 8, py - 7, 16, 16, coat);
  rect(ctx, px - 10, py - 5, 3, 10, coat);
  rect(ctx, px + 7, py - 5, 3, 10, coat);
  if (state === 'working') {
    rect(ctx, px - 12, py + 3 + Math.round(Math.sin(t * 12 + index) * 2), 4, 3, skin);
    rect(ctx, px + 8, py + 3 + Math.round(Math.cos(t * 12 + index) * 2), 4, 3, skin);
  } else {
    rect(ctx, px - 10, py + 4, 3, 4, skin);
    rect(ctx, px + 7, py + 4, 3, 4, skin);
  }
  rect(ctx, px - 5, py - 5, 10, 4, '#f3f2da');
  rect(ctx, px - 7, py - 20, 14, 14, skin);
  rect(ctx, px - 8, py - 23, 16, 7, hair);
  rect(ctx, px - 8, py - 20, 3, 9, hair);
  rect(ctx, px + 5, py - 20, 3, 8, hair);
  rect(ctx, px - 4, py - 13, 2, 2, '#273044');
  rect(ctx, px + 2, py - 13, 2, 2, '#273044');
  if (state === 'done') {
    rect(ctx, px - 1, py - 10, 3, 1, '#915b61');
  }
  if (state === 'error') rect(ctx, px - 2, py - 12, 4, 2, '#9c4757');
  if (active) {
    const c = state === 'error' ? '#f29f9f' : state === 'done' ? '#9de7bc' : '#eac18c';
    rect(ctx, px - 3, py - 29, 6, 2, c);
  }
  const label = (name || 'AGENT').slice(0, 14);
  const tw = Math.max(38, label.length * 4.3 + 10);
  roundPanel(ctx, px - tw/2, py - 41, tw, 10, 'rgba(21,32,47,.97)', '#5a6a79');
  text(ctx, label, px, py - 34, '#e7eedf', 'bold 6px monospace');
}
function drawStatusBubble(ctx, x, y, state, t, index) {
  if (!state || state === 'idle') return;
  if (state === 'working' && Math.sin(t * 0.8 + index) < -0.4) return;
  const icons = { working: '...', waiting: '?', done: 'OK!', error: '!' };
  const word = icons[state] || '...';
  const cx = Math.round(x + 17), cy = Math.round(y - 29);
  roundPanel(ctx, cx, cy - 7, word.length * 5 + 10, 12, '#fff2d3', '#a8a68d');
  rect(ctx, cx + 2, cy + 5, 3, 3, '#fff2d3');
  text(ctx, word, cx + (word.length*5+10)/2, cy + 2, state === 'error' ? '#ba5c62' : '#3b5260', 'bold 7px monospace');
}
function normalizeAgents(view) {
  const sessions = view?.sessions || [];
  return sessions.flatMap(s => (s.agents || []).map(a => ({
    ...a, sessionId: s.id
  }))).slice(0, 6);
}
function drawHeader(ctx, view, t) {
  // Artist-created little neon sign.
  rect(ctx, 16, 16, 27, 17, '#1b293a');
  rect(ctx, 19, 19, 21, 11, '#b2d8c4');
  rect(ctx, 22, 22, 6, 5, '#344a5b');
  rect(ctx, 31, 22, 6, 5, '#344a5b');
  rect(ctx, 27, 29, 5, 3, '#d1ad83');
  text(ctx, 'AI', 29, 28, '#e9fcf0', 'bold 5px monospace');
  // tiny desk clock.
  rect(ctx, 295, 83, 16, 13, '#8a6864');
  rect(ctx, 297, 85, 12, 9, '#d9d1aa');
  rect(ctx, 302, 87, 1, 4, '#385063');
  rect(ctx, 303, 90, 3, 1, '#385063');
  // Dancing connection light.
  rect(ctx, 463, 92, 4, 4, Math.sin(t * 3) > 0 ? '#9bddbd' : '#4b776f');
  const active = (view?.sessions || []).length;
  if (active) {
    text(ctx, active + ' SESSION' + (active > 1 ? 'S' : ''), 241, 89, '#d9c6a9', 'bold 6px monospace');
  }
}
export function startOffice(canvas, getView) {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return () => {};
  const dpr = 2;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.imageSmoothingEnabled = false;
  let frame = 0, active = true, previous = performance.now();
  function render(now) {
    if (!active) return;
    const delta = Math.min((now - previous) / 1000, 0.08);
    previous = now;
    frame += delta;
    const t = frame;
    const view = getView() || { sessions: [] };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    drawWall(ctx, t);
    drawDecoration(ctx, t);
    const agents = normalizeAgents(view);
    for (let i = 0; i < 6; i++) {
      const [x, y] = stationPositions[i];
      const agent = agents[i];
      if (agent) {
        const key = agent.sessionId + ':' + agent.id;
        const target = agent.status === 'waiting' ? [x + 13, y - 8] :
          agent.status === 'done' ? [x + 8, y - 7] : [x, y];
        const pos = positionCache.get(key) || [x - 35, y + 48];
        pos[0] += (target[0] - pos[0]) * Math.min(1, delta * 3);
        pos[1] += (target[1] - pos[1]) * Math.min(1, delta * 3);
        positionCache.set(key, pos);
        drawCharacter(ctx, pos[0], pos[1], t, i, agent.status, agent.name, true);
        drawStatusBubble(ctx, pos[0], pos[1], agent.status, t, i);
      } else {
        // Empty chairs are drawn even without active workers.
        rect(ctx, x - 11, y - 3, 22, 18, '#364756');
        rect(ctx, x - 7, y - 9, 14, 22, '#64798b');
      }
      drawDesk(ctx, x, y, t, agent?.status || 'idle', i);
    }
    drawHeader(ctx, view, t);
    // vignette framing and scanline accents.
    rect(ctx, 0, H - 3, W, 3, '#172635');
    requestAnimationFrame(render);
  }
  const raf = requestAnimationFrame(render);
  return () => { active = false; cancelAnimationFrame(raf); };
}
