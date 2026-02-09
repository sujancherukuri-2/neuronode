import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = client ? client.getGenerativeModel({ model: modelName }) : null;

type SummaryResult = {
  summary: string;
  tags: string[];
};

type AnswerResult = {
  answer: string;
  sources: Array<{ id: string; title: string }>;
};

function safeJsonParse<T>(value: string, fallback: T): T {
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const sliced = trimmed.slice(start, end + 1);
      try {
        return JSON.parse(sliced) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

function buildFallbackAnswer(params: {
  question: string;
  notes: Array<{ id: string; title: string; content: string; summary?: string }>;
}): AnswerResult {
  const topNotes = params.notes.slice(0, 3);
  const stitched = topNotes
    .map((note) => {
      const raw = `${note.summary || ""}\n${note.content || ""}`.trim();
      if (!raw) return "";
      const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (!lines.length) return "";

      const expanded = lines
        .map((line) => {
          const cleaned = line.replace(/^[-•*]+\s*/, "");
          return `${cleaned}.`;
        })
        .join(" ");

      return `From your note "${note.title}": ${expanded}`;
    })
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 1200);

  return {
    answer: stitched
      ? `Based on your notes, here's a detailed explanation of "${params.question}":\n\n${stitched}\n\nIf you want deeper detail on any part, add more notes or ask a follow-up question.`
      : `I couldn't find a direct answer in the notes for "${params.question}". Try adding more context.`,
    sources: topNotes.map((note) => ({ id: note.id, title: note.title })),
  };
}

export async function summarizeAndTag(note: {
  title: string;
  content: string;
  insights?: string[];
}): Promise<SummaryResult> {
  if (!model) {
    const fallbackTags = note.title
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean)
      .slice(0, 5);

    const fallbackSummary = [note.content, ...(note.insights || [])].join("\n").slice(0, 180);

    return {
      summary: fallbackSummary,
      tags: fallbackTags,
    };
  }

  const fallbackSummary = [note.content, ...(note.insights || [])].join("\n").slice(0, 180);
  try {
    const prompt = `Summarize the note and suggest tags. Respond with JSON only: {"summary":"...","tags":["tag"]}.\n\nNote: ${JSON.stringify(
      {
        title: note.title,
        content: note.content,
        insights: note.insights || [],
      }
    )}`;

    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    });

    const content = response.response.text() || "";
    const result = safeJsonParse<SummaryResult>(content, {
      summary: fallbackSummary,
      tags: [],
    });

    return {
      summary: result.summary || fallbackSummary,
      tags: Array.isArray(result.tags) ? result.tags : [],
    };
  } catch {
    return {
      summary: fallbackSummary,
      tags: [],
    };
  }
}

export async function answerQuestion(params: {
  question: string;
  notes: Array<{ id: string; title: string; content: string; summary?: string }>;
}): Promise<AnswerResult> {
  if (!model) {
    return {
      answer: "Gemini is not configured. Add GEMINI_API_KEY to enable responses.",
      sources: params.notes.slice(0, 3).map((note) => ({ id: note.id, title: note.title })),
    };
  }

  try {
    const prompt = `You are an expert AI knowledge agent with deep domain expertise. Your role is to provide comprehensive, detailed, and insightful answers that go well beyond simple facts.

When answering:
1. Provide a thorough, multi-paragraph explanation with depth and nuance (at least 2 paragraphs).
2. Explain the topic in full sentences; do not just list keywords or bullet points from the notes.
3. Use the user's notes as anchors: expand on each idea with definitions, reasoning, and examples.
4. Include relevant examples, use cases, and real-world applications.
5. Add context, history, or background when helpful.
6. Be conversational yet professional, like an expert mentor.
7. If the notes are insufficient or unrelated, answer fully from your general knowledge instead of saying "not found".
8. For common definitions (e.g., HTML, web development), always provide a complete, standalone explanation.

Respond with JSON only: {"answer":"...","sources":[{"id":"...","title":"..."}]}

Question: ${params.question}

User's Knowledge Base (use when relevant, but do not limit the answer to it):
${params.notes
  .map(
    (note, index) =>
      `Note ${index + 1}:
Title: ${note.title}
Summary: ${note.summary || "-"}
Content: ${note.content}`
  )
  .join("\n\n")}`;

    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    });

    const content = response.response.text() || "";
    const result = safeJsonParse<AnswerResult>(content, {
      answer: "",
      sources: [],
    });

    if (!result.answer) {
      return buildFallbackAnswer(params);
    }

    return {
      answer: result.answer,
      sources: Array.isArray(result.sources) && result.sources.length
        ? result.sources
        : params.notes.slice(0, 3).map((note) => ({ id: note.id, title: note.title })),
    };
  } catch {
    return buildFallbackAnswer(params);
  }
}
