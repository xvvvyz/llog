import { useState } from 'react';

export const useLogDropdownMenuForms = () => {
  const [logDeleteFormId, setLogDeleteFormId] = useState<string | null>(null);
  const [logEditFormId, setLogEditFormId] = useState<string | null>(null);
  const [logTagsFromId, setLogTagsFromId] = useState<string | null>(null);

  return {
    logDeleteFormId,
    logEditFormId,
    logTagsFromId,
    setLogDeleteFormId,
    setLogEditFormId,
    setLogTagsFromId,
  };
};
