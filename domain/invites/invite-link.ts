import { Role } from '@/domain/teams/role';

type InviteLinkMember = {
  avatarSeedId?: string;
  id: string;
  image?: string;
  name?: string;
};

export type InviteLinkInfo = {
  isValid: boolean;
  logNames?: string[];
  members?: InviteLinkMember[];
  role?: Role;
  teamId?: string;
  teamName?: string;
};
