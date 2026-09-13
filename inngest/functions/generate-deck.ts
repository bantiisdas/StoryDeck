import { prisma } from "@/lib/db";
import { inngest } from "../client";
import { NonRetriableError } from "inngest";
import { DECKSTATUS } from "@/app/generated/prisma/enums";
import {
  generatePitchDeck,
  PitchDeckGenerationError,
} from "@/lib/agents/generate-pitch-deck";
import { generateSlideImage } from "@/lib/openai";
import { uploadSlideImage } from "@/lib/imageKit";

export const generateDeck = inngest.createFunction(
  {
    id: "generate-deck",
    triggers: [{ event: "deck/generate" }],
  },
  async ({ event, step }) => {
    const { deckId } = event.data;

    const deck = await step.run("load-deck", async () => {
      const record = await prisma.deck.findUnique({ where: { id: deckId } });
      if (!record) {
        throw new NonRetriableError(`Failed to load deck ${deckId}`);
      }
      return record;
    });

    try {
      await step.run("mark-deck-generating", async () => {
        await prisma.deck.update({
          where: { id: deckId },
          data: { status: DECKSTATUS.GENERATING },
        });
      });

      const pitchDeck = await step.run("run-pitch-deck-agent", async () => {
        return generatePitchDeck(deck.idea);
      });

      await step.run("save-deck-title", async () => {
        await prisma.deck.update({
          where: { id: deckId },
          data: { title: pitchDeck.deckTitle },
        });
      });

      for (let index = 0; index < pitchDeck.slides.length; index++) {
        const slide = pitchDeck.slides[index];
        const order = index + 1;

        const imageUrl = await step.run(`image-${order}`, async () => {
          const imageBuffer = await generateSlideImage(slide.imagePrompt);
          const fileName = `deck-${deckId}-slide-${order}.png`;
          return uploadSlideImage(imageBuffer, fileName);
        });

        await step.run(`save-slide-${order}`, async () => {
          await prisma.slide.create({
            data: {
              deckId,
              title: slide.title,
              content: slide.content,
              imagePrompt: slide.imagePrompt,
              order,
              imageUrl,
            },
          });
        });
      }

      await step.run("mark-complete", async () => {
        await prisma.deck.update({
          where: { id: deckId },
          data: { status: DECKSTATUS.COMPLETE },
        });
      });

      return { deckId, slideCount: pitchDeck.slides.length };
    } catch (error) {
      const message =
        error instanceof PitchDeckGenerationError
          ? error.message
          : error instanceof Error
            ? error.message
            : "unknown error during deck generation";

      await step.run("mark-failed", async () => {
        await prisma.deck.update({
          where: { id: deckId },
          data: { status: DECKSTATUS.FAILED, errorMessage: message },
        });
      });

      if (
        error instanceof PitchDeckGenerationError ||
        error instanceof NonRetriableError
      ) {
        throw new NonRetriableError(message);
      }

      throw error;
    }
  },
);
