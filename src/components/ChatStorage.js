import React from 'react';
import './ChatStorage.css';

// Retrieve category for chat log timestamp
const getTimeCategory = (date) => {
  const now = new Date();
  const chatDate = new Date(date);
  const diffInDays = Math.floor((now - chatDate) / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays <= 7) return 'This Week';
  return 'Older';
};

const ChatStorage = ({ chats, onSelectChat, onNewChat, language, selectedChat }) => {
  const groupedChats = chats.reduce((acc, chat) => {
    const category = getTimeCategory(chat.createdAt);
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(chat);
    return acc;
  }, {});

  const categoryOrder = ['Today', 'Yesterday', 'This Week', 'Older'];

  return (
    <div className="chat-storage">
      <button className="new-chat-btn" onClick={onNewChat}>
        {language === 'English' ? '+ New Chat' : '+ Nueva Conversación'}
      </button>
      <div className="chat-groups">
        {categoryOrder.map(category => (
          groupedChats[category] && groupedChats[category].length > 0 && (
            <div key={category} className="chat-group">
              <h3>
                {category === 'Today'
                  ? language === 'English' ? 'Today' : 'Hoy'
                  : category === 'Yesterday'
                  ? language === 'English' ? 'Yesterday' : 'Ayer'
                  : category === 'This Week'
                  ? language === 'English' ? 'This Week' : 'Esta Semana'
                  : language === 'English' ? 'Older' : 'Más Antiguo'}
              </h3>
              {groupedChats[category].map((chat, index) => (
                <div key={index} className="chat-item-container">
                  <div
                    className={`chat-item ${selectedChat === chat ? 'active' : ''}`}
                    onClick={() => onSelectChat(chat)}
                  >
                    {chat.title}
                  </div>
                </div>
              ))}
            </div>
          )
        ))}
      </div>
      <a href="https://www.partselect.com/user/self-service/" target="_blank" rel="noopener noreferrer" className="order-support-link">
        <button className="new-chat-btn order-support-btn">
          {language === 'English' ? 'Order Support' : 'Soporte para pedidos'}
        </button>
      </a>
    </div>
  );
};

export default ChatStorage;