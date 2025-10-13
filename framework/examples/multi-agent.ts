/**
 * Multi-Agent Example
 * 
 * Demonstrates hierarchical agent composition where a coordinator agent
 * delegates tasks to specialized sub-agents.
 * 
 * This example shows:
 * - Creating specialized agents with focused capabilities
 * - Converting agents to tools using agentAsTool()
 * - Building a coordinator agent that orchestrates sub-agents
 * - Streaming output from sub-agents to the parent
 */

import { 
  Agent, 
  OpenAIConnector, 
  ThreadManager, 
  OpenAIContextBuilder 
} from '../src';
import { agentAsTool, createAgentHierarchy } from '../src/utils/agent-tools';

async function main() {
  console.log('🤖 Multi-Agent System Demo\n');

  const connector = new OpenAIConnector({
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-5-mini'
  });

  // ========================================
  // 1. Create Specialized Sub-Agents
  // ========================================

  // Weather Specialist
  const weatherAgent = new Agent({
    name: 'WeatherSpecialist',
    systemPrompt: `You are a weather information specialist.
You provide detailed weather forecasts, climate data, and weather-related advice.
Always include temperature, conditions, and any relevant warnings.
Be concise but informative.`,
    tools: {
      get_weather: {
        intent: 'get_weather',
        description: 'Get current weather for a location',
        parameters: {
          type: 'object' as const,
          properties: {
            location: { 
              type: 'string', 
              description: 'City name or location' 
            },
            units: { 
              type: 'string', 
              enum: ['celsius', 'fahrenheit'], 
              description: 'Temperature units' 
            }
          },
          required: ['location']
        },
        execute: async (args: any) => ({
          location: args.location,
          temperature: 72,
          temperature_fahrenheit: 72,
          temperature_celsius: 22,
          condition: 'Sunny',
          humidity: 45,
          wind_speed: '10 mph',
          forecast: '3-day forecast: Sunny today, Partly Cloudy tomorrow, Light rain in 2 days',
          units: args.units || 'fahrenheit'
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  // Math Specialist
  const mathAgent = new Agent({
    name: 'MathSpecialist',
    systemPrompt: `You are a mathematics expert.
You solve complex calculations, explain mathematical concepts, and provide step-by-step solutions.
Always show your work and explain the reasoning behind calculations.
Be precise and educational.`,
    tools: {
      calculate: {
        intent: 'calculate',
        description: 'Perform mathematical calculations',
        parameters: {
          type: 'object' as const,
          properties: {
            expression: { 
              type: 'string', 
              description: 'Mathematical expression to evaluate' 
            }
          },
          required: ['expression']
        },
        execute: async (args: any) => {
          try {
            const result = eval(args.expression);
            return {
              expression: args.expression,
              result: result,
              explanation: `Evaluated: ${args.expression} = ${result}`
            };
          } catch (error: any) {
            return {
              expression: args.expression,
              error: error.message,
              explanation: 'Invalid mathematical expression'
            };
          }
        }
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  // Research Specialist
  const researchAgent = new Agent({
    name: 'ResearchSpecialist',
    systemPrompt: `You are a research assistant.
You search for information, summarize findings, and provide well-sourced answers.
Always be thorough and cite your reasoning.
Provide comprehensive, accurate information.`,
    tools: {
      search: {
        intent: 'search',
        description: 'Search for information on a topic',
        parameters: {
          type: 'object' as const,
          properties: {
            query: { 
              type: 'string', 
              description: 'Search query or topic to research' 
            }
          },
          required: ['query']
        },
        execute: async (args: any) => ({
          query: args.query,
          results: [
            `Research finding 1: Comprehensive data about ${args.query}`,
            `Research finding 2: Additional context and historical analysis`,
            `Research finding 3: Expert opinions and current trends`,
            `Research finding 4: Related topics and further reading suggestions`
          ],
          sources: [
            'Academic Database (simulated)',
            'News Archives (simulated)',
            'Expert Analysis (simulated)'
          ],
          summary: `This is a simulated research result for: ${args.query}. In a real implementation, this would include actual search results from databases, APIs, or knowledge bases.`
        })
      }
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  // ========================================
  // 2. Convert Sub-Agents to Tools
  // ========================================

  const weatherTool = agentAsTool(weatherAgent, {
    intent: 'ask_weather_specialist',
    description: 'Delegate weather-related questions to the weather specialist. Use this for weather forecasts, climate data, and weather advice.',
    streamToParent: true // Stream sub-agent output to parent
  });

  const mathTool = agentAsTool(mathAgent, {
    intent: 'ask_math_specialist',
    description: 'Delegate mathematical calculations and problems to the math specialist. Use this for any calculations, formulas, or math explanations.',
    streamToParent: true
  });

  const researchTool = agentAsTool(researchAgent, {
    intent: 'ask_research_specialist',
    description: 'Delegate research questions and information gathering to the research specialist. Use this when you need to find information about a topic.',
    streamToParent: true
  });

  // ========================================
  // 3. Create Coordinator Agent
  // ========================================

  const coordinatorAgent = new Agent({
    name: 'CoordinatorAgent',
    systemPrompt: `You are a coordinator agent that manages specialized sub-agents.

You have access to three specialist agents:
- Weather Specialist: For weather information, forecasts, and climate data
- Math Specialist: For calculations, mathematical problems, and numerical analysis
- Research Specialist: For information gathering, research, and knowledge queries

Your role:
1. Analyze the user's request to understand what information they need
2. Determine which specialist(s) can best help answer their question
3. Delegate to the appropriate specialist(s) by using their tools
4. Synthesize the responses from specialists into a coherent, helpful answer
5. You can delegate to multiple specialists if the query requires it

When delegating:
- Be specific about what you're asking each specialist
- Break down complex queries into clear sub-tasks
- Combine multiple specialist responses when needed

Always provide a comprehensive final answer that addresses all aspects of the user's question.`,
    tools: {
      [weatherTool.intent]: weatherTool,
      [mathTool.intent]: mathTool,
      [researchTool.intent]: researchTool
    },
    connector,
    contextBuilder: new OpenAIContextBuilder()
  });

  // ========================================
  // 4. Run Complex Multi-Agent Query
  // ========================================

  const thread = ThreadManager.create();

  const query = "What's the weather in Tokyo? If it's 25°C there, what is that in Fahrenheit? Also, find some interesting facts about Tokyo's climate.";
  
  console.log(`📝 Query: "${query}"\n`);
  console.log('🔄 Processing with coordinator agent...\n');

  const result = await coordinatorAgent.streamRun(
    thread,
    query,
    (chunk) => {
      if (chunk.type === 'tool_call' && chunk.toolCall) {
        console.log(`\n🔧 Coordinator delegating to: ${chunk.toolCall.intent}`);
      } else if (chunk.type === 'content') {
        process.stdout.write(chunk.content || '');
      } else if (chunk.type === 'reasoning') {
        // Show reasoning as dots
        process.stdout.write('.');
      }
    }
  );

  console.log('\n\n✅ Multi-agent execution completed!\n');
  console.log('📊 Execution Summary:');
  console.log(`   Status: ${result.reason}`);
  console.log(`   Total events: ${result.thread.events.length}`);
  
  // Analyze which specialists were used
  const subAgentCalls = result.thread.events.filter(
    e => e.type === 'tool_call' && 
    ['ask_weather_specialist', 'ask_math_specialist', 'ask_research_specialist'].includes(e.data.intent)
  );
  
  console.log(`   Specialists used: ${subAgentCalls.length}`);
  subAgentCalls.forEach((call, idx) => {
    const agentName = call.data.intent.replace('ask_', '').replace('_', ' ');
    console.log(`   ${idx + 1}. ${agentName}`);
  });

  // Show tool results
  const toolResults = result.thread.events.filter(e => e.type === 'tool_result');
  console.log(`\n   Tool executions: ${toolResults.length}`);

  console.log('\n📜 Full Thread History:');
  result.thread.events.forEach((event, idx) => {
    const preview = JSON.stringify(event.data).slice(0, 80);
    console.log(`   ${idx + 1}. [${event.type}] ${preview}...`);
  });
}

main().catch(console.error);
