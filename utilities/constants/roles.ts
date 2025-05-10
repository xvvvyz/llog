export const ROLES = Object.freeze({
  admin: 'admin',
  owner: 'owner',
  recorder: 'recorder',
  viewer: 'viewer',
});

export type Role = (typeof ROLES)[keyof typeof ROLES];
