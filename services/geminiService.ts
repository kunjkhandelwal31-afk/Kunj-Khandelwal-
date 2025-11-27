
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, Subject, QuestionType, TestConfig } from "../types";
import { SYLLABUS } from "../constants";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to distribute total count among active subjects
const distributeCount = (total: number, parts: number): number[] => {
  const base = Math.floor(total / parts);
  const remainder = total % parts;
  const distribution = new Array(parts).fill(base);
  for (let i = 0; i < remainder; i++) {
    distribution[i]++;
  }
  return distribution;
};

// Generate a smaller batch of questions
const generateBatch = async (
  subject: Subject,
  mcqCount: number,
  numCount: number,
  chapters: string[],
  difficulty: string
): Promise<Partial<Question>[]> => {
  const model = "gemini-2.5-flash";
  const totalBatch = mcqCount + numCount;
  
  const chaptersStr = chapters.length > 0 
    ? `Focus strictly on these chapters: ${chapters.join(", ")}` 
    : "Full Syllabus (Cover diverse important topics)";

  const prompt = `
    Generate ${totalBatch} JEE Mains questions for ${subject}.
    Breakdown: ${mcqCount} MCQs and ${numCount} Numerical (Integer Type).
    
    Source: JEE Mains PYQs (2019-2025).
    Chapters: ${chaptersStr}.
    Difficulty: ${difficulty}.
    
    Output strictly strictly strictly JSON.
    
    Math: Use LaTeX in single dollars ($x^2$).
    Diagrams: PRIORITIZE questions with diagrams (Target 30-40% of questions). 
    SVG Rules for 'diagramSvg':
    1. STYLE: Stroke="black", Fill="none", Text="black". (Background will be white).
    2. CIRCUITS: 
       - Resistors MUST be drawn as ZIG-ZAG lines using <polyline points="..."/> (e.g. up-down sharp peaks). DO NOT use rectangles.
       - Inductors as loops. Capacitors as parallel plates.
       - Batteries as parallel lines (long/short).
    3. TEXT: Use Unicode for greek letters (e.g. \u03A9 for Ohm, \u03B8 for Theta) inside <text> tags.
    
    Explanations: Keep them CONCISE (max 2-3 sentences) to save time.
    
    Structure:
    questions: [
      {
        text: "Question string...",
        options: ["A...", "B...", "C...", "D..."], (Only for MCQ)
        correctAnswer: "0-3 for MCQ, number string for Numerical",
        type: "MCQ" or "NUMERICAL",
        subject: "${subject}",
        chapter: "Chapter Name",
        year: "2024 Jan Shift 1",
        explanation: "Concise Explanation...",
        diagramSvg: "<svg viewBox='0 0 200 150' xmlns='http://www.w3.org/2000/svg'>...</svg>" (Optional)
      }
    ]
  `;

  const questionSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            type: { type: Type.STRING, enum: [QuestionType.MCQ, QuestionType.NUMERICAL] },
            subject: { type: Type.STRING, enum: [subject] },
            chapter: { type: Type.STRING },
            year: { type: Type.STRING },
            explanation: { type: Type.STRING },
            diagramSvg: { type: Type.STRING }
          },
          required: ["text", "correctAnswer", "type", "subject", "chapter", "year", "explanation"]
        }
      }
    }
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.5, // Lower temperature for faster, more deterministic output
      }
    });

    let jsonText = response.text || "{}";
    // Sanitize markdown
    jsonText = jsonText.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```$/, "");
    const parsed = JSON.parse(jsonText);
    let questions = parsed.questions || [];

    // Filter to ensure types match request
    const mcqs = questions.filter((q: any) => q.type === QuestionType.MCQ).slice(0, mcqCount);
    const nums = questions.filter((q: any) => q.type === QuestionType.NUMERICAL).slice(0, numCount);

    return [...mcqs, ...nums];
  } catch (error) {
    console.error(`Error generating batch for ${subject}:`, error);
    return []; 
  }
};

export const generateQuestions = async (config: TestConfig): Promise<Question[]> => {
  const activeSubjects = config.subjects;
  if (activeSubjects.length === 0) return [];

  // Calculate total needed per subject
  const counts = distributeCount(config.questionCount, activeSubjects.length);
  
  const difficultyPrompt = config.difficulty === 'Mixed'
    ? "Mixed Easy/Medium/Hard"
    : `Mostly ${config.difficulty}`;

  // Create a flattened list of promises (Batching Strategy)
  // We split large requests into chunks of ~10 questions max to allow parallel generation.
  // This drastically reduces wait time.
  const BATCH_SIZE = 10;
  const batchPromises: Promise<Partial<Question>[]>[] = [];

  activeSubjects.forEach((sub, idx) => {
    const subTotal = counts[idx];
    if (subTotal === 0) return;

    // Determine strict split (80% MCQ, 20% Numerical)
    const totalMcq = Math.max(1, Math.floor(subTotal * 0.8));
    const totalNum = Math.max(0, subTotal - totalMcq);

    let subChapters: string[] = [];
    if (config.chapters.length > 0) {
      const syllabusChapters = SYLLABUS[sub];
      subChapters = config.chapters.filter(c => syllabusChapters.includes(c));
      // If chapters selected but none match this subject, skip this subject
      if (subChapters.length === 0 && config.chapters.length > 0) return; 
    }

    // Split MCQs into batches
    let remainingMcq = totalMcq;
    while (remainingMcq > 0) {
      const currentBatchSize = Math.min(remainingMcq, BATCH_SIZE);
      batchPromises.push(generateBatch(sub, currentBatchSize, 0, subChapters, difficultyPrompt));
      remainingMcq -= currentBatchSize;
    }

    // Split Numericals into batches
    let remainingNum = totalNum;
    while (remainingNum > 0) {
      const currentBatchSize = Math.min(remainingNum, BATCH_SIZE);
      batchPromises.push(generateBatch(sub, 0, currentBatchSize, subChapters, difficultyPrompt));
      remainingNum -= currentBatchSize;
    }
  });

  try {
    // Fire all batches in parallel
    const results = await Promise.all(batchPromises);
    
    // Flatten and assign IDs
    const allQuestions = results.flat().map((q, idx) => ({
      ...q,
      id: `q-${Date.now()}-${idx}`,
      subject: q.subject || activeSubjects[0],
      type: q.type || QuestionType.MCQ,
      text: q.text || "Question generation failed.",
      correctAnswer: q.correctAnswer || "0",
      explanation: q.explanation || "No explanation provided."
    } as Question));
    
    return allQuestions;

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("Failed to generate test. Please check your connection and try again.");
  }
};
