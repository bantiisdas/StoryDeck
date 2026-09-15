import { DECKSTATUS } from "@/app/generated/prisma/enums";
import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createDeckSchema = z.object({
  idea: z
    .string()
    .trim()
    .min(20, "Deck Idea should be atleast 20 characters long"),
});

//List all Decks - newest first
export async function GET() {
  const decks = await prisma.deck.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { slides: true } },
    },
  });

  return NextResponse.json(
    decks.map((deck) => ({
      id: deck.id,
      idea: deck.idea,
      title: deck.title,
      status: deck.status,
      errorMessage: deck.errorMessage,
      slideCount: deck._count.slides,
      createdAt: deck.createdAt,
      updatedAt: deck.updatedAt,
    })),
    { headers: { "Cache-Control": "no-store" } },
  );
}

//create a deck & start background generation
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid json body" }, { status: 400 });
  }

  const parsed = createDeckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const deck = await prisma.deck.create({
    data: { idea: parsed.data.idea, status: DECKSTATUS.PENDING },
  });

  try {
    await inngest.send({ name: "deck/generate", data: { deckId: deck.id } });
  } catch {
    await prisma.deck.update({
      where: { id: deck.id },
      data: {
        status: DECKSTATUS.FAILED,
        errorMessage: "Failed to start generation",
      },
    });
    return NextResponse.json(
      { error: "Failed to start generation" },
      { status: 502 },
    );
  }

  revalidatePath("/decks");

  return NextResponse.json(
    { id: deck.id, status: deck.status },
    { status: 201 },
  );
}
