export const openaiPluginMetadata = {
  name: "OpenAI Plugin",
  description: "Displays the OpenAI chat.",
  isEnabled: process.env.NEXT_PUBLIC_ENABLE_OPENAI_PLUGIN === "true",
};
