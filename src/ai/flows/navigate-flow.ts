
'use server';

/**
 * @fileOverview A navigation agent that determines where the user wants to go.
 *
 * - navigate - A function that handles the navigation logic.
 * - NavigateInput - The input type for the navigate function.
 * - NavigateOutput - The return type for the navigate function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const NavigateInputSchema = z.string();
export type NavigateInput = z.infer<typeof NavigateInputSchema>;

const NavigateOutputSchema = z.object({
    path: z.string().describe("The URL path the user should be redirected to. Should be one of the available tools.")
});
export type NavigateOutput = z.infer<typeof NavigateOutputSchema>;

const availablePages = [
    { name: "Arbeitsplätze", path: "/arbeitsplaetze", description: "Zeigt eine Übersicht aller Arbeitsplätze an." },
    { name: "DNA", path: "/dna", description: "Zeigt die DNA-Ansicht der aktiven Merkmale." },
    { name: "Events", path: "/events", description: "Zeigt die Liste der Shopfloor-Events an oder erlaubt das Erstellen eines neuen Events." },
    { name: "Incidents", path: "/incidents", description: "Zeigt die Liste der Incidents an oder erlaubt das Erstellen eines neuen Incidents." },
    { name: "Control Plan", path: "/cp", description: "Zeigt die Übersicht der Control Plans (Lenkungspläne)." },
    { name: "Notizen", path: "/notes", description: "Zeigt die Notizenseite an, auf der Notizen erstellt und angezeigt werden können." },
    { name: "Plan-Ideen", path: "/lenkungsplan", description: "Zeigt die Seite für Plan-Ideen und Entwürfe (Lenkungsplan-Rohfassungen)." },
    { name: "Admin", path: "/admin/users", description: "Zeigt die Admin-Konsole zur Benutzerverwaltung." },
    { name: "Startseite", path: "/", description: "Die Haupt- oder Startseite der Anwendung." },
];

const navigationTool = ai.defineTool(
    {
        name: 'navigateToPage',
        description: 'Navigiert den Benutzer zu einer bestimmten Seite der Anwendung.',
        inputSchema: z.object({
            pageName: z.enum(availablePages.map(p => p.name) as [string, ...string[]]).describe("Der Name der Seite, zu der navigiert werden soll."),
        }),
        outputSchema: z.string().describe("Der URL-Pfad der Zielseite."),
    },
    async (input) => {
        const page = availablePages.find(p => p.name === input.pageName);
        return page?.path || '/';
    }
);


const prompt = ai.definePrompt({
    name: 'navigationPrompt',
    tools: [navigationTool],
    prompt: `Du bist ein Navigations-Agent. Deine Aufgabe ist es, aus der Anfrage des Benutzers zu ermitteln, zu welcher Seite er navigieren möchte. Nutze das bereitgestellte Tool, um das Navigationsziel zu bestimmen.
    
    Benutzeranfrage: {{{prompt}}}
    
    Analysiere die Anfrage und rufe das 'navigateToPage'-Tool mit dem am besten passenden Seitennamen auf.`,
});


export const navigateFlow = ai.defineFlow(
    {
        name: 'navigateFlow',
        inputSchema: NavigateInputSchema,
        outputSchema: NavigateOutputSchema,
    },
    async (promptContent) => {
        const llmResponse = await prompt(promptContent);
        const toolRequest = llmResponse.toolRequest;

        if (toolRequest) {
            const toolResponse = await toolRequest.run();
            return { path: toolResponse };
        }
        
        return { path: '/' };
    }
);

export async function navigate(input: NavigateInput): Promise<NavigateOutput> {
  return navigateFlow(input);
}
