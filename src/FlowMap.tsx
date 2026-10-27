import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { AriaLabelConfig } from '@xyflow/system';
import {
  Background, BaseEdge, EdgeLabelRenderer, Handle, MarkerType, Position, ReactFlow,
  applyEdgeChanges, applyNodeChanges, getBezierPath, useReactFlow,
  type EdgeChange, type EdgeProps, type NodeChange, type NodeProps
} from '@xyflow/react';
import { buildFlow, type LinkEdge, type RecordNode } from './graph.ts';
import { useI18n, displayRecordLabel } from './i18n/index.ts';
import type { Locale } from './i18n/locale.ts';
import type { Workspace } from './types.ts';

export interface FlowApi { zoomIn: () => void; zoomOut: () => void; fit: () => void; home: () => void }

function motionMs(ms: number) {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}

function RecordCard({ data }: NodeProps<RecordNode>) {
  return <div className={`record-card ${data.kind}${data.dim ? ' dim' : ''}`}>
    <div className="kind">{data.badge}</div>
    <div className="label">{data.label}</div>
    <Handle type="target" position={Position.Left} isConnectable={false} />
    <Handle type="source" position={Position.Right} isConnectable={false} />
  </div>;
}

function EpistemicEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected, markerEnd }: EdgeProps<LinkEdge>) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const pattern = data?.pattern || 'solid';
  const color = selected ? '#315cd7' : data?.color || '#7d8da3';
  return <>
    <BaseEdge id={id} path={path} markerEnd={pattern === 'membership' ? undefined : markerEnd} style={{ stroke: color, strokeWidth: selected ? 2.4 : 1.4, strokeDasharray: pattern === 'dotted' ? '2 5' : pattern === 'dashed' ? '6 4' : pattern === 'membership' ? '2 3' : undefined }} />
    <EdgeLabelRenderer><div className={`edge-chip ${pattern}${selected ? ' selected' : ''}`} style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}>{data?.text}{data?.aria ? <span className="sr-only">{data.aria}</span> : null}</div></EdgeLabelRenderer>
  </>;
}

const nodeTypes = { record: RecordCard };
const edgeTypes = { epistemic: EpistemicEdge };

export function FlowMap({ model, ids, selectedId, selectedEdge, trace, fitToken, guardTick, api, locale, resolveLabel, onSelectNode, onSelectEdge, onMove }: {
  model: Workspace; ids: Set<string>; selectedId: string; selectedEdge: string; trace: { nodes: string[] } | null;
  fitToken: number; guardTick: number; api: RefObject<FlowApi | null>;
  locale?: Locale;
  resolveLabel?: (id: string, fallback: string) => string;
  onSelectNode: (id: string) => void; onSelectEdge: (id: string) => void; onMove: (id: string, position: { x: number; y: number }) => void;
}) {
  const { t, locale: contextLocale, hashMatches } = useI18n();
  const activeLocale = locale ?? contextLocale;
  const resolveRef = useRef(resolveLabel);
  resolveRef.current = resolveLabel;
  const visibleKey = [...ids].sort().join('|');
  const traceKey = trace?.nodes.join('|') || '';
  const flowAria = useMemo(() => ({
    'node.a11yDescription.default': t('flowAria.nodeKeys'),
    'node.a11yDescription.keyboardDisabled': t('flowAria.nodeKeys'),
    'node.a11yDescription.ariaLiveMessage': ({ direction, x, y }: { direction: string; x: number; y: number }) => {
      const dirKey = direction === 'left' || direction === 'right' || direction === 'up' || direction === 'down'
        ? (`flowAria.${direction}` as const)
        : null;
      const dirLabel = dirKey ? t(dirKey) : direction;
      return t('flowAria.moved', { direction: dirLabel, x, y });
    },
    'edge.a11yDescription.default': t('flowAria.edgeKeys')
  } satisfies Partial<AriaLabelConfig>), [t, activeLocale]);
  const built = useMemo(() => {
    const resolve = resolveRef.current
      || ((id: string, fallback: string) => displayRecordLabel(activeLocale, model, id, hashMatches) || fallback);
    const flow = buildFlow(model, ids, selectedId, selectedEdge, {
      locale: activeLocale,
      resolveLabel: resolve
    });
    const edges = flow.edges.map(edge => {
      const marked = edge.data?.pattern === 'membership' ? edge : { ...edge, markerEnd: { type: MarkerType.ArrowClosed, color: edge.data?.color || '#315cd7', width: 16, height: 16 } };
      return trace && !(trace.nodes.includes(edge.source) && trace.nodes.includes(edge.target)) ? { ...marked, className: 'dim-edge' } : marked;
    });
    return {
      nodes: trace ? flow.nodes.map(node => ({ ...node, data: { ...node.data, dim: !trace.nodes.includes(node.id) } })) : flow.nodes,
      edges
    };
  }, [model, visibleKey, selectedId, selectedEdge, traceKey, activeLocale, hashMatches, ids, trace]);
  const [nodes, setNodes] = useState(built.nodes);
  const [edges, setEdges] = useState(built.edges);
  useEffect(() => { setNodes(built.nodes); setEdges(built.edges); }, [built, guardTick]);
  return <div className="canvas-wrap"><ReactFlow
    nodes={nodes}
    edges={edges}
    nodeTypes={nodeTypes}
    edgeTypes={edgeTypes}
    onNodesChange={(changes: NodeChange<RecordNode>[]) => {
      setNodes(current => applyNodeChanges(changes, current));
      for (const change of changes) {
        if (change.type === 'select' && change.selected) onSelectNode(change.id);
        if (change.type === 'position' && change.position && change.dragging === false) onMove(change.id, change.position);
      }
    }}
    onEdgesChange={(changes: EdgeChange<LinkEdge>[]) => {
      setEdges(current => applyEdgeChanges(changes, current));
      for (const change of changes) if (change.type === 'select' && change.selected) onSelectEdge(change.id);
    }}
    onNodeClick={(_, node) => onSelectNode(node.id)}
    onEdgeClick={(_, edge) => onSelectEdge(edge.id)}
    nodesDraggable
    nodesConnectable={false}
    nodesFocusable
    edgesFocusable
    elementsSelectable
    deleteKeyCode={null}
    ariaLabelConfig={flowAria}
    multiSelectionKeyCode={null}
    panOnScroll={false}
    preventScrolling={false}
    fitView
    fitViewOptions={{ padding: 0.16, duration: motionMs(180) }}
    minZoom={0.2}
    maxZoom={1.75}
    proOptions={{ hideAttribution: false }}
    colorMode="light"
  >
    <Background color="#d5dde8" gap={18} size={1} />
    <FlowBridge fitToken={fitToken} api={api} />
  </ReactFlow>{nodes.length ? null : <p className="empty-map">{t('graph.emptyMap')}</p>}</div>;
}

function FlowBridge({ fitToken, api }: { fitToken: number; api: RefObject<FlowApi | null> }) {
  const flow = useReactFlow();
  useEffect(() => {
    api.current = {
      zoomIn: () => flow.zoomIn({ duration: motionMs(150) }),
      zoomOut: () => flow.zoomOut({ duration: motionMs(150) }),
      fit: () => flow.fitView({ padding: 0.16, duration: motionMs(180) }),
      home: () => flow.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: motionMs(180) })
    };
  }, [api, flow]);
  useEffect(() => { if (fitToken) void flow.fitView({ padding: 0.16, duration: motionMs(180) }); }, [fitToken, flow]);
  return null;
}
