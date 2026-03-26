import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  MessageCircle,
  Facebook,
  Instagram,
  ArrowLeft
} from 'lucide-react';
import { dbService, functionsService } from '../../services/firebaseService';

interface Message {
  id: string;
  sender: 'me' | 'them';
  text: string;
  timestamp: any;
  platform: string;
}

interface Conversation {
  id: string;
  name: string;
  platform: 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM';
  lastMessage: string;
  lastMessageTime: any;
  unread: number;
  phoneNumber?: string;
  updatedAt?: any;
}

const QUICK_REPLIES = [
  "Assalamualaikum, ada yang bisa dibantu?",
  "Berikut brosur paket Umrah kami.",
  "Syarat pendaftaran: KTP & KK.",
  "Mohon ditunggu sebentar ya."
];

export const UnifiedInbox: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to conversations
  useEffect(() => {
    const unsubscribe = dbService.subscribeToCollection(
      'conversations',
      (data) => {
        // Sort conversations by updatedAt descending locally if complex query is not indexed yet
        const sortedData = data.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis() || 0;
          const timeB = b.updatedAt?.toMillis() || 0;
          return timeB - timeA;
        });
        setConversations(sortedData as Conversation[]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Automatically select first conversation on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && !selectedId && conversations.length > 0) {
        setSelectedId(conversations[0].id);
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedId, conversations]);

  // Subscribe to messages of selected conversation
  useEffect(() => {
    if (selectedId) {
      // Clear previous messages when switching
      setActiveMessages([]);

      const unsubscribe = dbService.subscribeToCollection(
        `conversations/${selectedId}/messages`,
        (data) => {
          // Sort messages by timestamp ascending
          const sortedData = data.sort((a, b) => {
             const timeA = a.timestamp?.toMillis() || 0;
             const timeB = b.timestamp?.toMillis() || 0;
             return timeA - timeB;
          });
          setActiveMessages(sortedData as Message[]);

          // Reset unread count when viewing
          dbService.updateDocument('conversations', selectedId, { unread: 0 }).catch(console.error);
        }
      );
      return () => unsubscribe();
    } else {
      setActiveMessages([]);
    }
  }, [selectedId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const selectedConversation = conversations.find(c => c.id === selectedId);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedConversation || isSending) return;

    if (selectedConversation.platform === 'WHATSAPP' && selectedConversation.phoneNumber) {
      setIsSending(true);
      try {
        await functionsService.sendWhatsAppMessage(
          selectedConversation.phoneNumber,
          inputText.trim(),
          selectedConversation.id
        );
        setInputText('');
      } catch (error) {
        console.error("Failed to send WhatsApp message", error);
        alert("Failed to send message. Please try again.");
      } finally {
        setIsSending(false);
      }
    } else {
      // Mock for other platforms for now
      const newMessage: Message = {
        id: Date.now().toString(),
        sender: 'me',
        text: inputText,
        timestamp: new Date(),
        platform: selectedConversation.platform
      };
      setActiveMessages([...activeMessages, newMessage]);
      setInputText('');
    }
  };

  const handleQuickReply = (text: string) => {
    setInputText(text);
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    const today = new Date();
    const isToday = date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
    }
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
    <div className="h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar: Conversation List */}
      <div className={`w-full md:w-80 h-full border-r border-gray-200 flex flex-col shrink-0 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-3 md:hidden">Pesan Masuk</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search chats..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No conversations yet.
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${selectedId === conv.id ? 'bg-emerald-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-gray-900 text-sm">{conv.name}</h4>
                  <span className="text-xs text-gray-400">{formatTime(conv.lastMessageTime)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate mb-2">{conv.lastMessage}</p>
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                  <PlatformIcon platform={conv.platform} />
                  <span className="capitalize text-[10px]">{conv.platform.toLowerCase()}</span>
                </div>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {conv.unread}
                  </span>
                )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col h-full ${selectedId ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center">
                <button
                  onClick={() => setSelectedId(null)}
                  className="mr-3 p-1 rounded-full hover:bg-gray-100 md:hidden"
                  aria-label="Back to list"
                >
                  <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold mr-3">
                  {selectedConversation.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedConversation.name}</h3>
                  <div className="flex items-center text-xs text-gray-500">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span>
                    Online
                  </div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
              {activeMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end pl-10' : 'justify-start pr-10'}`}>
                  <div className={`max-w-full sm:max-w-[75%] break-words rounded-2xl px-4 py-3 text-sm ${
                    msg.sender === 'me'
                      ? 'bg-emerald-100 text-emerald-900 rounded-br-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                  }`}>
                    <p>{msg.text}</p>
                    <p className={`text-[10px] mt-1 text-right ${msg.sender === 'me' ? 'text-emerald-700' : 'text-gray-400'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
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
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 hidden md:block">
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Tulis pesan..."
                    className="w-full pl-4 pr-10 py-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hidden md:block">
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="p-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 flex-col">
            <MessageCircle className="w-16 h-16 text-gray-200 mb-4" />
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};
