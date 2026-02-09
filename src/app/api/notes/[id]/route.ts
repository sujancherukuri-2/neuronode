import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { Note, type NoteDocument } from "@/lib/models/Note";
import type { HydratedDocument } from "mongoose";
import { summarizeAndTag } from "@/lib/ai";

const linkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

const noteUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
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

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();

  const { id } = await context.params;

  const note = await Note.findById(id);

  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  note.lastAccessedAt = new Date();
  await note.save();

  return NextResponse.json({ note: serialize(note) });
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();

  const { id } = await context.params;

  const body = await request.json();
  const parsed = noteUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const note = await Note.findById(id);

  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { title, content, insights, tags, links } = parsed.data;

  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;
  if (insights !== undefined) note.insights = insights;
  if (tags !== undefined) {
    note.tags = tags.map((tag) => tag.trim()).filter(Boolean);
  }
  if (links !== undefined) note.links = links;

  if (title !== undefined || content !== undefined || insights !== undefined) {
    const aiResult = await summarizeAndTag({
      title: note.title,
      content: note.content,
      insights: note.insights,
    });

    note.summary = aiResult.summary;
    note.tags = Array.from(
      new Set([...(note.tags || []), ...aiResult.tags.map((tag) => tag.trim())])
    ).filter(Boolean);
  }

  await note.save();

  return NextResponse.json({ note: serialize(note) });
}

export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();

  const { id } = await context.params;

  const note = await Note.findByIdAndDelete(id);

  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
