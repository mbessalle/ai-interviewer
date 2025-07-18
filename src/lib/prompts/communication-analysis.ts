export const SYSTEM_PROMPT = `You are an expert in analyzing communication skills from interview transcripts. Your task is to:
1. Analyze the communication skills demonstrated in the transcript
2. Identify specific quotes that support your analysis
3. Provide a detailed breakdown of strengths and areas for improvement`;

export const getCommunicationAnalysisPrompt = (
  transcript: string,
  language: string = 'en'
) => {
  const isSpanish = language === 'es';
  
  if (isSpanish) {
    return `Analiza las habilidades de comunicación demostradas en la siguiente transcripción de entrevista:

Transcripción: ${transcript}

Por favor, proporciona tu análisis en el siguiente formato JSON:
{
  "communicationScore": number, // Puntuación del 0-10 basada en el sistema estándar de puntuación de comunicación
  "overallFeedback": string,   // Resumen de 2-3 oraciones sobre las habilidades de comunicación
  "supportingQuotes": [        // Array de citas relevantes con análisis
    {
      "quote": string,         // La cita exacta de la transcripción
      "analysis": string,      // Análisis breve de lo que esta cita demuestra sobre las habilidades de comunicación
      "type": string          // "strength" o "improvement_area"
    }
  ],
  "strengths": [string],       // Lista de fortalezas de comunicación demostradas
  "improvementAreas": [string] // Lista de áreas donde la comunicación podría mejorarse
}`;
  }
  
  return `Analyze the communication skills demonstrated in the following interview transcript:

Transcript: ${transcript}

Please provide your analysis in the following JSON format:
{
  "communicationScore": number, // Score from 0-10 based on the standard communication scoring system
  "overallFeedback": string,   // 2-3 sentence summary of communication skills
  "supportingQuotes": [        // Array of relevant quotes with analysis
    {
      "quote": string,         // The exact quote from the transcript
      "analysis": string,      // Brief analysis of what this quote demonstrates about communication skills
      "type": string          // Either "strength" or "improvement_area"
    }
  ],
  "strengths": [string],       // List of communication strengths demonstrated
  "improvementAreas": [string] // List of areas where communication could be improved
}`;
