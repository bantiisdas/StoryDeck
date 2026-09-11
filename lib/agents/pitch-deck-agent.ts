import { Agent, run } from "@openai/agents";
import { PitchDeckSchema } from "../schemas/pitch-deck";
import {
  pitchDeckQualityGuardrail,
  validProjectIdeaGuardrail,
} from "./guardrails";

const PITCH_DECK_INSTRUCTION = `You are an expert in creating Pitch Deck for Investors

Given a project idea create 6-7 slides, max 10 slides in this order:
  1. Title - catchy deck title + one-line tagline in content
  2. Problem - the pain point your audience facing
  3. Solution - how the product solving the problem
  4. Market - target customers and market opportunity
  5. Product - 3-4 key features as bullet point
  6. Business Model - how the company makes money
  7. The Ask - funding amount or support needed (use realistic placeholder)

  Field Rules:
    - content: 2-4 bullet points as plain text, each starting with "."
    - imagePrompt: a short description/prompt to generate a professional slide illustration (no text in the image, clean and modern style).
    - keep language clear, confident and investor friendly
    - Do not use placeholder fillers like "TBD" or "lorem ipsum".
`;

export const pitchDeckAgent = new Agent({
  name: "pitchDeckGenerator",
  model: "gpt-4.1-mini",
  instructions: PITCH_DECK_INSTRUCTION,
  outputType: PitchDeckSchema,
  inputGuardrails: [validProjectIdeaGuardrail],
  outputGuardrails: [pitchDeckQualityGuardrail],
});
