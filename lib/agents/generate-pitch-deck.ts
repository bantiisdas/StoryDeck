import {
  InputGuardrailTripwireTriggered,
  OutputGuardrailTripwireTriggered,
  run,
} from "@openai/agents";
import { PitchDeck, PitchDeckSchema } from "../schemas/pitch-deck";
import { pitchDeckAgent } from "./pitch-deck-agent";

export class PitchDeckGenerationError extends Error {
  readonly reason?: string;

  constructor(message: string, reason?: string) {
    super(message);
    this.name = "PichDeckGenerationError";
    this.reason = reason;
  }
}

function isGuardrailError(error: unknown): boolean {
  return (
    error instanceof InputGuardrailTripwireTriggered ||
    error instanceof OutputGuardrailTripwireTriggered
  );
}

function getGuardrailReason(error: unknown): string {
  if (
    error instanceof InputGuardrailTripwireTriggered ||
    error instanceof OutputGuardrailTripwireTriggered
  ) {
    const info = error.result.output.outputInfo as
      | { reason?: string }
      | undefined;
    return info?.reason ?? "Pitch Deck generation is blocked by Guardrails";
  }
  return "Pitch Deck generation is blocked by Guardrails";
}

function parseRawoutput(agentOutput: unknown): PitchDeck {
  return PitchDeckSchema.parse(agentOutput);
}

export async function generatePitchDeck(idea: string): Promise<PitchDeck> {
  const trimmedIdea = idea.trim();
  try {
    const agentResult = await run(pitchDeckAgent, trimmedIdea);
    return parseRawoutput(agentResult.finalOutput);
  } catch (error) {
    if (isGuardrailError(error)) {
      const reason = getGuardrailReason(error);
      throw new PitchDeckGenerationError(reason);
    }
    throw error;
  }
}
