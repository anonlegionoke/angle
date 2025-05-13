export const logChatMessage = async (
  userMessage: string,
  llmResponse: any,
  projectId?: string | null
): Promise<void> => {
  try {
    
    const response = await fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessage,
        llmResponse,
        projectId
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to log chat message');
    }
    
    console.log('Chat log saved successfully');
  } catch (error) {
    console.error('Error logging chat message:', error);
  }
};
