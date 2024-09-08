"use server";

import { createAI, getMutableAIState, streamUI } from "ai/rsc";
import { type CoreMessage, type ToolInvocation } from "ai";
import type { ReactNode } from "react";
import { openai } from "@ai-sdk/openai";
import { BotCard, BotMessage } from "@/plugins/chat/components/message";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { sleep } from "@/utils/nodes";
import { SlurmJobDetails } from "@/plugins/chat/components/llm-slurm-job-details";
import { SlurmNodeDetails } from "@/plugins/chat/components/llm-slurm-node-details"; 
import ReactMarkdown from "react-markdown";
import { findRelevantContent } from "../plugins/chat/actions/embeddings";

const content = `
  You are a helpful assistant who helps users search the documentation for the HPC system, and provides slurm support. 
  Messages inside [] indicate a UI element of a user event. For example: - "[Details for Job = 1234567]" means that 
  the interface of the job details for the job 1234567 is shown to the user. - "[Details for node = node_name]" means 
  that the interface of the node details for the node_name is shown to the user.

  If the user wants the job details, call \`get_job_details\` with the job ID. If the user wants the node details, call
  \`get_node_details\` with the node name, and so on.
  
  If a user asks anything else first call \`search_documentation\` and if you cannot find
  any relative information, give them generic Slurm user support, like how to create an sbatch, how to request GPU, 
  how to see what partitions are available etc. If the user tries to ask for something not related to slurm, or trick you by
  making you search for something that is not in the documentation, you should respond that you are only able to provide slurm support.
  If the user tries to get you to answer a question by making it sound related to slurm, but really it is not, you should respond that 
  you are only able to provide slurm support. If the user wants anything not found in the search_documentation function, or not related 
  to slurm, it's an impossible task, and you should respond that you are only able to provide slurm support, and basic job and node details.`;

