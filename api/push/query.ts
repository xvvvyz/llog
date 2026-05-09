export const pushSubscriptionQuery = {
  $: { fields: ['id' as const, 'endpoint' as const, 'subscription' as const] },
};

export const notificationUserQuery = {
  $: { fields: ['id' as const] },
  subscriptions: pushSubscriptionQuery,
};

export const notificationRecipientLogQuery = {
  profiles: { user: notificationUserQuery },
  team: {
    roles: {
      $: { fields: ['id' as const, 'role' as const, 'userId' as const] },
      user: notificationUserQuery,
    },
  },
};
