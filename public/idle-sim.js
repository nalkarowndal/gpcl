/**
 * Tiny autonomous office-life simulation.
 * Completely separate from GPT events: every resident is a fictional NPC.
 * All coordinates are in the existing 480x320 pixel-art world.
 */
const PEOPLE = ['Mimi', 'Bori', 'Pico', 'Nori', 'Dodo', 'Luna'];
export const ACTIVITIES = Object.freeze({
  roam: '산책', coffee: '커피 타임', chat: '수다', read: '독서',
  rest: '쉬는 중', desk: '책상 정리', plant: '식물 돌보기'
});

const LOCATIONS = [
  { x: 97, y: 193, action: 'desk' },
  { x: 233, y: 193, action: 'desk' },
  { x: 363, y: 193, action: 'desk' },
  { x: 98, y: 297, action: 'desk' },
  { x: 191, y: 296, action: 'rest' },
  { x: 300, y: 296, action: 'rest' },
  { x: 406, y: 280, action: 'coffee' },
  { x: 63, y: 193, action: 'read' },
  { x: 66, y: 285, action: 'plant' },
  { x: 178, y: 212, action: 'chat' },
  { x: 316, y: 212, action: 'chat' },
  { x: 406, y: 208, action: 'roam' }
];

const WALLS = [
  // Desk furniture, server station, coffee table, shelving and the lounge table.
  [60, 144, 141, 178], [195, 144, 273, 178], [328, 144, 404, 178],
  [60, 242, 141, 276], [195, 242, 273, 276], [328, 242, 404, 276],
  [15, 105, 52, 181], [430, 105, 467, 183],
  [422, 233, 473, 286], [214, 283, 268, 306],
  [36, 258, 56, 292]
];

function rand(world) {
  world.seed = (Math.imul(1664525, world.seed) + 1013904223) >>> 0;
  return world.seed / 4294967296;
}
function blocked(x, y) {
  if (x < 55 || x > 421 || y < 182 || y > 312) return true;
  return WALLS.some(([l, t, r, b]) => x >= l - 3 && x <= r + 3 && y >= t - 3 && y <= b + 3);
}
function nodeKey(x,y) { return x + ':' + y; }
const GRID = 8;
function cell(p) { return Math.round(p / GRID); }
function point(n) { return n * GRID; }
const MOVES = [[-1,0],[1,0],[0,-1],[0,1]];

/** Bounded orthogonal A* so NPCs don't teleport through desks. */
export function findPath(from, to) {
  const sx = cell(from.x), sy = cell(from.y), tx = cell(to.x), ty = cell(to.y);
  const start = nodeKey(sx, sy);
  const finish = nodeKey(tx, ty);
  if (start === finish) return [{ x: to.x, y: to.y }];
  const queue = [{ x: sx, y: sy, key: start, f: Math.abs(tx-sx)+Math.abs(ty-sy) }];
  const costs = new Map([[start, 0]]);
  const parents = new Map();
  const closed = new Set();
  let visited = 0;
  while (queue.length && visited++ < 2000) {
    queue.sort((a,b)=>b.f-a.f);
    const cur = queue.pop();
    if (closed.has(cur.key)) continue;
    if (cur.key === finish) {
      const path = [{ x: to.x, y: to.y }];
      let key = finish;
      while (parents.has(key)) {
        const [x,y] = key.split(':').map(Number);
        path.unshift({ x: point(x), y: point(y) });
        key = parents.get(key);
      }
      return path;
    }
    closed.add(cur.key);
    for (const [dx,dy] of MOVES) {
      const x = cur.x + dx, y = cur.y + dy;
      const key = nodeKey(x,y);
      if (blocked(point(x),point(y)) && key !== finish) continue;
      if (closed.has(key)) continue;
      const g = (costs.get(cur.key) || 0) + 1;
      if (g >= (costs.get(key) ?? Infinity)) continue;
      costs.set(key, g); parents.set(key, cur.key);
      queue.push({x,y,key,f:g+Math.abs(tx-x)+Math.abs(ty-y)});
    }
  }
  return [{x:from.x,y:from.y}];
}

function chooseActivity(world, p) {
  const choice = LOCATIONS[Math.floor(rand(world)*LOCATIONS.length)];
  const next = { x: choice.x, y: choice.y };
  const path = findPath(p, next);
  if (path.length <= 1 && Math.hypot(p.x-next.x,p.y-next.y)>24) {
    p.wait = 1.2;
    return;
  }
  p.path = path;
  p.action = 'roam';
  p.nextAction = choice.action;
  p.wait = 0;
}

export function createIdleWorld({ count = 6, seed = 41 } = {}) {
  const world = { seed: seed>>>0, time: 0, residents: [], enabled: true, speed: 1, ticks: 0 };
  for (let i = 0; i < Math.max(0,Math.min(6,count)); i++) {
    const x = 155 + (i%3)*45;
    const y = 206 + (i%2)*80;
    const p = {id:'npc-'+i,name:PEOPLE[i],x,y,
      facing: i%2?'left':'right', action:'rest', nextAction:'rest',
      walking:false, wait:0.2+i*.5, path:[], step:0};
    world.residents.push(p);
  }
  return world;
}
export function stepIdleWorld(world, elapsed, speed = world.speed) {
  if (!world.enabled) return world;
  const dt = Math.max(0, Math.min(0.08, elapsed)) * Math.max(.25,Math.min(3,Number(speed)||1));
  world.time += dt;
  world.ticks++;
  for (const p of world.residents) {
    if (p.wait > 0) {p.wait -= dt; p.walking=false; continue;}
    if (!p.path.length) {
      if (p.action !== 'roam') {
        chooseActivity(world,p);
        continue;
      }
      p.action = p.nextAction;
      p.wait = 1.8 + rand(world)*5.5;
      continue;
    }
    const dest = p.path[0];
    const dx=dest.x-p.x, dy=dest.y-p.y;
    const distance=Math.hypot(dx,dy);
    const pace=26 + (p.id.length%3)*5;
    const distanceStep=pace*dt;
    if (distance <= distanceStep + .05) {
      p.x=dest.x;p.y=dest.y;p.path.shift();
    } else if (distance > 0) {
      p.x+=dx/distance*distanceStep;
      p.y+=dy/distance*distanceStep;
    }
    if (Math.abs(dx)>0.02) p.facing=dx>0?'right':'left';
    p.walking=true;
    p.step+=dt*9;
  }
  return world;
}
export function idleSummary(world) {
  return {
    residents: world.residents.length,
    walking: world.residents.filter(p=>p.walking).length,
    activities: world.residents.map(p=>({name:p.name,action:p.action,label:ACTIVITIES[p.action]}))
  };
}
