/**
 * G2 animation mapping shared by Room and Taskbar renderers.
 * Only names in the validated original atlas contract can be selected.
 * Pseudo-residents remain separate from real GPT sessions.
 */
export const CHARACTER_NAMES=Object.freeze(['Mimi','Nori','Pico','Luna']);
export const CHARACTER_ACTIONS=Object.freeze([
  'idle','walk_down','walk_up','walk_left','walk_right',
  'work','coffee','read','chat','rest','plant','sit'
]);
const ACTIONS=new Set(CHARACTER_ACTIONS);
const DIRS=new Set(['down','up','left','right']);

export function chooseCharacterAnimation(resident={}) {
  if(resident.moving) {
    const direction=DIRS.has(resident.facing)?resident.facing:'down';
    return 'walk_'+direction;
  }
  const action=resident.action;
  if(action==='desk')return 'work';
  if(action==='walk'||action==='roam')return 'idle';
  return ACTIONS.has(action)&&!action.startsWith('walk_') ? action : 'idle';
}
export function characterElapsedMs(resident={},timeSeconds=0,index=0) {
  if(Number.isFinite(resident.actionAge))
    return Math.max(0,resident.actionAge*1000 + index*37);
  return Math.max(0,Number(timeSeconds)||0)*1000+index*137;
}