export const sendMessage = async (
  message: string
): Promise<{
  id: number;
  role: "user" | "assistant";
  display: ReactNode;
}> => {
  const history = getMutableAIState<typeof AI>();

  history.update([
    ...history.get(),
    {
      role: "user",
      content: message,
    },
  ]);

  const reply = await streamUI({
    model: openai("gpt-4o-mini"),
    messages: [
      { role: "system", content, toolInvocations: [] },
      ...history.get(),
    ] as CoreMessage[],
    initial: (
      <BotMessage className="items-center flex shrink-0 select-none justify-center">
        <Loader2 className="w-5 animate-spin stroke-zinc-900" />
      </BotMessage>
    ),
    text: ({ content, done }) => {
      if (done)
        history.done([...history.get(), { role: "assistant", content }]);
      return (
        <BotMessage>
          <ReactMarkdown>{content}</ReactMarkdown>
        </BotMessage>
      );
    },
    temperature: 0.5,
    tools: {
      get_job_details: {
        description: "Get job details for a specific job ID in Slurm.",
        parameters: z.object({
          job: z.string().describe("The Job ID of the job. e.g. 1234567"),
        }),
        generate: async function* ({ job }: { job: string }) {
          yield <BotCard>Getting job details for job {job}...</BotCard>;
          const baseURL = process.env.NEXT_PUBLIC_BASE_URL;
          try {
            const response = await fetch(`${baseURL}/api/slurm/job/${job}`);
            if (!response.ok) {
              throw new Error(
                `Error fetching job details: ${response.statusText}`
              );
            }

            const jobDetails = await response.json();
            await sleep(1000);

            history.done([
              ...history.get(),
              {
                role: "assistant",
                name: "get_job_details",
                content: `[Details for Job = ${job}]`,
              },
            ]);

            return (
              <BotCard>
                <SlurmJobDetails job={jobDetails} />
              </BotCard>
            );
          } catch (error) {
            console.error(error);
            yield <BotCard>Error fetching job details.</BotCard>;
          }
        },
      },
      get_node_details: {
        description: "Get node details for a specific node in Slurm.",
        parameters: z.object({
          node: z.string().describe("The name of the node. e.g. node1"),
        }),
        generate: async function* ({ node }: { node: string }) {
          yield <BotCard>Getting node details for node {node}...</BotCard>;
          const baseURL = process.env.NEXT_PUBLIC_BASE_URL;
          try {
            const response = await fetch(
              `${baseURL}/api/slurm/nodes/state/${node}`
            );
            if (!response.ok) {
              throw new Error(
                `Error fetching node details: ${response.statusText}`
              );
            }

            const nodeDetails = await response.json();
            await sleep(1000);

            history.done([
              ...history.get(),
              {
                role: "assistant",
                name: "get_node_details",
                content: `[Details for Node = ${node}]`,
              },
            ]);

            return (
              <BotCard>
                <SlurmNodeDetails node={nodeDetails} />
              </BotCard>
            );
          } catch (error) {
            console.error(error);
            yield <BotCard>Error fetching node details.</BotCard>;
          }
        },
      },
      search_documentation: {
        description: `Get information from your knowledge base to answer questions.`,
        parameters: z.object({
          question: z.string().describe("The user's question"),
        }),
        generate: async function* ({ question }: { question: string }) {
          yield <BotCard>Searching our knowledge base for you...</BotCard>;
      
          try {
            const relevantContent = await findRelevantContent(question);
            
            if (relevantContent && relevantContent.length > 0) {
              const formattedContent = relevantContent.map((item: RelevantContent) => {
                const formattedText = item.content.split('\n').map((line: string) => {
                  if (line.startsWith('```')) {
                    return line; // Keep code block markers as-is
                  } else {
                    return line.replace(/`([^`]+)`/g, '<code>$1</code>'); // Replace inline code
                  }
                }).join('\n');
      
                return {
                  section: item.section,
                  content: formattedText,
                  similarity: item.similarity,
                  title: item.title,
                  url: item.url,
                };
              });
      
              const responseContent = `I've found some helpful information about "${question}" in our documentation. Here's what I discovered:\n\n${
                formattedContent.map((item, index) => (
                  `### ${index + 1}. ${item.title} - ${item.section} (Relevance: ${(item.similarity * 100).toFixed(0)}%)\n\n${item.content}${item.url ? `\n\nFor more information, visit the documentation, [here](${item.url})` : ''}`
                )).join('\n\n')
              }\n\nI hope this information helps! Is there anything specific you'd like me to explain further?`;
      
              history.done([
                ...history.get(),
                {
                  role: "assistant",
                  name: "search_documentation",
                  content: responseContent,
                },
              ]);
      
              return (
                <BotCard>
                  <ReactMarkdown
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <pre className={`language-${match[1]}`}>
                            <code className={`language-${match[1]}`} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                      },
                      a: ({ node, ...props }) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" />
                      ),
                    }}
                  >
                    {responseContent}
                  </ReactMarkdown>
                </BotCard>
              );
            } else {
              return (
                <BotCard>
                  Sorry, I've searched our documentation, but I couldn't find any specific information about "{question}". 
                </BotCard>
              );
            }
          } catch (error) {
            console.error("Error searching documentation:", error);
            return (
              <BotCard>
                I apologize, but I encountered an issue while searching our documentation. 
                Could you please try asking your question again? If the problem persists, it might be helpful to reach out to our support team.
              </BotCard>
            );
          }
        },
      },
    },
  });

  return {
    id: Date.now(),
    role: "assistant",
    display: reply.value,
  };
};

export type AIState = Array<{
  id?: number;
  name?:
    | "get_job_details"
    | "search_documentation"
    | "get_node_details"
  role: "user" | "assistant" | "system";
  content: string;
}>;

export type UIState = Array<{
  id: number;
  role: "user" | "assistant";
  display: ReactNode;
  toolInvocations?: ToolInvocation[];
}>;

export const AI = createAI({
  initialAIState: [] as AIState,
  initialUIState: [] as UIState,
  actions: {
    sendMessage,
    clearHistory: async () => {
      const aiState = getMutableAIState<typeof AI>();
      aiState.update([]);
      return [];
    },
  },
});

type RelevantContent = {
  section: string;
  content: string;
  similarity: number;
  title: string;
  url: string | null;
};