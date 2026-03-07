// Palette inspired by Nogizaka46 member image colors
export const AVATAR_PALETTE = [
  '#e82598', // Nogizaka pink
  '#9c27b0',
  '#5c6bc0',
  '#26a69a',
  '#ef5350',
  '#ff7043',
  '#66bb6a',
  '#42a5f5',
  '#ab47bc',
  '#ec407a',
  '#7e57c2',
  '#26c6da',
];

// Deterministic color from a string
export function memberColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

// First character to show in the avatar bubble
export function avatarChar(name = '') {
  if (!name) return '?';
  return name.charAt(0);
}

// Is this member an "お知らせ" (announcement) channel?
export function isAnnouncement(member) {
  return member.group && member.group.includes('お知らせ');
}
