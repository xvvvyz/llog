export const MCP_SERVER_INSTRUCTIONS = `
llog is a collaborative timeline for capturing and finding shared context in one place.

Answer with the result, not tool narration. Prefer concrete names, snippets, dates, URLs, and media timestamps when relevant. Follow nextCursor while pagination.more is true. Do not invent records, links, files, or timestamps that are not present in tool results. For writes, infer obvious fields from context, but ask before ambiguous or destructive writes.
`.trim();
