import { useState, useEffect } from 'react';
import { BookOpen, ArrowRight, ArrowLeft, Database, Loader2, Server } from 'lucide-react';
import Navbar from '../components/Navbar';
import OneNoteBrowser from '../components/OneNoteBrowser';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function KnowledgeBasePage() {
  const { providerToken, connectMicrosoft, user } = useAuth();
  
  const [step, setStep] = useState(0);
  const [selectedPages, setSelectedPages] = useState([]);
  const [canProceed, setCanProceed] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);

  // Auto-connect if needed? Let the user click a button if not connected.

  const handleSelectionChange = ({ selectedPageIds }) => {
    setSelectedPages(selectedPageIds);
  };

  const handlePagesContentReady = async (text) => {
    // This is called when OneNoteBrowser finishes fetching text for the selected pages.
    // Instead of generating questions, we will send this text to our Edge Function for ingestion.
    if (!text || text.trim().length === 0) {
      toast.error('No text content extracted from selected pages');
      setIsIngesting(false);
      return;
    }

    try {
      // In this simple implementation, we just pass all combined text as one "pageId" for simplicity
      // Or we can just use a timestamp as a batch ID. 
      const batchId = `onenote_batch_${Date.now()}`;
      
      const { data, error } = await supabase.functions.invoke('rag-handler', {
        body: {
          action: 'ingest',
          pageId: batchId,
          text: text,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Successfully ingested ${data.chunksIngested} chunks of text!`);
      setStep(0);
      setSelectedPages([]);
    } catch (err) {
      toast.error(err.message || 'Failed to ingest pages into knowledge base');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleIngestClick = () => {
    setIsIngesting(true);
    // Trigger the OneNoteBrowser to fetch content
    window.dispatchEvent(new CustomEvent('onenote-fetch-content'));
  };

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="page-header" style={{ textAlign: 'center' }}>
            <h1>Knowledge Base</h1>
            <p>Select OneNote pages to embed into your vector database for Q&A.</p>
          </div>

          {!providerToken ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <BookOpen size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--neutral-400)' }} />
              <h3>Connect to Microsoft</h3>
              <p style={{ color: 'var(--neutral-500)', marginBottom: 'var(--space-6)' }}>
                You need to connect your Microsoft account to browse OneNote.
              </p>
              <button className="btn btn-primary" onClick={connectMicrosoft}>
                Sign in with Microsoft
              </button>
            </div>
          ) : (
            <div className="animate-in">
              <OneNoteBrowser
                accessToken={providerToken}
                step={step}
                onSelectionChange={handleSelectionChange}
                onPagesContentReady={handlePagesContentReady}
                onCanProceedChange={setCanProceed}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
                {step === 1 ? (
                  <>
                    <button className="btn btn-secondary btn-lg" onClick={() => setStep(0)} disabled={isIngesting}>
                      <ArrowLeft size={18} /> Back
                    </button>
                    <button
                      className="btn btn-primary btn-lg"
                      disabled={!canProceed || isIngesting}
                      onClick={handleIngestClick}
                    >
                      {isIngesting ? (
                        <>
                          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                          Ingesting...
                        </>
                      ) : (
                        <>
                          <Database size={18} /> Ingest Pages
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                    <button
                      className="btn btn-primary btn-lg"
                      disabled={!canProceed}
                      onClick={() => setStep(1)}
                    >
                      Select Pages <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
