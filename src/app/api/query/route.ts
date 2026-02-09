import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Note } from "@/lib/models/Note";
import { answerQuestion } from "@/lib/ai";

const querySchema = z.object({
  question: z.string().min(1),
});

async function findRelevantNotes(question: string) {
  try {
    return await Note.find(
      { $text: { $search: question } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(8);
  } catch {
    return await Note.find({
      $or: [
        { title: new RegExp(question, "i") },
        { content: new RegExp(question, "i") },
        { summary: new RegExp(question, "i") },
      ],
    })
      .sort({ updatedAt: -1 })
      .limit(8);
  }
}

export async function POST(request: Request) {
  await connectToDatabase();

  const body = await request.json();
  const parsed = querySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const notes = await findRelevantNotes(parsed.data.question);

  const answer = await answerQuestion({
    question: parsed.data.question,
    notes: notes.map((note) => ({
      id: note._id.toString(),
      title: note.title,
      content: note.content,
      summary: note.summary,
    })),
  });

  return NextResponse.json({
    answer: answer.answer,
    sources: answer.sources,
    matches: notes.map((note) => ({
      id: note._id.toString(),
      title: note.title,
      summary: note.summary ?? "",
      confidence: note.confidence ?? 0,
    })),
  });
}
