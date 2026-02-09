import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Note, type NoteDocument } from "@/lib/models/Note";
import type { HydratedDocument } from "mongoose";
import { summarizeAndTag } from "@/lib/ai";

// Disable static generation for this route
export const dynamic = 'force-dynamic';


const linkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

const noteSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  insights: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  links: z.array(linkSchema).optional(),
});

function serialize(note: HydratedDocument<NoteDocument>) {
  return {
    id: note._id.toString(),
    title: note.title,
    content: note.content,
    insights: note.insights ?? [],
    summary: note.summary ?? "",
    tags: note.tags ?? [],
    links: note.links ?? [],
    confidence: note.confidence ?? 0,
    lastAccessedAt: note.lastAccessedAt?.toISOString() ?? null,
    createdAt: note.createdAt?.toISOString() ?? null,
    updatedAt: note.updatedAt?.toISOString() ?? null,
  };
}

export async function GET(request: Request) {
  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") || 50);

  const notes = await Note.find().sort({ updatedAt: -1 }).limit(limit);

  return NextResponse.json({ notes: notes.map(serialize) });
}

export async function POST(request: Request) {
  await connectToDatabase();

  const body = await request.json();
  const parsed = noteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { title, content, insights = [], tags = [], links = [] } = parsed.data;
  const aiResult = await summarizeAndTag({ title, content, insights });

  const mergedTags = Array.from(
    new Set([...(tags || []), ...(aiResult.tags || [])].map((tag) => tag.trim()))
  ).filter(Boolean);

  const note = await Note.create({
    title,
    content,
    insights,
    summary: aiResult.summary,
    tags: mergedTags,
    links,
    lastAccessedAt: new Date(),
  });

  return NextResponse.json({ note: serialize(note) }, { status: 201 });
}
