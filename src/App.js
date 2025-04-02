import React, { useState, useEffect, useCallback } from 'react';
import ChatStorage from './components/ChatStorage';
import ChatWindow from './components/ChatWindow';
import ProductCard from './components/ProductCard';
import logo from './logo.png';
import partData from './partData.json'; 
import './App.css';

// Manage session
const App = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [language, setLanguage] = useState('English');
  const [partDataState, setPartData] = useState({});
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [shouldClearChat, setShouldClearChat] = useState(false);
  const [currentMessages, setCurrentMessages] = useState([]);

  useEffect(() => {
    console.log('Loaded partData:', partData);
    setPartData(partData);
  }, []);

  const handleNewChat = useCallback(() => {
    if (currentMessages.length > 0 && !selectedChat) {
      const firstMessage = currentMessages[0]?.text || '';
      const chatName = firstMessage.length > 0 
        ? firstMessage.substring(0, 20) + (firstMessage.length > 20 ? '...' : '')
        : `Chat ${new Date().toLocaleDateString()}`;
      const newChatEntry = {
        title: chatName,
        messages: [...currentMessages],
        createdAt: new Date().toISOString(),
      };
      setChats(prevChats => [...prevChats, newChatEntry]);
    }
    
    setSelectedChat(null);
    setSelectedProducts([]);
    setCurrentMessages([]);
    setShouldClearChat(true);
  }, [currentMessages, selectedChat]);

  // Currently disables chat selection
  const handleSelectChat = useCallback(() => {
    console.log('Chat selection is disabled');
  }, []);

  const handleProductSelect = useCallback((products) => {
    setSelectedProducts(products);
  }, []);

  // Switch between English/ Spanish
  const toggleLanguage = useCallback((lang) => {
    setLanguage(lang);
  }, []);

  const handleMessagesUpdate = useCallback((updatedMessages) => {
    setCurrentMessages(updatedMessages);
    if (selectedChat) {
      const updatedChat = { 
        ...selectedChat, 
        messages: [...updatedMessages]
      };
      setSelectedChat(updatedChat);
      setChats(prev => prev.map(chat => 
        chat.createdAt === selectedChat.createdAt ? updatedChat : { ...chat }
      ));
    }
  }, [selectedChat]);

  const onChatCleared = useCallback(() => {
    setShouldClearChat(false);
    if (!selectedChat) {
      setCurrentMessages([]);
    }
  }, [selectedChat]);

  return (
    <div className="app">
      <div className="top-bar">
        <a href="https://www.partselect.com" target="_blank" rel="noopener noreferrer" className="logo">
          <img src={logo} alt="PartSelect Logo" className="logo-image" />
        </a>
        <div className="language-toggle">
          <button
            className={language === 'English' ? 'active' : ''}
            onClick={() => toggleLanguage('English')}
          >
            English
          </button>
          <button
            className={language === 'Spanish' ? 'active' : ''}
            onClick={() => toggleLanguage('Spanish')}
          >
            Spanish
          </button>
        </div>
      </div>
      <div className="main-content">
        <ChatStorage
          chats={chats}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          language={language}
          selectedChat={selectedChat}
        />
        <ChatWindow
          partData={partDataState}
          onProductSelect={handleProductSelect}
          selectedChat={selectedChat}
          onMessagesUpdate={handleMessagesUpdate}
          language={language}
          shouldClear={shouldClearChat}
          onChatCleared={onChatCleared}
        />
        <div className="product-sidebar">
          {selectedProducts.length > 0 ? (
            selectedProducts.map((product, index) => (
              <ProductCard key={index} product={product} language={language} />
            ))
          ) : (
            <div className="placeholder">
              {language === 'English' ? (
                <>Generated product items with purchase information will appear here!</>
              ) : (
                <>Los artículos de producto generados con información de compra aparecerán aquí!</>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;