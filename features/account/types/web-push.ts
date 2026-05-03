export type WebPushState = {
  endpoint?: string;
  status: 'blocked' | 'disabled' | 'enabled' | 'unsupported';
};

export type WebPushSupportState =
  | 'ios-home-screen-required'
  | 'supported'
  | 'unsupported';
