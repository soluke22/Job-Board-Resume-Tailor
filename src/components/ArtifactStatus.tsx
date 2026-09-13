import React from 'react';
import { useApp } from '../context/AppContext';

export function ArtifactStatus({artifact}:{artifact:any}) {
  const {evidence}=useApp();
  const p=artifact?.provenance;
  return <div className="text-xs text-slate-300 space-y-1">
    <p>{p?.validationStatus?.replaceAll('_',' ') || 'DRAFT'} · Review before use. Nothing is sent or submitted.</p>
    {p?.issues?.length>0 && <p className="text-amber-300">{p.issues.join(' · ')}</p>}
    {p?.supportingEvidenceIds?.length>0 && <details><summary className="cursor-pointer">Supporting evidence ({p.supportingEvidenceIds.length})</summary>
      {p.supportingEvidenceIds.map((id:string)=><p key={id} className="mt-2 whitespace-pre-wrap">{evidence.find(e=>e.id===id)?.rawEvidence || 'Source unavailable'}</p>)}
    </details>}
  </div>;
}
