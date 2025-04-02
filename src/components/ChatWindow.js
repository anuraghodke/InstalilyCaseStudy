import React, { useState, useEffect, useRef } from 'react';
import { getAIMessage } from '../api/api'; 
import './ChatWindow.css';

// Manages conversation
const ChatWindow = ({ partData, onProductSelect, selectedChat, onMessagesUpdate, language, shouldClear, onChatCleared }) => {
  const [messages, setMessages] = useState(selectedChat?.messages || []);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (shouldClear) {
      setMessages([]);
      setInput('');
      setIsTyping(false);
      onChatCleared();
    } else if (selectedChat) {
      setMessages(selectedChat.messages || []);
    }
  }, [shouldClear, selectedChat, onChatCleared]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (messages.length > 0) {
      onMessagesUpdate(messages);
    }
  }, [messages, onMessagesUpdate]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [input]);

  // Parses API call; formats text
  const parseMessageText = (text) => {
    const lines = text.split('\n');
    return lines.map((line, lineIndex) => {
      const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(line)) !== null) {
        const [fullMatch, linkText, url] = match;
        const startIndex = match.index;

        if (startIndex > lastIndex) {
          const beforeText = line.slice(lastIndex, startIndex);
          parts.push(parseBoldText(beforeText, `${lineIndex}-${lastIndex}`));
        }

        parts.push(
          <a
            key={`${lineIndex}-${startIndex}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#2A3F44', textDecoration: 'underline' }}
          >
            {linkText}
          </a>
        );

        lastIndex = startIndex + fullMatch.length;
      }

      if (lastIndex < line.length) {
        const remainingText = line.slice(lastIndex);
        parts.push(parseBoldText(remainingText, `${lineIndex}-${lastIndex}`));
      }

      if (parts.length === 0) {
        parts.push(parseBoldText(line, `${lineIndex}-0`));
      }

      return (
        <React.Fragment key={lineIndex}>
          {parts}
          {lineIndex < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  const parseBoldText = (text, keyPrefix) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, partIndex) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={`${keyPrefix}-${partIndex}`}>{boldText}</strong>;
      }
      return part;
    });
  };

  // User sending message
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, sender: 'user', role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const partNumberRegex = /PS-?\s?\d+/gi;
    const partNumbers = input.match(partNumberRegex) || [];
    let matchingProducts = [];
    let validPartNumbers = [];

    if (partNumbers.length > 0) {
      const normalizedPartNumbers = partNumbers.map(pn => pn.replace(/[-\s]/g, '').trim().toUpperCase());
      validPartNumbers = normalizedPartNumbers.filter(pn => partData[pn]);
      matchingProducts = validPartNumbers.map(pn => partData[pn]);
    }

    try {
      let apiMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })).concat({ role: 'user', content: input });

      // Add context based on product lookup in partData.json
      if (matchingProducts.length > 0) {
        const productTitles = matchingProducts.map(product => product.name).join(', ');
        const contextMessage = {
          role: 'system',
          content: `The part is a ${productTitles}. Use this information to generate a relevant response to the user's message.`,
        };
        apiMessages = [contextMessage, ...apiMessages];
        onProductSelect(matchingProducts);
      }

      const apiResponse = await getAIMessage(apiMessages, language);
      const apiPartNumbers = apiResponse.content.match(partNumberRegex) || [];
      const normalizedApiPartNumbers = apiPartNumbers.map(pn => pn.replace(/[-\s]/g, '').trim().toUpperCase());
      const validApiPartNumbers = normalizedApiPartNumbers.filter(pn => partData[pn]);
      const apiProducts = validApiPartNumbers.map(pn => partData[pn]);

      let botMessageText = apiResponse.content;
      if (matchingProducts.length > 0) {
        botMessageText = (language === 'English'
          ? 'Here are the parts I found, I have displayed them in the product card window on the right:\n\n'
          : 'Aquí están las piezas que encontré, las he mostrado en la ventana de tarjetas de productos a la derecha:\n\n') + botMessageText;
      }
      if (apiProducts.length > 0) {
        onProductSelect(apiProducts);
      }

      const botMessage = {
        text: botMessageText,
        sender: 'bot',
        role: 'assistant',
        content: botMessageText
      };
      setMessages(prev => {
        const newMessages = [...prev, botMessage];
        setIsTyping(false);
        return newMessages;
      });
    } catch (error) {
      console.error('Error fetching response from API:', error);
      const botMessage = {
        text: language === 'English'
          ? 'An error occurred while fetching the response. Please try again or contact support at ' + (partData["Support Phone Number"] || '1-888-738-4871') + '.'
          : 'Ocurrió un error al obtener la respuesta. Por favor, intenta de nuevo o contacta al soporte en ' + (partData["Support Phone Number"] || '1-888-738-4871') + '.',
        sender: 'bot',
        role: 'assistant',
        content: language === 'English'
          ? 'An error occurred while fetching the response. Please try again or contact support at ' + (partData["Support Phone Number"] || '1-888-738-4871') + '.'
          : 'Ocurrió un error al obtener la respuesta. Por favor, intenta de nuevo o contacta al soporte en ' + (partData["Support Phone Number"] || '1-888-738-4871') + '.'
      };
      setMessages(prev => {
        const newMessages = [...prev, botMessage];
        setIsTyping(false);
        return newMessages;
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-messages">
        {!shouldClear && messages.length > 0 ? (
          messages.map((message, index) => (
            <div key={index} className={`message ${message.sender}`}>
              <div className="message-content">
                {parseMessageText(message.text)}
              </div>
            </div>
          ))
        ) : (
          <div className="welcome-message">
            <h2>
              {language === 'English'
                ? '✨ Assistance for your appliance needs'
                : '✨ Asistencia para tus necesidades de electrodomésticos'}
            </h2>
          </div>
        )}
        {isTyping && (
          <div className="message bot">
            <div className="message-content typing">
              {language === 'English' ? 'Typing...' : 'Escribiendo...'}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={
            language === 'English'
              ? 'Ask about your appliance needs'
              : 'Pregunte por sus necesidades de electrodomésticos'
          }
          className="chat-textarea"
          rows="1"
        />
        <button onClick={handleSendMessage}>➤</button>
      </div>
    </div>
  );
};

export default ChatWindow;