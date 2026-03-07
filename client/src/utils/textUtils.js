// Your display name — replaces %%% placeholders in member messages
export const YOUR_NAME = 'あなた';

export function replaceName(text = '') {
  return text.replace(/%%%/g, YOUR_NAME);
}
