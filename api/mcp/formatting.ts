// Formatting guidance surfaced to MCP clients writing record, reply, and
// template text. Bodies render as a small markdown subset; templates can also
// contain fillable input placeholders the author completes when using them.

export const MARKDOWN_FORMATTING =
  'Renders as markdown: **bold**, *italic*, ***bold italic***, ~~strikethrough~~, <u>underline</u>, [label](url) links, "> " blockquotes, "- " bullet lists, and "1. " numbered lists. Headings (#) are not supported and render as literal text.';

export const TEMPLATE_INPUTS_FORMATTING =
  "May also contain fillable inputs the author completes: [text], [paragraph], [number], [checkbox], [link], [file], and [recording]. Add a default or label after a colon, e.g. [number:0] or [text:Title]. Wrap guidance in {{double braces}} to show it to the author without saving it to the record, and put a line directly after an input to use it as that input's helper hint.";

export const RECORD_TEXT_DESCRIPTION = `Record body. ${MARKDOWN_FORMATTING}`;

export const REPLY_TEXT_DESCRIPTION = `Reply body. ${MARKDOWN_FORMATTING}`;

export const TEMPLATE_TEXT_DESCRIPTION = `Template body. ${MARKDOWN_FORMATTING} ${TEMPLATE_INPUTS_FORMATTING}`;
