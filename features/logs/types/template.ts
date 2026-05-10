export type LogTemplate = {
  id: string;
  log?: { id?: string | null } | null;
  name: string;
  order: number;
  teamId: string;
  text: string;
};
