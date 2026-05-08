export type VideoPlayerHandle = {
  enterFullscreen: () => void;
  pause: () => void;
  play: () => void;
  seekTo: (seconds: number) => void;
  setScrubbingEnabled: (enabled: boolean) => void;
  toggleMute: () => boolean;
  togglePlay: () => boolean;
};
