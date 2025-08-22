
import { GoogleGenAI, Type } from "@google/genai";
import type { FileSystemNode, Diagnostic, DependencyReport, InspectedElement } from '../types';

let ai: GoogleGenAI | null = null;
let initError: string | null = "AI not configured. Please add your Gemini API Key in the Settings panel.";

/**
 * Initializes or updates the AI client with a new API key.
 * This function should be called from the main application component
 * whenever the API key changes.
 * @param key The Gemini API key, or null to deconfigure.
 */
export function setApiKey(key: string | null) {
  if (key) {
    try {
      ai = new GoogleGenAI({ apiKey: key });
      initError = null;
      // The key is managed in React state, which can persist to localStorage.
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error during AI initialization.";
      initError = `Failed to initialize AI with the provided key: ${message}`;
      ai = null;
    }
  } else {
    ai = null;
    initError = "AI not configured. Please add your Gemini API Key in the Settings panel.";
  }
}

const getAI = (): GoogleGenAI => {
  if (!ai || initError) {
    throw new Error(initError || "AI client is not available.");
  }
  return ai;
};


export async function* streamAIResponse(prompt: string): AsyncGenerator<string> {
    try {
        const ai = getAI();
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: `You are an expert pair programming assistant in a web-based IDE. Your response format depends entirely on the user's request.

**Scenario 1: The user asks to write, create, update, or modify code.**
In this case, you MUST ONLY output a single, raw JSON object. Do not include markdown fences (\`\`\`json) or any other text, conversation, or explanation before or after the JSON object. Your entire response must be the JSON object itself.

The JSON object must have this exact structure:
{
  "explanation": "A concise, well-formatted markdown string explaining the changes you made.",
  "actions": [
    {
      "action": "create" | "update",
      "path": "/path/to/the/file.js",
      "content": "The ENTIRE new content of the file."
    }
  ]
}

**Scenario 2: The user asks a general question, for an explanation, or anything that does not involve changing files.**
In this case, respond with a helpful, friendly answer in standard Markdown format. Do NOT use the JSON format for these requests.`,
            }
        });

        for await (const chunk of responseStream) {
            yield chunk.text;
        }

    } catch (error) {
        console.error("Error getting AI stream response:", error);
        yield `\n\n**AI Service Error:**\n${error instanceof Error ? error.message : 'An unknown error occurred.'}\n\nPlease check your API key in the Settings panel or review the browser console for more details.`;
    }
}


export const generateCodeForFile = async (userPrompt: string, fileName: string): Promise<string> => {
    try {
        const ai = getAI();
        const fullPrompt = `You are an expert programmer. A user wants to create a file named "${fileName}". 
Based on their request, generate the complete, production-ready code for this file. 
Do not add any conversational text, explanations, or markdown formatting like \`\`\` around the code. 
Only output the raw code for the file content.
User's request: "${userPrompt}"`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt
        });
        
        return response.text.trim();

    } catch (error) {
        console.error("Error generating file with AI:", error);
        throw error;
    }
};

