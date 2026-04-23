import { DEFAULT_AUDIO_PLAYBACK_RATE } from '@/features/media/lib/audio-playback-rate';
import { Role } from '@/features/teams/types/role';
import { db } from '@/lib/db';
import { id as generateId } from '@instantdb/react-native';

export const onboardUser = async ({ name }: { name: string }) => {
  const auth = await db.getAuth();
  if (!auth) return;
  const teamId = generateId();
  const now = new Date().toISOString();
  const trimmedName = name.trim();

  return db.transact([
    db.tx.profiles[generateId()]
      .update({ name: trimmedName })
      .link({ user: auth.id }),
    db.tx.teams[teamId].update({ name: trimmedName }),
    db.tx.roles[generateId()]
      .update({
        key: `${Role.Owner}_${auth.id}_${teamId}`,
        role: Role.Owner,
        teamId,
        userId: auth.id,
      })
      .link({ team: teamId, user: auth.id }),
    db.tx.ui[generateId()]
      .update({
        activityLastReadDate: now,
        audioPlaybackRate: DEFAULT_AUDIO_PLAYBACK_RATE,
      })
      .link({ team: teamId, user: auth.id }),
  ]);
};
