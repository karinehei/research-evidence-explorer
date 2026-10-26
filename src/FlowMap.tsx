import { useEffect, useMemo, useState, type MutableRefObject } from 'react';
import {
  Background, BaseEdge, EdgeLabelRenderer, Handle, MarkerType, Position, ReactFlow,
  applyEdgeChanges, applyNodeChanges, getBezierPath, useReactFlow,
  type EdgeChange, type EdgeProps, type NodeChange, type NodeProps
} from '@xyflow/react';
import { buildFlow, type LinkEdge, type RecordNode } from './graph.ts';
import type { Workspace } from './types.ts';

export interface FlowApi { zoomIn: () => void; zoomOut: () => void; fit: () => void; home: () => void }

function RecordCard({ data }: NodeProps<RecordNode>) {
  return <div className={`record-card ${data.kind}${data.dim ? ' dim' : ''}`} title={data.label}>
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
    <EdgeLabelRenderer><div className={`edge-chip ${pattern}${selected ? ' selected' : ''}`} style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }} title={data?.aria}>{data?.text}</div></EdgeLabelRenderer>
  </>;
}

const nodeTypes = { record: RecordCard };
const edgeTypes = { epistemic: EpistemicEdge };

export function FlowMap({ model, ids, selectedId, selectedEdge, trace, fitToken, guardTick, api, onSelectNode, onSelectEdge, onMove }: {
  model: Workspace; ids: Set<string>; selectedId: string; selectedEdge: string; trace: { nodes: string[] } | null;
  fitToken: number; guardTick: number; api: MutableRefObject<FlowApi | null>;
  onSelectNode: (id: string) => void; onSelectEdge: (id: string) => void; onMove: (id: string, position: { x: number; y: number }) => void;
}) {
  const visibleKey = [...ids].sort().join('|');
  const traceKey = trace?.nodes.join('|') || '';
  const built = useMemo(() => {
    const flow = buildFlow(model, ids, selectedId, selectedEdge);
    const edges = flow.edges.map(edge => {
      const marked = edge.data?.pattern === 'membership' ? edge : { ...edge, markerEnd: { type: MarkerType.ArrowClosed, color: edge.data?.color || '#315cd7', width: 16, height: 16 } };
      return trace && !(trace.nodes.includes(edge.source) && trace.nodes.includes(edge.target)) ? { ...marked, className: 'dim-edge' } : marked;
    });
    return {
      nodes: trace ? flow.nodes.map(node => ({ ...node, data: { ...node.data, dim: !trace.nodes.includes(node.id) } })) : flow.nodes,
      edges
    };
  }, [model, visibleKey, selectedId, selectedEdge, traceKey]);
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
    multiSelectionKeyCode={null}
    panOnScroll={false}
    preventScrolling={false}
    fitView
    fitViewOptions={{ padding: 0.16 }}
    minZoom={0.2}
    maxZoom={1.75}
    proOptions={{ hideAttribution: false }}
    colorMode="light"
  >
    <Background color="#d5dde8" gap={18} size={1} />
    <FlowBridge fitToken={fitToken} api={api} />
  </ReactFlow>{nodes.length ? null : <p className="empty-map">Ei hakua tai suodatusta vastaavia kohteita.</p>}</div>;
}

function FlowBridge({ fitToken, api }: { fitToken: number; api: MutableRefObject<FlowApi | null> }) {
  const flow = useReactFlow();
  useEffect(() => {
    api.current = {
      zoomIn: () => flow.zoomIn({ duration: 150 }),
      zoomOut: () => flow.zoomOut({ duration: 150 }),
      fit: () => flow.fitView({ padding: 0.16, duration: 180 }),
      home: () => flow.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 180 })
    };
  }, [api, flow]);
  useEffect(() => { if (fitToken) void flow.fitView({ padding: 0.16, duration: 180 }); }, [fitToken, flow]);
  return null;
}
