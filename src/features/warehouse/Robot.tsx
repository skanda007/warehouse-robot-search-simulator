import React, { useRef } from "react";

interface RobotProps {
  x: number;
  y: number;
  /** Target heading in degrees. 0 = facing RIGHT, 90 = DOWN, 180 = LEFT, -90 = UP. */
  angle: number;
  moveMs: number;
  scanning: boolean;
  label: string;
  coord: string;
  gradientId: string;
}

/** Autonomous mobile robot (AMR) — SVG body, wheels, heading chevron, lidar and label. */
export function Robot({ x, y, angle, moveMs, scanning, label, coord, gradientId }: RobotProps) {
  // keep the heading continuous so the robot always turns the short way round
  const heading = useRef(angle);
  const delta = ((angle - heading.current + 540) % 360) - 180;
  heading.current += delta;

  return (
    <g style={{ transform: `translate(${x}px, ${y}px)`, transition: `transform ${moveMs}ms linear` }} pointerEvents="none">
      <g style={{ transform: `rotate(${heading.current}deg)`, transition: `transform ${Math.min(moveMs, 280)}ms ease-out` }}>
        {scanning && <circle r={18} fill="none" stroke="#c8ff2e" strokeOpacity={0.4} strokeWidth={1} strokeDasharray="2 3" className="wa-scan" />}
        {[
          [-9, -12],
          [5, -12],
          [-9, 8],
          [5, 8],
        ].map(([wx, wy], i) => (
          <rect key={i} x={wx} y={wy} width={8} height={4} rx={1} fill="#0a0b0c" stroke="#38414a" strokeWidth={0.7} />
        ))}
        {/* Chassis */}
        <rect x={-14} y={-9} width={28} height={18} rx={4.5} fill="#14181c" stroke="#c8ff2e" strokeWidth={1.3} />
        <rect x={-10} y={-6} width={15} height={12} rx={2} fill="#191d20" opacity={0.9} stroke="#2a333d" strokeWidth={0.6} />
        {/* Forward direction chevron in volt */}
        <polygon points="14,0 8.5,-4.5 8.5,4.5" fill="#c8ff2e" stroke="#84a91a" strokeWidth={0.5} />
        <rect x={12.5} y={-7} width={2} height={3} rx={0.8} fill="#fef9c3" />
        <rect x={12.5} y={4} width={2} height={3} rx={0.8} fill="#fef9c3" />
        {/* Lidar center */}
        <circle cx={-3} cy={0} r={3.6} fill="#0a0b0c" stroke="#c8ff2e" strokeWidth={0.8} />
        <circle cx={-3} cy={0} r={1.3} fill="#c8ff2e" />
        {scanning && <path d="M-3 0 L7 -5 A11 11 0 0 1 7 5 Z" fill="#c8ff2e" opacity={0.25} className="wa-scan-local" />}
      </g>
      <g>
        <rect x={-21} y={-30} width={42} height={16} rx={3} fill="#0a0b0c" opacity={0.88} stroke="#2a333d" strokeWidth={0.8} />
        <text y={-23} textAnchor="middle" fontSize={6.5} fontWeight={800} fill="#f3f4f1" letterSpacing={0.4}>
          {label}
        </text>
        <text y={-16.3} textAnchor="middle" fontSize={5.8} fontWeight={700} fill="#c8ff2e">
          {coord}
        </text>
      </g>
    </g>
  );
}
