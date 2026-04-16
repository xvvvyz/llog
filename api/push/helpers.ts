import { createAdminDb, type Db } from '@/api/middleware/db';
import * as p from '@/utilities/permissions';
import { buildPushHTTPRequest } from '@pushforge/builder';
import { z } from 'zod/v4';

const MAX_BODY_LENGTH = 140;

type StoredPushSubscription = {
  endpoint?: string | null;
  id: string;
  subscription?: z.infer<typeof pushSubscriptionSchema> | null;
};

type RecipientUser = {
  id?: string;
  subscriptions?: StoredPushSubscription[];
};

type RecipientRole = {
  role?: string | null;
  user?: RecipientUser;
  userId?: string;
};

type RecipientProfile = {
  user?: RecipientUser;
};

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
});

const getPrivateJwk = (env: CloudflareEnv) => {
  if (!env.WEB_PUSH_VAPID_PRIVATE_KEY) {
    return null;
  }

  try {
    return JSON.parse(env.WEB_PUSH_VAPID_PRIVATE_KEY) as JsonWebKey;
  } catch (error) {
    console.error('Failed to parse web push VAPID private key', error);
    return null;
  }
};

const trimBody = (text?: string | null) => {
  const value = text?.trim();

  if (!value) {
    return '';
  }

  return value.length > MAX_BODY_LENGTH
    ? `${value.slice(0, MAX_BODY_LENGTH - 1)}…`
    : value;
};

const collectSubscriptions = (users: RecipientUser[]) => {
  const seenUserIds = new Set<string>();
  const seenEndpoints = new Set<string>();
  const subscriptions: StoredPushSubscription[] = [];

  for (const user of users) {
    if (!user.id || seenUserIds.has(user.id)) continue;
    seenUserIds.add(user.id);

    for (const subscription of user.subscriptions ?? []) {
      if (!subscription.endpoint || seenEndpoints.has(subscription.endpoint)) {
        continue;
      }

      seenEndpoints.add(subscription.endpoint);
      subscriptions.push(subscription);
    }
  }

  return subscriptions;
};

export const collectRecipientSubscriptions = ({
  actorUserId,
  logProfiles = [],
  roles = [],
}: {
  actorUserId: string;
  logProfiles?: RecipientProfile[];
  roles?: RecipientRole[];
}) => {
  const users: RecipientUser[] = [];

  for (const profile of logProfiles) {
    if (profile.user?.id && profile.user.id !== actorUserId) {
      users.push(profile.user);
    }
  }

  for (const role of roles) {
    if (
      role.user?.id &&
      role.user.id !== actorUserId &&
      p.canManageTeam(role.role)
    ) {
      users.push(role.user);
    }
  }

  return collectSubscriptions(users);
};

export const buildRecordNotification = ({
  authorName,
  logName,
  recordId,
  text,
}: {
  authorName?: string | null;
  logName?: string | null;
  recordId: string;
  text?: string | null;
}) => ({
  body: trimBody(text),
  recordId,
  tag: `record:${recordId}`,
  title: `${authorName || 'Someone'} recorded in ${logName || 'llog'}`,
  type: 'record_published' as const,
  url: `/activity`,
});

export const buildReplyNotification = ({
  authorName,
  replyId,
  logName,
  recordId,
  text,
}: {
  authorName?: string | null;
  replyId: string;
  logName?: string | null;
  recordId: string;
  text?: string | null;
}) => ({
  body: trimBody(text),
  recordId,
  tag: `reply:${replyId}`,
  title: `${authorName || 'Someone'} replied in ${logName || 'llog'}`,
  type: 'reply_posted' as const,
  url: `/activity`,
});

export const upsertPushSubscription = async (
  db: Db,
  userId: string,
  subscription: z.infer<typeof pushSubscriptionSchema>
) => {
  const { subscriptions } = await db.query({
    subscriptions: {
      $: { where: { endpoint: subscription.endpoint } },
    },
  });

  const existingId = subscriptions[0]?.id;
  const subscriptionId = existingId ?? crypto.randomUUID();

  await db.transact(
    db.tx.subscriptions[subscriptionId]
      .update({
        endpoint: subscription.endpoint,
        lastSeenAt: new Date().toISOString(),
        subscription,
      })
      .link({ user: userId })
  );

  return subscriptionId;
};

export const listUserPushSubscriptions = async (db: Db, userId: string) => {
  const { subscriptions } = await db.query({
    subscriptions: {
      $: {
        fields: ['id', 'endpoint', 'lastSeenAt'] as [
          'id',
          'endpoint',
          'lastSeenAt',
        ],
        where: { user: userId },
      },
    },
  });

  return subscriptions;
};

export const deletePushSubscriptionByEndpoint = async (
  db: Db,
  userId: string,
  endpoint: string
) => {
  const { subscriptions } = await db.query({
    subscriptions: {
      $: { where: { endpoint } },
      user: { $: { fields: ['id'] as ['id'] } },
    },
  });

  const target = subscriptions.find(
    (subscription) => subscription.user?.id === userId
  );

  if (!target) return;
  await db.transact(db.tx.subscriptions[target.id].delete());
};

const deletePushSubscriptionsById = async (
  env: CloudflareEnv,
  subscriptionIds: string[]
) => {
  if (!subscriptionIds.length) return;
  const adminDb = createAdminDb(env);

  await adminDb.transact(
    subscriptionIds.map((subscriptionId) =>
      adminDb.tx.subscriptions[subscriptionId].delete()
    )
  );
};

export const sendPushNotifications = async (
  env: CloudflareEnv,
  subscriptions: StoredPushSubscription[],
  payload: {
    body: string;
    recordId: string;
    tag: string;
    title: string;
    type: 'reply_posted' | 'record_published';
    url: string;
  }
) => {
  if (!subscriptions.length) return;
  const privateJwk = getPrivateJwk(env);
  if (!privateJwk) return;
  const staleSubscriptionIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      if (!subscription.subscription) {
        staleSubscriptionIds.push(subscription.id);
        return;
      }

      try {
        const request = await buildPushHTTPRequest({
          message: {
            adminContact: env.MAILTO_CONTACT ?? '',
            options: {
              ttl: 300,
              urgency: 'high',
            },
            payload,
          },
          privateJWK: privateJwk,
          subscription: subscription.subscription,
        });

        const response = await fetch(request.endpoint, {
          body: request.body,
          headers: request.headers,
          method: 'POST',
        });

        if (response.status === 404 || response.status === 410) {
          staleSubscriptionIds.push(subscription.id);
          return;
        }

        if (!response.ok) {
          const responseBody = await response.text().catch(() => '');

          console.error('Failed to deliver web push notification', {
            endpoint: subscription.endpoint,
            responseBody,
            status: response.status,
            statusText: response.statusText,
          });
        }
      } catch (error) {
        console.error('Failed to deliver web push notification', error);
      }
    })
  );

  await deletePushSubscriptionsById(env, staleSubscriptionIds);
};
