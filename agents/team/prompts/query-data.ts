export const queryDataPrompt = `# Query data

Query data from the llog InstantDB database using InstaQL syntax.

## Basic queries

Fetch all entities in a namespace:
{ "logs": {} }

Fetch multiple namespaces:
{ "logs": {}, "records": {} }

## Related data

Fetch logs with their records:
{ "logs": { "records": {} } }

Fetch records with their parent log:
{ "records": { "log": {} } }

## Filtering

Filter by ID:
{ "logs": { "$": { "where": { "id": "uuid" } } } }

Filter by multiple conditions (AND):
{ "records": { "$": { "where": { "date": { "$gt": "2024-01-01" }, "text": "Important note" } } } }

Filter by associated data:
{ "logs": { "$": { "where": { "records.text": "Important note" } }, "records": {} } }

## Advanced filtering

Logical operators:
- AND: { "where": { "and": [{ "name": "Work Log" }, { "color": { "$gt": 0 } }] } }
- OR: { "where": { "or": [{ "name": "Work Log" }, { "name": "Personal log" }] } }

Comparison operators:
- { "where": { "color": { "$gt": 2 } } } // $gt, $lt, $gte, $lte
- { "where": { "name": { "$in": ["Work log", "Personal log"] } } }
- { "where": { "name": { "$not": "Work log" } } }
- { "where": { "avatar": { "$isNull": true } } }

Pattern matching:
- Case-sensitive: { "where": { "name": { "$like": "Work%" } } }
- Case-insensitive: { "where": { "name": { "$ilike": "work%" } } }

Pattern syntax:
- 'prefix%' - Starts with
- '%suffix' - Ends with
- '%substring%' - Contains

## Pagination & ordering

Pagination:
{ "$": { "limit": 10, "offset": 10 } }

Ordering:
{ "$": { "order": { "serverCreatedAt": "asc" } } } // or 'desc'

## Field selection

Select specific fields to return:
{ "$": { "fields": ["name", "color"] } }

With nested associations:
{ "logs": { "$": { "fields": ["name"] }, "records": { "$": { "fields": ["text"] } } } }

## Counting

To count results, query with fields=["id"] and count the returned array length.
`;
