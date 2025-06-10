export const updateDataPrompt = `# Update data

Updates data in the llog InstantDB database using transaction construction format.

Create and link new entity:
{
  "namespace": "records",
  "id": "uuid",
  "action": "update",
  "data": { "text": "Project update", "date": "2000-01-00:00:00.000Z" },
  "links": { "log": "uuid", "team": "uuid" }
}

Update existing entity:
{
  "namespace": "logs",
  "id": "uuid",
  "action": "update",
  "data": { "name": "Updated journal" }
}

Remove specific fields:
{
  "namespace": "profiles",
  "id": "uuid",
  "action": "merge",
  "data": { "avatar": null }
}

Delete entity:
{
  "namespace": "logs",
  "id": "uuid",
  "action": "delete"
}

Link existing entities:
{
  "namespace": "records",
  "id": "uuid",
  "action": "link",
  "links": { "author": "uuid" }
}

Unlink entities:
{
  "namespace": "logs",
  "id": "uuid",
  "action": "unlink",
  "links": { "logTags": "uuid" }
}

Combined operations:
[
  {
    "namespace": "logs",
    "id": "uuid",
    "action": "unlink",
    "links": { "logTags": "old-tag-uuid" }
  },
  {
    "namespace": "logs",
    "id": "uuid",
    "action": "link",
    "links": { "logTags": "new-tag-uuid" }
  }
]
`;
