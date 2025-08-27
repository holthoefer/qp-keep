
'use server';

/**
 * @fileOverview AI-powered tool to suggest a response plan when a process falls out of specification.
 *
 * - suggestResponsePlan - A function that suggests a response plan.
 * - SuggestResponsePlanInput - The input type for the suggestResponsePlan function.
 * - SuggestResponsePlanOutput - The return type for the suggestResponsePlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { ControlPlan } from '@/types';

const SuggestResponsePlanInputSchema = z.object({
  processStep: z.string().describe('The current step in the process.'),
  characteristic: z.string().describe('The specific characteristic that is out of specification.'),
  specificationLimits: z.string().describe('The upper and lower specification limits for the characteristic.'),
  currentValue: z.string().describe('The current measured values of the characteristic, including individual values, mean and standard deviation.'),
  responsiblePersonRoles: z.array(z.string()).describe('List of possible responsible person roles, e.g. Quality Engineer, Process Engineer, Operator.'),
});
export type SuggestResponsePlanInput = z.infer<typeof SuggestResponsePlanInputSchema>;

const SuggestResponsePlanOutputSchema = z.object({
  suggestedResponsePlan: z.string().describe('Ein detaillierter Aktionsplan zur Behebung des Konformitätsproblems, formatiert mit Abschnitten und Aufzählungspunkten. Textpassagen, die eine Verletzung der Spezifikationsgrenzen (LSL/USL) beschreiben, MÜSSEN in ein <span class="spec-violation"> Tag eingeschlossen werden. Textpassagen, die eine Verletzung der Kontrollgrenzen (LCL/UCL/sUCL) beschreiben, MÜSSEN in ein <span class="control-violation"> Tag eingeschlossen werden.'),
  suggestedResponsiblePerson: z.string().describe('The role of the person who should be responsible for the response plan.'),
});
export type SuggestResponsePlanOutput = z.infer<typeof SuggestResponsePlanOutputSchema>;

export async function suggestResponsePlan(input: SuggestResponsePlanInput): Promise<SuggestResponsePlanOutput> {
  return suggestResponsePlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestResponsePlanPrompt',
  input: {schema: SuggestResponsePlanInputSchema},
  output: {schema: SuggestResponsePlanOutputSchema},
  prompt: `Du bist ein KI-Assistent, der Qualitätsingenieure dabei unterstützt, schnell auf Nichtkonformitätsprobleme zu reagieren.

  Erstelle basierend auf den folgenden Informationen zu einem Prozess, der außerhalb der Spezifikation liegt, einen Maßnahmenplan und schlage die Rolle der Person vor, die dafür verantwortlich sein sollte. Antwort ausschließlich auf Deutsch.

  Prozessschritt: {{{processStep}}}
  Merkmal: {{{characteristic}}}
  Spezifikationsgrenzen: {{{specificationLimits}}}
  Untersuchungswerte (einschließlich Einzelwerte, Mittelwert und Standardabweichung): {{{currentValue}}}
  Mögliche verantwortliche Rollen: {{#each responsiblePersonRoles}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

  So erstellst du den Maßnahmenplan:
  1.  Diagnostiziere die möglichen Ursachen des Problems anhand des Prozessschritts, des Merkmals, der Spezifikationsgrenzen und der bereitgestellten Untersuchungswerte.
  2.  Definiere Sofortmaßnahmen, um die Nichtkonformität einzudämmen.
  3.  Schlage Korrekturmaßnahmen vor, um den Prozess wieder in die Spezifikation zu bringen.
  4.  Empfehle vorbeugende Maßnahmen, um ein erneutes Auftreten des Problems zu vermeiden.
  5.  Bestimme aus der Liste der möglichen verantwortlichen Rollen die geeignete Person, die für die Ausführung des Maßnahmenplans verantwortlich sein soll.

  WICHTIG: Strukturiere deine "suggestedResponsePlan"-Ausgabe mit klaren Überschriften für jeden Abschnitt (Diagnose, Sofortmaßnahmen, Korrekturmaßnahmen, Vorbeugende Maßnahmen) unter Verwendung von <h3>-Tags. Verwende Aufzählungspunkte (<ul> und <li>) für Aktionslisten.
  
  KRITISCHE STILREGEL:
  - Wenn du eine Verletzung einer SPEZIFIKATIONSGRENZE (LSL oder USL) erwähnst, MUSST du diesen Satz oder diese Phrase in ein <span class="spec-violation"> Tag einschließen.
  - Wenn du eine Verletzung einer KONTROLLGRENZE (LCL, UCL oder sUCL) erwähnst, MUSST du diesen Satz oder diese Phrase in ein <span class="control-violation"> Tag einschließen.

  Beispielstruktur:
  <h3>Diagnose</h3>
  <p>Eine kurze Analyse der potenziellen Grundursache. <span class="spec-violation">Der Mittelwert liegt über der USL.</span></p>

  <h3>Sofortmaßnahmen</h3>
  <ul>
    <li>Prozess sofort stoppen.</li>
    <li>Alle Produkte seit der letzten Gut-Prüfung isolieren.</li>
  </ul>

  <h3>Korrekturmaßnahmen</h3>
  <ul>
    <li>Messgerät neu kalibrieren.</li>
    <li>Maschinenwerkzeug auf Verschleiß prüfen.</li>
  </ul>

  <h3>Vorbeugende Maßnahmen</h3>
  <ul>
    <li>Frequenz der Messmittelkalibrierung erhöhen.</li>
    <li>Überprüfung des Werkzeugverschleißes in die tägliche Startprozedur aufnehmen.</li>
  </ul>
`,
});

const suggestResponsePlanFlow = ai.defineFlow(
  {
    name: 'suggestResponsePlanFlow',
    inputSchema: SuggestResponsePlanInputSchema,
    outputSchema: SuggestResponsePlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


const GenerateControlPlanDocV5OutputSchema = z.object({
    htmlContent: z.string().describe("The full HTML content of the control plan document."),
});

export async function generateControlPlanDocV5Action(plan: ControlPlan): Promise<z.infer<typeof GenerateControlPlanDocV5OutputSchema>> {
    return generateControlPlanDocV5Flow(plan);
}

const generateControlPlanDocV5Flow = ai.defineFlow(
    {
        name: 'generateControlPlanDocV5Flow',
        inputSchema: z.any(), // Using z.any() for complex ControlPlan object
        outputSchema: GenerateControlPlanDocV5OutputSchema,
    },
    async (plan) => {
        const { output } = await ai.generate({
            prompt: `Generate a full HTML document for the given Control Plan JSON object.
            The HTML should be styled professionally for printing, using inline CSS or a <style> block.
            It must be a complete, self-contained HTML document starting with <html> and ending with </html>.
            The response must be in German.
            Use tables to structure the data clearly.
            The plan data is:
            ${JSON.stringify(plan, null, 2)}
            `,
            output: {
                schema: GenerateControlPlanDocV5OutputSchema,
            }
        });
        return output!;
    }
);
