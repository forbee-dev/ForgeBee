import React from 'react';
import {AbsoluteFill, Audio, Sequence, Series, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const C = {
  bg: '#0B0B0F',
  panel: '#15151C',
  line: '#2A2A35',
  text: '#F4F1EA',
  dim: '#8E8B99',
  honey: '#FFB81C',
  ok: '#3DDC97',
  bad: '#FF5C5C',
};
// shortcut: system fonts, so the render matches only on macOS. Add @remotion/google-fonts if CI renders it.
const sans = 'system-ui, -apple-system, "Helvetica Neue", sans-serif';
const mono = 'Menlo, "SF Mono", monospace';
const HEX = '50,3 93,26 93,74 50,97 7,74 7,26';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Counts match the README badges. Update both together.
const STATS = [
  [46, 'agents'],
  [39, 'commands'],
  [34, 'skills'],
  [27, 'hooks'],
] as const;

const STEPS = ['Goal first', 'Evidence before code', 'A spec you approve', 'Specialists build', 'Review until clean'];

const CLAIMS = [
  [true, 'goal ', 'hide the block on mobile', ''],
  [false, 'claim', '"the bug is in render.php"', 'false'],
  [false, 'claim', '"the field hide_mobile exists"', 'false'],
  [true, 'claim', '"the class is-hidden-mobile exists"', 'true'],
] as const;

const useRise = (start: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - start, fps, config: {damping: 200}});
  return {opacity: s, transform: `translateY(${(1 - s) * 30}px)`};
};

const Rise: React.FC<{at: number; style?: React.CSSProperties; children: React.ReactNode}> = ({at, style, children}) => (
  <div style={{...style, ...useRise(at)}}>{children}</div>
);

const Sfx: React.FC<{at: number; src: string; rate?: number}> = ({at, src, rate = 1}) => (
  <Sequence from={at} layout="none">
    <Audio src={staticFile(src)} playbackRate={rate} />
  </Sequence>
);

const Scene: React.FC<{d: number; children: React.ReactNode}> = ({d, children}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, d - 10, d], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{opacity, alignItems: 'center', justifyContent: 'center', padding: 120}}>{children}</AbsoluteFill>
  );
};

const Background: React.FC = () => (
  <AbsoluteFill style={{background: `radial-gradient(circle at 50% 40%, #1D1A12 0%, ${C.bg} 65%)`}}>
    <svg width="100%" height="100%" style={{opacity: 0.07}}>
      <defs>
        <pattern id="comb" width="120" height="208" patternUnits="userSpaceOnUse">
          <path
            d="M60 0 L120 35 L120 104 L60 139 L0 104 L0 35 Z M60 139 L60 208 M0 104 L0 208 M120 104 L120 208"
            fill="none"
            stroke={C.honey}
            strokeWidth="2"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#comb)" />
    </svg>
  </AbsoluteFill>
);

const Logo: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <clipPath id="hex">
      <polygon points={HEX} />
    </clipPath>
    <g clipPath="url(#hex)">
      <rect width="100" height="100" fill={C.honey} />
      <rect y="34" width="100" height="12" fill={C.bg} />
      <rect y="56" width="100" height="12" fill={C.bg} />
    </g>
  </svg>
);

const Hook: React.FC = () => (
  <>
    <Rise at={5} style={{fontSize: 84, fontWeight: 700, textAlign: 'center'}}>
      A coding agent does what the ticket says.
    </Rise>
    <Rise at={50} style={{fontSize: 84, fontWeight: 700, color: C.honey, marginTop: 30}}>
      That is the problem.
    </Rise>
    <Sfx at={50} src="thud.wav" />
  </>
);

const Ticket: React.FC = () => {
  const frame = useCurrentFrame();
  const cmd = '/team PROJ-142: the newsletter block ignores the "hide on mobile" setting';
  const typed = cmd.slice(0, Math.floor(interpolate(frame, [10, 60], [0, cmd.length], clamp)));
  return (
    <>
      <Rise at={0} style={{fontSize: 56, fontWeight: 700, marginBottom: 50}}>
        ForgeBee checks the ticket against <span style={{color: C.honey}}>your code</span>.
      </Rise>
      <div
        style={{
          width: 1600,
          background: C.panel,
          border: `2px solid ${C.line}`,
          borderRadius: 20,
          padding: 50,
          fontFamily: mono,
          fontSize: 32,
          lineHeight: 1.9,
        }}
      >
        <div>
          <span style={{color: C.honey}}>&gt; </span>
          {typed}
          <span style={{opacity: frame % 20 < 10 ? 1 : 0}}>▌</span>
        </div>
        <Sfx at={10} src="typing.wav" />
        {CLAIMS.map(([ok, kind, text, verdict], i) => (
          <Rise key={text} at={70 + i * 20} style={{display: 'flex', gap: 28, whiteSpace: 'pre'}}>
            <Sfx at={70 + i * 20} src={ok ? 'ok.wav' : 'bad.wav'} />
            <span style={{color: ok ? C.ok : C.bad}}>{ok ? '✓' : '✗'}</span>
            <span style={{color: C.dim}}>{kind}</span>
            <span style={{flex: 1}}>{text}</span>
            <span style={{color: ok ? C.ok : C.bad}}>{verdict}</span>
          </Rise>
        ))}
      </div>
    </>
  );
};

