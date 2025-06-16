import React, { useState, useEffect, useRef } from 'react';

// 聊天框通用組件
const ChatBox = ({ title, messages, initialDelay = 1000 }) => {
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [started, setStarted] = useState(false);
  const chatMessagesRef = useRef(null);

  // 自動滾動到底部
  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  // 處理元素進入視圖
  const handleIntersection = (entries) => {
    if (entries[0].isIntersecting && !started) {
      setStarted(true);
    }
  };

  // 設置 Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.3
    });
    
    if (chatMessagesRef.current) {
      observer.observe(chatMessagesRef.current);
    }
    
    return () => {
      if (chatMessagesRef.current) {
        observer.unobserve(chatMessagesRef.current);
      }
    };
  }, []);

  // 控制訊息逐條顯示
  useEffect(() => {
    if (!started) return;
    
    let currentIndex = visibleMessages.length;
    
    if (currentIndex < messages.length) {
      // 設置不同類型訊息的延遲時間
      // 第一條訊息特別延遲，其他則根據類型設定不同延遲
      const delay = currentIndex === 0 
                    ? initialDelay
                    : messages[currentIndex].type === 'received' ? 1500 : 1000;
      
      const timer = setTimeout(() => {
        setVisibleMessages(prev => [...prev, messages[currentIndex]]);
      }, delay);
      
      return () => clearTimeout(timer);
    }
  }, [visibleMessages, started, messages, initialDelay]);

  // 當訊息更新時，滾動到底部
  useEffect(() => {
    scrollToBottom();
  }, [visibleMessages]);

  // 重置並重新播放對話
  const restartChat = () => {
    setVisibleMessages([]);
    setStarted(true);
  };

  return (
    <div className="chat-box-container">
      <div className="chat-header">
        <h3>{title}</h3>
      </div>
      <div className="chat-messages" ref={chatMessagesRef}>
        {visibleMessages.map((message, index) => (
          <div key={index} className={`chat-message ${message.type}`}>
            <div className="message-content" 
                dangerouslySetInnerHTML={{ __html: message.content }}>
            </div>
          </div>
        ))}
        
        {/* 打字指示器 */}
        {visibleMessages.length < messages.length && 
         visibleMessages.length > 0 &&
         visibleMessages[visibleMessages.length - 1].type === 'sent' && (
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>
      
      {/* 重新播放按鈕 */}
      {visibleMessages.length === messages.length && (
        <button className="replay-button" onClick={restartChat}>
          重新播放對話
        </button>
      )}
    </div>
  );
};

// 三個聊天框展示組件
const ThreeChatBoxes = () => {
  // 登記陳情案對話內容
  const registerMessages = [
    { type: 'received', content: '您好！我是智能選服幕僚，請問有什麼需要協助的嗎？' },
    { type: 'sent', content: '我想要陳情' },
    { type: 'received', content: '感謝您的陳情意願。請問您的陳情是關於以下哪一類問題？<br />1. 交通問題<br />2. 治安問題<br />3. 環境問題<br />4. 民生服務<br />5. 其他問題' },
    { type: 'sent', content: '3' },
    { type: 'received', content: '了解，您的陳情是關於環境問題。請簡述您遇到的環境問題，越詳細越好，以便我們能更好地協助您。' },
    { type: 'sent', content: '我家附近的公園最近垃圾很多，希望能增加清潔頻率' },
    { type: 'received', content: '感謝您的回報。為了更好地處理您的陳情，請提供以下資訊：<br />1. 公園名稱或確切位置<br />2. 您的姓名<br />3. 聯絡電話或 Email' },
    { type: 'sent', content: '1. 中正公園 2. 王小明 3. 0912345678' },
    { type: 'received', content: '感謝您提供的資訊，王小明先生/女士。您關於中正公園清潔問題的陳情已成功建立，案件編號為 ENV-20230615-001。<br /><br />我們將儘快處理您的陳情，並在有進展時通知您。您也可以隨時使用「查詢案件」功能，輸入案件編號查詢最新進度。' }
  ];

  // 自動通知進度對話內容
  const notificationMessages = [
    { type: 'received', content: '【進度通知】王小明先生/女士您好，您的陳情案件 ENV-20230615-001 有新進展' },
    { type: 'received', content: '案件：中正公園清潔問題<br />最新進度：我們已將您的陳情轉交環保局，並已安排增加該公園的清潔頻率，預計從下週一開始，每天增加至2次清潔。' },
    { type: 'sent', content: '謝謝，請問還需要多久才會完成？' },
    { type: 'received', content: '環保局表示會立即處理，並且會評估是否需要增設垃圾桶。我們預計一週內完成改善，若有其他疑問，歡迎隨時詢問。' },
    { type: 'sent', content: '好的，謝謝' },
    { type: 'received', content: '不客氣！我們很樂意為您服務。若後續有任何問題，也歡迎您隨時聯繫我們。' }
  ];

  // 查詢案件進度對話內容
  const queryMessages = [
    { type: 'received', content: '您好！我是智能選服幕僚，請問有什麼需要協助的嗎？' },
    { type: 'sent', content: '我想查詢案件進度' },
    { type: 'received', content: '好的，請輸入您的案件編號，我將為您查詢最新進度。' },
    { type: 'sent', content: 'ENV-20230615-001' },
    { type: 'received', content: '案件查詢結果：<br /><br />案件編號：ENV-20230615-001<br />案件類型：環境問題<br />案件內容：中正公園清潔問題<br />目前狀態：<span style="color: #3b82f6; font-weight: bold;">處理中</span><br /><br />最新進度（2023/06/17更新）：<br />環保局已安排增加清潔頻率至每日2次，並正評估增設垃圾桶的最佳位置。' },
    { type: 'sent', content: '什麼時候可以完成？' },
    { type: 'received', content: '根據環保局的回覆，預計會在本週五（2023/06/23）前完成全部改善措施，包括增加清潔頻率和新增垃圾桶的設置。<br /><br />如果您有其他問題，可以隨時詢問，或者您希望我們提供其他協助嗎？' }
  ];

  return (
    <div className="chat-boxes-container">
      <ChatBox title="登記陳情案件" messages={registerMessages} initialDelay={500} />
      <ChatBox title="自動通知進度" messages={notificationMessages} initialDelay={800} />
      <ChatBox title="查詢案件進度" messages={queryMessages} initialDelay={1100} />
    </div>
  );
};

export default ThreeChatBoxes;