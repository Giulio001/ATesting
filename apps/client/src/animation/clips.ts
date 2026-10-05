import type { ClipAliases } from './AnimationController';

/**
 * KayKit characters share one animation rig, but melee, ranged and caster
 * packs differ in which clips they ship, so each role carries its own map.
 */
const LOCOMOTION: ClipAliases = {
  Idle: ['Idle', 'Unarmed_Idle', '2H_Melee_Idle'],
  Run: ['Running_A', 'Running_B', 'Walking_C', 'Walk'],
  Block: ['Blocking', 'Block'],
  Hit: ['Hit_A', 'Hit_B'],
  Death: ['Death_A', 'Death_B'],
};

export const MELEE_CLIPS: ClipAliases = {
  ...LOCOMOTION,
  Attack01: ['1H_Melee_Attack_Slice_Diagonal', '2H_Melee_Attack_Slice', '1H_Melee_Attack_Chop'],
  Attack02: ['1H_Melee_Attack_Slice_Horizontal', '1H_Melee_Attack_Stab', '2H_Melee_Attack_Slice'],
  Attack03: ['1H_Melee_Attack_Chop', '2H_Melee_Attack_Spin', '1H_Melee_Attack_Stab'],
  Skill01: ['2H_Melee_Attack_Spin', '2H_Melee_Attack_Spinning', 'Cheer'],
};

export const RANGED_CLIPS: ClipAliases = {
  ...LOCOMOTION,
  Attack01: ['1H_Ranged_Shoot', '1H_Ranged_Shooting'],
  Attack02: ['1H_Ranged_Shooting', '1H_Ranged_Shoot'],
  Attack03: ['1H_Ranged_Reload', '1H_Ranged_Aiming'],
  Skill01: ['1H_Ranged_Aiming', '1H_Ranged_Shoot'],
};

export const MAGIC_CLIPS: ClipAliases = {
  ...LOCOMOTION,
  Attack01: ['Spellcast_Shoot', 'Spellcasting'],
  Attack02: ['Spellcast_Raise', 'Spellcasting'],
  Attack03: ['Spellcast_Long', 'Spellcasting'],
  Skill01: ['Spellcast_Long', 'Spellcast_Raise'],
};

/** Feral, shambling enemies read better with the unarmed and dual-wield sets. */
export const MONSTER_CLIPS: ClipAliases = {
  ...LOCOMOTION,
  Attack01: ['Unarmed_Melee_Attack_Punch_A', '1H_Melee_Attack_Chop', 'Dualwield_Melee_Attack_Chop'],
  Attack02: ['Unarmed_Melee_Attack_Punch_B', '1H_Melee_Attack_Slice_Horizontal'],
  Attack03: ['Unarmed_Melee_Attack_Kick', 'Dualwield_Melee_Attack_Stab'],
  Skill01: ['Spellcast_Raise', 'Jump_Full_Short'],
};

export const CLASS_MODEL: Record<string, string> = {
  GUARDIAN: 'warrior',
  AETHER_BLADE: 'archer',
  VOID_KNIGHT: 'mage',
};

export function classClips(classId: string): ClipAliases {
  if (classId === 'AETHER_BLADE') return RANGED_CLIPS;
  if (classId === 'VOID_KNIGHT') return MAGIC_CLIPS;
  return MELEE_CLIPS;
}
