// https://www.instantdb.com/docs/permissions

import type { InstantRules } from '@instantdb/react-native';

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
