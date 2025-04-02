import axios from 'axios';
import partData from '../partData.json';

const API_KEY = process.env.REACT_APP_DEEPSEEK_API_KEY
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Read part and appliance type
const extractContextFromMessages = (messages) => {
  const lastMessage = messages[messages.length - 1].content.toLowerCase();
  let partType = 'unknown';
  let appliance = 'unknown';

  if (lastMessage.includes('drain pump')) partType = 'drain pump';
  else if (lastMessage.includes('ice maker')) partType = 'ice maker';
  else if (lastMessage.includes('filter')) partType = 'filter';
  else if (lastMessage.includes('gasket')) partType = 'gasket';

  if (lastMessage.includes('dishwasher')) appliance = 'dishwasher';
  else if (lastMessage.includes('refrigerator')) appliance = 'refrigerator';
  else if (lastMessage.includes('freezer')) appliance = 'freezer';

  return { partType, appliance };
};

// Filter part numbers based on part type and appliance
const filterPartNumbers = (partType, appliance) => {
  return Object.keys(partData).filter(partNumber => {
    const part = partData[partNumber];
    const matchesPartType = partType === 'unknown' || part.partType === partType;
    const matchesAppliance = appliance === 'unknown' || part.appliance === appliance;
    return matchesPartType && matchesAppliance;
  });
};

export const getAIMessage = async (messages) => {
  try {
    // Extract context from the user's message
    const { partType, appliance } = extractContextFromMessages(messages);

    // Filter valid part numbers based on context
    const validPartNumbers = filterPartNumbers(partType, appliance);

    const systemPrompt = `
      You are a helpful and knowledgeable assistant for the PartSelect e-commerce website.

      Your primary role is to assist users with finding parts and troubleshooting issues for **Refrigerators** and **Dishwashers** only. Do not answer questions about other appliances.

      The user is asking about a ${partType} for a ${appliance}.

      - Only respond with part numbers from the following list: ${validPartNumbers.join(', ') || 'none'}.
      - **Do NOT guess or make up part numbers.** If no valid part numbers are available for the given appliance and part type, inform the user and suggest they contact PartSelect support for further assistance.
      - If there is a solution to a problem that requires some parts, list the part but do NOT make up a part number.
      - Keep responses friendly, clear, and focused on helping the user complete their purchase or resolve their issue.

      If the user's question is outside the scope of Refrigerator or Dishwasher parts, politely let them know and redirect them to support.

      Always prioritize a smooth and helpful customer experience.
    `;

    const response = await axios.post(
      API_URL,
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          ...messages
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message;
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    throw error;
  }
};