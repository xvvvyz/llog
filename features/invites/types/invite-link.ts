import { Role } from '@/features/teams/types/role';

export type InviteLinkMember = {
  avatarSeedId?: string;
  id: string;
  name?: string;
  image?: string;
};

export type InviteLinkInfo = {
  isValid: boolean;
  teamId?: string;
  teamName?: string;
  role?: Role;
  logNames?: string[];
  members?: InviteLinkMember[];
};
