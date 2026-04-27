export type VideoPlayerHandle = {
  pause: () => void;
  play: () => void;
  seekTo: (seconds: number) => void;
  setScrubbingEnabled: (enabled: boolean) => void;
  toggleMute: () => boolean;
  togglePlay: () => boolean;
};