export const getInlineCodeSuggestion = async (codeBeforeCursor: string): Promise<string> => {
    try {
        const ai = getAI();
        if (codeBeforeCursor.trim().length < 10) return "";

        const fullPrompt = `You are a code completion AI. Provide the next few lines of code based on the context.
Provide only the code that should be inserted after the cursor.
Do not repeat any of the code that was given to you.
Do not include any explanatory text or markdown formatting.
Your response must be ONLY the code completion.

Code before cursor:
---
${codeBeforeCursor}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
            config: { temperature: 0.2, maxOutputTokens: 100, thinkingConfig: { thinkingBudget: 0 } }
        });

        return response.text;

    } catch (error) {
        console.error("Error getting inline code suggestion:", error);
        return "";
    }
};

export interface AIFixResponse {
    filePath: string;
    fixedCode: string;
    explanation: string;
    detailedExplanation: string;
}

export const fixCodeWithAI = async (
    errorMessage: string,
    files: {path: string, content: string}[],
    entryPointFile?: string
): Promise<AIFixResponse> => {
    const ai = getAI();
    const fileContents = files.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n');
    const entryPointHint = entryPointFile ? `The execution entry point was: \`${entryPointFile}\`.\n` : '';

    const prompt = `A web app produced an error.
${entryPointHint}
Error:
\`\`\`
${errorMessage}
\`\`\`
Workspace source code:
${fileContents}

Analyze the error and the code. Determine which file is causing the error and correct the bug.
Provide a detailed, step-by-step explanation of the bug and the fix.
Provide your response as a JSON object.
Ensure "fixedCode" contains the complete content for the entire file.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    filePath: { type: Type.STRING },
                    fixedCode: { type: Type.STRING },
                    explanation: { type: Type.STRING, description: "A brief, one-sentence summary of the fix." },
                    detailedExplanation: { type: Type.STRING, description: "A detailed, step-by-step explanation of the original problem, the root cause, and how the new code fixes it. Use Markdown." },
                },
                required: ['filePath', 'fixedCode', 'explanation', 'detailedExplanation']
            }
        }
    });

    try {
        const result: AIFixResponse = JSON.parse(response.text.trim());
        if (!result.filePath || typeof result.fixedCode === 'undefined' || !result.detailedExplanation) {
            throw new Error("AI response is missing required fields.");
        }
        return result;
    } catch (e) {
        console.error("Failed to parse AI fix response:", response.text, e);
        throw new Error("AI returned an invalid response. Could not apply fix.");
    }
}

// --- NEW AI FEATURES ---

export const getSuggestedFix = async (fileContent: string, problem: Diagnostic, activeFile: string): Promise<string> => {
    const ai = getAI();
    const prompt = `You are an expert developer fixing a single line of code.
A linter has found an issue in the file \`${activeFile}\`:
Line ${problem.line}: ${problem.message}
Severity: ${problem.severity}

Here is the full code content:
\`\`\`
${fileContent}
\`\`\`

Based on the error, provide the single, corrected line of code for line ${problem.line}.
Do NOT provide explanations, context, or code fences. Your response must be ONLY the corrected line of code.
For example, if the original line is "console.log(myVar)" and the fix is to remove it, return an empty string. If the fix is to change it to "console.info(myVar)", return exactly that.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text; // Return the raw text which should be just the line
};

export const getCodeExplanation = async (code: string): Promise<string> => {
    const ai = getAI();
    const prompt = `Explain the following code snippet concisely. Format the response as Markdown. \n\n\`\`\`\n${code}\n\`\`\``;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
};

export const analyzeCodeForBugs = async (code: string): Promise<Omit<Diagnostic, 'source'>[]> => {
    const ai = getAI();
    const prompt = `Analyze the following code for potential bugs, logical errors, or anti-patterns.
Do not report stylistic issues. Focus on actual problems that could lead to runtime errors or incorrect behavior.
Respond with a JSON array of issues.

\`\`\`
${code}
\`\`\`
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            line: { type: Type.INTEGER },
                            startCol: { type: Type.INTEGER },
                            endCol: { type: Type.INTEGER },
                            message: { type: Type.STRING },
                            severity: { type: Type.STRING, enum: ['error', 'warning', 'info'] },
                        },
                        required: ['line', 'startCol', 'endCol', 'message', 'severity']
                    }
                }
            }
        });
        return JSON.parse(response.text.trim());
    } catch (error) {
        console.error("AI Bug Analysis failed:", error);
        return [];
    }
};

export const generateMermaidDiagram = async (code: string): Promise<string> => {
    const ai = getAI();
    const prompt = `Generate a Mermaid.js flowchart or graph diagram to visualize the logic of the following code.
Only output the raw Mermaid code inside a \`\`\`mermaid\`\`\` block. Do not include any other text or explanation.
Code:
\`\`\`
${code}
\`\`\``;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.replace(/```mermaid\n|```/g, '').trim();
};

export const generateTestFile = async (code: string, filePath: string): Promise<string> => {
    const ai = getAI();
    const prompt = `You are an expert in software testing. Generate a complete test file for the following code from \`${filePath}\`.
Use a modern testing framework like Jest or React Testing Library. Cover the main functionalities and edge cases.
Only output the raw code for the new test file. Do not add any conversational text or markdown formatting.
Code to test:
\`\`\`
${code}
\`\`\``;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.trim();
};

export const optimizeCss = async (css: string): Promise<string> => {
    const ai = getAI();
    const prompt = `Optimize the following CSS code. Combine selectors, remove redundancy, and improve performance where possible.
Only output the raw, optimized CSS code. Do not add any conversational text or markdown formatting.
CSS to optimize:
\`\`\`css
${css}
\`\`\``;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.trim();
};

export const generateCommitMessage = async (files: {path: string, content: string}[]): Promise<string> => {
    const ai = getAI();
    const fileContents = files.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n');
    const prompt = `Analyze the following workspace files and generate a descriptive, conventional commit message.
The message should start with a type (e.g., feat, fix, chore), followed by a concise summary.
\`\`\`
${fileContents}
\`\`\`
`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.trim();
};

export const generateRegex = async (description: string): Promise<string> => {
    const ai = getAI();
    const prompt = `Generate a JavaScript-compatible regular expression for the following description.
Only output the raw regex pattern. Do not include slashes, flags, or any other text.
Description: "${description}"`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.trim();
};

export const generateDocsForCode = async (code: string, filePath: string): Promise<string> => {
    const ai = getAI();
    const prompt = `Generate comprehensive Markdown documentation for the following file: \`${filePath}\`.
Explain the purpose of the file, its functions/classes, parameters, and return values.
\`\`\`
${code}
\`\`\``;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.trim();
};

export const generateTheme = async (description: string): Promise<Record<string, string>> => {
    const ai = getAI();
    const prompt = `Generate a set of CSS variables for a web IDE theme based on this description: "${description}".
Provide a JSON object with keys like "--text-primary", "--ui-panel-bg", "--accent-primary", etc., and their corresponding color values.
The required keys are: --text-primary, --text-secondary, --ui-panel-bg, --ui-panel-bg-heavy, --ui-border, --ui-hover-bg, --accent-primary.`;
     const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    '--text-primary': { type: Type.STRING }, '--text-secondary': { type: Type.STRING },
                    '--ui-panel-bg': { type: Type.STRING }, '--ui-panel-bg-heavy': { type: Type.STRING },
                    '--ui-border': { type: Type.STRING }, '--ui-hover-bg': { type: Type.STRING },
                    '--accent-primary': { type: Type.STRING },
                },
                 required: ['--text-primary', '--text-secondary', '--ui-panel-bg', '--ui-panel-bg-heavy', '--ui-border', '--ui-hover-bg', '--accent-primary']
            }
        }
    });
    return JSON.parse(response.text.trim());
};

