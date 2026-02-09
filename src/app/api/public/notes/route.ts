import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Note } from "@/lib/models/Note";

export async function GET(request: Request) {
  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || 50);

  const notes = await Note.find().sort({ updatedAt: -1 }).limit(limit);

  return NextResponse.json({
    notes: notes.map((note) => ({
      id: note._id.toString(),
      title: note.title,
      summary: note.summary ?? "",
      tags: note.tags ?? [],
      confidence: note.confidence ?? 0,
      updatedAt: note.updatedAt?.toISOString() ?? null,
    })),
  });
}
