import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { CalculatedTimeline, EraseEffect } from '../types';
import { clamp, DEFAULT_DUST_ANGLE, dustVector, getEraseProgress, remainingPolygon, seededRandom } from '../utils/eraseEffects';

interface Props {
  effect: EraseEffect;
  timeline: CalculatedTimeline;
  dustAngle?: number;
  contentKey: string;
  className?: string;
  children: ReactNode;
}
interface Point { x: number; y: number; color: string; r: number; r2: number }
interface Line { left: number; right: number; top: number; bottom: number }
interface Layout { width: number; height: number; lines: Line[]; points: Point[] }
const PAD = 70;
const isParticleEffect = (effect: EraseEffect) => ['eraser', 'dust', 'sparkle'].includes(effect);

// DOM remains the real reading content. Canvas is only a decorative overlay, never a second clock.
export function EraseTextEffect({ effect, timeline, dustAngle = DEFAULT_DUST_ANGLE, contentKey, className = '', children }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const p = getEraseProgress(timeline);
  const particlesEnabled = isParticleEffect(effect) && !reduced;
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useLayoutEffect(() => {
    if (!particlesEnabled || !contentRef.current) { setLayout(null); return; }
    const content = contentRef.current;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const bounds = content.getBoundingClientRect();
      const width = Math.ceil(bounds.width), height = Math.ceil(bounds.height);
      if (!width || !height) return;
      // Bound decorative raster cost for very long paragraphs; the DOM still renders all content.
      if (width * height > 3_000_000) { setLayout(null); return; }
      const source = document.createElement('canvas'); source.width = width; source.height = height;
      const ctx = source.getContext('2d'); if (!ctx) return;
      const lines: Line[] = [];
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      const segmenter = new Intl.Segmenter('vi', { granularity: 'grapheme' });
      // Paint full highlight boxes (including padding) so highlights erase with the text.
      content.querySelectorAll('mark').forEach(mark => {
        const rect = mark.getBoundingClientRect(), style = getComputedStyle(mark);
        ctx.fillStyle = style.backgroundColor;
        ctx.fillRect(rect.left - bounds.left, rect.top - bounds.top, rect.width, rect.height);
      });
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent || '', element = node.parentElement;
        if (!element) continue;
        const style = getComputedStyle(element), size = parseFloat(style.fontSize);
        ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        ctx.fillStyle = style.color; ctx.textBaseline = 'alphabetic';
        for (const { segment, index } of segmenter.segment(text)) {
          range.setStart(node, index); range.setEnd(node, index + segment.length);
          const rect = range.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
          const left = rect.left - bounds.left, top = rect.top - bounds.top;
          let line = lines.find(l => Math.abs(l.top - top) < size * .5);
          if (!line) { line = { left, right: left + rect.width, top, bottom: top + rect.height }; lines.push(line); }
          else { line.left = Math.min(line.left, left); line.right = Math.max(line.right, left + rect.width); line.bottom = Math.max(line.bottom, top + rect.height); }
          // Approximate glyph ink only for dust; the visible stationary text stays native DOM.
          ctx.fillText(segment, left, top + (rect.height - size) / 2 + size * .82);
        }
      }
      range.detach(); lines.sort((a, z) => a.top - z.top);
      const image = ctx.getImageData(0, 0, width, height).data;
      const points: Point[] = [];
      for (let y = 0; y < height; y += 3) for (let x = 0; x < width; x += 3) {
        const offset = (y * width + x) * 4;
        if (image[offset + 3] > 100) points.push({ x, y, color: `rgb(${image[offset]},${image[offset + 1]},${image[offset + 2]})`, r: seededRandom(y * width + x), r2: seededRandom(y * width + x + 77) });
      }
      const stride = Math.max(1, Math.ceil(points.length / 4500));
      setLayout({ width, height, lines, points: points.filter((_, i) => i % stride === 0) });
    };
    measure();
    const observer = new ResizeObserver(measure); observer.observe(content);
    document.fonts.ready.then(measure);
    return () => { disposed = true; observer.disconnect(); };
  }, [particlesEnabled, contentKey, className]);

  const vector = dustVector(dustAngle);
  let min = Infinity, max = -Infinity;
  layout?.points.forEach(a => { const projection = a.x * vector.dx + a.y * vector.dy; min = Math.min(min, projection); max = Math.max(max, projection); });
  if (!Number.isFinite(min)) { min = 0; max = 1; }
  const span = Math.max(1, max - min);
  const lineIndex = layout ? Math.min(layout.lines.length - 1, Math.floor(p * layout.lines.length)) : 0;
  const line = layout?.lines[lineIndex];
  const fraction = layout ? p * layout.lines.length - lineIndex : 0;
  const edge = line ? line.left + fraction * (line.right - line.left + 22) : 0;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layout) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = layout.width + PAD * 2, h = layout.height + PAD * 2;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, PAD * dpr, PAD * dpr);
    ctx.clearRect(-PAD, -PAD, w, h);
    if (p <= 0 || p >= 1 || reduced) return;
    layout.points.forEach((a, i) => {
      let threshold: number;
      if (effect === 'eraser') {
        const row = Math.max(0, layout.lines.findIndex(l => a.y <= l.bottom));
        const l = layout.lines[row]; if (!l) return;
        threshold = (row + clamp((a.x - l.left) / (l.right - l.left + 22))) / layout.lines.length;
      } else threshold = effect === 'dust' ? clamp((a.x * vector.dx + a.y * vector.dy - min) / span) * .65 : a.x / layout.width * .7;
      const q = (p - threshold) / Math.max(.15, 1 - threshold);
      if (q <= 0 || q >= 1) return;
      ctx.globalAlpha = (1 - q) ** 2 * .85;
      if (effect === 'sparkle') {
        if (i % 3) return;
        const x = a.x + q * (15 + a.r * 65), y = a.y - q * (25 + a.r2 * 75);
        const size = (.6 + Math.sin(q * Math.PI) * 1.6) * (i % 13 === 0 ? 2 : 1);
        ctx.fillStyle = i % 2 ? '#c98520' : '#8974bd';
        ctx.fillRect(x - size, y - size / 3, size * 2, size * 2 / 3);
        ctx.fillRect(x - size / 3, y - size, size * 2 / 3, size * 2);
      } else {
        const travel = q * (55 + a.r * 120), sway = Math.sin(q * 8 + a.r2 * 6) * q * 16;
        const dx = effect === 'eraser' ? (a.r - .35) * q * 60 : vector.dx * travel - vector.dy * sway;
        const dy = effect === 'eraser' ? q * 35 + q * q * 55 : vector.dy * travel + vector.dx * sway;
        ctx.fillStyle = effect === 'eraser' ? (i % 2 ? '#ed9eae' : '#9f9582') : a.color;
        ctx.fillRect(a.x + dx, a.y + dy, effect === 'eraser' ? 2 : 1.5, effect === 'eraser' ? 2 : 1.5);
      }
    });
    ctx.globalAlpha = 1;
    if (effect === 'eraser' && line) {
      ctx.save(); ctx.translate(edge, (line.top + line.bottom) / 2); ctx.rotate(Math.sin(p * 90) * .16);
      ctx.shadowColor = '#0003'; ctx.shadowBlur = 8; ctx.fillStyle = '#f69bac'; ctx.strokeStyle = '#252525'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-16, -24, 32, 48, 5); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff1d8'; ctx.fillRect(-15, 4, 30, 14); ctx.fillStyle = '#b75c70'; ctx.fillRect(-9, -16, 18, 3); ctx.restore();
    }
    if (effect === 'sparkle' && p < .7) {
      const x = layout.width * p / .7, glow = ctx.createLinearGradient(x - 20, 0, x + 16, 0);
      glow.addColorStop(0, '#ffbd4500'); glow.addColorStop(.6, '#ffd46b99'); glow.addColorStop(1, '#ffbd4500');
      ctx.fillStyle = glow; ctx.fillRect(x - 20, 0, 36, layout.height);
    }
  }, [layout, p, effect, reduced, vector.dx, vector.dy, min, span, edge, line]);

  let style: CSSProperties = {};
  if (p > 0) {
    if (p >= 1 || reduced || (isParticleEffect(effect) && !layout)) style = { opacity: 1 - p };
    else if (effect === 'dust' && layout) {
      const polygon = remainingPolygon(layout.width, layout.height, vector.dx, vector.dy, min + clamp(p / .65) * span);
      style = { clipPath: polygon.length ? `polygon(${polygon.map(([x, y]) => `${x}px ${y}px`).join(',')})` : 'inset(100%)', opacity: p >= .65 ? 0 : 1 };
    } else if (effect === 'sparkle') style = { clipPath: `inset(0 0 0 ${clamp(p / .7) * 100}%)` };
    else if (effect === 'eraser' && layout && line) {
      const top = lineIndex ? (layout.lines[lineIndex - 1].bottom + line.top) / 2 : 0;
      const bottom = lineIndex + 1 < layout.lines.length ? (line.bottom + layout.lines[lineIndex + 1].top) / 2 : layout.height;
      style = { clipPath: `polygon(${edge}px ${top}px,100% ${top}px,100% 100%,0 100%,0 ${bottom}px,${edge}px ${bottom}px)` };
    } else if (effect === 'vaporize') style = { opacity: (1 - p) ** 1.6, filter: `blur(${p * 10}px)`, transform: `translateY(-${p * 20}px) scale(${1 + p * .05})` };
    else if (effect === 'dissolve') style = { opacity: 1 - p, filter: `contrast(${100 + p * 120}%) blur(${p * 6}px)`, transform: `scale(${1 - p * .04})` };
    else if (effect === 'fade') style = { opacity: 1 - p, filter: `blur(${p * 3.5}px)` };
    else { const mask = `linear-gradient(to right,transparent ${p * 100}%,black ${Math.min(100, p * 100 + 12)}%)`; style = { maskImage: mask, WebkitMaskImage: mask, opacity: Math.max(.15, 1 - p * .8) }; }
  }
  return <div className={`relative ${className}`} data-erase-effect={effect} data-erase-progress={p.toFixed(3)}>
    <div ref={contentRef} style={style}>{children}</div>
    {particlesEnabled && layout && <canvas ref={canvasRef} aria-hidden="true" className="absolute pointer-events-none" style={{ left: -PAD, top: -PAD, width: layout.width + PAD * 2, height: layout.height + PAD * 2 }} />}
  </div>;
}
