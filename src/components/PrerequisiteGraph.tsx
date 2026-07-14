import { useMemo } from "react";
import type { Course } from "../domain/course";
import { buildCourseGraph, graphLevels, prerequisiteClosure } from "../domain/graph";

interface PrerequisiteGraphProps {
  catalog: readonly Course[];
  selected: ReadonlySet<string>;
}

interface Position {
  x: number;
  y: number;
}

export function PrerequisiteGraph({ catalog, selected }: PrerequisiteGraphProps) {
  const graphData = useMemo(() => {
    const graph = buildCourseGraph(catalog);
    const included = prerequisiteClosure(graph, selected);
    const levels = graphLevels(graph, included);
    const byLevel = new Map<number, string[]>();

    for (const code of [...included].sort()) {
      const level = levels.get(code) ?? 0;
      byLevel.set(level, [...(byLevel.get(level) ?? []), code]);
    }

    const positions = new Map<string, Position>();
    for (const [level, codes] of byLevel) {
      codes.forEach((code, index) => {
        positions.set(code, { x: 82 + level * 190, y: 60 + index * 92 });
      });
    }

    const maxLevel = Math.max(0, ...byLevel.keys());
    const maxRows = Math.max(1, ...[...byLevel.values()].map((items) => items.length));
    return {
      graph,
      included,
      positions,
      width: Math.max(700, 210 + maxLevel * 190),
      height: Math.max(250, 105 + maxRows * 92),
    };
  }, [catalog, selected]);

  if (selected.size === 0) {
    return (
      <section className="panel graph-panel" aria-labelledby="graph-title">
        <p className="eyebrow">Dependencies</p>
        <h2 id="graph-title">Prerequisite map</h2>
        <p className="empty-state">Add a course to reveal its prerequisite path.</p>
      </section>
    );
  }

  return (
    <section className="panel graph-panel" aria-labelledby="graph-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Dependencies</p>
          <h2 id="graph-title">Prerequisite map</h2>
        </div>
        <span className="graph-legend"><i /> prerequisite path</span>
      </div>
      <div className="graph-scroll" tabIndex={0} aria-label="Scrollable prerequisite graph">
        <svg
          role="img"
          aria-labelledby="graph-title graph-description"
          viewBox={`0 0 ${graphData.width} ${graphData.height}`}
          width={graphData.width}
          height={graphData.height}
        >
          <desc id="graph-description">
            Courses are arranged from prerequisites on the left to advanced courses on the right.
          </desc>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#557086" />
            </marker>
          </defs>
          {[...graphData.included].flatMap((code) =>
            [...(graphData.graph.prerequisites.get(code) ?? [])]
              .filter((prerequisite) => graphData.included.has(prerequisite))
              .map((prerequisite) => {
                const from = graphData.positions.get(prerequisite);
                const to = graphData.positions.get(code);
                if (!from || !to) return null;
                return (
                  <line
                    key={`${prerequisite}-${code}`}
                    x1={from.x + 62}
                    y1={from.y}
                    x2={to.x - 62}
                    y2={to.y}
                    className="graph-edge"
                    markerEnd="url(#arrow)"
                  />
                );
              }),
          )}
          {[...graphData.included].map((code) => {
            const position = graphData.positions.get(code);
            if (!position) return null;
            const active = selected.has(code);
            return (
              <g key={code} transform={`translate(${position.x}, ${position.y})`}>
                <rect x="-62" y="-24" width="124" height="48" rx="14" className={active ? "graph-node active" : "graph-node"} />
                <text textAnchor="middle" dominantBaseline="middle" className="graph-label">
                  {code}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
