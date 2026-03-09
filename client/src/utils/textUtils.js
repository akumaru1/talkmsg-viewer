// Your display name — replaces %%% placeholders in member messages
export const YOUR_NAME = import.meta.env.VITE_YOUR_NAME || 'あなた';

export function replaceName(text = '') {
  return text.replace(/%%%/g, YOUR_NAME);
}
