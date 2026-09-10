import OpenAI from "openai";

const IMAGE_MODEL = "gpt-image-1-mini";
const IMAGE_SIZE = "1024x1024";

let openaiClient: OpenAI | null = null;

function getOpenaiClient(): OpenAI {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OpenAI API Key is missing");
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: openaiKey });
  }

  return openaiClient;
}
