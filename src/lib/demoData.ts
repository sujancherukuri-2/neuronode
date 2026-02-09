export const demoNotes = [
  {
    id: "demo-1",
    title: "WEBDEV",
    content:
      "Web development covers building websites and web applications using front-end and back-end technologies. HTML provides structure, CSS handles styling, and JavaScript powers interactivity. Full stack development combines front-end and server-side work, often with frameworks and databases.",
    insights: [
      "Tech stacks define the tools used to build and deploy web apps.",
      "Full stack work includes UI, APIs, and databases.",
      "MERN (MongoDB, Express, React, Node) is a common stack for web apps.",
    ],
    summary: "Notes on web development concepts, stacks, and full stack workflows.",
    tags: ["web", "html", "css", "javascript", "mern"],
    links: [
      {
        label: "MDN Web Docs",
        url: "https://developer.mozilla.org/",
      },
    ],
    confidence: 0.9,
    updatedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  },
  {
    id: "demo-2",
    title: "AI WORKFLOW",
    content:
      "AI development involves data collection, model training, evaluation, and deployment. LLM systems include prompt design, retrieval of context, and validation of outputs. Monitoring and feedback loops improve quality over time.",
    insights: [
      "LLM apps need guardrails and reliable sources.",
      "Prompting shapes the tone and completeness of responses.",
    ],
    summary: "High-level view of AI development and LLM workflow stages.",
    tags: ["ai", "llm", "prompting"],
    links: [],
    confidence: 0.82,
    updatedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  },
];

export function buildDemoAnswer(
  question: string,
  notes: Array<{ id: string; title: string; summary?: string; content: string }>
) {
  const q = question.toLowerCase();
  let answer = "";

  if (q.includes("html")) {
    answer =
      "HTML (HyperText Markup Language) is the standard language used to structure content on the web. It defines the elements of a page such as headings, paragraphs, images, links, forms, and other building blocks that browsers render into a visual layout. HTML is not a programming language; it is a markup language that describes meaning and structure so browsers and assistive technologies can interpret content correctly.\n\n" +
      "In practice, HTML works together with CSS and JavaScript. CSS controls the visual presentation (colors, layout, typography), while JavaScript adds behavior and interactivity (menus, animations, data fetching). Modern development often uses component frameworks like React or Vue, but they still output HTML under the hood, which makes HTML foundational for accessibility, SEO, and cross-device compatibility.";
  } else if (q.includes("web development") || q.includes("webdev")) {
    answer =
      "Web development is the process of creating websites and web applications that run in a browser. It spans front-end development (the user interface built with HTML, CSS, and JavaScript) and back-end development (servers, APIs, databases, and authentication). A full stack developer works across both layers, connecting the UI to data and business logic.\n\n" +
      "Teams typically choose a tech stack such as MERN (MongoDB, Express, React, Node) or alternatives like Django, Rails, or .NET. The goal is to deliver fast, secure, and accessible experiences. Beyond writing code, web development includes performance optimization, deployment, monitoring, and continuous improvement based on user feedback.";
  } else {
    const noteHints = notes
      .slice(0, 2)
      .map((note) => note.summary || note.content)
      .filter(Boolean)
      .join(" ");

    answer =
      "Here is a clear explanation based on general knowledge, with references to your notes where relevant.\n\n" +
      (noteHints
        ? `From your notes: ${noteHints}\n\n`
        : "") +
      "If you want a deeper dive on a specific angle, ask a follow-up and I will expand the explanation with examples and practical guidance.";
  }

  return {
    answer,
    sources: notes.slice(0, 2).map((note) => ({ id: note.id, title: note.title })),
  };
}
