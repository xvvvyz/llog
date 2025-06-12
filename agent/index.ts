import { eventSystemPrompt } from '@/agent/prompts/event-system';
import { generateId } from '@/agent/tools/generate-id';
import { getCurrentTime } from '@/agent/tools/get-current-time';
import { queryData } from '@/agent/tools/query-data';
import { updateData } from '@/agent/tools/update-data';
import { Role } from '@/enums/roles';
import schema from '@/instant.schema';
import { createAISDKTools } from '@agentic/ai-sdk';
import { calculator } from '@agentic/calculator';
import { WeatherClient } from '@agentic/weather';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { id, init, User } from '@instantdb/admin';
import { Agent } from 'agents';

import {
  createProviderRegistry,
  generateText,
  InvalidToolArgumentsError,
  stepCountIs,
  StepResult,
  ToolExecutionError,
  ToolSet,
} from 'ai';

export class AppAgent extends Agent<CloudflareEnv> {
  private ai = createProviderRegistry({
    anthropic: createAnthropic({ apiKey: this.env.ANTHROPIC_API_KEY }),
    google: createGoogleGenerativeAI({ apiKey: this.env.GOOGLE_API_KEY }),
    openai: createOpenAI({ apiKey: this.env.OPENAI_API_KEY }),
  });

  private db = init({
    adminToken: this.env.INSTANT_APP_ADMIN_TOKEN,
    appId: this.env.INSTANT_APP_ID,
    schema,
  });

  async onRequest(r: Request) {
    try {
      await this.authorizeRequest(r);
    } catch {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const agent = await this.authenticateAgent();
      const agentProfileId = await this.getAgentProfileId(agent);

      const tools = createAISDKTools(
        generateId,
        getCurrentTime,
        queryData(this.db.asUser(agent)),
        updateData(this.db.asUser(agent)),
        calculator,
        new WeatherClient({ apiKey: this.env.WEATHER_API_KEY })
      );

      const response = await generateText({
        maxRetries: 3,
        model: this.ai.languageModel('google:gemini-2.0-flash'),
        onStepFinish: this.onStepFinish<typeof tools>,
        prompt: await r.text(),
        stopWhen: stepCountIs(10),
        system: eventSystemPrompt({ agentProfileId, teamId: this.name }),
        tools,
      });

      return Response.json(response.text);
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      }

      if (
        ToolExecutionError.isInstance(error) ||
        InvalidToolArgumentsError.isInstance(error)
      ) {
        console.log(error.toolArgs);
      }

      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  private async authenticateAgent() {
    const email = `agent-${this.name}@${this.env.AGENT_EMAIL_DOMAIN}`;
    const token = await this.db.auth.createToken(email);
    return this.db.auth.verifyToken(token);
  }

  private async authorizeRequest(r: Request) {
    const token = r.headers.get('Authorization')?.split(' ')[1] ?? '';
    const user = await this.db.auth.verifyToken(token);
    const query = { teams: { $: { where: { id: this.name } } } };
    const { teams } = await this.db.asUser(user).query(query);
    if (!teams.length) throw new Error('Unauthorized');
    return user;
  }

  private async getAgentProfileId(agent: User) {
    const query = { profiles: { $: { where: { user: agent.id } } } };
    const { profiles } = await this.db.asUser(agent).query(query);
    return profiles[0]?.id ?? this.onboardAgent(agent);
  }

  private async onboardAgent(agent: User) {
    const profileId = id();

    await this.db.transact([
      this.db.tx.profiles[profileId]
        .update({ name: 'llog bot' })
        .link({ user: agent.id }),
      this.db.tx.roles[id()]
        .update({
          key: `${Role.Admin}_${agent.id}`,
          role: Role.Admin,
          userId: agent.id,
        })
        .link({ team: this.name, user: agent.id }),
    ]);

    return profileId;
  }

  private async onStepFinish<T extends ToolSet>({
    text,
    toolResults,
  }: StepResult<T>) {
    const fn = toolResults.map((r) => [r.args, r.result])[0];
    console.log(JSON.stringify({ text, fn }, null, 2).replaceAll('\\', ''));
  }
}