const Steps: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <Rise at={0} style={{fontSize: 56, fontWeight: 700, marginBottom: 90}}>
        Then it works in this order.
      </Rise>
      <div style={{display: 'flex', gap: 40}}>
        {STEPS.map((label, i) => {
          const lit = interpolate(frame, [20 + i * 30, 35 + i * 30], [0, 1], clamp);
          return (
            <div key={label} style={{width: 300, textAlign: 'center', opacity: 0.35 + lit * 0.65}}>
              {/* Each pop is one whole tone above the last. */}
              <Sfx at={20 + i * 30} src="pop.wav" rate={2 ** (i / 6)} />
              <svg width={200} height={200} viewBox="0 0 100 100" style={{transform: `scale(${0.9 + lit * 0.1})`}}>
                <polygon points={HEX} fill={C.honey} fillOpacity={lit * 0.9} stroke={C.honey} strokeWidth="3" />
                <text
                  x="50"
                  y="64"
                  textAnchor="middle"
                  fontSize="40"
                  fontWeight="700"
                  fontFamily={sans}
                  fill={lit > 0.5 ? C.bg : C.honey}
                >
                  {i + 1}
                </text>
              </svg>
              <div style={{fontSize: 38, fontWeight: 600, marginTop: 24}}>{label}</div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const Stats: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <div style={{display: 'flex', gap: 110}}>
        {STATS.map(([n, label], i) => (
          <Rise key={label} at={i * 6} style={{textAlign: 'center'}}>
            <Sfx at={45 + i * 6} src="pop.wav" rate={2 ** (i / 6)} />
            <div style={{fontSize: 170, fontWeight: 800, color: C.honey, fontVariantNumeric: 'tabular-nums'}}>
              {Math.round(interpolate(frame, [5 + i * 6, 45 + i * 6], [0, n], clamp))}
            </div>
            <div style={{fontSize: 44, color: C.dim}}>{label}</div>
          </Rise>
        ))}
      </div>
      <Rise at={50} style={{fontSize: 48, fontWeight: 600, marginTop: 80}}>
        Routed by stack. Reviewed until clean.
      </Rise>
    </>
  );
};

const Cta: React.FC = () => (
  <>
    <Sfx at={0} src="chime.wav" />
    <Rise at={0} style={{display: 'flex', alignItems: 'center', gap: 36}}>
      <Logo size={170} />
      <span style={{fontSize: 150, fontWeight: 800}}>ForgeBee</span>
    </Rise>
    <Rise at={15} style={{fontSize: 52, color: C.dim, marginTop: 20}}>
      A colony of AI agents forging your product
    </Rise>
    <Rise
      at={35}
      style={{
        fontFamily: mono,
        fontSize: 40,
        marginTop: 70,
        padding: '28px 48px',
        background: C.panel,
        border: `2px solid ${C.honey}`,
        borderRadius: 16,
      }}
    >
      <span style={{color: C.honey}}>&gt; </span>/plugin install forgebee@forbee-dev
    </Rise>
    <Rise at={50} style={{fontSize: 36, color: C.dim, marginTop: 40}}>
      github.com/forbee-dev/ForgeBee
    </Rise>
  </>
);

const SCENES: [React.FC, number][] = [
  [Hook, 105],
  [Ticket, 180],
  [Steps, 210],
  [Stats, 105],
  [Cta, 135],
];

export const TOTAL_FRAMES = SCENES.reduce((sum, [, d]) => sum + d, 0);

export const Promo: React.FC = () => (
  <AbsoluteFill style={{color: C.text, fontFamily: sans}}>
    <Background />
    <Audio src={staticFile('music.wav')} />
    <Series>
      {SCENES.map(([Component, d], i) => (
        <Series.Sequence key={i} durationInFrames={d}>
          <Scene d={d}>
            <Component />
          </Scene>
        </Series.Sequence>
      ))}
    </Series>
  </AbsoluteFill>
);
