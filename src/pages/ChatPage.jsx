import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Database } from 'lucide-react';
import Navbar from '../components/Navbar';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your OneNote Knowledge Base assistant. Ask me anything about the pages you have ingested.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
          query: userQuery
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: 'assistant', content: data.answer, context: data.context }]);
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
      <main className="page" style={{ height: 'calc(100vh - 64px)', padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="container" style={{ maxWidth: '800px', flex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-6)' }}>
          <div className="page-header" style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-1)' }}>Knowledge Base Q&A</h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)', margin: 0 }}>
              Chat with your synced OneNote notes
            </p>
          </div>

          {/* Chat Window */}
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
            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {messages.map((msg, idx) => (
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
                      <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--neutral-200)', fontSize: '11px', color: 'var(--neutral-500)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <Database size={12} />
                          <span>Sources used: {msg.context.length} chunks</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
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
                  disabled={isLoading}
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
                  disabled={!input.trim() || isLoading}
                  style={{ 
                    padding: '0 var(--space-4)', 
                    backgroundColor: 'var(--primary)', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: 'var(--radius-md)',
                    cursor: (!input.trim() || isLoading) ? 'not-allowed' : 'pointer',
                    opacity: (!input.trim() || isLoading) ? 0.5 : 1,
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
