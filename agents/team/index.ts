import { systemPrompt } from '@/agents/team/prompts/system';
import * as generateId from '@/agents/team/tools/generate-id';
import * as getCurrentTime from '@/agents/team/tools/get-current-time';
import * as queryData from '@/agents/team/tools/query-data';
import * as updateData from '@/agents/team/tools/update-data';
import schema from '@/instant.schema';
import { Content, GenerateContentConfig, GoogleGenAI } from '@google/genai';
import { init, InstantAPIError, InstaQLEntity, User } from '@instantdb/admin';
import { Agent } from 'agents';

export class TeamAgent extends Agent<CloudflareEnv> {
  private ai: {
    client: GoogleGenAI;
    config: GenerateContentConfig;
    model: string;
  } = {
    client: new GoogleGenAI({ apiKey: this.env.GOOGLE_API_KEY }),
    config: {
      tools: [
        {
          functionDeclarations: [
            generateId.tool,
            getCurrentTime.tool,
            queryData.tool,
            updateData.tool,
          ],
        },
      ],
    },
    model: 'gemini-2.5-flash-preview-05-20',
  };

  private db = init({
    adminToken: this.env.INSTANT_APP_ADMIN_TOKEN,
    appId: this.env.INSTANT_APP_ID,
    schema,
  });

  private thread: Content[] = [];
  private user = {} as User;

  async onError() {
    // noop
  }

  async onRequest(request: Request) {
    await this.authorize(request);
    const rules = await this.getRules();
    if (!rules.length) return Response.json('Nothing to do.');
    this.ai.config.systemInstruction = systemPrompt({ teamId: this.name });
    this.initThread({ event: await request.text(), rules });

    while (true) {
      const { content, fn } = await this.generate();
      if (!content?.role) break;
      this.threadPush(content);
      if (!fn) break;
      const response = await this.runTool(fn.name, fn.args);
      this.threadPushFunctionResponse(fn.name, response);
    }

    return Response.json(this.thread);
  }

  private async authorize(r: Request) {
    try {
      const token = r.headers.get('Authorization')?.split(' ')[1] ?? '';
      this.user = await this.db.auth.verifyToken(token);
      this.db = this.db.asUser({ email: this.user.email });
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  private async generate() {
    try {
      const res = await this.ai.client.models.generateContent({
        config: this.ai.config,
        contents: this.thread,
        model: this.ai.model,
      });

      const content = res.candidates?.[0]?.content;
      const fn = content?.parts?.find((p) => p.functionCall)?.functionCall;
      return { content, fn };
    } catch (e) {
      let text = e instanceof Error ? e.message : 'Unknown error';

      try {
        // handle wacky gemini error message
        const split = text.split('{').slice(1);
        text = JSON.parse(split[1])?.error?.message;
      } catch {
        // noop
      }

      return { content: { parts: [{ text }], role: 'model' } as Content };
    }
  }

  private async getRules() {
    const { rules } = await this.db.query({
      rules: { $: { where: { team: this.name } } },
    });

    return rules;
  }

  private initThread({
    event,
    rules,
  }: {
    event: string;
    rules: InstaQLEntity<typeof schema, 'rules'>[];
  }) {
    this.thread = [
      {
        parts: [{ text: event }],
        role: 'user',
      },
      {
        parts: [
          {
            functionCall: {
              name: 'queryData',
              args: { query: { rules: { $: { where: { team: this.name } } } } },
            },
          },
        ],
        role: 'model',
      },
      {
        parts: [
          { functionResponse: { name: 'queryData', response: { rules } } },
        ],
        role: 'user',
      },
    ];
  }

  private async runTool(name?: string, args?: Record<string, unknown>) {
    try {
      switch (name) {
        case generateId.tool.name: {
          return { output: generateId.run() };
        }

        case getCurrentTime.tool.name: {
          return { output: getCurrentTime.run() };
        }

        case queryData.tool.name: {
          return await queryData.run(this.db, args?.query);
        }

        case updateData.tool.name: {
          await updateData.run(this.db, args?.transactions);
          return { output: 'Success!' };
        }

        default: {
          return { error: `Unknown tool: ${name}` };
        }
      }
    } catch (e) {
      return {
        error:
          e instanceof InstantAPIError
            ? e.body?.message
            : e instanceof Error
              ? e.message
              : 'Unknown error',
      };
    }
  }

  private threadPush(content: Content) {
    this.thread.push(content);
    console.log(JSON.stringify(content, null, 2));
  }

  private threadPushFunctionResponse(
    name?: string,
    response?: Record<string, unknown>
  ) {
    this.threadPush({
      parts: [{ functionResponse: { name, response } }],
      role: 'user',
    });
  }
}
