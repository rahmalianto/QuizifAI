import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import { Save, Eye, EyeOff, Settings, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const PROVIDER_OPTIONS = [
  { id: 'google', name: 'Google AI Studio', defaultModel: 'gemini-2.5-flash', placeholder: 'AIzaSy...' },
  { id: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o-mini', placeholder: 'sk-proj-...' },
  { id: 'anthropic', name: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022', placeholder: 'sk-ant-...' },
  { id: 'groq', name: 'Groq', defaultModel: 'llama-3.3-70b-versatile', placeholder: 'gsk_...' },
  { id: 'cloudflare', name: 'Cloudflare Workers AI', defaultModel: '@cf/meta/llama-3-8b-instruct', placeholder: 'ACCOUNT_ID:TOKEN' }
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState([]);
  const [showKeys, setShowKeys] = useState({});
  const [testingKeys, setTestingKeys] = useState({});
  const [removedProviders, setRemovedProviders] = useState([]);

  useEffect(() => { fetchConfigs(); }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('user_api_configs')
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      if (data && data.length > 0) {
        setConfigs(data.map((c, idx) => ({ ...c, priority: idx })));
      } else {
        setConfigs([{ provider: 'google', api_key: '', model_name: 'gemini-2.5-flash', is_enabled: true, priority: 0 }]);
      }
      setRemovedProviders([]);
    } catch (err) {
      console.error('Error fetching API configs:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (index, field, value) => {
    setConfigs(prev => prev.map((c, idx) => {
      if (idx !== index) return c;
      const updated = { ...c, [field]: value };
      if (field === 'provider') {
        const info = PROVIDER_OPTIONS.find(p => p.id === value);
        if (info) updated.model_name = info.defaultModel;
      }
      return updated;
    }));
  };

  const handlePriorityChange = (index, newPriority) => {
    const oldPriority = configs[index].priority;
    if (oldPriority === newPriority) return;
    const next = configs.map((c, idx) => {
      if (idx === index) return { ...c, priority: newPriority };
      if (c.priority === newPriority) return { ...c, priority: oldPriority };
      return c;
    });
    next.sort((a, b) => a.priority - b.priority);
    setConfigs(next);
  };

  const handleAddKey = () => {
    const used = configs.map(c => c.provider);
    const unused = PROVIDER_OPTIONS.find(p => !used.includes(p.id));
    setConfigs(prev => [...prev, {
      provider: unused ? unused.id : 'google',
      api_key: '',
      model_name: unused ? unused.defaultModel : 'gemini-2.5-flash',
      is_enabled: true,
      priority: prev.length
    }]);
  };

  const handleRemoveRow = (index) => {
    const target = configs[index];
    if (target.id) setRemovedProviders(prev => [...prev, target.provider]);
    const filtered = configs.filter((_, idx) => idx !== index);
    filtered.forEach((c, idx) => { c.priority = idx; });
    setConfigs(filtered);
  };

  const handleTestKey = async (index) => {
    const config = configs[index];
    if (!config.api_key.trim()) {
      toast.error('Please enter an API key to test');
      return;
    }

    setTestingKeys(prev => ({ ...prev, [index]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('test-api-key', {
        body: { provider: config.provider, api_key: config.api_key.trim(), model_name: config.model_name.trim() }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Success! ${PROVIDER_OPTIONS.find(p => p.id === config.provider).name} key is valid.`);
      } else {
        toast.error(`Invalid API Key: ${data?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error testing key:', err);
      toast.error('Failed to test API key. Please check your connection.');
    } finally {
      setTestingKeys(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const enabledCount = configs.filter(c => c.is_enabled && c.api_key.trim()).length;
      if (enabledCount === 0) {
        toast.error('Enable at least one provider with a valid API key.');
        setSaving(false);
        return;
      }
      const provs = configs.map(c => c.provider);
      if (provs.some((v, i) => provs.indexOf(v) !== i)) {
        toast.error('Duplicate providers found.');
        setSaving(false);
        return;
      }
      if (removedProviders.length > 0) {
        const { error: delErr } = await supabase.from('user_api_configs').delete().eq('user_id', user.id).in('provider', removedProviders);
        if (delErr) throw delErr;
      }
      const rows = configs.map(c => ({
        user_id: user.id,
        provider: c.provider,
        api_key: c.api_key.trim(),
        model_name: c.model_name.trim() || PROVIDER_OPTIONS.find(p => p.id === c.provider).defaultModel,
        priority: c.priority,
        is_enabled: c.is_enabled
      }));
      const { error } = await supabase.from('user_api_configs').upsert(rows, { onConflict: 'user_id,provider' });
      if (error) throw error;
      toast.success('Settings saved!');
      fetchConfigs();
    } catch (err) {
      console.error('Error saving configs:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const priorityLabel = (p) => {
    if (p === 0) return '1st (Primary)';
    if (p === 1) return '2nd (Fallback)';
    if (p === 2) return '3rd (Fallback)';
    return `${p + 1}th`;
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 8px',
  };
  const thStyle = {
    padding: '0 8px 4px',
    fontSize: 'var(--text-xs)',
    fontWeight: 'var(--weight-semibold)',
    color: 'var(--neutral-500)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '8px',
    verticalAlign: 'middle',
  };

  return (
    <div className="page-layout">
      <Navbar />
      <main className="main-content" id="settings-page">
        <div className="container py-5">
          <div className="card max-w-5xl mx-auto shadow-sm">
            <div className="card-header d-flex align-items-center gap-2">
              <Settings className="text-primary" size={24} />
              <h1 className="h4 mb-0">AI Provider Settings</h1>
            </div>

            <div className="card-body" style={{ overflowX: 'auto' }}>
              {loading ? (
                <div className="text-center py-5"><div className="spinner spinner-md"></div></div>
              ) : (
                <>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>API Provider</th>
                        <th style={thStyle}>API Priority</th>
                        <th style={thStyle}>API Key</th>
                        <th style={{ ...thStyle, textAlign: 'center' }}>Disabled</th>
                        <th style={thStyle}>AI Model Code</th>
                        <th style={{ ...thStyle, width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {configs.map((config, index) => {
                        const info = PROVIDER_OPTIONS.find(p => p.id === config.provider) || PROVIDER_OPTIONS[0];
                        const used = configs.map(c => c.provider).filter(p => p !== config.provider);
                        const available = PROVIDER_OPTIONS.filter(o => !used.includes(o.id));
                        const rowBg = config.is_enabled ? 'var(--neutral-50)' : 'var(--danger-50)';

                        return (
                          <tr key={index} style={{ background: rowBg, borderRadius: 'var(--radius-md)' }}>
                            {/* API Provider */}
                            <td style={tdStyle}>
                              <select
                                className="form-select form-select-sm"
                                value={config.provider}
                                onChange={(e) => handleRowChange(index, 'provider', e.target.value)}
                                style={{ minWidth: '140px' }}
                              >
                                {available.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                              </select>
                            </td>

                            {/* API Priority */}
                            <td style={tdStyle}>
                              <select
                                className="form-select form-select-sm"
                                value={config.priority}
                                onChange={(e) => handlePriorityChange(index, parseInt(e.target.value))}
                                style={{ minWidth: '130px' }}
                              >
                                {configs.map((_, idx) => (
                                  <option key={idx} value={idx}>{priorityLabel(idx)}</option>
                                ))}
                              </select>
                            </td>

                            {/* API Key */}
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: '180px' }}>
                                <input
                                  type={showKeys[index] ? 'text' : 'password'}
                                  className="form-control form-control-sm"
                                  placeholder={info.placeholder}
                                  value={config.api_key}
                                  onChange={(e) => handleRowChange(index, 'api_key', e.target.value)}
                                  style={{ flex: 1 }}
                                />
                                <button
                                  className="btn btn-ghost btn-sm p-1"
                                  type="button"
                                  onClick={() => setShowKeys(prev => ({ ...prev, [index]: !prev[index] }))}
                                  title={showKeys[index] ? 'Hide key' : 'Show key'}
                                  style={{ lineHeight: 1 }}
                                >
                                  {showKeys[index] ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </td>

                            {/* Disabled checkbox */}
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={!config.is_enabled}
                                onChange={(e) => handleRowChange(index, 'is_enabled', !e.target.checked)}
                                title={config.is_enabled ? 'Click to disable' : 'Click to enable'}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                            </td>

                            {/* Default Model */}
                            <td style={tdStyle}>
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder={info.defaultModel}
                                value={config.model_name}
                                onChange={(e) => handleRowChange(index, 'model_name', e.target.value)}
                                style={{ minWidth: '160px' }}
                              />
                            </td>

                            {/* Actions (Check & Remove) */}
                            <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <button
                                className="btn btn-ghost btn-sm p-1 me-2"
                                onClick={() => handleTestKey(index)}
                                disabled={testingKeys[index] || !config.api_key.trim()}
                                title="Test API Key"
                                style={{ color: 'var(--primary-600)', lineHeight: 1 }}
                              >
                                {testingKeys[index] ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm p-1"
                                onClick={() => handleRemoveRow(index)}
                                disabled={configs.length === 1}
                                title="Remove"
                                style={{ color: configs.length > 1 ? 'var(--danger-500)' : 'var(--neutral-300)', lineHeight: 1 }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {(() => {
                    const hasEmptyKey = configs.some(c => !c.api_key.trim());
                    return (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={handleAddKey}
                          disabled={configs.length >= PROVIDER_OPTIONS.length || hasEmptyKey}
                          title={hasEmptyKey ? 'Fill all existing API keys first' : ''}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', borderStyle: 'dashed' }}
                        >
                          <Plus size={16} /> Add API Key
                        </button>

                        <button
                          className="btn btn-primary"
                          onClick={handleSave}
                          disabled={saving || loading || hasEmptyKey}
                          title={hasEmptyKey ? 'Fill all API keys before saving' : ''}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
