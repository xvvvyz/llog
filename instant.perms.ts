import type { InstantRules } from '@instantdb/react-native';

// Docs: https://www.instantdb.com/docs/permissions
const rules = {
  $files: {
    allow: {
      create: 'true',
      delete: 'true',
      view: 'true',
    },
  },
} satisfies InstantRules;

export default rules;
