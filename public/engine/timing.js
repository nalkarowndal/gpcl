/**
 * Fixed-step simulation helper: rendering at 30fps must NOT halve NPC speed.
 * App-owned clock; no global browser state or network API.
 */
export function createFixedClock({hz=60,maxFrameMs=200,maxSteps=8}={}) {
  if (!Number.isFinite(hz) || hz<1 || hz>120) throw new RangeError('Invalid simulation frequency');
  return {stepMs:1000/hz,maxFrameMs,maxSteps,last:null,accumulator:0,totalSteps:0};
}
export function advanceFixedClock(clock,nowMs,onStep,{paused=false}={}) {
  if (!Number.isFinite(nowMs)) return 0;
  if (clock.last === null || paused) {
    clock.last=nowMs;
    clock.accumulator=0;
    return 0;
  }
  const delta=Math.max(0,Math.min(clock.maxFrameMs,nowMs-clock.last));
  clock.last=nowMs;
  clock.accumulator+=delta;
  let executed=0;
  while (clock.accumulator+1e-7>=clock.stepMs && executed<clock.maxSteps) {
    onStep(clock.stepMs/1000);
    clock.accumulator-=clock.stepMs;
    executed++;
    clock.totalSteps++;
  }
  // Deliberately skip an unbounded catch-up after large OS scheduling stalls.
  if(executed===clock.maxSteps && clock.accumulator>=clock.stepMs)
    clock.accumulator=clock.accumulator%clock.stepMs;
  return executed;
}
