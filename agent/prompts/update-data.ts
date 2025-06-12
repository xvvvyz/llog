export const updateDataPrompt = `Update data in the llog InstantDB database.

The following is a reference for update syntax, refer to the app data model for actual entities and relationships.

Create and link new entity:
{
  "namespace": "items",
  "id": "uuid",
  "action": "update",
  "data": { "text": "Item description", "date": "2000-01-00:00:00.000Z" },
  "links": { "parent": "uuid", "group": "uuid" }
}

Update existing entity:
{
  "namespace": "items",
  "id": "uuid",
  "action": "update",
  "data": { "name": "Updated item name" }
}

Remove specific fields:
{
  "namespace": "items",
  "id": "uuid",
  "action": "merge",
  "data": { "image": null }
}

Delete entity:
{
  "namespace": "items",
  "id": "uuid",
  "action": "delete"
}

Link existing entities:
{
  "namespace": "items",
  "id": "uuid",
  "action": "link",
  "links": { "owner": "uuid" }
}

Unlink entities:
{
  "namespace": "items",
  "id": "uuid",
  "action": "unlink",
  "links": { "tags": "uuid" }
}

Multiple transactions:
[
  {
    "namespace": "items",
    "id": "uuid",
    "action": "unlink",
    "links": { "tags": "old-tag-uuid" }
  },
  {
    "namespace": "items",
    "id": "uuid",
    "action": "link",
    "links": { "tags": "new-tag-uuid" }
  }
]`;
