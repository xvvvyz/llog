import { Role } from '../domain/teams/role';

export const and = (...conditions: string[]) => conditions.join(' && ');

export const or = (...conditions: string[]) => conditions.join(' || ');

export const group = (condition: string) => `(${condition})`;

const refSize = (path: string) => `size(data.ref('${path}'))`;

export const hasExactlyOneRef = (...paths: string[]) =>
  `${paths.map(refSize).join(' + ')} == 1`;

const authRolesKeyRef = "auth.ref('$user.roles.key')";
const currentTeamRolesKeyRef = "data.ref('team.roles.key')";

const authRoleKey = (role: Role, teamIdRef: string) =>
  `'${role}_' + auth.id + '_' + ${teamIdRef}`;

export const authRoleIn = (
  role: Role,
  teamIdRef: string,
  rolesKeyRef: string
) => `${authRoleKey(role, teamIdRef)} in ${rolesKeyRef}`;

const authRoleExistsFor = (role: Role, teamIdRef: string) =>
  `data.ref('${teamIdRef}').exists(teamId, ${authRoleIn(
    role,
    'teamId',
    authRolesKeyRef
  )})`;

export const canManageAuthTeam = (teamIdRef: string) =>
  or(
    authRoleIn(Role.Owner, teamIdRef, authRolesKeyRef),
    authRoleIn(Role.Admin, teamIdRef, authRolesKeyRef)
  );

export const isOwner = authRoleIn(
  Role.Owner,
  'data.teamId',
  currentTeamRolesKeyRef
);

export const isAdmin = authRoleIn(
  Role.Admin,
  'data.teamId',
  currentTeamRolesKeyRef
);

export const canManageCurrentTeam = or(isOwner, isAdmin);

export const isOwnerFor = (teamIdRef: string) =>
  authRoleExistsFor(Role.Owner, teamIdRef);

export const isAdminFor = (teamIdRef: string) =>
  authRoleExistsFor(Role.Admin, teamIdRef);

export const canManageFor = (teamIdRef: string) =>
  or(isOwnerFor(teamIdRef), isAdminFor(teamIdRef));
