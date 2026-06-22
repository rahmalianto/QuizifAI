import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  FolderOpen,
  FileText,
  Check,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { OneNoteService } from '../services/oneNoteService';

/**
 * OneNoteBrowser — An inline component that lets the user browse
 * their OneNote notebooks, sections, and select pages.
 *
 * The parent controls the active `step` prop:
 *   step 0 = Select notebook & section
 *   step 1 = Select pages (checkboxes)
 *
 * Callbacks:
 *   onSelectionChange({ notebook, section, selectedPageIds }) — fires on any selection
 *   onPagesContentReady(combinedText) — fires when page text is fetched
 *   onCanProceedChange(canProceed) — tells parent if navigation is allowed
 */
export default function OneNoteBrowser({
  accessToken,
  step,
  onSelectionChange,
  onPagesContentReady,
  onCanProceedChange,
}) {
  const service = useMemo(
    () => new OneNoteService(accessToken),
    [accessToken]
  );

  // Data state
  const [notebooks, setNotebooks] = useState([]);
  const [sections, setSections] = useState([]);
  const [pages, setPages] = useState([]);

  // Selection state
  const [selectedNotebook, setSelectedNotebook] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedPageIds, setSelectedPageIds] = useState(new Set());

  // Loading / error state
  const [loadingNotebooks, setLoadingNotebooks] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingPages, setLoadingPages] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notebooks on mount
  useEffect(() => {
    fetchNotebooks();
  }, [accessToken]);

  // Notify parent of proceed-ability
  useEffect(() => {
    if (step === 0) {
      onCanProceedChange?.(!!selectedSection);
    } else if (step === 1) {
      onCanProceedChange?.(selectedPageIds.size > 0 && !loadingContent);
    }
  }, [step, selectedSection, selectedPageIds, loadingContent]);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.({
      notebook: selectedNotebook,
      section: selectedSection,
      selectedPageIds: Array.from(selectedPageIds),
    });
  }, [selectedNotebook, selectedSection, selectedPageIds]);

  // When transitioning from step 1 to step 2 (parent advances), fetch content
  const fetchSelectedPagesContent = useCallback(async () => {
    if (selectedPageIds.size === 0) return;

    try {
      setLoadingContent(true);
      setError(null);
      const ids = Array.from(selectedPageIds);
      const combinedText = await service.getCombinedPageText(ids);
      onPagesContentReady?.(combinedText);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingContent(false);
    }
  }, [selectedPageIds, service, onPagesContentReady]);

  // Listen for parent's request to fetch content (triggered via CustomEvent)
  useEffect(() => {
    const handleFetchRequest = () => {
      fetchSelectedPagesContent();
    };
    window.addEventListener('onenote-fetch-content', handleFetchRequest);
    return () => {
      window.removeEventListener('onenote-fetch-content', handleFetchRequest);
    };
  }, [fetchSelectedPagesContent]);

  const fetchNotebooks = async () => {
    try {
      setLoadingNotebooks(true);
      setError(null);
      const data = await service.getNotebooks();
      setNotebooks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingNotebooks(false);
    }
  };

  const handleSelectNotebook = async (notebook) => {
    setSelectedNotebook(notebook);
    setSelectedSection(null);
    setSections([]);
    setPages([]);
    setSelectedPageIds(new Set());

    try {
      setLoadingSections(true);
      setError(null);
      const data = await service.getSections(notebook.id);
      setSections(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSections(false);
    }
  };

  const handleSelectSection = async (section) => {
    setSelectedSection(section);
    setPages([]);
    setSelectedPageIds(new Set());

    try {
      setLoadingPages(true);
      setError(null);
      const data = await service.getPages(section.id);
      setPages(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPages(false);
    }
  };

  const togglePage = (pageId) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const selectAllPages = () => {
    setSelectedPageIds(new Set(pages.map((p) => p.id)));
  };

  const deselectAllPages = () => {
    setSelectedPageIds(new Set());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Error banner
  const renderError = () => {
    if (!error) return null;
    return (
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
          color: 'var(--danger)',
          fontSize: 'var(--text-sm)',
        }}
      >
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    );
  };

  // ========== STEP 0: Select Notebook & Section ==========
  if (step === 0) {
    return (
      <div className="animate-in">
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-5)',
            }}
          >
            <h3 style={{ margin: 0 }}>
              <BookOpen
                size={20}
                style={{ marginRight: 'var(--space-2)', verticalAlign: 'middle' }}
              />
              Select Notebook & Section
            </h3>
            <button
              className="btn btn-ghost btn-sm"
              onClick={fetchNotebooks}
              disabled={loadingNotebooks}
              title="Refresh notebooks"
            >
              <RefreshCw
                size={14}
                style={{
                  animation: loadingNotebooks ? 'spin 1s linear infinite' : 'none',
                }}
              />
            </button>
          </div>

          {renderError()}

          {/* Notebooks list */}
          {loadingNotebooks ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-8)',
                color: 'var(--neutral-400)',
              }}
            >
              <Loader2
                size={18}
                style={{ animation: 'spin 1s linear infinite' }}
              />
              Loading notebooks...
            </div>
          ) : notebooks.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-8)',
                color: 'var(--neutral-400)',
              }}
            >
              No notebooks found in your OneNote account.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <label
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--weight-semibold)',
                  color: 'var(--neutral-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 'var(--space-1)',
                }}
              >
                Notebooks
              </label>
              {notebooks.map((nb) => (
                <button
                  key={nb.id}
                  onClick={() => handleSelectNotebook(nb)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    border:
                      selectedNotebook?.id === nb.id
                        ? '2px solid var(--primary)'
                        : '1px solid var(--neutral-200)',
                    background:
                      selectedNotebook?.id === nb.id
                        ? 'rgba(99, 102, 241, 0.05)'
                        : 'var(--neutral-50)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.15s ease',
                    fontSize: 'var(--text-sm)',
                    fontWeight:
                      selectedNotebook?.id === nb.id
                        ? 'var(--weight-semibold)'
                        : 'var(--weight-normal)',
                    color: 'var(--neutral-800)',
                  }}
                >
                  <BookOpen
                    size={18}
                    style={{
                      color:
                        selectedNotebook?.id === nb.id
                          ? 'var(--primary)'
                          : 'var(--neutral-400)',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1 }}>{nb.displayName}</span>
                  {selectedNotebook?.id === nb.id && (
                    <Check size={16} style={{ color: 'var(--primary)' }} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Sections list (appears after notebook is selected) */}
          {selectedNotebook && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <div
                style={{
                  width: '100%',
                  height: '1px',
                  background: 'var(--neutral-200)',
                  marginBottom: 'var(--space-5)',
                }}
              />

              {loadingSections ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-6)',
                    color: 'var(--neutral-400)',
                  }}
                >
                  <Loader2
                    size={18}
                    style={{ animation: 'spin 1s linear infinite' }}
                  />
                  Loading sections...
                </div>
              ) : sections.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: 'var(--space-6)',
                    color: 'var(--neutral-400)',
                  }}
                >
                  This notebook has no sections.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                  }}
                >
                  <label
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--weight-semibold)',
                      color: 'var(--neutral-500)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    Sections in "{selectedNotebook.displayName}"
                  </label>
                  {sections.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => handleSelectSection(sec)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderRadius: 'var(--radius-md)',
                        border:
                          selectedSection?.id === sec.id
                            ? '2px solid var(--primary)'
                            : '1px solid var(--neutral-200)',
                        background:
                          selectedSection?.id === sec.id
                            ? 'rgba(99, 102, 241, 0.05)'
                            : 'var(--neutral-50)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        transition: 'all 0.15s ease',
                        fontSize: 'var(--text-sm)',
                        fontWeight:
                          selectedSection?.id === sec.id
                            ? 'var(--weight-semibold)'
                            : 'var(--weight-normal)',
                        color: 'var(--neutral-800)',
                      }}
                    >
                      <FolderOpen
                        size={18}
                        style={{
                          color:
                            selectedSection?.id === sec.id
                              ? 'var(--primary)'
                              : 'var(--neutral-400)',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1 }}>{sec.displayName}</span>
                      {selectedSection?.id === sec.id && (
                        <Check size={16} style={{ color: 'var(--primary)' }} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== STEP 1: Select Pages (checkboxes) ==========
  if (step === 1) {
    return (
      <div className="animate-in">
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-5)',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
            }}
          >
            <div>
              <h3 style={{ margin: 0 }}>
                <FileText
                  size={20}
                  style={{
                    marginRight: 'var(--space-2)',
                    verticalAlign: 'middle',
                  }}
                />
                Select Pages
              </h3>
              <p
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--neutral-500)',
                  marginTop: 'var(--space-1)',
                  marginBottom: 0,
                }}
              >
                {selectedNotebook?.displayName} → {selectedSection?.displayName}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={selectAllPages}
                disabled={pages.length === 0}
              >
                Select All
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={deselectAllPages}
                disabled={selectedPageIds.size === 0}
              >
                Deselect All
              </button>
            </div>
          </div>

          {renderError()}

          {loadingPages ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-8)',
                color: 'var(--neutral-400)',
              }}
            >
              <Loader2
                size={18}
                style={{ animation: 'spin 1s linear infinite' }}
              />
              Loading pages...
            </div>
          ) : pages.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--space-8)',
                color: 'var(--neutral-400)',
              }}
            >
              This section has no pages.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              {pages.map((page) => {
                const isSelected = selectedPageIds.has(page.id);
                return (
                  <label
                    key={page.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected
                        ? '2px solid var(--primary)'
                        : '1px solid var(--neutral-200)',
                      background: isSelected
                        ? 'rgba(99, 102, 241, 0.05)'
                        : 'var(--neutral-50)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => togglePage(page.id)}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: 'var(--primary)',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    />
                    <FileText
                      size={16}
                      style={{
                        color: isSelected
                          ? 'var(--primary)'
                          : 'var(--neutral-400)',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 'var(--text-sm)',
                          fontWeight: isSelected
                            ? 'var(--weight-semibold)'
                            : 'var(--weight-normal)',
                          color: 'var(--neutral-800)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {page.title || 'Untitled Page'}
                      </div>
                      {page.lastModifiedDateTime && (
                        <div
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--neutral-400)',
                            marginTop: '2px',
                          }}
                        >
                          Modified {formatDate(page.lastModifiedDateTime)}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {/* Selection summary */}
          {pages.length > 0 && (
            <div
              style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--neutral-100)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                color: 'var(--neutral-600)',
                textAlign: 'center',
              }}
            >
              {selectedPageIds.size} of {pages.length} page
              {pages.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Loading overlay when fetching page content */}
        {loadingContent && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-4)',
              color: 'var(--neutral-500)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <Loader2
              size={18}
              style={{ animation: 'spin 1s linear infinite' }}
            />
            Fetching page content...
          </div>
        )}
      </div>
    );
  }

  return null;
}
