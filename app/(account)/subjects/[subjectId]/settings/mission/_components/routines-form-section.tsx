'use client';

import IconButton from '@/_components/icon-button';
import Select from '@/_components/select';
import TemplateTypes from '@/_constants/enum-template-types';
import { ListInputsData } from '@/_server/list-inputs';
import { ListTemplatesData } from '@/_server/list-templates';
import { TemplateType } from '@/_types/template';
import { PlusIcon } from '@heroicons/react/24/outline';
import { FieldValues, useFieldArray, UseFormReturn } from 'react-hook-form';
import RoutineFormSection from './routine-form-section';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface RoutinesFormSection<T extends FieldValues> {
  form: UseFormReturn<T>;
  inputOptions: NonNullable<ListInputsData>;
  sessionIndex: number;
  templateOptions: NonNullable<ListTemplatesData>;
}

const RoutinesFormSection = <T extends FieldValues>({
  form,
  inputOptions,
  sessionIndex,
  templateOptions,
}: RoutinesFormSection<T>) => {
  const name = `sessions.${sessionIndex}.routines`;

  const routinesArray = useFieldArray({
    control: form.control,
    keyName: 'key',
    name: name as T[string],
  });

  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <>
      <ul>
        <DndContext
          collisionDetection={closestCenter}
          id={name}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event;

            if (over && active.id !== over.id) {
              routinesArray.move(
                routinesArray.fields.findIndex((f) => f.key === active.id),
                routinesArray.fields.findIndex((f) => f.key === over.id)
              );
            }
          }}
          sensors={sensors}
        >
          <SortableContext
            items={routinesArray.fields.map((eventType) => eventType.key)}
            strategy={verticalListSortingStrategy}
          >
            {routinesArray.fields.map((eventType, eventTypeIndex) => (
              <RoutineFormSection<T>
                eventTypeArray={routinesArray}
                eventTypeIndex={eventTypeIndex}
                eventTypeKey={eventType.key}
                form={form}
                inputOptions={inputOptions}
                key={eventType.key}
                name={name}
                sessionIndex={sessionIndex}
              />
            ))}
          </SortableContext>
        </DndContext>
      </ul>
      <div className="flex items-center gap-4">
        <div className="flex-grow">
          <Select
            instanceId={`${name}Template`}
            noOptionsMessage={() => 'No templates'}
            onChange={(e) => {
              const template = e as TemplateType;
              if (!template) return;

              routinesArray.append({
                content: template?.data?.content || '',
                inputs: inputOptions.filter((input) =>
                  template?.data?.inputIds?.includes(input.id)
                ),
              } as T[string]);
            }}
            options={templateOptions.filter(
              (template) => template.type === TemplateTypes.Routine
            )}
            placeholder="Add routine from template…"
            value={null}
          />
        </div>
        <span className="text-fg-3">or</span>
        <IconButton
          className="p-2"
          colorScheme="transparent"
          icon={<PlusIcon className="m-0.5 w-5" />}
          label="Add routine"
          onClick={() =>
            routinesArray.append({
              content: '',
              inputs: [],
            } as T[string])
          }
          type="button"
          variant="primary"
        />
      </div>
    </>
  );
};

export default RoutinesFormSection;