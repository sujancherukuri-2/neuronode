import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Note } from "@/lib/models/Note";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");

  if (secret && secret !== provided) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const decayRate = Number(process.env.DECAY_RATE_PER_DAY || 0.015);
  const now = new Date();

  const notes = await Note.find();
  const updates = notes
    .map((note) => {
      const lastTouched = note.lastAccessedAt || note.updatedAt || note.createdAt;
      const days = (now.getTime() - lastTouched.getTime()) / MS_PER_DAY;
      if (days <= 0) return null;

      const currentConfidence = typeof note.confidence === "number" ? note.confidence : 0.9;
      const decayed = currentConfidence - days * decayRate;
      const nextConfidence = Math.max(0.1, Number(decayed.toFixed(4)));

      if (nextConfidence >= currentConfidence) return null;

      return {
        updateOne: {
          filter: { _id: note._id },
          update: { $set: { confidence: nextConfidence } },
        },
      };
    })
    .filter(Boolean);

  if (updates.length) {
    await Note.bulkWrite(updates as NonNullable<(typeof updates)[number]>[]);
  }

  return NextResponse.json({
    processed: notes.length,
    updated: updates.length,
    decayRate,
  });
}
