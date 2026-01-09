import { useState, useCallback } from 'react'

const PROMPTS = {
  main_claims: ({ paper_title, doi, pdf_text, user_input }) => `
Du bist ein wissenschaftlicher Assistent. Der Nutzer hat folgendes Paper gelesen:

Titel: ${paper_title}
DOI: ${doi}

Der Nutzer hat bereits folgende Hauptaussagen identifiziert:
"${user_input}"

Hier ist der extrahierte Text des Papers:
${pdf_text}

Aufgabe: Ergänze oder verfeinere die Hauptaussagen des Nutzers. Formuliere 2-3 prägnante Sätze, die wichtige Punkte hinzufügen könnten, die der Nutzer möglicherweise übersehen hat. Bleibe sachlich und zitierbar.
`.trim(),

  topics: ({ paper_title, pdf_text, user_input }) => `
Paper: ${paper_title}
Nutzer-Tags: ${user_input}
Paper-Abstract/Text: ${pdf_text.slice(0, 3000)}

Schlage 3-5 weitere relevante Schlagworte vor, die dieses Paper charakterisieren. Fokussiere auf Methodik, Forschungsfeld und zentrale Konzepte.

Antworte NUR mit den Tags, kommagetrennt, ohne Erklärung.
`.trim(),

  key_concepts: ({ paper_title, pdf_text, user_input }) => `
Paper: ${paper_title}
Nutzer-Konzepte: ${user_input}
Paper-Text: ${pdf_text.slice(0, 3000)}

Welche weiteren Schlüsselkonzepte, Theorien oder Frameworks werden in diesem Paper verwendet oder eingeführt? Liste 3-5 Vorschläge.

Antworte NUR mit den Konzepten, kommagetrennt, ohne Erklärung.
`.trim(),

  critical_notes: ({ paper_title, pdf_text, user_input }) => `
Paper: ${paper_title}
Nutzer-Kritik: ${user_input}
Paper-Text: ${pdf_text.slice(0, 5000)}

Der Nutzer hat kritische Anmerkungen gemacht. Ergänze mögliche weitere kritische Perspektiven:
- Methodische Einschränkungen
- Generalisierbarkeit
- Fehlende Perspektiven
- Alternative Interpretationen

Sei konstruktiv-kritisch, nicht destruktiv. Antworte in 2-4 Sätzen.
`.trim(),

  full_analysis: ({ paper_title, doi, pdf_text, projects, project_descriptions }) => `
You are a scientific assistant for a researcher in Educational Technology / AI in Higher Education.

IMPORTANT: Always respond in ENGLISH, regardless of the paper's language. Even if the paper is in German or another language, all your outputs (main_claims, topics, critical_notes, reasoning) must be in English.

Paper to analyze:
Title: ${paper_title}
DOI: ${doi}

Extracted text:
${pdf_text}

The researcher works on the following projects:
${project_descriptions}

Analyze the paper and respond in the following JSON format (ONLY JSON, no explanation):
{
  "main_claims": "2-4 sentences with the central claims and findings of the paper. Formulated objectively and citable.",
  "topics": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "study_type": "One of: Meta-Analysis, RCT, Quasi-Experimental, Observational Study, Qualitative, Mixed Methods, Review, Theoretical, Other",
  "citability": 5,
  "citability_reasoning": "Brief reasoning for the citability score (1-2 sentences)",
  "relevant_projects": ["ProjectName1"],
  "project_reasoning": "Brief reasoning for the project assignment",
  "critical_notes": "2-3 sentences with constructive-critical notes on methodology, limitations, or alternative interpretations."
}

Citability criteria (1-10):
- 1-2 (Trash): Severe methodological flaws, not peer-reviewed, questionable sources
- 3-4 (Weak): Significant limitations, small sample size, weak methodology
- 5-6 (Okay): Solid work with some limitations, average quality
- 7-8 (Good): High-quality study, good methodology, relevant findings
- 9-10 (Angel): Excellent study, strong methodology, high relevance for the research field

Consider for citability:
1. Methodological quality of the study
2. Relevance for Educational Technology / AI in Higher Education

Available projects for relevant_projects: ${projects.join(', ')}
`.trim()
}

export function useAi(settings) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const requestSuggestions = useCallback(async (field, context) => {
    if (!settings.api_key) {
      setError('Kein API-Key konfiguriert. Bitte in den Einstellungen hinterlegen.')
      return null
    }

    const prompt = PROMPTS[field]?.(context)
    if (!prompt) {
      setError('Unbekanntes Feld für KI-Vorschlag')
      return null
    }

    setLoading(true)
    setError(null)

    try {
      let response
      
      if (settings.api_provider === 'openai') {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.api_key}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 500,
            temperature: 0.7
          })
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error?.message || 'OpenAI API Fehler')
        }

        const data = await response.json()
        return data.choices[0]?.message?.content?.trim() || null
        
      } else if (settings.api_provider === 'gemini') {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.api_key}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 500,
              temperature: 0.7
            }
          })
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error?.message || 'Gemini API Fehler')
        }

        const data = await response.json()
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
      }

      throw new Error('Unbekannter API-Provider')
      
    } catch (err) {
      console.error('AI request error:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [settings])

  const requestFullAnalysis = useCallback(async (context) => {
    if (!settings.api_key) {
      setError('Kein API-Key konfiguriert. Bitte in den Einstellungen hinterlegen.')
      return null
    }

    const prompt = PROMPTS.full_analysis(context)
    
    setLoading(true)
    setError(null)

    try {
      let response
      let resultText
      
      if (settings.api_provider === 'openai') {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.api_key}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.5
          })
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error?.message || 'OpenAI API Fehler')
        }

        const data = await response.json()
        resultText = data.choices[0]?.message?.content?.trim() || null
        
      } else if (settings.api_provider === 'gemini') {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${settings.api_key}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 1500,
              temperature: 0.5
            }
          })
        })

        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error?.message || 'Gemini API Fehler')
        }

        const data = await response.json()
        resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null
      } else {
        throw new Error('Unbekannter API-Provider')
      }

      // Parse JSON response
      if (resultText) {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = resultText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          return {
            main_claims: parsed.main_claims || '',
            topics: Array.isArray(parsed.topics) ? parsed.topics : [],
            study_type: parsed.study_type || '',
            citability: typeof parsed.citability === 'number' ? parsed.citability : 5,
            citability_reasoning: parsed.citability_reasoning || '',
            relevant_projects: Array.isArray(parsed.relevant_projects) ? parsed.relevant_projects : [],
            project_reasoning: parsed.project_reasoning || '',
            critical_notes: parsed.critical_notes || ''
          }
        }
      }
      
      throw new Error('Konnte KI-Antwort nicht parsen')
      
    } catch (err) {
      console.error('AI full analysis error:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [settings])

  return { requestSuggestions, requestFullAnalysis, loading, error }
}
