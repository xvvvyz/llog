'use client';

import Button from '@/_components/button';
import * as Drawer from '@/_components/drawer';
import Select, { IOption } from '@/_components/select-v1';
import getTemplateData from '@/_queries/get-template-data';
import { ListInputsBySubjectIdData } from '@/_queries/list-inputs-by-subject-id';
import { ListTemplatesData } from '@/_queries/list-templates';
import { ListTemplatesBySubjectIdAndTypeData } from '@/_queries/list-templates-by-subject-id-and-type';
import { SessionTemplateDataJson } from '@/_types/session-template-data-json';
import { useToggle } from '@uidotdev/usehooks';
import { ReactNode, useTransition } from 'react';
import * as Form from 'react-hook-form';

interface SessionUseTemplateDrawerProps<T extends Form.FieldValues> {
  availableInputs: NonNullable<ListInputsBySubjectIdData>;
  availableSessionTemplates: NonNullable<
    ListTemplatesBySubjectIdAndTypeData | ListTemplatesData
  >;
  fieldPath?: string;
  form: Form.UseFormReturn<T>;
  trigger: ReactNode;
}

const SessionUseTemplateDrawer = <T extends Form.FieldValues>({
  availableInputs,
  availableSessionTemplates,
  fieldPath,
  form,
  trigger,
}: SessionUseTemplateDrawerProps<T>) => {
  const [isTransitioning, startTransition] = useTransition();
  const [open, toggleOpen] = useToggle(false);

  const titleFieldPath = (
    fieldPath ? `${fieldPath}.title` : 'title'
  ) as Form.FieldPath<T>;

  const modulesFieldPath = (
    fieldPath ? `${fieldPath}.modules` : 'modules'
  ) as Form.FieldPath<T>;

  return (
    <Drawer.NestedRoot onOpenChange={toggleOpen} open={open}>
      {trigger}
      <Drawer.Portal>
        <Drawer.Overlay />
        <Drawer.Content>
          <Drawer.Title className="not-sr-only text-center text-2xl">
            Use template
          </Drawer.Title>
          <Drawer.Description className="mt-4 px-4 text-center text-fg-4">
            Selecting a template will overwrite any existing session modules.
          </Drawer.Description>
          <div className="pt-16 text-left">
            <Select
              isLoading={isTransitioning}
              noOptionsMessage={() => 'No templates.'}
              onChange={(t) =>
                startTransition(async () => {
                  const template = t as NonNullable<
                    ListTemplatesBySubjectIdAndTypeData | ListTemplatesData
                  >[0];

                  const { data: templateData } = await getTemplateData(
                    template.id,
                  );

                  const data = templateData?.data as SessionTemplateDataJson;

                  form.setValue(
                    titleFieldPath,
                    template.name as Form.PathValue<T, Form.Path<T>>,
                    { shouldDirty: true },
                  );

                  form.setValue(
                    modulesFieldPath,
                    (data?.modules ?? []).map((module) => ({
                      content: module.content ?? '',
                      inputs: availableInputs.filter((input) =>
                        module.inputIds?.some((id) => id === input.id),
                      ),
                      name: module.name,
                    })) as Form.PathValue<T, Form.Path<T>>,
                    { shouldDirty: true },
                  );

                  toggleOpen();
                })
              }
              options={availableSessionTemplates as IOption[]}
              placeholder="Select a template…"
              value={null}
            />
          </div>
          <Drawer.Close asChild>
            <Button
              className="-mb-3 mt-14 w-full justify-center p-0 py-3"
              variant="link"
            >
              Close
            </Button>
          </Drawer.Close>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.NestedRoot>
  );
};

export default SessionUseTemplateDrawer;
