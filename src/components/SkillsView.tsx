import React, { useState } from 'react';
import { Cpu, CheckCircle2, Shield, Search, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SkillCategory } from '../types';

export const SkillsView: React.FC = () => {
  const { skills, setCurrentView } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories: ('All' | SkillCategory)[] = [
    'All',
    'Languages',
    'Frameworks & Libraries',
    'Architecture & Web Systems',
    'Developer Tools & Workflow'
  ];

  const filteredSkills = skills.filter((s) => {
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.professionalEvidence && s.professionalEvidence.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Curated Skills Inventory
          </h1>
          <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-semibold">
            {skills.length} Skill records
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Review the evidence supporting each skill before including it in an application.
        </p>
      </div>

      {skills.length === 0 && <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm space-y-2">
        <p>No skill records yet. Use Setup to selectively import structured records when applicable; records are not verified by presence.</p>
        <button type="button" className="text-emerald-600 font-medium" onClick={() => setCurrentView('candidate-setup')}>Return to Setup and import</button>
      </div>}

      {/* Filter & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills by name or evidence..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-1 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-800 text-white border border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSkills.map((s, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-900 dark:text-white text-sm">
                  {s.name}
                </span>
                {s.isCore && (
                  <span
                    className="p-1 rounded text-amber-500 bg-amber-50 dark:bg-amber-950/40"
                    title="Core Primary Skill"
                  >
                    <Star className="w-3 h-3 fill-amber-500" />
                  </span>
                )}
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                {s.confidence} Confidence
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-medium">
              Category: <span className="text-slate-600 dark:text-slate-300">{s.category}</span>
            </div>

            {s.professionalEvidence && (
              <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">
                  Professional Evidence
                </span>
                <p className="leading-snug">{s.professionalEvidence}</p>
              </div>
            )}

            {s.projectEvidence && !s.professionalEvidence && (
              <div className="text-xs text-slate-700 dark:text-slate-300 bg-indigo-50/40 dark:bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40 space-y-0.5">
                <span className="text-[10px] font-semibold text-indigo-500 uppercase block">
                  Project Evidence
                </span>
                <p className="leading-snug">{s.projectEvidence}</p>
              </div>
            )}

            <div className="flex items-center flex-wrap gap-1 pt-1 text-[10px] text-slate-400">
              <span>Families:</span>
              {(s.roleFamilies || s.roleFamilyRelevance || []).map((rf, rIdx) => (
                <span
                  key={rIdx}
                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                  {rf}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
