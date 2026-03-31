export function shouldSendShortcutImmediately(currentValue: string): boolean {
  return currentValue.trim().length === 0;
}

export function mergeShortcutIntoComposerValue(currentValue: string, prompt: string): string {
  const trimmedCurrent = currentValue.trim();
  return trimmedCurrent ? `${trimmedCurrent}\n${prompt}` : prompt;
}
