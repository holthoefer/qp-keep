
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

export type NavigateInput = z.infer<typeof NavigateInputSchema>;
const NavigateInputSchema = z.string();

export type NavigateOutput = z.infer<typeof NavigateOutputSchema>;
const NavigateOutputSchema = z.object({
    path: z.string().describe("The URL path the user should be redirected to. Should be one of the available paths. If no suitable page is found, this should be '/#not-found'."),
    message: z.string().optional().describe("An optional message to display on the target page, extracted from the user's prompt (e.g., a greeting or note content).")
});

const availablePages = [
    { name: "Arbeitsplätze", path: "/arbeitsplaetze", description: "Zeigt eine Übersicht aller Arbeitsplätze (Workstations, WP) an." },
    { name: "DNA", path: "/dna", description: "Zeigt die DNA-Ansicht der aktiven Merkmale an (active characteristics)." },
    { name: "Aufträge", path: "/PO", description: "Zeigt die Auftragsliste an. (Stichworte: Auftrag, Aufträge, Orders, PO)" },
    { name: "Events", path: "/events", description: "Zeigt die Liste der Shopfloor-Events an oder erlaubt das Erstellen eines neuen Events." },
    { name: "Incidents", path: "/incidents", description: "Zeigt die Liste der Incidents (Vorfälle) an oder erlaubt das Erstellen eines neuen Incidents." },
    { name: "Control Plan", path: "/cp", description: "Zeigt die Übersicht der Control Plans (Lenkungspläne, CP) an." },
    { name: "Notizen", path: "/notes", description: "Zeigt die Notizenseite an. Wenn der Benutzer eine neue Notiz erstellen möchte (z.B. 'Notiz: ...'), navigiere hierher und extrahiere den Inhalt in das 'message'-Feld. Formatiere den extrahierten Text in einem sauberen E-Mail-Stil (Anrede, Hauptteil mit Absätzen und ggf. Aufzählungspunkten), falls der Kontext dies nahelegt. Der Titel der Notiz wird automatisch auf 'Agent😎' gesetzt." },
    { name: "Plan-Ideen", path: "/lenkungsplan", description: "Zeigt die Seite für Plan-Ideen und Entwürfe (Lenkungsplan-Rohfassungen, LP) an." },
    { name: "Admin", path: "/admin/users", description: "Zeigt die Admin-Konsole zur Benutzerverwaltung (User Management) an." },
    { name: "Startseite", path: "/", description: "Die Haupt- oder Startseite der Anwendung (Homepage, Main Page, Home)." },
];

const prompt = ai.definePrompt({
    name: 'navigationPrompt',
    input: { schema: z.object({ prompt: z.string() }) },
    output: { schema: NavigateOutputSchema },
    prompt: `Du bist ein Navigations-Agent. Deine Aufgabe ist es, aus der Anfrage des Benutzers zu ermitteln, zu welcher Seite er navigieren möchte und ob eine zusätzliche Nachricht oder ein Inhalt extrahiert werden soll. Die Anfrage kann auf Deutsch oder Englisch sein.
    
Hier ist eine Liste der verfügbaren Seiten mit ihren Pfaden und Beschreibungen. Nutze diese Informationen, um das richtige Navigationsziel zu bestimmen und den korrekten URL-Pfad im 'path'-Feld der Ausgabe zurückzugeben.

Verfügbare Seiten:
${availablePages.map(p => `- Pfad: ${p.path}\n  - Name/Beschreibung: ${p.name} - ${p.description}`).join('\n    ')}

Analysiere die Anfrage des Benutzers und finde den am besten passenden URL-Pfad aus der obigen Liste.

Sonderfälle:
- Wenn die Anfrage eine zusätzliche Nachricht, einen Gruß oder eine Anweisung enthält (z.B. "wünsche einen guten Morgen"), extrahiere diesen Text und füge ihn in das 'message'-Feld ein.
- Wenn der Benutzer explizit eine neue Notiz erstellen möchte (z.B. durch "Notiz:", "Notiere:", "Neue Notiz:"), navigiere zur '/notes'-Seite und extrahiere den gesamten nachfolgenden Text als Inhalt für das 'message'-Feld. Formatiere den extrahierten Text in einem sauberen E-Mail-Stil (Anrede, Hauptteil, ggf. mit Aufzählungspunkten/Bullet Points), aber verzichte auf eine Grußformel am Ende.

Wenn du absolut kein passendes Ziel findest, gib '/#not-found' als Pfad zurück.
Antworte AUSSCHLIESSLICH mit dem JSON-Objekt, das die Felder enthält.

Benutzeranfrage: {{{prompt}}}
`,
});

const navigateFlow = ai.defineFlow(
    {
        name: 'navigateFlow',
        inputSchema: NavigateInputSchema,
        outputSchema: NavigateOutputSchema,
    },
    async (promptContent) => {
        if (!promptContent) {
            return { path: '/#not-found' };
        }
        
        try {
            const { output } = await prompt({ prompt: promptContent });
            if (output) {
                return output;
            }
        } catch (error) {
            console.error("Error in navigateFlow:", error);
        }

        return { path: '/#not-found' };
    }
);

export async function navigate(input: NavigateInput): Promise<NavigateOutput> {
  return navigateFlow(input);
}
