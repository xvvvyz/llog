export const queryDataPrompt = `Query data from the llog InstantDB database using InstaQL syntax.

The following is a reference for query syntax, refer to the app data model for actual entities and relationships.

Fetch all entities in a namespace:
{ "items": {} }

Fetch multiple namespaces:
{ "items": {}, "related_items": {} }

Fetch related entities:
- { "items": { "related_items": {} } }
- { "related_items": { "parent": {} } }

Filter by ID:
{ "items": { "$": { "where": { "id": "uuid" } } } }

Filter by associated id:
{ "items": { "$": { "where": { "parent": "uuid" } } } }

Filter by associated data:
{ "items": { "$": { "where": { "related_items.text": "Important note" } }, "related_items": {} } }

Filter by multiple conditions (AND):
{ "related_items": { "$": { "where": { "date": { "$gt": "2024-01-01" }, "parent": "uuid" } } } }

Logical operators:
- AND: { "items": { "$": { "where": { "and": [{ "name": "Item Name" }, { "value": { "$gt": 0 } }] } } } }
- OR: { "items": { "$": { "where": { "or": [{ "name": "Item A" }, { "name": "Item B" }] } } } }

Comparison operators:
- { "items": { "$": { "where": { "value": { "$gt": 2 } } } } } // $gt, $lt, $gte, $lte
- { "items": { "$": { "where": { "name": { "$in": ["Item A", "Item B"] } } } } }
- { "items": { "$": { "where": { "name": { "$not": "Item A" } } } } }
- { "items": { "$": { "where": { "image": { "$isNull": true } } } } }

Pattern matching:
- Case-sensitive: { "items": { "$": { "where": { "name": { "$like": "Item%" } } } } }
- Case-insensitive: { "items": { "$": { "where": { "name": { "$ilike": "item%" } } } } }

Pattern syntax:
- 'prefix%' - Starts with
- '%suffix' - Ends with
- '%substring%' - Contains

Pagination:
{ "items": { "$": { "limit": 10, "offset": 10 } } }

Ordering:
{ "items": { "$": { "order": { "serverCreatedAt": "asc" } } } } // or 'desc'

Select specific fields to return:
{ "items": { "$": { "fields": ["name", "value"] } } }

With nested associations:
{ "items": { "$": { "fields": ["name"] }, "related_items": { "$": { "fields": ["text"] } } } }

To count results, query with fields=["id"] and count the returned array length.

serverCreatedAt is available on all entities for ordering.

Filter or limit queries when possible to avoid returning too many results.`;
