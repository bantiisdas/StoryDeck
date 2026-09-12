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

async function fetchPlaceholderImage(): Promise<Buffer> {
  const response = await fetch("https://picsum.photos/1024/1024");
  if (!response.ok) {
    throw new Error("Could not download placeholder image");
  }

  const bytes = await response.arrayBuffer();
  return Buffer.from(bytes);
}

async function createImageWithOpenai(prompt: string): Promise<Buffer> {
  const openai = getOpenaiClient();

  const response = await openai.images.generate({
    prompt,
    model: IMAGE_MODEL,
    size: IMAGE_SIZE,
    n: 1,
  });

  const bas64Image = response.data?.[0].b64_json;
  if (!bas64Image) {
    throw new Error("Unable to generate slide image");
  }

  return Buffer.from(bas64Image, "base64");
}

export async function generateSlideImage(prompt: string): Promise<Buffer> {
  if (process.env.USE_PLACEHOLDER_IMAGES === "true") {
    return fetchPlaceholderImage();
  }
  return createImageWithOpenai(prompt);
}
