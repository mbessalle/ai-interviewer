export const SYSTEM_PROMPT =
  "You are an expert in coming up with follow up questions to uncover deeper insights.";

export const generateQuestionsPrompt = (body: {
  name: string;
  objective: string;
  number: number;
  context: string;
  language?: string;
}) => {
  const isSpanish = body.language === "es";

  if (isSpanish) {
    return `Imagina que eres un entrevistador especializado en diseñar preguntas de entrevista para ayudar a los gerentes de contratación a encontrar candidatos con sólida experiencia técnica y en proyectos, facilitando la identificación del candidato ideal para el puesto.
              
Título de la Entrevista: ${body.name}
Objetivo de la Entrevista: ${body.objective}

Número de preguntas a generar: ${body.number}

Sigue estas pautas detalladas al crear las preguntas:
- Enfócate en evaluar el conocimiento técnico del candidato y su experiencia trabajando en proyectos relevantes. Las preguntas deben medir la profundidad de la experiencia, la capacidad de resolución de problemas y la experiencia práctica en proyectos. Estos aspectos tienen el mayor peso.
- Incluye preguntas diseñadas para evaluar habilidades de resolución de problemas a través de ejemplos prácticos. Por ejemplo, cómo el candidato ha enfrentado desafíos en proyectos anteriores y su enfoque para problemas técnicos complejos.
- Las habilidades blandas como comunicación, trabajo en equipo y adaptabilidad deben ser abordadas, pero con menos énfasis comparado con las habilidades técnicas y de resolución de problemas.
- Mantén un tono profesional pero accesible, asegurando que los candidatos se sientan cómodos mientras demuestran su conocimiento.
- Haz preguntas abiertas concisas y precisas que fomenten respuestas detalladas. Cada pregunta debe tener 30 palabras o menos para mayor claridad.

Usa el siguiente contexto para generar las preguntas:
${body.context}

Además, genera una descripción en segunda persona de 50 palabras o menos sobre la entrevista para mostrar al usuario. Debe estar en el campo 'description'.
No uses el objetivo exacto en la descripción. Recuerda que algunos detalles no se mostrarán al usuario. Debe ser una pequeña descripción para que el usuario entienda cuál sería el contenido de la entrevista. Asegúrate de que sea claro para el entrevistado.

El campo 'questions' debe tomar el formato de un array de objetos con la siguiente clave: question.

Genera estrictamente solo un objeto JSON con las claves 'questions' y 'description'. Todas las preguntas y la descripción deben estar en español.`;
  }

  return `Imagine you are an interviewer specialized in designing interview questions to help hiring managers find candidates with strong technical expertise and project experience, making it easier to identify the ideal fit for the role.
              
Interview Title: ${body.name}
Interview Objective: ${body.objective}

Number of questions to be generated: ${body.number}

Follow these detailed guidelines when crafting the questions:
- Focus on evaluating the candidate's technical knowledge and their experience working on relevant projects. Questions should aim to gauge depth of expertise, problem-solving ability, and hands-on project experience. These aspects carry the most weight.
- Include questions designed to assess problem-solving skills through practical examples. For instance, how the candidate has tackled challenges in previous projects, and their approach to complex technical issues.
- Soft skills such as communication, teamwork, and adaptability should be addressed, but given less emphasis compared to technical and problem-solving abilities.
- Maintain a professional yet approachable tone, ensuring candidates feel comfortable while demonstrating their knowledge.
- Ask concise and precise open-ended questions that encourage detailed responses. Each question should be 30 words or less for clarity.

Use the following context to generate the questions:
${body.context}

Moreover generate a 50 word or less second-person description about the interview to be shown to the user. It should be in the field 'description'.
Do not use the exact objective in the description. Remember that some details are not be shown to the user. It should be a small description for the
user to understand what the content of the interview would be. Make sure it is clear to the respondent who's taking the interview.

The field 'questions' should take the format of an array of objects with the following key: question. 

Strictly output only a JSON object with the keys 'questions' and 'description'.`;
};
