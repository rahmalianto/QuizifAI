import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Database, MessageSquare, Plus, Trash2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export default function ChatPage() {
  const { user } = useAuth();
  
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch sessions on load
  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSessions(data || []);
      
      // If we have sessions but none selected, select the first one
      if (data && data.length > 0 && !activeSessionId) {
        handleSelectSession(data[0].id);
      } else if (!data || data.length === 0) {
        startNewChat();
      }
    } catch (err) {
      toast.error('Failed to load chat history');
    }
  };

  const handleSelectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    setIsFetchingHistory(true);
    setMessages([]);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        setMessages(data.map(m => ({
          role: m.role,
          content: m.content,
          context: m.context_used
        })));
      } else {
        setMessages([
          { role: 'assistant', content: 'Hello! I am your OneNote Knowledge Base assistant. Ask me anything about the pages you have ingested.' }
        ]);
      }
    } catch (err) {
      toast.error('Failed to load messages');
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([
      { role: 'assistant', content: 'Hello! I am your OneNote Knowledge Base assistant. Ask me anything about the pages you have ingested.' }
    ]);
  };
  
  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId);
      if (error) throw error;
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        startNewChat();
      }
      toast.success('Chat deleted');
    } catch (err) {
      toast.error('Failed to delete chat');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('rag-handler', {
        body: {
          action: 'chat',
          query: userQuery,
          sessionId: activeSessionId
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.answer, context: data.context }]);
      
      // If this was a new chat, the backend created a session. Update state.
      if (!activeSessionId && data.sessionId) {
        setActiveSessionId(data.sessionId);
        // Refresh sessions list to show the new session
        fetchSessions();
      }
    } catch (err) {
      toast.error(err.message || 'Failed to get a response');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error while searching the knowledge base.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="page" style={{ height: '100vh', paddingTop: 'var(--navbar-height)', paddingBottom: 0, paddingLeft: 0, paddingRight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="container" style={{ maxWidth: '1200px', flex: 1, display: 'flex', height: '100%', padding: 'var(--space-6)', gap: 'var(--space-6)' }}>
          
          {/* Sidebar */}
          <div 
            style={{ 
              width: '280px', 
              display: 'flex', 
              flexDirection: 'column', 
              backgroundColor: 'white', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--neutral-200)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--neutral-200)' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}
                onClick={startNewChat}
              >
                <Plus size={18} /> New Chat
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-2)' }}>
              {sessions.length === 0 ? (
                <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--neutral-500)', fontSize: 'var(--text-sm)' }}>
                  No chat history found.
                </div>
              ) : (
                sessions.map(session => (
                  <div 
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      backgroundColor: activeSessionId === session.id ? 'var(--primary-light)' : 'transparent',
                      color: activeSessionId === session.id ? 'var(--primary)' : 'var(--neutral-700)',
                      marginBottom: 'var(--space-1)'
                    }}
                    onMouseEnter={(e) => { if (activeSessionId !== session.id) e.currentTarget.style.backgroundColor = 'var(--neutral-100)'; }}
                    onMouseLeave={(e) => { if (activeSessionId !== session.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', overflow: 'hidden' }}>
                      <MessageSquare size={16} style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 'var(--text-sm)' }}>
                        {session.title}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => deleteSession(session.id, e)}
                      style={{ background: 'none', border: 'none', color: 'var(--neutral-400)', cursor: 'pointer', padding: '4px' }}
                      title="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div 
            className="card" 
            style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden',
              padding: 0,
              backgroundColor: 'var(--neutral-50)',
              border: '1px solid var(--neutral-200)'
            }}
          >
            <div className="page-header" style={{ textAlign: 'center', padding: 'var(--space-4)', borderBottom: '1px solid var(--neutral-200)', backgroundColor: 'white', margin: 0 }}>
              <h1 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-1)' }}>Knowledge Base Q&A</h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)', margin: 0 }}>
                Chat with your synced OneNote notes
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {isFetchingHistory ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      gap: 'var(--space-3)', 
                      alignItems: 'flex-start',
                      flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                    }}
                  >
                    <div 
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '50%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexShrink: 0,
                        backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'var(--neutral-200)',
                        color: msg.role === 'user' ? 'white' : 'var(--neutral-600)'
                      }}
                    >
                      {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                    </div>
                    
                    <div 
                      style={{ 
                        maxWidth: '75%', 
                        padding: 'var(--space-3) var(--space-4)', 
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: msg.role === 'user' ? 'var(--primary)' : 'white',
                        color: msg.role === 'user' ? 'white' : 'var(--neutral-800)',
                        border: msg.role === 'user' ? 'none' : '1px solid var(--neutral-200)',
                        borderTopRightRadius: msg.role === 'user' ? '2px' : 'var(--radius-lg)',
                        borderTopLeftRadius: msg.role === 'assistant' ? '2px' : 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: 'var(--text-sm)' }}>
                        {msg.content}
                      </div>
                      {msg.context && msg.context.length > 0 && (
                        <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: msg.role === 'user' ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--neutral-200)', fontSize: '11px', color: msg.role === 'user' ? 'rgba(255,255,255,0.8)' : 'var(--neutral-500)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <Database size={12} />
                            <span>Sources used: {msg.context.length} chunks</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--neutral-200)', color: 'var(--neutral-600)' }}>
                    <Bot size={18} />
                  </div>
                  <div style={{ padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)', backgroundColor: 'white', border: '1px solid var(--neutral-200)', borderTopLeftRadius: '2px' }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--neutral-400)' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{ padding: 'var(--space-4)', backgroundColor: 'white', borderTop: '1px solid var(--neutral-200)' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about your notes..."
                  disabled={isLoading || isFetchingHistory}
                  style={{ 
                    flex: 1, 
                    padding: 'var(--space-3)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--neutral-300)',
                    outline: 'none'
                  }}
                />
                <button 
                  type="submit" 
                  disabled={!input.trim() || isLoading || isFetchingHistory}
                  style={{ 
                    padding: '0 var(--space-4)', 
                    backgroundColor: 'var(--primary)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 'var(--radius-md)',
                    cursor: (!input.trim() || isLoading || isFetchingHistory) ? 'not-allowed' : 'pointer',
                    opacity: (!input.trim() || isLoading || isFetchingHistory) ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
