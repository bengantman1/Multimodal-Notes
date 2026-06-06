/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Node structure for SVG meeting flowchart/map rendering
export interface DiagramNode {
  id: string;
  label: string;
  type: 'agenda' | 'decision' | 'action' | 'milestone' | 'idea';
  x: number;
  y: number;
  description?: string;
}

// Edge structure connecting diagram nodes
export interface DiagramEdge {
  source: string;
  target: string;
  label?: string;
}

export interface DiagramData {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface ActionItem {
  id: string;
  task: string;
  owner: string;
  priority: 'High' | 'Medium' | 'Low';
  done: boolean;
  deadline?: string;
}

export interface SegmentNotes {
  title: string;
  timeRange?: string;
  bullets: string[];
}

export interface SummaryResult {
  title: string;
  duration?: string;
  date: string;
  summaryText: string;
  highlights: string[];
  segments: SegmentNotes[];
  actionItems: ActionItem[];
  diagramData: DiagramData;
  rawTranscriptUsed: string;
}

// Memory block for Pinecone-associated historical semantic retrieval
export interface SearchResultMemory {
  id: string;
  meetingTitle: string;
  date: string;
  matchedText: string;
  score: number;
  contextSegment: string;
}
