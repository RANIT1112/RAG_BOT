import { useState, useRef, useEffect, type FormEvent } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Avatar, AvatarFallback } from "./components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Label } from "./components/ui/label";
import { MessageCircle, Send, Settings, Download, Trash2, Plus, Menu, User, Bot, Search, Moon, Sun, Copy, MoreVertical, History, Zap, Shield, HelpCircle, Star, Archive, RefreshCw, X } from 'lucide-react';
import { Toaster, toast } from "sonner";
import './App.css';

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStarred?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
  isArchived?: boolean;
  isStarred?: boolean;
  userId: string;
}

interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  autoSave: boolean;
  soundEnabled: boolean;
  compactMode: boolean;
  showTimestamps: boolean;
  autoScroll: boolean;
}

function App() {
  
  // Core state
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [conversationId, setConversationId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  
  // UI state
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mainDropdownOpen, setMainDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // Chat management
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStarred, setFilterStarred] = useState(false);
  
  // Settings
  const [userSettings, setUserSettings] = useState<UserSettings>({
    theme: 'light',
    autoSave: true,
    soundEnabled: true,
    compactMode: false,
    showTimestamps: true,
    autoScroll: true,
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (userSettings.autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, userSettings.autoScroll]);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Close dropdowns and modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setActiveDropdown(null);
        setMainDropdownOpen(false);
      }
      if (!target.closest('.modal-container') && !target.closest('[data-modal-trigger]')) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
        setActiveDropdown(null);
        setMainDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Load saved data on mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('chatSessions');
    const savedSettings = localStorage.getItem('userSettings');
    const savedUserId = localStorage.getItem('userId');
    const savedDarkMode = localStorage.getItem('darkMode');
    
    if (savedSessions) {
      try {
        const sessions = JSON.parse(savedSessions).map((session: any) => ({
          ...session,
          timestamp: new Date(session.timestamp)
        }));
        setChatSessions(sessions);
      } catch (error) {
        console.error('Error loading chat sessions:', error);
      }
    }
    
    if (savedSettings) {
      try {
        setUserSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    }
    
    if (savedUserId) {
      setUserId(savedUserId);
    }

    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Save data when it changes
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
    }
  }, [chatSessions]);

  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
  }, [userSettings]);

  useEffect(() => {
    if (userId) {
      localStorage.setItem('userId', userId);
    }
  }, [userId]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Save current chat session
  useEffect(() => {
    if (messages.length > 0 && conversationId && userSettings.autoSave) {
      const lastMessage = messages[messages.length - 1];
      const existingSessionIndex = chatSessions.findIndex(s => s.id === conversationId);
      
      const sessionData: ChatSession = {
        id: conversationId,
        title: messages.find(m => m.role === 'user')?.content.slice(0, 50) + "..." || "New Chat",
        lastMessage: lastMessage.content.slice(0, 100) + "...",
        timestamp: new Date(),
        messageCount: messages.length,
        userId: userId,
        isArchived: existingSessionIndex >= 0 ? chatSessions[existingSessionIndex].isArchived : false,
        isStarred: existingSessionIndex >= 0 ? chatSessions[existingSessionIndex].isStarred : false,
      };

      if (existingSessionIndex >= 0) {
        setChatSessions(prev => {
          const updated = [...prev];
          updated[existingSessionIndex] = sessionData;
          return updated;
        });
      } else {
        setChatSessions(prev => [sessionData, ...prev]);
      }
    }
  }, [messages, conversationId, userId, userSettings.autoSave, chatSessions]);

  const generateMessageId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId || !message.trim()) return;

    setLoading(true);
    const userMsg: Message = { 
      id: generateMessageId(),
      role: "user", 
      content: message.trim(),
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMsg]);

    const formData = new FormData();
    formData.append("user_id", userId);
    formData.append("message", message.trim());

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      
      const data = await res.json();
      const newConversationId = data.conversation_id ? String(data.conversation_id) : "";
      setConversationId(newConversationId);

      const assistantMsg: Message = {
        id: generateMessageId(),
        role: "assistant", 
        content: String(data.answer || "No response received"),
        timestamp: new Date()
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
      setMessage("");
      
      // Focus back to textarea
      textareaRef.current?.focus();
      
      toast.success("AI response received successfully");
      
    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        id: generateMessageId(),
        role: "system", 
        content: "Error: Unable to send message. Please check your connection and try again.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
      
      toast.error("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId("");
    setMessage("");
    textareaRef.current?.focus();
    toast.success("New chat started");
  };

  const loadChatSession = (sessionId: string) => {
    setConversationId(sessionId);
    setSidebarOpen(false);
    toast.success("Previous conversation restored");
  };

  const toggleStarSession = (sessionId: string) => {
    setChatSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, isStarred: !session.isStarred }
        : session
    ));
    setActiveDropdown(null);
  };

  const toggleArchiveSession = (sessionId: string) => {
    setChatSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, isArchived: !session.isArchived }
        : session
    ));
    setActiveDropdown(null);
  };

  const deleteSession = (sessionId: string) => {
    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
    if (conversationId === sessionId) {
      startNewChat();
    }
    toast.success("Conversation has been removed");
    setActiveDropdown(null);
  };

  const clearAllChats = () => {
    setMessages([]);
    setChatSessions([]);
    setConversationId("");
    localStorage.removeItem('chatSessions');
    toast.success("Chat history has been reset");
    setMainDropdownOpen(false);
  };

  const exportChat = () => {
    const chatData = {
      conversationId,
      userId,
      messages,
      settings: userSettings,
      exportedAt: new Date().toISOString(),
      version: "1.0"
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${conversationId || 'session'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Download started successfully");
    setMainDropdownOpen(false);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Message copied to clipboard");
  };

  const toggleStarMessage = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, isStarred: !msg.isStarred }
        : msg
    ));
  };

  const regenerateResponse = async () => {
    if (messages.length === 0) return;
    
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    if (!lastUserMessage) return;

    setLoading(true);
    setMainDropdownOpen(false);
    
    const formData = new FormData();
    formData.append("user_id", userId);
    formData.append("message", lastUserMessage.content);

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      
      const data = await res.json();

      const assistantMsg: Message = {
        id: generateMessageId(),
        role: "assistant", 
        content: String(data.answer || "No response received"),
        timestamp: new Date()
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
      
      toast.success("New AI response generated");
      
    } catch (err) {
      console.error(err);
      toast.error("Failed to regenerate response");
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = chatSessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         session.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStarFilter = !filterStarred || session.isStarred;
    
    return matchesSearch && matchesStarFilter && !session.isArchived;
  });

  // Custom Dropdown Component
  const CustomDropdown = ({ 
    children, 
    trigger, 
    isOpen, 
    onToggle, 
    align = "end" 
  }: { 
    children: React.ReactNode; 
    trigger: React.ReactNode; 
    isOpen: boolean; 
    onToggle: () => void;
    align?: "start" | "end";
  }) => (
    <div className="dropdown-container relative">
      <div onClick={onToggle} className="flex items-center">
        {trigger}
      </div>
      {isOpen && (
        <div className={`absolute top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 ${
          align === "end" ? "right-0" : "left-0"
        }`}>
          {children}
        </div>
      )}
    </div>
  );

  const DropdownItem = ({ 
    onClick, 
    children, 
    className = "",
    disabled = false 
  }: { 
    onClick: () => void; 
    children: React.ReactNode; 
    className?: string;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );

  // Custom Modal Component
  const CustomModal = ({ 
    isOpen, 
    onClose, 
    title, 
    children 
  }: { 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    children: React.ReactNode; 
  }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="modal-container relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {children}
          </div>
          
          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Custom Tabs Component
  const CustomTabs = ({ 
    tabs, 
    activeTab, 
    onTabChange, 
    children 
  }: { 
    tabs: { id: string; label: string }[]; 
    activeTab: string; 
    onTabChange: (tabId: string) => void; 
    children: React.ReactNode; 
  }) => (
    <div className="w-full">
      {/* Tab List */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="mt-4">
        {children}
      </div>
    </div>
  );

  // Mobile Sidebar Component
  const MobileSidebar = () => {
    if (!sidebarOpen) return null;

    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50" 
          onClick={() => setSidebarOpen(false)}
        />
        
        {/* Sidebar */}
        <div className="absolute left-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl">
          <div className="sr-only">
            <h2>Navigation Menu</h2>
            <p>Access chat history and settings</p>
          </div>
          <Sidebar />
        </div>
      </div>
    );
  };

  const Sidebar = () => (
    <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="h-5 w-5" />
            Chat History
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={startNewChat}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <Label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={filterStarred}
                onClick={() => setFilterStarred(!filterStarred)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  filterStarred ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    filterStarred ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
              <Star className="h-4 w-4" />
              Starred
            </Label>
          </div>
        </div>
      </div>

      {/* Chat Sessions */}
      <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
        <div className="space-y-2">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No chats found</p>
              {searchQuery && (
                <p className="text-xs mt-1">Try adjusting your search</p>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <Card 
                key={session.id} 
                className={`cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 group ${
                  session.id === conversationId ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''
                }`}
                onClick={() => loadChatSession(session.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                          {session.title}
                        </h3>
                        {session.isStarred && (
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
                        {session.lastMessage}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {session.messageCount} msgs
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {session.timestamp.toLocaleDateString()}
                          </span>
                        </div>
                        
                        <CustomDropdown
                          isOpen={activeDropdown === session.id}
                          onToggle={() => {
                            setActiveDropdown(activeDropdown === session.id ? null : session.id);
                          }}
                          trigger={
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          }
                        >
                          <DropdownItem onClick={() => toggleStarSession(session.id)}>
                            <Star className="h-4 w-4" />
                            {session.isStarred ? 'Unstar' : 'Star'}
                          </DropdownItem>
                          <DropdownItem onClick={() => toggleArchiveSession(session.id)}>
                            <Archive className="h-4 w-4" />
                            Archive
                          </DropdownItem>
                          <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                          <DropdownItem 
                            onClick={() => deleteSession(session.id)}
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownItem>
                        </CustomDropdown>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
              {userId ? userId.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {userId || 'Anonymous User'}
            </p>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center gap-2"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Theme
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2"
            data-modal-trigger
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-950 ${darkMode ? 'dark' : ''}`}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Settings Modal */}
      <CustomModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Settings"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Customize your chat experience and preferences.
        </p>
        
        <CustomTabs
          tabs={[
            { id: 'general', label: 'General' },
            { id: 'appearance', label: 'Appearance' }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-save conversations</Label>
                  <p className="text-sm text-gray-500">Automatically save chat sessions</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={userSettings.autoSave}
                  onClick={() => setUserSettings(prev => ({ ...prev, autoSave: !prev.autoSave }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    userSettings.autoSave ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      userSettings.autoSave ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-scroll</Label>
                  <p className="text-sm text-gray-500">Automatically scroll to new messages</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={userSettings.autoScroll}
                  onClick={() => setUserSettings(prev => ({ ...prev, autoScroll: !prev.autoScroll }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    userSettings.autoScroll ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      userSettings.autoScroll ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show timestamps</Label>
                  <p className="text-sm text-gray-500">Display message timestamps</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={userSettings.showTimestamps}
                  onClick={() => setUserSettings(prev => ({ ...prev, showTimestamps: !prev.showTimestamps }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    userSettings.showTimestamps ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      userSettings.showTimestamps ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Compact mode</Label>
                  <p className="text-sm text-gray-500">Reduce spacing for more content</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={userSettings.compactMode}
                  onClick={() => setUserSettings(prev => ({ ...prev, compactMode: !prev.compactMode }))}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    userSettings.compactMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      userSettings.compactMode ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </CustomTabs>
      </CustomModal>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Navigation Bar */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <MessageCircle className="h-8 w-8 text-blue-600" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    💬 RAG + Groq Chat Pro
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Powered by AI • {messages.length} messages
                  </p>
                </div>
              </div>
              
              {conversationId && typeof conversationId === 'string' && (
                <Badge variant="outline" className="hidden sm:inline-flex">
                  <Zap className="h-3 w-3 mr-1" />
                  {conversationId.slice(0, 8)}...
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={regenerateResponse}
                disabled={loading || messages.length === 0}
                className="hidden md:flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={exportChat}
                disabled={messages.length === 0}
                className="hidden md:flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={startNewChat}
                className="hidden sm:flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>

              <CustomDropdown
                isOpen={mainDropdownOpen}
                onToggle={() => setMainDropdownOpen(!mainDropdownOpen)}
                trigger={
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                }
              >
                <div className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600">
                  Actions
                </div>
                <DropdownItem onClick={startNewChat}>
                  <Plus className="h-4 w-4" />
                  New Chat
                </DropdownItem>
                <DropdownItem 
                  onClick={regenerateResponse} 
                  disabled={messages.length === 0}
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate Response
                </DropdownItem>
                <DropdownItem 
                  onClick={exportChat} 
                  disabled={messages.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Export Chat
                </DropdownItem>
                <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                <DropdownItem onClick={() => {
                  setSettingsOpen(true);
                  setMainDropdownOpen(false);
                }}>
                  <Settings className="h-4 w-4" />
                  Settings
                </DropdownItem>
                <DropdownItem onClick={() => setMainDropdownOpen(false)}>
                  <HelpCircle className="h-4 w-4" />
                  Help & Support
                </DropdownItem>
                <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                <DropdownItem 
                  onClick={clearAllChats}
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All Chats
                </DropdownItem>
              </CustomDropdown>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div className={`p-4 space-y-4 max-w-4xl mx-auto ${userSettings.compactMode ? 'space-y-2' : 'space-y-4'}`}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                  <div className="relative mb-6">
                    <MessageCircle className="h-20 w-20 text-gray-300 dark:text-gray-600" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <Zap className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Welcome to RAG + Groq Chat Pro
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                    Start a conversation with our AI assistant. Enter your user ID below and send your first message to begin.
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Secure
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Fast
                    </div>
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Smart
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 group ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    } ${userSettings.compactMode ? 'gap-2' : 'gap-3'}`}
                  >
                    {msg.role !== "user" && (
                      <Avatar className={`${userSettings.compactMode ? 'h-6 w-6' : 'h-8 w-8'} mt-1 flex-shrink-0`}>
                        <AvatarFallback className={`${
                          msg.role === "assistant" 
                            ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white" 
                            : "bg-red-600 text-white"
                        }`}>
                          {msg.role === "assistant" ? <Bot className="h-4 w-4" /> : "!"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} max-w-[75%] min-w-0`}>
                      <Card className={`${
                        msg.role === "user"
                          ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-600"
                          : msg.role === "assistant"
                          ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
                          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
                      } transition-all hover:shadow-md`}>
                        <CardContent className={`${userSettings.compactMode ? 'p-2' : 'p-3'} relative`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm leading-relaxed break-words ${
                                msg.role === "user" 
                                  ? "text-white" 
                                  : msg.role === "assistant"
                                  ? "text-gray-900 dark:text-white"
                                  : "text-red-800 dark:text-red-200"
                              }`}>
                                {msg.content}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyMessage(msg.content)}
                                className={`h-6 w-6 p-0 ${
                                  msg.role === "user" 
                                    ? "hover:bg-blue-700 text-blue-100" 
                                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleStarMessage(msg.id)}
                                className={`h-6 w-6 p-0 ${
                                  msg.role === "user" 
                                    ? "hover:bg-blue-700 text-blue-100" 
                                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                } ${msg.isStarred ? 'text-yellow-500' : ''}`}
                              >
                                <Star className={`h-3 w-3 ${msg.isStarred ? 'fill-current' : ''}`} />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {userSettings.showTimestamps && (
                        <span className="text-xs text-gray-400 mt-1 px-1">
                          {msg.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      )}
                    </div>

                    {msg.role === "user" && (
                      <Avatar className={`${userSettings.compactMode ? 'h-6 w-6' : 'h-8 w-8'} mt-1 flex-shrink-0`}>
                        <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))
              )}
              
              {loading && (
                <div className="flex justify-start gap-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-gray-400">AI is thinking...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </div>
        </main>

        {/* Input Bar */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-shrink-0">
                <Input
                  type="text"
                  placeholder="User ID"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-28"
                  required
                />
              </div>
              
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Type your message here... (Enter to send, Shift+Enter for new line)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[44px] max-h-32 resize-none pr-12"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                  required
                />
                <div className="absolute right-2 bottom-2 text-xs text-gray-400">
                  {message.length}/2000
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={loading || !userId || !message.trim()}
                className="flex-shrink-0 h-11 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span>Press Enter to send • Shift + Enter for new line</span>
                {userSettings.autoSave && (
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Auto-save enabled
                  </span>
                )}
              </div>
              {messages.length > 0 && (
                <span>{messages.length} messages • {chatSessions.length} conversations</span>
              )}
            </div>
          </form>
        </div>
      </div>
      
      <Toaster />
    </div>
  );
}

export default App;