export const migrateCode = async (code: string, from: string, to: string): Promise<string> => {
    const ai = getAI();
    const prompt = `You are an expert code migrator. Convert the following code from ${from} to ${to}.
Only output the raw, converted code. Do not add any conversational text or markdown formatting.
\`\`\`${from}
${code}
\`\`\``;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.trim();
};

export const generateCodeFromImage = async (base64Image: string, prompt: string): Promise<string> => {
    const ai = getAI();
    const imagePart = { inlineData: { mimeType: 'image/jpeg', data: base64Image } };
    const textPart = { text: `Generate the HTML and CSS code for the UI in this image. The user provides this hint: "${prompt}". Respond with a single HTML file containing a <style> tag for the CSS. Do not add any conversational text, explanations, or markdown formatting.` };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] }
    });
    return response.text.trim();
};

export const scaffoldProject = async (prompt: string): Promise<Record<string, string>> => {
    const ai = getAI();
    const fullPrompt = `You are a project scaffolding expert. Based on the user's prompt, generate a complete file and folder structure.
Respond with a JSON object where keys are the full file paths (e.g., "/src/components/Button.jsx") and values are the file content.
User's prompt: "${prompt}"`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text.trim());
};

export const analyzeDependencies = async (packageJsonContent: string): Promise<DependencyReport> => {
    const ai = getAI();
    const prompt = `Analyze this package.json content. For each dependency and devDependency, determine if it is outdated (assume today's date) or has known vulnerabilities.
Provide a brief summary for major version updates.
Respond with a JSON object matching the specified schema.
\`\`\`json
${packageJsonContent}
\`\`\``;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    dependencies: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT, properties: { name: { type: Type.STRING }, version: { type: Type.STRING }, latest: { type: Type.STRING }, status: { type: Type.STRING, enum: ['ok', 'outdated', 'vulnerable'] }, summary: { type: Type.STRING, description: 'Summary of changes if a major update is available.' } }, required: ['name', 'version', 'status']
                        }
                    },
                    devDependencies: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT, properties: { name: { type: Type.STRING }, version: { type: Type.STRING }, latest: { type: Type.STRING }, status: { type: Type.STRING, enum: ['ok', 'outdated', 'vulnerable'] }, summary: { type: Type.STRING, description: 'Summary of changes if a major update is available.' } }, required: ['name', 'version', 'status']
                        }
                    }
                }
            }
        }
    });
    return JSON.parse(response.text.trim());
};

