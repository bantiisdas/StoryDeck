import {
  Agent,
  run,
  type InputGuardrail,
  type OutputGuardrail,
} from "@openai/agents";
import { z } from "zod";
import { PitchDeck, PitchDeckSchema } from "../schemas/pitch-deck";

function getInputText(input: string | unknown[]): string {
  if (typeof input === "string") {
    return input;
  }
  return JSON.stringify(input);
}

export const validProjectIdeaGuardrail: InputGuardrail = {
  name: "valid_project_idea",
  execute: async ({ input }) => {
    const text = getInputText(input).trim();
    const tooShort = text.length < 20;

    return {
      tripwireTriggered: tooShort,
      outputInfo: tooShort
        ? { reason: "Project Idea must be atleast of 20 characters" }
        : undefined,
    };
  },
};

const QualityCheckSchema = z.object({
  isValid: z.boolean(),
  reason: z.string().optional(),
});

const qualityCheckerAgent = new Agent({
  name: "PitchDeckQualityChecker",
  model: "gpt-4.1-mini",
  instructions: `You review Pitch Deck JSON for a Business Pitch Deck generator App.
    Return isValid as false if any of the below conditions are true:
     - Profanity, hate speech, or violent content
     - Placeholder text like "TBD", "lorem ipsum", "[insert here]", "coming soon"
     - Slides with empty or meaningless filler content
     - Content that clearly does not belong to Business Pitch Deck.

    Otherwise return isValid as true.

    If invalid explain why in the reason field
    `,
  outputType: QualityCheckSchema,
});

export const pitchDeckQualityGuardrail: OutputGuardrail<
  typeof PitchDeckSchema
> = {
  name: "pitch_deck_quality",
  execute: async ({ agentOutput }) => {
    const deckJson = JSON.stringify(agentOutput, null, 2);
    const agentResult = await run(qualityCheckerAgent, deckJson);
    const check = QualityCheckSchema.parse(agentResult.finalOutput as unknown);

    return {
      tripwireTriggered: !check.isValid,
      outputInfo: check.isValid
        ? undefined
        : { reason: check.reason ?? "Deck failed quality checks" },
    };
  },
};
