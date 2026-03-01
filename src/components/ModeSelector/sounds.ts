let clickAudio: HTMLAudioElement | null = null;
export function playClickSound() {
  if (!clickAudio) clickAudio = new Audio('/assets/audio/click.mp3');
  clickAudio.currentTime = 0;
  clickAudio.play().catch(() => {});
}

let tapAudio: HTMLAudioElement | null = null;
export function playTapSound() {
  if (!tapAudio) tapAudio = new Audio('/assets/audio/ui-tap.mp3');
  tapAudio.currentTime = 0;
  tapAudio.play().catch(() => {});
}