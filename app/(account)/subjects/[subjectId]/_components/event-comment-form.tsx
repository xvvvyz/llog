'use client';

import IconButton from '@/_components/icon-button';
import RichTextarea from '@/_components/rich-textarea';
import createComment from '@/_server/create-comment';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { twMerge } from 'tailwind-merge';

interface EventCommentFormProps {
  className?: string;
  eventId: string;
  inputClassName?: string;
}

const EventCommentForm = ({
  className,
  eventId,
  inputClassName,
}: EventCommentFormProps) => {
  const [isTransitioning, startTransition] = useTransition();
  const form = useForm({ defaultValues: { content: '' } });
  const router = useRouter();

  const onSubmit = form.handleSubmit(async ({ content }) => {
    startTransition(() => {
      createComment({ content, eventId });
      router.refresh();
    });

    form.setValue('content', '');
  });

  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      <Controller
        control={form.control}
        name="content"
        render={({ field }) => (
          <RichTextarea
            aria-label="Comment"
            className={twMerge('min-h-full pr-12', inputClassName)}
            onEnter={onSubmit}
            placeholder="Add comment…"
            right={
              <IconButton
                className="m-0 px-3 py-2.5"
                icon={<PaperAirplaneIcon className="w-5" />}
                label="Add comment"
                loading={form.formState.isSubmitting || isTransitioning}
                loadingText="Adding comment…"
                onClick={onSubmit}
              />
            }
            {...field}
          />
        )}
      />
    </div>
  );
};

export default EventCommentForm;