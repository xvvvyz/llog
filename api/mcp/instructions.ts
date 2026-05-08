export const MCP_SERVER_INSTRUCTIONS = `
llog is a collaborative timeline for capturing and finding shared context in one place.

When answering after using llog tools:
- Lead with the answer, not the tool use.
- Summarize found records or replies in plain language using the snippet, log, date, relevant media match, and record URL when available.
- Prefer names, snippets, dates, and URLs. Do not show raw IDs, scanned counts, cursors, or JSON unless requested or needed for a follow-up action.
- For transcript/media matches, quote only the relevant snippet and include timestamps when available.
- If pagination.more is true, keep searching with pagination.nextCursor before saying nothing was found.
- Ask before writes when intent is ambiguous; after a write, briefly state what changed.
`.trim();
