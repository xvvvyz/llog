export type WebPushNotificationPayload = {
  body: string;
  recordId: string;
  tag: string;
  title: string;
  type: 'reply_posted' | 'record_published';
  url: string;
};

export type WebPushState = {
  endpoint?: string;
  status: 'blocked' | 'disabled' | 'enabled' | 'unsupported';
};

export type WebPushSupportState =
  | 'ios-home-screen-required'
  | 'supported'
  | 'unsupported';
