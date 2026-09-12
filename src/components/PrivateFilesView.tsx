import React, { useEffect, useState } from 'react';
import { workspaceRequest } from '../services/api';

export function PrivateFilesView() {
  const [files, setFiles] = useState<any[]>([]);
  const [purpose, setPurpose] = useState('evidence');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { try { setFiles((await workspaceRequest('/api/private/files')).files); } catch (err: any) { setMessage(err.message); } };
  useEffect(() => { void load(); }, []);
  return <section className="rounded-xl border border-slate-300 dark:border-slate-700 p-5 space-y-4">
    <h2 className="font-semibold">Private source files</h2>
    <p className="text-sm text-slate-500">PDF, UTF-8 text, LaTeX or JSON, up to 2 MiB. Downloads require your active owner session.</p>
    <select aria-label="File purpose" className="bg-transparent border rounded p-2" value={purpose} onChange={event => setPurpose(event.target.value)}>{['evidence', 'master-resume', 'resume-source', 'generated-resume', 'application-history'].map(value => <option key={value}>{value}</option>)}</select>
    <input aria-label="Upload private file" disabled={busy} type="file" accept=".pdf,.txt,.md,.tex,.json" onChange={async event => {
      const file = event.target.files?.[0]; if (!file) return;
      setBusy(true); setMessage('');
      try {
        if (file.size > 2 * 1024 * 1024) throw new Error('File exceeds 2 MiB.');
        const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
        const mimeType = file.name.endsWith('.pdf') ? 'application/pdf' : file.name.endsWith('.json') ? 'application/json' : file.name.endsWith('.tex') ? 'application/x-tex' : 'text/plain';
        await workspaceRequest('/api/private/files', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ originalFilename: file.name, mimeType, purpose, sourceType: 'user-upload', contentBase64: btoa(binary) }) });
        setMessage('File stored privately.'); await load();
      } catch (err: any) { setMessage(err.message); } finally { setBusy(false); }
    }} />
    {files.map(file => <div key={file.id} className="flex gap-4 text-sm"><a className="text-emerald-600" href={'/api/private/files/' + encodeURIComponent(file.id)}>{file.originalFilename}</a><span>{file.purpose}</span><button onClick={async () => { try { await workspaceRequest('/api/private/files/' + encodeURIComponent(file.id), { method: 'DELETE' }); await load(); } catch (err: any) { setMessage(err.message); } }}>Delete</button></div>)}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
