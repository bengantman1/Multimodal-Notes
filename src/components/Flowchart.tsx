/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DiagramData, DiagramNode } from '../types';
import { Network, HelpCircle, Eye } from 'lucide-react';

interface FlowchartProps {
  data?: DiagramData;
}

export default function Flowchart({ data }: FlowchartProps) {
  const [hoveredNode, setHoveredNode] = useState<DiagramNode | null>(null);

  // default diagram data to preview on initial launch if nothing generated yet
  const defaultData: DiagramData = {
    nodes: [
      { id: "init-1", label: "Kickoff Sync", type: "agenda", x: 100, y: 120, description: "Aligning meeting parameters" },
      { id: "init-2", label: "Pinecone Sponsor Integration", type: "idea", x: 260, y: 50, description: "Vector databases for real-time memory lookups" },
      { id: "init-3", label: "Interactive Canvas drawing", type: "idea", x: 260, y: 200, description: "Sketches processed directly with Gemini multimodal" },
      { id: "init-4", label: "Summarization Loop", type: "decision", x: 420, y: 120, description: "Extract key takeaways and actionable checklist metrics" }
    ],
    edges: [
      { source: "init-1", target: "init-2" },
      { source: "init-1", target: "init-3" },
      { source: "init-2", target: "init-4" },
      { source: "init-3", target: "init-4" }
    ]
  };

  const activeData = data && data.nodes && data.nodes.length > 0 ? data : defaultData;

  // Type styling map
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'agenda':
        return { bg: '#e0f2fe', stroke: '#0284c7', text: '#0369a1', pill: 'bg-sky-100 text-sky-800' };
      case 'decision':
        return { bg: '#fef3c7', stroke: '#d97706', text: '#b45309', pill: 'bg-amber-100 text-amber-800' };
      case 'action':
        return { bg: '#dcfce7', stroke: '#16a34a', text: '#15803d', pill: 'bg-emerald-100 text-emerald-800' };
      case 'milestone':
        return { bg: '#f3e8ff', stroke: '#7c3aed', text: '#6d28d9', pill: 'bg-purple-100 text-purple-800' };
      case 'idea':
        return { bg: '#f1f5f9', stroke: '#475569', text: '#334155', pill: 'bg-slate-100 text-slate-800' };
      default:
        return { bg: '#f8fafc', stroke: '#64748b', text: '#475569', pill: 'bg-slate-50 text-slate-700' };
    }
  };

  // Safe node coordinate locator by id
  const findNode = (id: string) => {
    return activeData.nodes.find((n) => n.id === id);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col h-full" id="flowchart-card">
      <div className="flex items-center justify-between border-b border-slate-105 pb-3 mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Network className="w-5 h-5 text-indigo-600" />
            AI Workspace Cognitive Mind-Map
          </h3>
          <p className="font-sans text-xs text-slate-500 mt-0.5">
            Chronological decision flow and topics structurally charted by Gemini.
          </p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-sans font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Eye className="w-3 h-3" />
            Hover nodes for details
          </span>
        </div>
      </div>

      {/* SVG Canvas diagram */}
      <div className="relative flex-1 bg-slate-50 rounded-xl overflow-hidden min-h-[260px] border border-slate-100 shadow-inner">
        
        {/* Subtle grid pattern background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <svg className="w-full h-full min-h-[260px]" viewBox="0 0 640 320" preserveAspectRatio="xMidYMid meet" id="flow-diagram-svg">
          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Render connecting edges */}
          {activeData.edges && activeData.edges.map((edge, i) => {
            const startNode = findNode(edge.source);
            const endNode = findNode(edge.target);

            if (!startNode || !endNode) return null;

            // Draw curved bezier line instead of straight
            const dx = endNode.x - startNode.x;
            const dy = endNode.y - startNode.y;
            const cx1 = startNode.x + dx * 0.5;
            const cy1 = startNode.y;
            const cx2 = startNode.x + dx * 0.5;
            const cy2 = endNode.y;

            return (
              <g key={`edge-${i}`}>
                <path
                  d={`M ${startNode.x} ${startNode.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${endNode.x} ${endNode.y}`}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="2"
                  strokeDasharray={startNode.type === 'idea' ? '4,4' : 'none'}
                  markerEnd="url(#arrow)"
                  className="transition-colors duration-200 hover:stroke-indigo-400"
                />
                {edge.label && (
                  <text
                    x={(startNode.x + endNode.x) / 2}
                    y={(startNode.y + endNode.y) / 2 - 4}
                    className="font-sans text-[9px] fill-slate-400 font-medium text-anchor-middle"
                    textAnchor="middle"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render nodes */}
          {activeData.nodes && activeData.nodes.map((node) => {
            const colors = getNodeColor(node.type);
            const isHovered = hoveredNode?.id === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHoveredNode(node)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer select-none group"
                id={`flow-node-${node.id}`}
              >
                {/* Node outer pulse glowing ring */}
                <rect
                  x="-75"
                  y="-22"
                  width="150"
                  height="44"
                  rx="10"
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth={isHovered ? 6 : 0}
                  className="transition-all duration-300 opacity-20"
                />

                {/* Node body container */}
                <rect
                  x="-75"
                  y="-22"
                  width="150"
                  height="44"
                  rx="10"
                  fill={colors.bg}
                  stroke={colors.stroke}
                  strokeWidth="2"
                  className="transition-transform duration-200 group-hover:scale-105"
                  style={{ filter: isHovered ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.06))' : '' }}
                />

                {/* Small indicator label */}
                <circle
                  cx="-60"
                  cy="0"
                  r="4"
                  fill={colors.stroke}
                />

                {/* Node labels */}
                <text
                  x="-46"
                  y="4"
                  className="font-sans text-[11px] font-semibold select-none text-left"
                  fill="#1e293b"
                  textAnchor="start"
                >
                  {node.label.length > 20 ? `${node.label.slice(0, 18)}...` : node.label}
                </text>

                {/* Tiny node type annotation */}
                <text
                  x="-46"
                  y="15"
                  className="font-mono text-[8px] tracking-wider uppercase font-medium"
                  fill={colors.stroke}
                  textAnchor="start"
                >
                  {node.type}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover overlay description tooltip info */}
        {hoveredNode && (
          <div className="absolute top-2 left-2 right-2 bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-lg text-xs font-sans border border-slate-700/80 shadow-lg flex items-start gap-2.5 animate-fadeIn">
            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wide uppercase ${getNodeColor(hoveredNode.type).pill}`}>
              {hoveredNode.type}
            </span>
            <div className="flex-1">
              <strong className="block text-white font-medium text-sm mb-0.5">{hoveredNode.label}</strong>
              <p className="text-slate-300 level-relaxed text-[10px]">{hoveredNode.description || 'No direct notes added for this flowchart section.'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
        <span className="font-sans text-[10px] font-medium text-slate-400">Node Legend:</span>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-sky-200 border border-sky-600 block"></span>
          <span className="font-sans text-[10px] text-slate-600">Agenda</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-amber-200 border border-amber-600 block"></span>
          <span className="font-sans text-[10px] text-slate-600">Decision</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-600 block"></span>
          <span className="font-sans text-[10px] text-slate-600">Action</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-purple-200 border border-purple-600 block"></span>
          <span className="font-sans text-[10px] text-slate-600">Milestone</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-600 block"></span>
          <span className="font-sans text-[10px] text-slate-600">Idea</span>
        </div>
      </div>
    </div>
  );
}
