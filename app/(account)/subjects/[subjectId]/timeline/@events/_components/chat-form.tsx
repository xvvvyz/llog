'use client';

import Avatar from '@/(account)/_components/avatar';
import IconButton from '@/(account)/_components/icon-button';
import Button from '@/_components/button';
import Input from '@/_components/input';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { User } from '@supabase/gotrue-js/src/lib/types';
import { useChat } from 'ai/react';
import merge from 'lodash/merge';
import { nanoid } from 'nanoid';
import { ChatCompletionRequestMessageFunctionCall } from 'openai-edge';
import { useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { VegaLite } from 'react-vega';
import { VegaLiteProps } from 'react-vega/lib/VegaLite';
import { useBoolean } from 'usehooks-ts';

interface ChatFormProps {
  subjectId: string;
  user: User;
}

const ChatForm = ({
  subjectId,
  user: {
    user_metadata: { first_name, last_name },
  },
}: ChatFormProps) => {
  const dataRef = useRef();
  const isInitializing = useBoolean();

  const {
    handleInputChange,
    handleSubmit,
    input,
    isLoading,
    messages,
    setMessages,
  } = useChat({
    experimental_onFunctionCall: async () => {},
    initialMessages: [
      {
        content: 'Hello! What would you like to see?',
        id: nanoid(),
        role: 'assistant',
      },
    ],
  });

  return (
    <div className="space-y-8">
      <div className="space-y-4" role="section">
        {useMemo(
          () =>
            messages.map((m) => {
              if (m.role === 'system') return null;

              const func =
                m.function_call as ChatCompletionRequestMessageFunctionCall;

              if (func) {
                let args: Record<string, unknown> = {};

                try {
                  args = JSON.parse(func.arguments ?? '');
                } catch (e) {
                  // noop
                }

                if (!dataRef.current || !Object.keys(args).length) {
                  return (
                    <div
                      className="border-t border-alpha-1 pt-4 text-left font-mono text-xs text-fg-4 [overflow-wrap:anywhere]"
                      key={m.id}
                    >
                      {JSON.stringify(m.function_call).replace(
                        /(\\n|\\| )/g,
                        '',
                      )}
                    </div>
                  );
                }

                const spec = merge(
                  {
                    config: {
                      axis: { grid: false, title: null },
                      axisX: { labelAngle: -33 },
                      legend: { columns: 1, orient: 'top', title: null },
                      padding: 20,
                      style: {
                        'guide-label': { font: 'monospace' },
                        'guide-title': {
                          font: 'monospace',
                          fontWeight: 'normal',
                        },
                      },
                      view: { strokeWidth: 0 },
                    },
                    data: { name: 'values' },
                    width: 'container',
                  },
                  args,
                );

                return (
                  <Button
                    className="m-0 w-full p-0"
                    key={m.id}
                    onClick={() => {
                      // https://github.com/vega/vega-embed/blob/next/src/post.ts

                      const url = 'https://vega.github.io/editor';
                      const editor = window.open(url);
                      const wait = 10_000;
                      const step = 250;
                      const { origin } = new URL(url);
                      let count = ~~(wait / step);

                      const data = {
                        mode: 'VEGA-LITE',
                        spec: JSON.stringify(
                          { ...spec, data: { values: dataRef.current } },
                          null,
                          2,
                        ),
                      };

                      function listen(evt: MessageEvent) {
                        if (evt.source !== editor) return;
                        count = 0;
                        window.removeEventListener('message', listen, false);
                      }

                      function send() {
                        if (count <= 0) return;
                        editor?.postMessage(data, origin);
                        setTimeout(send, step);
                        count -= 1;
                      }

                      setTimeout(send, step);
                      setTimeout(() => window.postMessage(data, url), 2000);
                      window.addEventListener('message', listen, false);
                    }}
                    variant="link"
                  >
                    <VegaLite
                      actions={false}
                      className="block w-full"
                      data={{ values: dataRef.current }}
                      spec={spec as unknown as VegaLiteProps['spec']}
                    />
                  </Button>
                );
              }

              return (
                <div className="flex gap-4" key={m.id}>
                  <Avatar
                    className="mt-0.5"
                    name={m.role === 'user' ? first_name : 'V'}
                  />
                  <div className="flex-1">
                    <div className="smallcaps h-5">
                      {m.role === 'user'
                        ? `${first_name} ${last_name}`
                        : 'Visualization Assistant'}
                    </div>
                    <div className="mt-1">
                      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                      {/* @ts-ignore */}
                      <ReactMarkdown className="prose" linkTarget="_blank">
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              );
            }),
          [first_name, last_name, messages],
        )}
      </div>
      <form
        onSubmit={async (e) => {
          if (dataRef.current) return handleSubmit(e);
          e.preventDefault();
          isInitializing.setTrue();
          const res = await fetch(`/subjects/${subjectId}/events.json`);
          const data = await res.json();
          dataRef.current = data;
          const fields: Record<string, Set<string> | null> = {};

          for (const d of data) {
            for (const [key, value] of Object.entries(d)) {
              if (!/\((n|an)\)$/i.test(key) || !value) {
                fields[key] = null;
                continue;
              }

              fields[key] = fields[key] ?? new Set();

              if (/\(n\)$/i.test(key)) {
                (fields[key] as Set<string>).add(value as string);
              } else if (/\(an\)$/i.test(key)) {
                (value as string[]).forEach((item) =>
                  (fields[key] as Set<string>).add(item),
                );
              }
            }
          }

          setMessages([
            {
              content: JSON.stringify({
                fields: Object.entries(fields).reduce(
                  (acc, [key, value]) => {
                    acc[key] = value ? Array.from(value) : value;
                    return acc;
                  },
                  {} as Record<string, string[] | null>,
                ),
              }),
              id: nanoid(),
              role: 'system',
            },
            ...messages,
          ]);

          isInitializing.setFalse();
          return handleSubmit(e);
        }}
      >
        <Input
          className="rounded-sm"
          disabled={isInitializing.value || isLoading}
          onChange={handleInputChange}
          placeholder="Ask for a visualization…"
          right={
            <IconButton
              className="m-0 px-3 py-2.5"
              icon={<PaperAirplaneIcon className="w-5" />}
              label="Submit"
              loading={isInitializing.value || isLoading}
              loadingText="Submitting…"
              type="submit"
            />
          }
          value={input}
        />
      </form>
    </div>
  );
};

export default ChatForm;