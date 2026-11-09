import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdleWorld, stepIdleWorld, idleSummary, findPath, ACTIVITIES } from '../public/idle-sim.js';

test('idle world creates independent residents with distinct identities', () => {
  const world = createIdleWorld();
  assert.equal(world.residents.length, 6);
  assert.equal(new Set(world.residents.map(p=>p.id)).size, 6);
  assert.equal(world.enabled, true);
  assert.equal(world.speed, 1);
  assert.equal(idleSummary(world).residents, 6);
});

test('idle simulation moves even without any GPT sessions or tool calls', () => {
  const world = createIdleWorld({seed: 1234});
  const initial = world.residents.map(({x,y})=>[x,y]);
  for (let frame=0;frame<1000;frame++) stepIdleWorld(world,0.05);
  const moved = world.residents.filter((p,i) => Math.hypot(p.x-initial[i][0],p.y-initial[i][1])>15);
  assert.ok(moved.length >= 3,'most NPCs must autonomously wander around the office');
  assert.ok(world.residents.every(p => ACTIVITIES[p.action]), 'only authored activity types');
  assert.ok(world.residents.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
});

test('pause freezes positions and resets no tasks or invented progress', () => {
  const world = createIdleWorld();
  for(let i=0;i<80;i++) stepIdleWorld(world,0.04);
  const before = world.residents.map(p=>[p.x,p.y,p.wait,p.action]);
  world.enabled=false;
  for(let i=0;i<80;i++) stepIdleWorld(world,0.04);
  assert.deepEqual(world.residents.map(p=>[p.x,p.y,p.wait,p.action]),before);
  assert.equal(world.residents.length,6);
});

test('speed scales world clock and clamps to a safe range', () => {
  const slower = createIdleWorld({seed:7}), faster=createIdleWorld({seed:7});
  stepIdleWorld(slower,0.05,1);
  stepIdleWorld(faster,0.05,3);
  assert.ok(faster.time > slower.time);
  stepIdleWorld(faster,900,100000);
  assert.ok(faster.time < 0.40);
});

test('pathfinder detours around desks instead of walking straight through them', () => {
  const start={x:152,y:208},end={x:406,y:280};
  const points=findPath(start,end);
  assert.ok(points.length>2,'needs multi-waypoint route');
  assert.equal(points.at(-1).x,end.x);
  assert.equal(points.at(-1).y,end.y);
  assert.ok(points.every(p=>p.x>=55&&p.x<=421&&p.y>=182&&p.y<=312));
});

test('idle settings do not invent data or require network calls', () => {
  const world = createIdleWorld({count:2,seed:41});
  assert.equal(world.residents.length,2);
  assert.deepEqual(idleSummary(world).activities.map(p=>p.label),['쉬는 중','쉬는 중']);
});
