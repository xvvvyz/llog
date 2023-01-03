import xss from 'xss';

const sanitizeHtml = (html?: string | null) =>
  xss(html ?? '', {
    whiteList: {
      a: ['href', 'target'],
      em: [],
      li: [],
      ol: [],
      p: [],
      strong: [],
      ul: [],
    },
  });

export default sanitizeHtml;