export const generateCodeFromFigma = async (fileUrl: string, token: string, userPrompt: string): Promise<string> => {
    const ai = getAI();
    const prompt = `A user has provided a Figma file URL and an access token (for context, do not try to access it).
File URL: ${fileUrl}
User Prompt: "${userPrompt}"

Based on the user's prompt and the context of a modern web design, generate a single, complete HTML file with embedded CSS in a <style> tag that accurately represents the described design.
Focus on creating a clean, responsive, and semantic structure.
Only output the raw HTML code. Do not include any explanations or markdown formatting.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.trim();
};

export const reviewCode = async (code: string): Promise<Omit<Diagnostic, 'source'>[]> => {
    const ai = getAI();
    const prompt = `You are an expert senior software engineer performing a code review. Analyze the following code for issues related to quality, best practices, performance, security, and potential bugs.
Do not report stylistic issues like missing semicolons unless they cause functional problems. Focus on substantive issues.
Respond with a JSON array of review comments, where each comment is an object.

Code to review:
\`\`\`
${code}
\`\`\`
`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        line: { type: Type.INTEGER },
                        startCol: { type: Type.INTEGER, description: "The starting column, defaulting to 1 if not applicable." },
                        endCol: { type: Type.INTEGER, description: "The ending column, spanning the full line if not applicable." },
                        message: { type: Type.STRING, description: "Your detailed review comment for this line." },
                        severity: { type: Type.STRING, enum: ['error', 'warning', 'info'], description: "'error' for critical issues, 'warning' for suggestions, 'info' for minor notes." },
                    },
                    required: ['line', 'startCol', 'endCol', 'message', 'severity']
                }
            }
        }
    });
    return JSON.parse(response.text.trim());
};


export const deployProject = async (): Promise<{ url: string; success: boolean; message: string }> => {
    const ai = getAI();
    const prompt = `Simulate a successful deployment of a static web project. Generate a realistic-looking but fake deployment URL on a platform like Vercel or Netlify.
Respond with a JSON object containing a "url" and a "message".`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    url: { type: Type.STRING },
                    message: { type: Type.STRING },
                },
                required: ['url', 'message']
            }
        }
    });
    const result = JSON.parse(response.text.trim());
    return { ...result, success: true };
};

export const updateCssInProject = async (
    files: { path: string; content: string }[],
    selector: string,
    newStyles: Record<string, string>
): Promise<{ filePath: string, updatedCode: string }> => {
    const ai = getAI();
    const cssFiles = files.filter(f => f.path.endsWith('.css'));
    const htmlFilesWithStyle = files.filter(f => f.path.endsWith('.html') && f.content.includes('<style>'));
    
    let contextFiles = [...cssFiles, ...htmlFilesWithStyle];
    
    if (contextFiles.length === 0) {
        const firstHtmlFile = files.find(f => f.path.endsWith('.html'));
        if (!firstHtmlFile) {
            throw new Error("No CSS or HTML file found to update.");
        }
        contextFiles = [firstHtmlFile];
    }

    const fileContents = contextFiles.map(f => `--- FILE: ${f.path} ---\n${f.content}`).join('\n\n');
    const stylesToApply = JSON.stringify(newStyles, null, 2);

    const prompt = `You are an expert CSS refactoring tool. A user wants to apply new styles to an element with the selector \`${selector}\`.
The new styles are:
${stylesToApply}

Here are the relevant CSS/HTML files in the project:
${fileContents}

Your task is to intelligently update the correct file.
1.  **Prioritize existing rules:** Search all provided files to find the most specific existing rule for \`${selector}\`. This could be in an external stylesheet (.css) or an inline <style> tag within an HTML file.
2.  **Update the rule:** If a rule is found, update it with the new styles. If a property already exists, update its value. If it doesn't, add the new property. Preserve the rest of the file's content perfectly.
3.  **Create a new rule:** If no rule for \`${selector}\` exists, create a new one.
    *   If there is a \`.css\` file, add the new rule to the end of the most relevant one (e.g., \`style.css\`).
    *   If there are no \`.css\` files but an HTML file has a \`<style>\` tag, add the new rule inside that tag.
    *   If no file has a \`<style>\` tag, add a new \`<style>\` block inside the \`<head>\` of the most relevant HTML file (like \`index.html\`) and add the rule there.
4.  **Respond with JSON:** Provide a JSON object containing the path of the single file you chose to modify (\`filePath\`) and the complete, new content of that file (\`updatedCode\`).
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    filePath: { type: Type.STRING },
                    updatedCode: { type: Type.STRING },
                },
                required: ['filePath', 'updatedCode']
            }
        }
    });

    return JSON.parse(response.text.trim());
};

export const generateShellCommand = async (prompt: string): Promise<string> => {
    const ai = getAI();
    const fullPrompt = `You are an expert shell command assistant. A user wants to perform an action from the terminal. Based on their request, generate the corresponding shell command.
Only output the raw, executable command. Do not add any conversational text, explanations, or markdown formatting.
User's request: "${prompt}"`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt
    });

    return response.text.trim();
};
