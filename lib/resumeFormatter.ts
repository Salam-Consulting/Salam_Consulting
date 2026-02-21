import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun
} from "docx";
import {
  cacheDirectory,
  downloadAsync,
  EncodingType,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import {
  extractText as extractPdfNative,
  isAvailable as isPdfExtractAvailable,
} from "expo-pdf-text-extract";
import * as Sharing from "expo-sharing";
import JSZip from "jszip";
import { Platform } from "react-native";
import { extractTextFromPdfWeb } from "./pdfExtractor";


// ─── Types ────────────────────────────────────────────────────────────────────

export type ParsedResume = {
  name: string;
  location: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
  portfolio: string;
  education: EducationEntry[];
  skills: string;
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
};

export type EducationEntry = {
  degree: string;
  institution: string;
  date: string;
  gpa?: string;
};

export type ExperienceEntry = {
  company: string;
  position: string;
  location: string;
  date: string;
  bullets: string[];
};

export type ProjectEntry = {
  name: string;
  technologies: string;
  bullets: string[];
};


// ─── File helpers ─────────────────────────────────────────────────────────────

async function loadDocxZip(uri: string): Promise<JSZip> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    const response = await fetch(uri, { headers: { Accept: "*/*" } });
    if (!response.ok)
      throw new Error(`Failed to fetch document: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return JSZip.loadAsync(arrayBuffer);
  }
  const base64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
  return JSZip.loadAsync(base64, { base64: true });
}

async function extractTextFromPDF(uri: string): Promise<string> {
  let localUri = uri;
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    if (!cacheDirectory)
      throw new Error("Cache directory not available on this platform");
    const filename = `temp_${Date.now()}.pdf`;
    const downloadPath = `${cacheDirectory}${filename}`;
    const result = await downloadAsync(uri, downloadPath);
    localUri = result.uri;
  }
  if (isPdfExtractAvailable()) {
    try {
      const text = await extractPdfNative(localUri);
      return text || "";
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("expo-pdf-text-extract error:", msg);
    }
  }
  if (Platform.OS === "web") {
    return extractTextFromPdfWeb(uri);
  }
  throw new Error(
    "PDF formatting requires a development build. Run `npx expo run:android` or `npx expo run:ios`."
  );
}

async function extractTextFromDocx(uri: string): Promise<string> {
  try {
    const zip = await loadDocxZip(uri);
    const xmlTargets = ["word/document.xml", "word/header1.xml", "word/footer1.xml"];
    const xmlParts: string[] = [];
    for (const target of xmlTargets) {
      const file = zip.file(target);
      if (!file) continue;
      xmlParts.push(await file.async("string"));
    }
    if (xmlParts.length === 0) throw new Error("Invalid .docx file structure");
    return xmlParts
      .map(extractTextFromWordXml)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch (error) {
    console.error("Word extraction error:", error);
    throw new Error("Failed to extract text from Word document");
  }
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTextFromWordXml(xml: string): string {
  const withBreaks = xml
    .replace(/<w:p\b[^>]*>/g, "\n")
    .replace(/<w:br\b[^>]*\/>/g, "\n")
    .replace(/<w:tab\b[^>]*\/>/g, "\t");
  const textOnly = withBreaks
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n");
  return decodeXmlEntities(textOnly);
}

export async function extractTextFromDocument(
  uri: string,
  mimeType: string
): Promise<string> {
  const isPdf =
    mimeType === "application/pdf" || uri.toLowerCase().endsWith(".pdf");
  const isWord =
    mimeType === "application/msword" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    uri.toLowerCase().endsWith(".docx");
  if (isPdf) return extractTextFromPDF(uri);
  if (isWord) return extractTextFromDocx(uri);
  throw new Error(
    "Unsupported file type. Please use PDF or Word (.docx) documents."
  );
}


// ─── Parser helpers ───────────────────────────────────────────────────────────

const SECTION_HEADERS = [
  "education",
  "technical skills",
  "skills",
  "professional experience",
  "work experience",
  "experience",
  "technical projects",
  "projects",
];

// Matches: "May 2026", "April 2025 – December 2025", "June 2025 - Present"
const DATE_RE =
  /((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}(\s*[-–]\s*(Present|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}))?)/i;

function isSectionHeader(line: string): boolean {
  return SECTION_HEADERS.includes(line.toLowerCase());
}

function extractDateFromLine(line: string): { before: string; date: string } {
  const match = line.match(DATE_RE);
  if (!match) return { before: line, date: "" };
  const date = match[0].trim();
  const before = line
    .slice(0, match.index)
    .replace(/\s{2,}/g, " ")
    .replace(/[\s()\-–]+$/, "")  // ← also strips trailing ( ) characters
    .trim();
  return { before, date };
}


// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseResumeText(text: string): ParsedResume {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const resume: ParsedResume = {
    name: "",
    location: "",
    phone: "",
    email: "",
    linkedin: "",
    github: "",
    portfolio: "",
    education: [],
    skills: "",
    experience: [],
    projects: [],
  };

  let currentSection = "";
  let currentExperience: ExperienceEntry | null = null;
  let currentProject: ProjectEntry | null = null;
  let currentEducation: EducationEntry | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // ── Name
    if (i === 0) {
      resume.name = line;
      continue;
    }

    // ── Contact line
    if (i === 1 && line.includes("|")) {
      const parts = line.split("|").map((p) => p.trim());
      resume.location  = parts[0] ?? "";
      resume.phone     = parts[1] ?? "";
      resume.email     = parts[2] ?? "";
      resume.linkedin  = parts[3] ?? "";
      resume.github    = parts[4] ?? "";
      resume.portfolio = parts[5] ?? "";
      continue;
    }

    // ── Section headers — flush open entries first
    if (isSectionHeader(line)) {
      if (currentEducation)  { resume.education.push(currentEducation);   currentEducation = null; }
      if (currentExperience) { resume.experience.push(currentExperience); currentExperience = null; }
      if (currentProject)    { resume.projects.push(currentProject);      currentProject = null; }

      if (lower === "education")                                    currentSection = "education";
      else if (lower === "technical skills" || lower === "skills") currentSection = "skills";
      else if (lower.includes("experience"))                        currentSection = "experience";
      else if (lower.includes("projects"))                          currentSection = "projects";
      continue;
    }

    // ─── EDUCATION
    if (currentSection === "education") {
      const isBullet = line.startsWith("•") || line.startsWith("-");
      if (isBullet) continue;

      if (/^gpa/i.test(line)) {
        if (currentEducation) currentEducation.gpa = line;
        continue;
      }

      // Standalone date line
      if (
        currentEducation &&
        !currentEducation.date &&
        DATE_RE.test(line) &&
        line.replace(DATE_RE, "").replace(/[-–\s]/g, "").length === 0
      ) {
        currentEducation.date = line.trim();
        continue;
      }

      const isEduLine =
        lower.includes("university") ||
        lower.includes("college") ||
        lower.includes("bachelor") ||
        lower.includes("associate") ||
        lower.includes("master") ||
        lower.includes("degree");

      if (isEduLine) {
        if (currentEducation) resume.education.push(currentEducation);
        const { before, date } = extractDateFromLine(line);
        const cleaned = before.replace(/[-–]+$/, "").trim();
        const commaIdx = cleaned.indexOf(",");
        const degree      = commaIdx !== -1 ? cleaned.slice(0, commaIdx).trim() : cleaned;
        const institution = commaIdx !== -1 ? cleaned.slice(commaIdx + 1).trim() : "";
        currentEducation = { degree, institution, date };
      }
      continue;
    }

    // ─── SKILLS
    if (currentSection === "skills") {
      resume.skills += (resume.skills ? " " : "") + line;
      continue;
    }

    // ─── EXPERIENCE
    if (currentSection === "experience") {
      const isBullet = line.startsWith("•") || line.startsWith("-");

      if (isBullet) {
        if (currentExperience) {
          currentExperience.bullets.push(line.replace(/^[•\-]\s*/, "").trim());
        }
        continue;
      }

      const { before: company, date } = extractDateFromLine(line);

      if (date) {
        if (currentExperience) resume.experience.push(currentExperience);

        const nextLine      = lines[i + 1] ?? "";
        const nextHasDate   = DATE_RE.test(nextLine);
        const nextIsBullet  = nextLine.startsWith("•") || nextLine.startsWith("-");
        const nextIsSection = isSectionHeader(nextLine);

        let position = "";
        let location = "";

        if (nextLine && !nextHasDate && !nextIsBullet && !nextIsSection) {
          const subParts = nextLine.split(/\s{3,}|\s+[-–]\s+/);
          position = subParts[0].trim();
          location = subParts.length > 1 ? subParts[subParts.length - 1].trim() : "";
          i++;
        }

        currentExperience = { company, position, location, date, bullets: [] };
        continue;
      }

      if (currentExperience && line.length > 20) {
        currentExperience.bullets.push(line);
      }
      continue;
    }

    // ─── PROJECTS
    if (currentSection === "projects") {
      const isBullet = line.startsWith("•") || line.startsWith("-");

      if (isBullet) {
        if (currentProject) {
          currentProject.bullets.push(line.replace(/^[•\-]\s*/, "").trim());
        }
        continue;
      }

      if (currentProject) resume.projects.push(currentProject);

      const match = line.match(/^(.+?)\s*\((.+)\)\s*$/);
      if (match) {
        currentProject = {
          name: match[1].trim(),
          technologies: match[2].trim(),
          bullets: [],
        };
      } else {
        currentProject = { name: line, technologies: "", bullets: [] };
      }
      continue;
    }
  }

  // Flush remaining open entries
  if (currentEducation)  resume.education.push(currentEducation);
  if (currentExperience) resume.experience.push(currentExperience);
  if (currentProject)    resume.projects.push(currentProject);

  return resume;
}


// ─── Text formatter ───────────────────────────────────────────────────────────

export function formatResumeToTemplate(resume: ParsedResume): string {
  let output = "";

  output += `${resume.name}\n`;

  const contactParts = [
    resume.location,
    resume.phone,
    resume.email,
    resume.linkedin,
    resume.github,
    resume.portfolio,
  ].filter(Boolean);
  if (contactParts.length > 0) output += contactParts.join(" | ") + "\n";

  output += "\nEducation\n";
  resume.education.forEach((edu) => {
    const degreeInstitution = edu.institution
      ? `${edu.degree}, ${edu.institution}`
      : edu.degree;
    output += `${degreeInstitution}\t${edu.date}\n`;
    if (edu.gpa) output += `${edu.gpa}\n`;
  });

  if (resume.skills) {
    output += "\nTechnical Skills\n";
    output += resume.skills + "\n";
  }

  if (resume.experience.length > 0) {
    output += "\nProfessional Experience\n";
    resume.experience.forEach((exp) => {
      output += `${exp.company}\t${exp.date}\n`;
      if (exp.position || exp.location)
        output += `${exp.position}\t${exp.location}\n`;
      exp.bullets.forEach((b) => (output += `• ${b}\n`));
    });
  }

  if (resume.projects.length > 0) {
    output += "\nTechnical Projects\n";
    resume.projects.forEach((proj) => {
      const header = proj.technologies
        ? `${proj.name} (${proj.technologies})`
        : proj.name;
      output += `${header}\n`;
      proj.bullets.forEach((b) => (output += `• ${b}\n`));
    });
  }

  return output;
}


// ─── DOCX builder ─────────────────────────────────────────────────────────────

function sectionHeader(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, allCaps: true, size: 22, font: "Times New Roman" })],
    spacing: { before: 200, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000", space: 1 },
    },
  });
}

function rightTabParagraph(
  leftRuns: TextRun[],
  rightText: string
): Paragraph {
  return new Paragraph({
    children: [
      ...leftRuns,
      new TextRun({ text: "\t" + rightText, font: "Times New Roman", size: 22 }),
    ],
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    spacing: { after: 40 },
  });
}

export function buildResumeDocx(resume: ParsedResume): Document {
  const contactParts = [
    resume.location,
    resume.phone,
    resume.email,
    resume.linkedin,
    resume.github,
    resume.portfolio,
  ].filter(Boolean);

  const children: Paragraph[] = [];

  // ── Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: resume.name,
          bold: true,
          size: 36,
          font: "Times New Roman",
        }),
      ],
    })
  );

  // ── Contact
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: contactParts.join(" | "),
          size: 20,
          font: "Times New Roman",
        }),
      ],
    })
  );

  // ── EDUCATION
  children.push(sectionHeader("Education"));

  resume.education.forEach((edu) => {
    children.push(
      rightTabParagraph(
        [
          new TextRun({ text: edu.degree, bold: true, size: 22, font: "Times New Roman" }),
          new TextRun({ text: edu.institution ? `, ${edu.institution}` : "", italics: true, size: 22, font: "Times New Roman" }),
        ],
        edu.date
      )
    );
    if (edu.gpa) {
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: edu.gpa, size: 20, font: "Times New Roman" })],
        })
      );
    }
  });

  // ── TECHNICAL SKILLS
  if (resume.skills) {
    children.push(sectionHeader("Technical Skills"));
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [new TextRun({ text: resume.skills, size: 22, font: "Times New Roman" })],
      })
    );
  }

  // ── PROFESSIONAL EXPERIENCE
  if (resume.experience.length > 0) {
    children.push(sectionHeader("Professional Experience"));

    resume.experience.forEach((exp) => {
      // Company (bold left) — Date (bold right)
      children.push(
        rightTabParagraph(
          [new TextRun({ text: exp.company, bold: true, size: 22, font: "Times New Roman" })],
          exp.date
        )
      );

      // Position (italic left) — Location (italic right)
      if (exp.position || exp.location) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: exp.position, italics: true, size: 22, font: "Times New Roman" }),
              new TextRun({ text: "\t" + exp.location, italics: true, size: 22, font: "Times New Roman" }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            spacing: { after: 40 },
          })
        );
      }

      // Bullets
      exp.bullets.forEach((bullet) => {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: bullet, size: 22, font: "Times New Roman" })],
          })
        );
      });

      // Spacer between entries
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    });
  }

  // ── TECHNICAL PROJECTS
  if (resume.projects.length > 0) {
    children.push(sectionHeader("Technical Projects"));

    resume.projects.forEach((proj) => {
      const titleRuns: TextRun[] = [
        new TextRun({ text: proj.name, bold: true, size: 22, font: "Times New Roman" }),
      ];
      if (proj.technologies) {
        titleRuns.push(
          new TextRun({
            text: ` (${proj.technologies})`,
            italics: true,
            bold: false,
            size: 22,
            font: "Times New Roman",
          })
        );
      }

      children.push(
        new Paragraph({
          children: titleRuns,
          spacing: { after: 40 },
        })
      );

      proj.bullets.forEach((bullet) => {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: bullet, size: 22, font: "Times New Roman" })],
          })
        );
      });

      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    });
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,    // 0.5in
              bottom: 720,
              left: 1080,  // 0.75in
              right: 1080,
            },
          },
        },
        children,
      },
    ],
  });
}


// ─── Save as DOCX ─────────────────────────────────────────────────────────────

export async function saveResumeAsDocx(resume: ParsedResume): Promise<void> {
  const doc = buildResumeDocx(resume);

  const base64 = await Packer.toBase64String(doc);

  const safeName = resume.name.replace(/\s+/g, "_") || "Resume";
  const fileUri = `${cacheDirectory}${safeName}_Resume.docx`;

  await writeAsStringAsync(fileUri, base64, {
    encoding: EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Sharing is not available on this device");

  await Sharing.shareAsync(fileUri, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    dialogTitle: "Save Resume",
    UTI: "org.openxmlformats.wordprocessingml.document",
  });
}


// ─── Main entry point ─────────────────────────────────────────────────────────

export async function generateFormattedResume(
  fileUri: string,
  mimeType: string
): Promise<string> {
  const extractedText = await extractTextFromDocument(fileUri, mimeType);

  if (!extractedText || extractedText.trim().length === 0) {
    throw new Error(
      "No text could be extracted. The document may be scanned (image-based) or protected."
    );
  }

  const parsedResume = parseResumeText(extractedText);

  const hasContent =
    parsedResume.name ||
    parsedResume.education.length > 0 ||
    parsedResume.experience.length > 0 ||
    parsedResume.skills ||
    parsedResume.projects.length > 0;

  return hasContent ? formatResumeToTemplate(parsedResume) : extractedText;
}
