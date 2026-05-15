import type { Team } from '@/features/teams/types/team';
import { db } from '@/lib/db';

export const updateTeam = async ({ id, name }: Pick<Team, 'id' | 'name'>) => {
  return db.transact(db.tx.teams[id].update({ name: name.trim() }));
};
