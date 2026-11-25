export const topics = [
  ["cs.AI", "Artificial intelligence"], ["cs.LG", "Machine learning"], ["cs.CL", "Computation & language"],
  ["cs.CV", "Computer vision"], ["cs.CR", "Cryptography & security"], ["cs.SE", "Software engineering"],
  ["cs.HC", "Human-computer interaction"], ["cs.RO", "Robotics"], ["cs.OS", "Operating systems"], ["autonomous", "Autonomous systems"], ["cs.DB", "Databases"],
  ["cs.DC", "Distributed computing"], ["cs.PL", "Programming languages"], ["cs.IR", "Information retrieval"],
  ["cs.NE", "Neural & evolutionary computing"], ["cs.SY", "Systems & control"], ["cs.TH", "Theory"],
] as const;

export const topicName = (code: string) =>
  code === "eess.SY" ? "Systems & control"
    : code === "cs.CC" ? "Theory"
      : topics.find(([id]) => id === code)?.[1] || code;

export const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const compactAuthors = (authors: string[]) => {
  const visible = authors.slice(0, 2).join(", ") || "Authors";
  const remaining = authors.length - 2;
  return remaining > 0 ? `${visible} +${remaining} more` : visible;
};

export const message = (error: unknown) => error instanceof Error ? error.message : "Something went wrong.";