export type SheetNames = readonly [
  'comment-create',
  'comment-delete',
  'invite-delete',
  'member-remove',
  'invite-logs',
  'invite-qr',
  'log-delete',
  'log-edit',
  'log-members',
  'log-tags',
  'member-logs',
  'record-audio',
  'record-create',
  'record-delete',
  'record-edit',
  'record-media',
  'tag-delete',
  'team-delete',
  'team-leave',
  'team-switch',
];

export type SheetName = SheetNames[number];
