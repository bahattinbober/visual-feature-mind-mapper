"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import * as htmlToImage from "html-to-image";

export type NodeColor = "blue" | "green" | "purple" | "amber";

export type Node = {
  id: string;
  title: string;
  x: number;
  y: number;
  color: NodeColor; // <- burada
};


type Edge = {
  id: string;
  from: string;
  to: string;
};

const STORAGE_KEY = "mind_mapper_v1";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>(() => [
    { id: "root", title: "Main Idea", x: 140, y: 140, color: "blue" },
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState<Node["color"]>("green");
  const [connectFrom, setConnectFrom] = useState<string>("root");
  const [connectTo, setConnectTo] = useState<string>("");
  const [menu, setMenu] = useState<null | {
  x: number;
  y: number;
  nodeId: string;
   }>(null);
   const [scale, setScale] = useState(1);
   const [offset, setOffset] = useState({ x: 0, y: 0 });
   type Snapshot = { nodes: Node[]; edges: Edge[] };

   const [past, setPast] = useState<Snapshot[]>([]);
   const [future, setFuture] = useState<Snapshot[]>([]);



  const fileRef = useRef<HTMLInputElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
const dragRef = useRef<{
  id: string;
  offsetX: number;
  offsetY: number;
} | null>(null);


  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { nodes: Node[]; edges: Edge[] };
      if (parsed?.nodes?.length) setNodes(parsed.nodes);
      if (parsed?.edges) setEdges(parsed.edges);
      if (parsed?.nodes?.[0]?.id) setSelected(parsed.nodes[0].id);
      if (parsed?.nodes?.[0]?.id) setConnectFrom(parsed.nodes[0].id);
    } catch {
      // ignore
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
    } catch {
      // ignore
    }
  }, [nodes, edges]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selected),
    [nodes, selected]
  );

  const colorClasses: Record<Node["color"], string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-900",
    green: "bg-green-50 border-green-200 text-green-900",
    purple: "bg-purple-50 border-purple-200 text-purple-900",
    amber: "bg-amber-50 border-amber-200 text-amber-900",
  };
  function getBoardRect() {
  return boardRef.current?.getBoundingClientRect() ?? null;
}

function onPointerDownNode(e: React.PointerEvent, id: string) {
  const rect = getBoardRect();
  if (!rect) return;

  const node = nodes.find((n) => n.id === id);
  if (!node) return;

  // pointer capture: mouse/touch fark etmez
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

  dragRef.current = {
    id,
    offsetX: e.clientX - rect.left - node.x,
    offsetY: e.clientY - rect.top - node.y,
  };

  setSelected(id);
}


function onPointerMoveBoard(e: React.PointerEvent) {
  const rect = getBoardRect();
  if (!rect) return;
  if (!dragRef.current) return;

  const { id, offsetX, offsetY } = dragRef.current;

  const x = e.clientX - rect.left - offsetX;
  const y = e.clientY - rect.top - offsetY;

  setNodes((prev) =>
    prev.map((n) =>
      n.id === id
        ? { ...n, x: clamp(x, 10, rect.width - 210), y: clamp(y, 10, rect.height - 90) }
        : n
    )
  );
}
function pushHistory(next: Snapshot) {
  setPast((p) => {
    const current: Snapshot = { nodes, edges };
    const nextPast = [...p, current];
    // istersen history limit:
    return nextPast.length > 50 ? nextPast.slice(nextPast.length - 50) : nextPast;
  });
  setFuture([]); // yeni işlem yapınca redo sıfırlanır
  }
function onPointerUpBoard() {
  dragRef.current = null;
}
function undo() {
  setPast((p) => {
    if (p.length === 0) return p;

    const prev = p[p.length - 1];
    const current: Snapshot = { nodes, edges };

    setFuture((f) => [current, ...f]);
    setNodes(prev.nodes);
    setEdges(prev.edges);

    return p.slice(0, -1);
  });
}

function redo() {
  setFuture((f) => {
    if (f.length === 0) return f;

    const next = f[0];
    const current: Snapshot = { nodes, edges };

    setPast((p) => [...p, current]);
    setNodes(next.nodes);
    setEdges(next.edges);

    return f.slice(1);
  });
}
useEffect(() => {
  function onKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const mod = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl/Cmd + Z -> Undo
    if (mod && key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }

    // Ctrl/Cmd + Shift + Z -> Redo (Mac)
    if (mod && key === "z" && e.shiftKey) {
      e.preventDefault();
      redo();
      return;
    }

    // Ctrl/Cmd + Y -> Redo (Windows/Linux)
    if (mod && key === "y") {
      e.preventDefault();
      redo();
      return;
    }

    // Delete / Backspace -> Delete selected (root hariç)
    if ((key === "delete" || key === "backspace") && selected && selected !== "root") {
      // input/textarea yazarken silmeyi bozmayalım
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      e.preventDefault();
      deleteSelected();
      return;
    }
  }

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}, [undo, redo, deleteSelected, selected]);



