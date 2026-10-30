import type { FamilyMember } from "../lib/types";

const WIDTH = 640;

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

function generationOf(member: FamilyMember): number {
  if (member.generation !== null && member.generation !== undefined) {
    const value = Number(member.generation);
    if (!Number.isNaN(value)) return value;
  }

  const id = String(member.id ?? "").toUpperCase();
  if (id.startsWith("III")) return 3;
  if (id.startsWith("II")) return 2;
  return 1;
}

function parentsOf(member: FamilyMember): string[] {
  const candidates: unknown[] = [];

  if (Array.isArray(member.parents)) candidates.push(...member.parents);
  if (member.mother_id) candidates.push(member.mother_id);
  if (member.father_id) candidates.push(member.father_id);

  const ids: string[] = [];

  for (const candidate of candidates) {
    const id =
      candidate && typeof candidate === "object"
        ? (candidate as { id?: string }).id
        : (candidate as string);
    if (id && !ids.includes(String(id))) ids.push(String(id));
  }

  return ids;
}

interface PedigreeProps {
  family: FamilyMember[];
  compact?: boolean;
}

export function Pedigree({ family, compact = false }: PedigreeProps) {
  if (!family.length) {
    return (
      <p className="py-10 text-center text-sm text-ink-muted">No family members to display.</p>
    );
  }

  const byGeneration = new Map<number, FamilyMember[]>();
  for (const member of family) {
    const generation = generationOf(member);
    const group = byGeneration.get(generation) ?? [];
    group.push(member);
    byGeneration.set(generation, group);
  }

  const generations = [...byGeneration.keys()].sort((a, b) => a - b);
  const positions = new Map<string, { x: number; y: number }>();
  const rowHeight = compact ? 74 : 86;
  const top = compact ? 34 : 44;
  const height = top + (generations.length - 1) * rowHeight + (compact ? 56 : 64);

  generations.forEach((generation, rowIndex) => {
    const group = byGeneration.get(generation) ?? [];
    const spacing = Math.min(120, (WIDTH - 100) / Math.max(group.length, 1));
    const y = top + rowIndex * rowHeight;

    group.forEach((member, index) => {
      positions.set(String(member.id), {
        x: WIDTH / 2 + (index - (group.length - 1) / 2) * spacing,
        y,
      });
    });
  });

  const nodes = family
    .map((member) => ({ member, position: positions.get(String(member.id)) }))
    .filter(
      (entry): entry is { member: FamilyMember; position: { x: number; y: number } } =>
        Boolean(entry.position),
    );

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Pedigree diagram of the synthetic family: filled shapes indicate affected members"
      >
        <defs>
          <filter id="node-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {generations.map((generation, index) => (
          <g key={`gen-${generation}`}>
            <text
              x={18}
              y={top + index * rowHeight + 4}
              fill="#536a82"
              fontSize={10}
              letterSpacing={2}
              fontFamily="JetBrains Mono, monospace"
            >
              {ROMAN[index] ?? String(generation)}
            </text>
            <line
              x1={36}
              x2={WIDTH - 16}
              y1={top + index * rowHeight}
              y2={top + index * rowHeight}
              stroke="rgba(148,178,210,0.06)"
              strokeDasharray="2 8"
            />
          </g>
        ))}

        {nodes.map(({ member, position }) => {
          const seen = new Set<string>();

          return parentsOf(member)
            .filter((parentId) => {
              if (seen.has(parentId)) return false;
              seen.add(parentId);
              return positions.has(parentId);
            })
            .map((parentId) => {
              const parent = positions.get(parentId)!;
              const child = position;
              const midY = parent.y + (child.y - parent.y) * 0.55;

              return (
                <path
                  key={`${parentId}-${String(member.id)}`}
                  d={`M ${parent.x} ${parent.y + 17} V ${midY} H ${child.x} V ${child.y - 17}`}
                  fill="none"
                  stroke="rgba(148,178,210,0.32)"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                />
              );
            });
        })}

        {nodes.map(({ member, position }) => {
          const id = String(member.id);
          const affected = member.affected === true;
          const sex = String(member.sex ?? "").toLowerCase();
          const size = compact ? 12 : 14;
          const stroke = affected ? "#fb7185" : "#2dd4bf";
          const fill = affected ? "rgba(251,113,133,0.14)" : "rgba(45,212,191,0.10)";
          const label = `${id} · ${affected ? "affected" : "unaffected"} · ${
            sex || "sex not specified"
          }`;

          return (
            <g key={id} filter={affected ? "url(#node-glow)" : undefined}>
              <title>{label}</title>
              {sex.startsWith("m") ? (
                <rect
                  x={position.x - size}
                  y={position.y - size}
                  width={size * 2}
                  height={size * 2}
                  rx={3}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.6}
                />
              ) : sex.startsWith("f") ? (
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={size}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.6}
                />
              ) : (
                <path
                  d={`M ${position.x} ${position.y - size - 1} L ${position.x + size + 1} ${
                    position.y
                  } L ${position.x} ${position.y + size + 1} L ${position.x - size - 1} ${
                    position.y
                  } Z`}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={1.6}
                />
              )}

              <text
                x={position.x}
                y={position.y + size + 15}
                textAnchor="middle"
                fill="#a2b5c9"
                fontSize={10}
                fontFamily="JetBrains Mono, monospace"
              >
                {id}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-rose-400 bg-rose-400/20" aria-hidden />
          Affected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-accent-teal bg-accent-teal/15" aria-hidden />
          Unaffected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] border border-ink-faint" aria-hidden />
          Male
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-ink-faint" aria-hidden />
          Female
        </span>
      </div>
    </div>
  );
}
