'use client';

import Alert from '@/_components/alert';
import Button from '@/_components/button';
import IconButton from '@/_components/icon-button';
import Menu from '@/_components/menu';
import Switch from '@/_components/switch';
import Tooltip from '@/_components/tooltip';
import createShareCode from '@/_mutations/create-share-code';
import deleteSubject from '@/_mutations/delete-subject';
import updateSubject from '@/_mutations/update-subject';
import { GetSubjectData } from '@/_queries/get-subject';
import { ListSubjectsData } from '@/_queries/list-subjects';
import { Dialog } from '@headlessui/react';
import ArrowDownTrayIcon from '@heroicons/react/24/outline/ArrowDownTrayIcon';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import ClipboardDocumentIcon from '@heroicons/react/24/outline/ClipboardDocumentIcon';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { useCopyToClipboard, useToggle } from '@uidotdev/usehooks';
import { ReactNode, useOptimistic, useRef, useTransition } from 'react';

interface SubjectMenuProps {
  children: ReactNode;
  className?: string;
  isPublic?: boolean;
  itemsClassName?: string;
  subject: NonNullable<GetSubjectData> | NonNullable<ListSubjectsData>[0];
}

const SubjectMenu = ({
  children,
  className,
  isPublic,
  itemsClassName,
  subject,
}: SubjectMenuProps) => {
  const [, copyToClipboard] = useCopyToClipboard();
  const [, startPublicTransition] = useTransition();
  const [deleteAlert, toggleDeleteAlert] = useToggle(false);
  const [hasCopiedClientLink, toggleHasCopiedClientLink] = useToggle(false);
  const [hasCopiedPublicLink, toggleHasCopiedPublicLink] = useToggle(false);
  const [isDownloadTransitioning, startIsDownloadTransition] = useTransition();
  const [isGenerateTransitioning, startGenerateTransition] = useTransition();
  const [opPublic, toggleOpPublic] = useOptimistic(subject.public, (s) => !s);
  const [shareModal, toggleShareModal] = useToggle(false);
  const clientLinkTimeoutRef = useRef<NodeJS.Timeout>();
  const publicLinkTimeoutRef = useRef<NodeJS.Timeout>();
  const shareOrSubjects = isPublic ? 'share' : 'subjects';

  return (
    <>
      <Menu className="shrink-0">
        <Menu.Button className={className}>{children}</Menu.Button>
        <Menu.Items className={itemsClassName}>
          <Menu.Item href={`/subjects/${subject.id}/edit`} scroll={false}>
            <PencilIcon className="w-5 text-fg-4" />
            Edit profile
          </Menu.Item>
          <div className="relative">
            <Menu.Item
              className="whitespace-nowrap"
              loading={isGenerateTransitioning}
              loadingText="Generating link…"
              onClick={(e) =>
                startGenerateTransition(async () => {
                  e.preventDefault();
                  clearTimeout(clientLinkTimeoutRef.current);
                  let shareCode = subject.share_code;

                  if (!shareCode) {
                    const { data } = await createShareCode(subject.id);
                    shareCode = data?.share_code as string;
                  }

                  await copyToClipboard(
                    `${location.origin}/subjects/${subject.id}/join/${shareCode}`,
                  );

                  toggleHasCopiedClientLink(true);

                  clientLinkTimeoutRef.current = setTimeout(
                    () => toggleHasCopiedClientLink(false),
                    2000,
                  );
                })
              }
            >
              {hasCopiedClientLink ? (
                <>
                  <CheckIcon className="w-5 text-fg-4" />
                  Copied, share it!
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-5 text-fg-4" />
                  Copy client link
                </>
              )}
            </Menu.Item>
            <Tooltip
              className="absolute right-3 top-2.5"
              id="clients-tip"
              placement="left"
              tip={
                <>
                  Clients can complete training plans, record events
                  and&nbsp;comment.
                </>
              }
            />
          </div>
          <Menu.Item onClick={() => toggleShareModal(true)}>
            <ShareIcon className="w-5 text-fg-4" />
            Share profile
          </Menu.Item>
          <Menu.Item
            loading={isDownloadTransitioning}
            loadingText="Exporting…"
            onClick={(e) =>
              startIsDownloadTransition(async () => {
                e.preventDefault();
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

                const r = await fetch(
                  `/${shareOrSubjects}/${subject.id}/events.csv?tz=${tz}`,
                );

                const blob = await r.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'events.csv';
                a.click();
              })
            }
          >
            <ArrowDownTrayIcon className="w-5 text-fg-4" />
            Export events
          </Menu.Item>
          <Menu.Item onClick={() => toggleDeleteAlert(true)}>
            <TrashIcon className="w-5 text-fg-4" />
            Delete
          </Menu.Item>
        </Menu.Items>
      </Menu>
      <Alert
        confirmText="Delete subject"
        isConfirmingText="Deleting…"
        isOpen={deleteAlert}
        onClose={toggleDeleteAlert}
        onConfirm={() => deleteSubject(subject.id)}
      />
      <Dialog onClose={toggleShareModal} open={shareModal}>
        <Dialog.Backdrop className="fixed inset-0 z-20 bg-alpha-reverse-1 backdrop-blur-sm" />
        <div className="fixed inset-0 z-30 overflow-y-auto p-4">
          <div className="flex min-h-full items-center justify-center">
            <Dialog.Panel className="w-full max-w-sm rounded border border-alpha-1 bg-bg-2 p-8 pt-5 shadow-lg">
              <div className="flex items-center justify-between">
                <Dialog.Title className="text-2xl">Share</Dialog.Title>
                <IconButton
                  icon={<XMarkIcon className="relative -right-[0.16em] w-7" />}
                  onClick={() => toggleShareModal(false)}
                />
              </div>
              <div className="pt-8">
                <Switch
                  checked={opPublic}
                  description={
                    <>
                      Anyone with the link can access.
                      <br />
                      Clients are anonymized.
                    </>
                  }
                  label="Public read-only profile"
                  name="share"
                  onCheckedChange={() =>
                    startPublicTransition(() => {
                      toggleOpPublic(null);
                      void updateSubject({ id: subject.id, public: !opPublic });
                    })
                  }
                />
              </div>
              {opPublic && (
                <div className="mt-10 space-y-4">
                  <Button
                    className="w-full justify-between"
                    colorScheme="transparent"
                    href={`/share/${subject.id}/events`}
                    target="_blank"
                  >
                    View public profile
                    <ArrowTopRightOnSquareIcon className="w-5" />
                  </Button>
                  <Button
                    className="w-full justify-between"
                    colorScheme="transparent"
                    onClick={async () => {
                      clearTimeout(publicLinkTimeoutRef.current);

                      void copyToClipboard(
                        `${location.origin}/share/${subject.id}/events`,
                      );

                      publicLinkTimeoutRef.current = setTimeout(
                        () => toggleHasCopiedPublicLink(false),
                        2000,
                      );

                      toggleHasCopiedPublicLink(true);
                    }}
                  >
                    {hasCopiedPublicLink ? (
                      <>
                        Copied, share it!
                        <CheckIcon className="w-5" />
                      </>
                    ) : (
                      <>
                        Copy share link
                        <ClipboardDocumentIcon className="w-5" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default SubjectMenu;