async function exportPNG() {
  if (!exportRef.current) return;

  const node = exportRef.current;

  const dataUrl = await htmlToImage.toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "white",
    width: canvasSize.w,
    height: canvasSize.h,
    style: {
      transform: "none",        // zoom/transform varsa etkisizleştir
      overflow: "visible",
    },
  });

  const link = document.createElement("a");
  link.download = "mind-map.png";
  link.href = dataUrl;
  link.click();
}



function autoLayout() {
  const PADDING_X = 260;   // sütunlar arası mesafe
  const PADDING_Y = 140;   // dikey node aralığı
  const START_X = 80;      // root X
  const CENTER_Y = 220;    // root Y (istersen değiştir)

  // 1) children map: from -> to listesi
  const children = new Map<string, string[]>();
  for (const e of edges) {
    if (!children.has(e.from)) children.set(e.from, []);
    children.get(e.from)!.push(e.to);
  }
  
  

  // 2) root bul: parent'ı olmayan node root kabul
  const hasParent = new Set(edges.map((e) => e.to));
  const root = nodes.find((n) => !hasParent.has(n.id))?.id ?? nodes[0]?.id;
  if (!root) return;

  // 3) BFS ile level (depth) hesapla
  const level = new Map<string, number>();
  level.set(root, 0);

  const queue: string[] = [root];
  while (queue.length) {
    const cur = queue.shift()!;
    const curLevel = level.get(cur)!;
    const kids = children.get(cur) ?? [];
    for (const k of kids) {
      if (!level.has(k)) {
        level.set(k, curLevel + 1);
        queue.push(k);
      }
    }
  }

  // 4) node'ları level'a göre grupla
  const byLevel = new Map<number, string[]>();
  for (const n of nodes) {
    const l = level.get(n.id) ?? 0;
    if (!byLevel.has(l)) byLevel.set(l, []);
    byLevel.get(l)!.push(n.id);
  }

  // 5) her level'ı dikey ortalayarak sırala
  const newPos = new Map<string, { x: number; y: number }>();

  for (const [l, ids] of byLevel.entries()) {
    // root tek node: ortada dursun
    if (l === 0) {
      newPos.set(root, { x: START_X, y: CENTER_Y });
      continue;
    }

    const x = START_X + l * PADDING_X;
    const totalH = (ids.length - 1) * PADDING_Y;
    const startY = CENTER_Y - totalH / 2;

    ids.forEach((id, idx) => {
      newPos.set(id, { x, y: startY + idx * PADDING_Y });
    });
  }

  // 6) state güncelle
  setNodes((prev) =>
    prev.map((n) => {
      const p = newPos.get(n.id);
      return p ? { ...n, x: p.x, y: p.y } : n;
    })
  );
}



  function addNode(type: "child" | "free" = "free") {
    pushHistory({ nodes, edges });
  const title = newTitle.trim();
  if (!title && type === "free") return;

  const base =
    type === "child"
      ? nodes.find((n) => n.id === menu?.nodeId) ?? nodes[0]
      : nodes.find((n) => n.id === selected) ?? nodes[0];

  const id = uid();

  const next: Node = {
    id,
    title: type === "child" ? "New Feature" : title,
    x: clamp(base.x + 240, 40, 900),
    y: clamp(base.y + 40, 40, 520),
    color: newColor,
  };

  setNodes((prev) => [...prev, next]);
  setSelected(id);
  setConnectTo(id);

  if (type === "free") setNewTitle("");
}
function deleteNode(id: string) {
  pushHistory({ nodes, edges });
  // silinecek node'un child bağlantılarını da kaldır
  setEdges((prev) => prev.filter((e) => e.from !== id && e.to !== id));

  // node'u sil
  setNodes((prev) => prev.filter((n) => n.id !== id));

  // seçiliyse temizle
  if (selected === id) {
    setSelected(null);
  }
}


  function updateNodeTitle(id: string, title: string) {
    pushHistory({ nodes, edges });
  setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, title } : n)));
}


  function renameSelected(title: string) {
    pushHistory({ nodes, edges });
    setNodes((prev) =>
      prev.map((n) => (n.id === selected ? { ...n, title } : n))
    );
  }

  function deleteSelected() {
    pushHistory({ nodes, edges });
    if (selected === "root") return; // keep root
    setNodes((prev) => prev.filter((n) => n.id !== selected));
    setEdges((prev) => prev.filter((e) => e.from !== selected && e.to !== selected));
    setSelected("root");
    setConnectFrom("root");
  }

  function connect() {
    pushHistory({ nodes, edges });
    if (!connectFrom || !connectTo) return;
    if (connectFrom === connectTo) return;

    // prevent duplicates
    const exists = edges.some(
      (e) => (e.from === connectFrom && e.to === connectTo) || (e.from === connectTo && e.to === connectFrom)
    );
    if (exists) return;

    setEdges((prev) => [...prev, { id: uid(), from: connectFrom, to: connectTo }]);
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mind-map.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function triggerImport() {
    fileRef.current?.click();
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text) as { nodes: Node[]; edges: Edge[] };
      if (!parsed?.nodes?.length) return;
      setNodes(parsed.nodes);
      setEdges(parsed.edges ?? []);
      setSelected(parsed.nodes[0].id);
      setConnectFrom(parsed.nodes[0].id);
      setConnectTo("");
    } catch {
      // ignore invalid
    } finally {
      e.target.value = "";
    }
  }

  function resetAll() {
    const freshNodes: Node[] = [
      { id: "root", title: "Main Idea", x: 140, y: 140, color: "blue" },
    ];
    setNodes(freshNodes);
    setEdges([]);
    setSelected("root");
    setConnectFrom("root");
    setConnectTo("");
    setNewTitle("");
  }
  const [canvasSize, setCanvasSize] = useState({ w: 2400, h: 1400 });


  return (
  <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Visual Feature Mind-Mapper</h1>
        <p className="text-slate-600">
          Create nodes, connect ideas, and export/import your map (stored locally).
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={exportJSON}
          >
            Export JSON
          </button>

          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={triggerImport}
          >
            Import JSON
          </button>

          <button
           className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
           onClick={exportPNG}
           >
           Export PNG
           </button>
           
           <button
            className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
            onClick={autoLayout}
          >
            Auto Layout
          </button>


          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={resetAll}
          >
            Reset
          </button>

          
          <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          onClick={undo}
          disabled={past.length === 0}
          >
           Undo
          </button>

          <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          onClick={redo}
           disabled={future.length === 0}
          >
          Redo
         </button>
          <button
           className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
           onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(2)))}
           >
             Zoom +
          </button>

           <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)))}
            >
            Zoom -
           </button>

            <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => setScale(1)}
            >
            Reset Zoom
            </button>


          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={onImportFile}
          />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Left panel */}
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Add Node</h2>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Node title (e.g., UI, Features, MVP)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <div className="flex items-center gap-2">
              <select
                value={newColor}
                onChange={(e) => setNewColor(e.target.value as Node["color"])}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="green">Green</option>
                <option value="blue">Blue</option>
                <option value="purple">Purple</option>
                <option value="amber">Amber</option>
              </select>

              <button
                onClick={() => addNode("free")}
                className="whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-slate-500">New nodes appear near the selected node.</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Selected Node</h2>
            <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
              <div className="text-xs text-slate-500">ID</div>
              <div className="text-sm font-mono break-all">{selectedNode?.id ?? "-"}</div>
            </div>

            <input
              value={selectedNode?.title ?? ""}
              onChange={(e) => renameSelected(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
            />

            <button
              onClick={deleteSelected}
              disabled={selected === "root"}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Delete selected (except root)
            </button>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Connect Nodes</h2>
            <div className="grid gap-2">
              <select
                value={connectFrom}
                onChange={(e) => setConnectFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    From: {n.title}
                  </option>
                ))}
              </select>

              <select
                value={connectTo}
                onChange={(e) => setConnectTo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">To: choose…</option>
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>

              <button
                onClick={connect}
                className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
              >
                Connect
              </button>
            </div>
          </div>
        </aside>

        {/* Right: Board */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Board</h2>
          <div className="text-xs text-slate-500">
          Nodes: {nodes.length} • Links: {edges.length} • Shortcuts: Ctrl+Z / Ctrl+Y / Del
          </div>
          </div>


          {/* Outer frame (NO SCROLL here) */}
          <div 
          ref={exportRef}
          className="relative h-[620px] rounded-xl border border-slate-200 overflow-hidden bg-gradient-to-b from-white to-slate-50">
            {/* Scrollable area */}
             <div
             className="absolute inset-0 overflow-auto"
             style={{ overscrollBehavior: "contain" }}
             onWheelCapture={(e) => {
             if (!e.ctrlKey) return;

             e.preventDefault();
             e.stopPropagation();

             setScale((s) => {
             const next = s - e.deltaY * 0.001;
             return Math.min(2, Math.max(0.5, next));
             });
              }}
              >

              {/* Big content (moves with scroll) */}
              <div
                ref={(el) => {
                boardRef.current = el;
                exportRef.current = el;
                  }}
                onPointerDownCapture={() => setMenu(null)}
                onPointerMove={onPointerMoveBoard}
                onPointerUp={onPointerUpBoard}
                onPointerLeave={onPointerUpBoard}
                className="relative"
                style={{
                 minWidth: canvasSize.w,
                 minHeight: canvasSize.h,
                 transform: `scale(${scale})`,
                 transformOrigin: "0 0",
                  }}
               >
                {/* SVG lines (NOW INSIDE content) */}
                <svg className="absolute inset-0 z-0 h-full w-full pointer-events-none">
                  {edges.map((e) => {
                    const a = nodes.find((n) => n.id === e.from);
                    const b = nodes.find((n) => n.id === e.to);
                    if (!a || !b) return null;

                    const x1 = a.x + 160;
                    const y1 = a.y + 40;
                    const x2 = b.x + 160;
                    const y2 = b.y + 40;
                    const cx = (x1 + x2) / 2;

                    return (
                      <g key={e.id}>
                        <path
                          d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                          fill="none"
                          stroke="rgb(100 116 139)"
                          strokeWidth={2}
                          opacity={0.55}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Context menu (moves with content) */}
                {menu && (
                  <div
                    className="absolute z-50 w-48 rounded-xl border border-slate-200 bg-white shadow-lg"
                    style={{ left: menu.x, top: menu.y }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        addNode("child");
                        setMenu(null);
                      }}
                    >
                      Add Child
                    </button>

                    <button
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        const current = nodes.find((n) => n.id === menu.nodeId);
                        const title = prompt("New title:", current?.title ?? "");
                        if (title && title.trim()) updateNodeTitle(menu.nodeId, title.trim());
                        setMenu(null);
                      }}
                    >
                      Rename
                    </button>

                    <div className="px-3 py-2">
                      <div className="mb-2 text-xs font-medium text-slate-500">Color</div>
                      <div className="flex gap-2">
                        {(["blue", "green", "purple", "amber"] as const).map((c) => (
                          <button
                            key={c}
                            className={[
                              "h-6 w-6 rounded-full border",
                              c === "blue" && "bg-blue-100 border-blue-200",
                              c === "green" && "bg-green-100 border-green-200",
                              c === "purple" && "bg-purple-100 border-purple-200",
                              c === "amber" && "bg-amber-100 border-amber-200",
                            ].join(" ")}
                            onClick={() => {
                              pushHistory({ nodes, edges });
                              setNodes((prev) =>
                                prev.map((n) => (n.id === menu.nodeId ? { ...n, color: c } : n))
                              );
                              setMenu(null);
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      onClick={() => {
                        deleteNode(menu.nodeId);
                        setMenu(null);
                      }}
                    >
                      Delete Node
                    </button>
                  </div>
                )}

                {/* Nodes (moves with content) */}
                {nodes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelected(n.id)}
                    onPointerDown={(e) => onPointerDownNode(e, n.id)}
                    className={[
                      "absolute z-10 w-[200px] rounded-2xl border px-3 py-2 text-left shadow-sm transition select-none",
                      colorClasses[n.color],
                      selected === n.id ? "ring-2 ring-slate-900" : "hover:shadow-md",
                    ].join(" ")}
                    style={{ left: n.x, top: n.y }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      const rect = boardRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setSelected(n.id);
                      setMenu({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                        nodeId: n.id,
                      });
                    }}
                  >
                    <div className="text-xs opacity-70">Node</div>
                    <div className="font-semibold leading-snug">{n.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Connections panel (STAYS VISIBLE, no need to scroll) */}
            <div className="absolute right-3 top-3 z-40 w-[260px] rounded-xl border border-slate-200 bg-white/80 p-3 backdrop-blur">
              <div className="text-xs font-semibold text-slate-700 mb-2">Connections</div>
              {edges.length === 0 ? (
                <div className="text-xs text-slate-500">No connections yet.</div>
              ) : (
                <ul className="space-y-1 text-xs text-slate-700">
                  {edges.slice(0, 8).map((e) => {
                    const a = nodes.find((n) => n.id === e.from)?.title ?? e.from;
                    const b = nodes.find((n) => n.id === e.to)?.title ?? e.to;
                    return (
                      <li key={e.id} className="truncate">
                        • {a} → {b}
                      </li>
                    );
                  })}
                  {edges.length > 8 && (
                    <li className="text-slate-500">…and {edges.length - 8} more</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
);

}
