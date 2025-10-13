/**
 * Human-in-the-Loop Example
 * 
 * Demonstrates pausing agent execution for human approval
 * Factor 7: Contact humans with tools
 */

import {
  Agent,
  OpenAIConnector,
  ThreadManager,
  FunctionToolExecutor,
  HumanRequest,
  HumanResponse,
  OpenAIContextBuilder
} from '../src';

async function main() {
  const connector = new OpenAIConnector({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o'
  });

  // Define tools including a "risky" operation
  const tools = {
    send_email: {
      intent: 'send_email',
      description: 'Send an email (requires approval)',
      parameters: {
        type: 'object' as const,
        properties: {
          to: { type: 'string', description: 'Recipient email' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body' }
        },
        required: ['to', 'subject', 'body']
      }
    },
    search_contacts: {
      intent: 'search_contacts',
      description: 'Search for contacts',
      parameters: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    }
  };

  const toolExecutors = [
    new FunctionToolExecutor('send_email', async (args) => {
      // This will be called after human approval
      console.log(`📧 Sending email to ${args.to}...`);
      return {
        sent: true,
        messageId: 'msg_' + Date.now(),
        to: args.to
      };
    }),
    new FunctionToolExecutor('search_contacts', async (args) => {
      return {
        contacts: [
          { name: 'Alice', email: 'alice@example.com' },
          { name: 'Bob', email: 'bob@example.com' }
        ]
      };
    })
  ];

  // Create agent with pause-on-intent for send_email
  const agent = new Agent({
    name: 'EmailAgent',
    systemPrompt: `You are an email assistant.
You can search contacts and send emails.
When sending emails, always be professional and clear.`,
    tools,
    connector,
    toolExecutors,
    contextBuilder: new OpenAIContextBuilder(),
    controlFlow: {
      // Pause before sending email
      pauseOnIntents: ['send_email']
    }
  });

  let thread = ThreadManager.create();

  console.log('🤖 Running agent with human-in-the-loop...\n');

  // First run - agent will pause at send_email
  let result = await agent.run(
    thread,
    'Send an email to Alice thanking her for the meeting'
  );

  thread = result.thread;

  if (result.reason === 'paused') {
    console.log('\n⏸️  Agent paused for approval');
    
    // Get the last tool call
    const lastToolCall = ThreadManager.getLastEvent(thread, 'tool_call');
    if (lastToolCall) {
      console.log('\n📋 Pending Action:');
      console.log(JSON.stringify(lastToolCall.data, null, 2));
      
      // Simulate human approval
      console.log('\n👤 Human approves the action...\n');
      
      // Add human approval event
      thread = ThreadManager.addEvent(thread, 'human_response', {
        approved: true,
        timestamp: Date.now()
      });
      
      // Update thread status to active
      thread = ThreadManager.updateStatus(thread, 'active');
      
      // Resume execution
      result = await agent.resume(thread);
    }
  }

  console.log('\n✅ Agent completed!');
  console.log(`Final status: ${result.reason}`);
  console.log(`Total events: ${result.thread.events.length}`);
}

main().catch(console.error);
