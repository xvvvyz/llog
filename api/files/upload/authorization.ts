import { type Db } from '@/api/middleware/db';
import type { LinkField } from '@/api/files/upload/types';
import { HTTPException } from 'hono/http-exception';

const denyUploadTarget = () => {
  throw new HTTPException(403, { message: 'Forbidden' });
};

export const assertCanUploadToOwnedTarget = async ({
  creatorId,
  db: dbClient,
  linkField,
  linkId,
  recordId,
}: {
  creatorId: string;
  db: Db;
  linkField: LinkField;
  linkId: string;
  recordId: string;
}) => {
  if (linkField === 'record') {
    const { records } = await dbClient.query({
      records: {
        $: { fields: ['id', 'isDraft', 'teamId'], where: { id: recordId } },
        author: { user: { $: { fields: ['id'] } } },
        log: {
          $: { fields: ['id'] },
          team: {
            $: { fields: ['id'] },
            roles: { $: { fields: ['id'], where: { userId: creatorId } } },
          },
        },
      },
    });

    const record = records[0];
    const hasLogTeamRole = !!record?.log?.team?.roles?.[0]?.id;
    const isLoglessDraft = record?.isDraft && !record.log?.id;
    let hasTeamRole = hasLogTeamRole;

    if (!hasTeamRole && isLoglessDraft && record.teamId) {
      const { roles } = await dbClient.query({
        roles: {
          $: {
            fields: ['id'],
            where: { team: record.teamId, userId: creatorId },
          },
        },
      });

      hasTeamRole = !!roles[0]?.id;
    }

    if (!record?.id || record.author?.user?.id !== creatorId || !hasTeamRole) {
      denyUploadTarget();
    }

    return;
  }

  const { replies } = await dbClient.query({
    replies: {
      $: { fields: ['id'], where: { id: linkId, record: recordId } },
      author: { user: { $: { fields: ['id'] } } },
      record: {
        $: { fields: ['id'] },
        log: {
          team: {
            $: { fields: ['id'] },
            roles: { $: { fields: ['id'], where: { userId: creatorId } } },
          },
        },
      },
    },
  });

  const reply = replies[0];

  if (
    !reply?.id ||
    reply.record?.id !== recordId ||
    reply.author?.user?.id !== creatorId ||
    !reply.record?.log?.team?.roles?.[0]?.id
  ) {
    denyUploadTarget();
  }
};

export const assertFileIdAvailable = async ({
  db: dbClient,
  fileId,
}: {
  db: Db;
  fileId?: string;
}) => {
  if (!fileId) return;

  const { files } = await dbClient.query({
    files: { $: { fields: ['id'], where: { id: fileId } } },
  });

  if (files[0]?.id) {
    throw new HTTPException(409, { message: 'File ID already exists' });
  }
};

export const assertCanCreateFileUpload = async ({
  creatorId,
  db: dbClient,
  fileId,
  linkField,
  linkId,
  recordId,
}: {
  creatorId: string;
  db: Db;
  fileId?: string;
  linkField: LinkField;
  linkId: string;
  recordId: string;
}) => {
  await assertCanUploadToOwnedTarget({
    creatorId,
    db: dbClient,
    linkField,
    linkId,
    recordId,
  });

  await assertFileIdAvailable({ db: dbClient, fileId });
};
