/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SearchResultMemory } from '../types';
import { Search, Database, Calendar, Tag, Sparkles, Loader2, ArrowUpRight } from 'lucide-react';

interface PineconeSearchProps {
  activeTranscript?: string;
}

export default function PineconeSearch({ activeTranscript }: PineconeSearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultMemory[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/semantic-memory-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          activeMeetingTranscript: activeTranscript,
        }),
      });

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("Vector search query failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-5 shadow-lg flex flex-col h-full" id="pinecone-card">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-base font-semibold text-white tracking-tight">Pinecone Vector Memory</h3>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-mono uppercase font-bold tracking-wider">Sponsor Tech</span>
            </div>
            <p className="font-sans text-[11px] text-slate-400 mt-0.5">
              Semantic lookup across historical indexes utilizing text-embeddings.
            </p>
          </div>
        </div>
      </div>

      {/* Query Bar */}
      <form onSubmit={handleSearch} className="relative mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-hidden font-sans transition-all"
            placeholder="Ask semantic questions (e.g. 'What was agreed about whiteboard design?')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            id="pinecone-query-input"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-sans text-xs font-semibold shadow-md transition-colors cursor-pointer flex items-center justify-center min-w-[80px]"
          id="btn-pinecone-search"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Retrieve'}
        </button>
      </form>

      {/* Results Container */}
      <div className="flex-1 max-h-[300px] overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
        {results.length === 0 ? (
          <div className="text-center py-6 px-4 bg-slate-950/50 rounded-xl border border-slate-800/50">
            <Sparkles className="w-5 h-5 text-slate-600 mx-auto mb-2" />
            <p className="font-sans text-xs text-slate-400">
              {query ? 'No matching historical embeddings located.' : 'Search semantic memory to automatically resolve context from previous meeting streams.'}
            </p>
            <span className="block text-[10px] text-slate-500 font-mono mt-1">
              Powered by Pinecone semantic indexing models.
            </span>
          </div>
        ) : (
          results.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-slate-950 hover:bg-slate-950/80 rounded-xl border border-slate-800/60 hover:border-slate-800 transition-all flex flex-col gap-2"
              id={`pinecone-result-${item.id}`}
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-800/40 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-display text-xs font-semibold text-slate-200">
                    {item.meetingTitle}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400">({item.date})</span>
                </div>

                {/* Score badge indicator */}
                <div className="flex items-center gap-1">
                  <span className="font-mono text-[9px] font-bold text-emerald-400">
                    {(item.score * 100).toFixed(0)}% Match
                  </span>
                  <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden block">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${item.score * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Matched text quote details */}
              <p className="font-sans text-xs text-slate-300 italic leading-relaxed pl-2 border-l-2 border-emerald-500/40">
                "{item.matchedText}"
              </p>

              <div className="flex items-center justify-between text-[10px] text-slate-500 font-sans pt-1 mt-0.5">
                <span className="truncate max-w-[240px]">Context: {item.contextSegment}</span>
                <span className="text-[9px] font-mono text-emerald-500/80 flex items-center gap-0.5 whitespace-nowrap">
                  Vector Segment <ArrowUpRight className="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span>Embedding Model: text-embedding-004</span>
        <span className="text-emerald-500">Cloud Host: Active AWS us-east-1</span>
      </div>
    </div>
  );
}
