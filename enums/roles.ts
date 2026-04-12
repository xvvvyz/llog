export enum Role {
  Admin = 'admin',
  Owner = 'owner',
  Member = 'member',
}

export const isManagedRole = (role?: string) =>
  role === Role.Owner || role === Role.Admin;
