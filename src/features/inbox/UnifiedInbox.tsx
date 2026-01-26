import React, { useState } from 'react';
import {
  Search,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  MessageCircle,
  Facebook,
  Instagram
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'me' | 'them';
  text: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  name: string;
  platform: 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM';
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  messages: Message[];
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    name: 'Budi Santoso',
    platform: 'WHATSAPP',
    lastMessage: 'Waalaikumsalam, boleh minta infonya?',
    lastMessageTime: '10:30',
    unread: 2,
    messages: [
      { id: '1', sender: 'me', text: 'Assalamualaikum Pak Budi, ada yang bisa kami bantu?', timestamp: '10:00' },
      { id: '2', sender: 'them', text: 'Waalaikumsalam, boleh minta infonya?', timestamp: '10:30' }
    ]
  },
  {
    id: '2',
    name: 'Siti Aminah',
    platform: 'INSTAGRAM',
    lastMessage: 'Harga paket Umrah berapa kak?',
    lastMessageTime: '09:15',
    unread: 1,
    messages: [
      { id: '1', sender: 'them', text: 'Harga paket Umrah berapa kak?', timestamp: '09:15' }
    ]
  },
  {
    id: '3',
    name: 'Rudi Hermawan',
    platform: 'FACEBOOK',
    lastMessage: 'Terima kasih informasinya.',
    lastMessageTime: 'Yesterday',
    unread: 0,
    messages: [
      { id: '1', sender: 'me', text: 'Berikut brosur paket kami Pak.', timestamp: 'Yesterday' },
      { id: '2', sender: 'them', text: 'Terima kasih informasinya.', timestamp: 'Yesterday' }
    ]
  }
];

const QUICK_REPLIES = [
  "Assalamualaikum, ada yang bisa dibantu?",
  "Berikut brosur paket Umrah kami.",
  "Syarat pendaftaran: KTP & KK.",
  "Mohon ditunggu sebentar ya."
];

export const UnifiedInbox: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>(MOCK_CONVERSATIONS[0].id);
  const [inputText, setInputText] = useState('');

  // In a real app, this would update the state, but here we just mock the UI update
  // We'll create a local state for the messages of the *selected* conversation to show interactivity
  const selectedConversation = MOCK_CONVERSATIONS.find(c => c.id === selectedId);
  const [activeMessages, setActiveMessages] = useState<Message[]>(selectedConversation?.messages || []);

  // Update active messages when selection changes
  React.useEffect(() => {
    if (selectedConversation) {
      setActiveMessages(selectedConversation.messages);
    }
  }, [selectedId, selectedConversation]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'me',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setActiveMessages([...activeMessages, newMessage]);
    setInputText('');
  };

  const handleQuickReply = (text: string) => {
    setInputText(text);
  };

  const PlatformIcon = ({ platform }: { platform: string }) => {
    switch (platform) {
      case 'WHATSAPP': return <MessageCircle className="w-4 h-4 text-green-600" />;
      case 'FACEBOOK': return <Facebook className="w-4 h-4 text-blue-600" />;
      case 'INSTAGRAM': return <Instagram className="w-4 h-4 text-pink-600" />;
      default: return null;
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-200 flex overflow-hidden">
      {/* Sidebar: Conversation List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search chats..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {MOCK_CONVERSATIONS.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${selectedId === conv.id ? 'bg-blue-50/50' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-gray-900 text-sm">{conv.name}</h4>
                <span className="text-xs text-gray-400">{conv.lastMessageTime}</span>
              </div>
              <p className="text-xs text-gray-500 truncate mb-2">{conv.lastMessage}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                  <PlatformIcon platform={conv.platform} />
                  <span className="capitalize text-[10px]">{conv.platform.toLowerCase()}</span>
                </div>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {conv.unread}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                  {selectedConversation.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedConversation.name}</h3>
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    Online via {selectedConversation.platform}
                  </div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {activeMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                    msg.sender === 'me'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                  }`}>
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-1 text-right ${msg.sender === 'me' ? 'text-blue-100' : 'text-gray-400'}`}>
                      {msg.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              {/* Quick Replies */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                {QUICK_REPLIES.map((reply, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickReply(reply)}
                    className="whitespace-nowrap px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 rounded-full transition-colors border border-gray-200"
                  >
                    {reply}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={handleSend}
                  className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
};
