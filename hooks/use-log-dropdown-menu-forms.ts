import { useState } from 'react';

export const useLogDropdownMenuForms = () => {
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);
  const [editFormId, setEditFormId] = useState<string | null>(null);
  const [tagsFormId, setTagsFormId] = useState<string | null>(null);

  return {
    deleteFormId,
    editFormId,
    tagsFormId,
    setDeleteFormId,
    setEditFormId,
    setTagsFormId,
  };
};
