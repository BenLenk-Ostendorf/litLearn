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

  return { requestSuggestions, loading, error }
}
