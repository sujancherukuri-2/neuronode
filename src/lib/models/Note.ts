import { Schema, model, models } from "mongoose";

export type NoteLink = {
  label: string;
  url: string;
};

export type NoteDocument = {
  title: string;
  content: string;
  insights: string[];
  summary?: string;
  tags: string[];
  links: NoteLink[];
  confidence: number;
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const noteSchema = new Schema<NoteDocument>(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    insights: { type: [String], default: [] },
    summary: { type: String, trim: true },
    tags: { type: [String], default: [] },
    links: {
      type: [
        {
          label: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
      default: [],
    },
    confidence: { type: Number, default: 0.9, min: 0, max: 1 },
    lastAccessedAt: { type: Date },
  },
  { timestamps: true }
);

noteSchema.index({
  title: "text",
  content: "text",
  insights: "text",
  tags: "text",
  summary: "text",
});

export const Note = models.Note || model<NoteDocument>("Note", noteSchema);
