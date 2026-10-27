/* Dra. Ana Paula Fonseca — componentes do site.
   React 18. Ícones: lucide-react (traço 1.5). Estilos: components/bundle.css (classes ap-*), valores: tokens.json. */
import * as React from 'react';
import {
  ArrowRight, Calendar, Clock, MapPin, Users, Menu, X, ChevronDown, Check, AlertTriangle,
  Info, CircleAlert, CircleCheck, Sun, Moon, Instagram, Mail, Phone, Quote, Pencil, Trash2,
  Eye, LayoutDashboard, BookOpen, UserRound, Settings, Plus, Award, Monitor, CalendarDays
} from 'lucide-react';
import { siWhatsapp } from 'simple-icons';
import GEO from './logo-geo.json';

const { useState, useEffect, useRef, useId, useLayoutEffect } = React;
const cx = (...a) => a.filter(Boolean).join(' ');
const ICON = { size: 20, strokeWidth: 1.5, 'aria-hidden': true };
const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/* ---------- Movimento: utilidades ---------- */

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* true quando o elemento entra na tela (uma vez). */
function useInView(ref, threshold = 0.2) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!('IntersectionObserver' in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el); return () => io.disconnect();
  }, []);
  return seen;
}

/* Progresso 0→1 de um elemento atravessando a tela (para parallax e para a linha da programação). */
function useScrollProgress(ref, enabled = true) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!enabled || reducedMotion()) return;
    let raf = 0;
    const tick = () => {
      raf = 0; const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect(); const vh = window.innerHeight || 1;
      setP(Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height || 1))));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick(); window.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
  }, [enabled]);
  return p;
}

/* ---------- Marca ---------- */

const GEO_KEY = { horizontal: 'logo-horizontal', vertical: 'logo-vertical', selo: 'logo-selo', simbolo: 'simbolo-azul-claro' };

/* Ordem de baixo para cima das pedras no arquivo do símbolo: 0 = base, 2 = terceira, 1 = segunda, 3 = topo. */
const STACK_ORDER = [0, 2, 1, 3];
const stoneStep = (k) => STACK_ORDER.indexOf(k % 4);

export function Logo({ variant = 'horizontal', mono = false, animated = false, width, className, style, title = 'Dra. Ana Paula Fonseca — Médica Fisiatra' }) {
  const g = GEO[GEO_KEY[variant]] || GEO['logo-horizontal'];
  let s = -1;
  return (
    <svg className={cx('ap-logo', mono && 'ap-logo-mono', animated && 'ap-logo-intro', className)} viewBox={`0 0 ${g.w} ${g.h}`}
      width={width} style={style} role="img" aria-label={title || undefined} aria-hidden={title ? undefined : true}>
      {g.p.map(([r, d], i) => {
        if (r === 's') { s += 1; return <path key={i} className="ap-logo-s" d={d} style={{ '--i': stoneStep(s) }} />; }
        return <path key={i} className="ap-logo-i" d={d} />;
      })}
    </svg>
  );
}

const STONES = GEO['simbolo-azul-claro'];
/* Grafismo da marca (capa e p. 26 do manual): o próprio símbolo, ampliado e sangrando para fora da área.
   intro: as pedras caem e se assentam de baixo para cima. parallax: andam mais devagar que a página ao rolar.
   Depois flutuam devagar, cada uma num tempo. */
export function PedrasFundo({ animated = true, intro = true, parallax = true, side = 'full', className }) {
  const ref = useRef(null);
  const p = useScrollProgress(ref, animated && parallax);
  return (
    <div ref={ref} className={cx('ap-pedras', `ap-pedras-${side}`, animated && 'ap-pedras-anim', animated && intro && 'ap-pedras-intro', className)} aria-hidden="true">
      <svg className="ap-pedras-svg" viewBox={`0 0 ${STONES.w} ${STONES.h}`} preserveAspectRatio="xMidYMid meet"
        style={{ transform: `translate3d(0, ${(p * 10).toFixed(2)}%, 0)` }}>
        {STONES.p.map(([, d], i) => (
          <g key={i} className="ap-pedra-g" style={{ '--i': stoneStep(i) }}>
            <path d={d} style={{ animationDelay: (-i * 2.2) + 's' }} />
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ---------- Ações ---------- */

export function Button({ variant = 'primary', size = 'md', href, arrow = false, icon, full = false, className, children, ...rest }) {
  const Tag = href ? 'a' : 'button';
  const extra = href ? { href } : { type: rest.type || 'button' };
  return (
    <Tag {...rest} {...extra} className={cx('ap-btn', `ap-btn-${variant}`, `ap-btn-${size}`, full && 'ap-btn-full', className)}>
      {icon && <span className="ap-btn-icon">{icon}</span>}
      <span className="ap-btn-label">{children}</span>
      {arrow && <ArrowRight {...ICON} size={18} className="ap-btn-arrow" />}
    </Tag>
  );
}

export function ThemeToggle({ theme = 'claro', onChange, className }) {
  const next = theme === 'claro' ? 'escuro' : 'claro';
  return (
    <button type="button" className={cx('ap-icon-btn', className)} onClick={() => onChange && onChange(next)}
      aria-label={theme === 'claro' ? 'Ativar tema escuro' : 'Ativar tema claro'}>
      {theme === 'claro' ? <Moon {...ICON} /> : <Sun {...ICON} />}
    </button>
  );
}

export function WhatsAppButton({ phone = '5531988856565', message = 'Olá! Gostaria de saber mais sobre as próximas turmas.', label = 'Fale conosco no WhatsApp', floating = true, className }) {
  const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cx('ap-wa', floating && 'ap-wa-float', className)} aria-label={label}>
      <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d={siWhatsapp.path} fill="currentColor" /></svg>
      <span className="ap-wa-label">{label}</span>
    </a>
  );
}

/* ---------- Status ---------- */

const BADGE_ICON = { success: CircleCheck, warning: AlertTriangle, danger: CircleAlert };
export function Badge({ tone = 'neutral', icon, children, className }) {
  const I = BADGE_ICON[tone];
  return (
    <span className={cx('ap-badge', `ap-badge-${tone}`, className)}>
      {icon !== false && I && <I {...ICON} size={14} />}
      {children}
    </span>
  );
}

const ALERT_ICON = { info: Info, success: CircleCheck, warning: AlertTriangle, danger: CircleAlert };
export function Alert({ tone = 'info', title, children, className }) {
  const I = ALERT_ICON[tone] || Info;
  return (
    <div className={cx('ap-alert', `ap-alert-${tone}`, className)} role={tone === 'danger' ? 'alert' : 'status'}>
      <I {...ICON} />
      <div>
        {title && <p className="ap-alert-title">{title}</p>}
        {children && <div className="ap-alert-body">{children}</div>}
      </div>
    </div>
  );
}

/* ---------- Formulário ---------- */

function FieldShell({ id, label, hint, error, required, children }) {
  return (
    <div className={cx('ap-field', error && 'ap-field-error')}>
      {label && <label className="ap-label" htmlFor={id}>{label}{required && <span className="ap-req" aria-hidden="true"> *</span>}</label>}
      {children}
      {error ? <p className="ap-hint ap-hint-error" id={id + '-msg'}><CircleAlert {...ICON} size={14} />{error}</p>
        : hint ? <p className="ap-hint" id={id + '-msg'}>{hint}</p> : null}
    </div>
  );
}

export function TextField({ label, hint, error, required, multiline = false, rows = 4, floating = false, id, className, ...rest }) {
  const auto = useId(); const fid = id || 'f' + auto.replace(/:/g, '');
  const props = { id: fid, required, 'aria-invalid': !!error || undefined, 'aria-describedby': (error || hint) ? fid + '-msg' : undefined, className: cx('ap-input', className), ...rest };
  if (floating) {
    /* Rótulo dentro do campo que sobe ao focar ou digitar. O placeholder vira " " para o CSS saber se há texto. */
    const fp = { ...props, placeholder: ' ' };
    return (
      <div className={cx('ap-field', 'ap-field-float', error && 'ap-field-error', multiline && 'is-multi')}>
        <div className="ap-float">
          {multiline ? <textarea rows={rows} {...fp} /> : <input {...fp} />}
          <label className="ap-float-label" htmlFor={fid}>{label}{required && <span className="ap-req" aria-hidden="true"> *</span>}</label>
          <span className="ap-float-line" aria-hidden="true" />
        </div>
        {error ? <p className="ap-hint ap-hint-error" id={fid + '-msg'}><CircleAlert {...ICON} size={14} />{error}</p>
          : hint ? <p className="ap-hint" id={fid + '-msg'}>{hint}</p> : null}
      </div>
    );
  }
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required}>
      {multiline ? <textarea rows={rows} {...props} /> : <input {...props} />}
    </FieldShell>
  );
}

export function Select({ label, hint, error, required, options = [], placeholder = 'Selecione', id, className, ...rest }) {
  const auto = useId(); const fid = id || 'f' + auto.replace(/:/g, '');
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required}>
      <div className="ap-select">
        <select id={fid} required={required} aria-invalid={!!error || undefined} className={cx('ap-input', className)} defaultValue="" {...rest}>
          <option value="" disabled>{placeholder}</option>
          {options.map((o) => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown {...ICON} size={18} />
      </div>
    </FieldShell>
  );
}

export function Checkbox({ label, hint, id, className, ...rest }) {
  const auto = useId(); const fid = id || 'c' + auto.replace(/:/g, '');
  return (
    <div className={cx('ap-check', className)}>
      <input type="checkbox" id={fid} {...rest} />
      <span className="ap-check-box" aria-hidden="true"><Check {...ICON} size={14} strokeWidth={2.5} /></span>
      <label htmlFor={fid}>{label}{hint && <span className="ap-check-hint">{hint}</span>}</label>
    </div>
  );
}

/* ---------- Layout e conteúdo ---------- */

export function Section({ theme, background = 'surface', pedras = false, narrow = false, id, className, children }) {
  return (
    <section id={id} data-theme={theme} className={cx('ap-section', `ap-bg-${background}`, className)}>
      {pedras && <PedrasFundo side="right" />}
      <div className={cx('ap-container', narrow && 'ap-container-narrow')}>{children}</div>
    </section>
  );
}

export function Reveal({ delay = 0, as: Tag = 'div', className, children }) {
  const ref = useRef(null); const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!('IntersectionObserver' in window)) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={cx('ap-reveal', shown && 'is-in', className)} style={{ transitionDelay: delay + 'ms' }}>{children}</Tag>;
}

export function SectionHeading({ number, eyebrow, title, lead, align = 'left', as: H = 'h2', className }) {
  return (
    <header className={cx('ap-sh', `ap-sh-${align}`, className)}>
      {(number || eyebrow) && (
        <div className="ap-sh-meta">
          {number && <span className="ap-sh-num">{number}</span>}
          <span className="ap-sh-rule" aria-hidden="true" />
          {eyebrow && <span className="ap-eyebrow">{eyebrow}</span>}
        </div>
      )}
      <H className="ap-sh-title">{title}</H>
      {lead && <p className="ap-lead">{lead}</p>}
    </header>
  );
}

export function Hero({ eyebrow = 'Médica Fisiatra', title, lead, primary, secondary, image, imageAlt = '', theme = 'escuro', intro = true, transitionName }) {
  return (
    <section className={cx('ap-hero', intro && 'ap-hero-intro')} data-theme={theme}>
      <PedrasFundo side="full" intro={intro} />
      <div className="ap-container ap-hero-grid">
        <div className="ap-hero-copy">
          {eyebrow && <p className="ap-eyebrow">{eyebrow}</p>}
          <h1 className="ap-hero-title">{title}</h1>
          {lead && <p className="ap-lead">{lead}</p>}
          {(primary || secondary) && (
            <div className="ap-hero-actions">
              {primary && <Button arrow size="lg" href={primary.href}>{primary.label}</Button>}
              {secondary && <Button variant="secondary" size="lg" href={secondary.href}>{secondary.label}</Button>}
            </div>
          )}
        </div>
        {image && (
          <figure className="ap-hero-media" style={transitionName ? { viewTransitionName: transitionName } : undefined}>
            <img src={image} alt={imageAlt} />
          </figure>
        )}
      </div>
    </section>
  );
}

/* ---------- Agenda ---------- */

const STATUS = {
  aberto: { tone: 'success', label: 'Inscrições abertas' },
  ultimas: { tone: 'warning', label: 'Últimas vagas' },
  esgotado: { tone: 'danger', label: 'Esgotado' },
  'em-breve': { tone: 'neutral', label: 'Em breve' },
  encerrado: { tone: 'neutral', label: 'Realizado' },
};
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
/* Aceita "2026-03-14" (ISO). Datas de vários dias: start + end. */
const parseDate = (s) => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return y ? { y, m: m - 1, d } : null; };

export function DateBlock({ start, end, size = 'md', className }) {
  const a = parseDate(start); const b = parseDate(end);
  if (!a) return null;
  const sameMonth = b && b.m === a.m;
  return (
    <span className={cx('ap-date', `ap-date-${size}`, className)}>
      <span className="ap-date-day">{String(a.d).padStart(2, '0')}{b && sameMonth ? `–${String(b.d).padStart(2, '0')}` : ''}</span>
      <span className="ap-date-month">{MESES[a.m]}{b && !sameMonth ? ` – ${String(b.d).padStart(2, '0')} ${MESES[b.m]}` : ''}</span>
      <span className="ap-date-year">{a.y}</span>
    </span>
  );
}

function EventMeta({ time, city, venue, modality, seats }) {
  return (
    <ul className="ap-meta">
      {time && <li><Clock {...ICON} size={18} />{time}</li>}
      {(city || venue) && <li>{modality === 'Online' ? <Monitor {...ICON} size={18} /> : <MapPin {...ICON} size={18} />}{[venue, city].filter(Boolean).join(' · ')}</li>}
      {seats && <li><Users {...ICON} size={18} />{seats}</li>}
    </ul>
  );
}

/* Cartão de uma data da agenda: a data é o destaque. No hover sobe, a foto aproxima e aparece o resumo. */
export function EventCard({ title, start, end, image, imageAlt = '', summary, modality = 'Presencial', time, city, venue, seats, price, status = 'aberto', href = '#', cta = 'Ver detalhes', transitionName, loading = false }) {
  if (loading) return <Skeleton variant="card" />;
  const s = STATUS[status] || STATUS.aberto;
  const off = status === 'esgotado' || status === 'encerrado';
  return (
    <article className={cx('ap-event', off && 'is-off')}>
      <div className="ap-event-media" style={transitionName ? { viewTransitionName: transitionName } : undefined}>
        {image ? <img src={image} alt={imageAlt} loading="lazy" /> : <div className="ap-event-ph"><Logo variant="simbolo" title="" /></div>}
        <DateBlock start={start} end={end} className="ap-event-date" />
        <Badge tone={s.tone} className="ap-event-status">{s.label}</Badge>
      </div>
      <div className="ap-event-body">
        <p className="ap-eyebrow">{modality}</p>
        <h3 className="ap-event-title"><a href={href}>{title}</a></h3>
        <EventMeta time={time} city={city} venue={venue} modality={modality} seats={seats} />
        {summary && <div className="ap-event-more"><p>{summary}</p></div>}
      </div>
      <div className="ap-event-foot">
        <span className="ap-price-main">{price}</span>
        <span className="ap-event-cta">{off ? (status === 'esgotado' ? 'Lista de espera' : 'Ver como foi') : cta}<ArrowRight {...ICON} size={18} /></span>
      </div>
    </article>
  );
}

/* Abas com indicador que desliza até a aba ativa. */
export function Tabs({ items = [], value, onChange, label = 'Filtrar', className }) {
  const wrap = useRef(null); const [bar, setBar] = useState({ left: 0, width: 0 });
  useIso(() => {
    const el = wrap.current && wrap.current.querySelector('[aria-selected="true"]');
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value, items.length]);
  return (
    <div ref={wrap} className={cx('ap-tabs', className)} role="tablist" aria-label={label}>
      {items.map((it) => {
        const v = typeof it === 'string' ? it : it.value; const l = typeof it === 'string' ? it : it.label;
        return <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => onChange && onChange(v)}>{l}{it.count != null && <span className="ap-tabs-count">{it.count}</span>}</button>;
      })}
      <span className="ap-tabs-bar" style={{ transform: `translateX(${bar.left}px)`, width: bar.width }} aria-hidden="true" />
    </div>
  );
}

/* A agenda: datas agrupadas por mês, com filtro (Todos / Presencial / Online…). Ao filtrar, a lista entra de novo, escalonada. */
export function AgendaList({ events = [], filterBy = 'modality', allLabel = 'Todos', emptyText = 'Nenhuma data com este filtro. Novas turmas aparecem aqui assim que forem abertas.', loading = false }) {
  const opts = Array.from(new Set(events.map((e) => e[filterBy]).filter(Boolean)));
  const [f, setF] = useState(allLabel);
  const list = events.filter((e) => f === allLabel || e[filterBy] === f).slice().sort((x, y) => String(x.start || '9').localeCompare(String(y.start || '9')));
  const groups = [];
  list.forEach((e) => { const d = parseDate(e.start); const k = d ? `${d.y}-${d.m}` : '—'; let g = groups.find((x) => x.k === k); if (!g) { g = { k, label: d ? `${MESES_LONGOS[d.m]} ${d.y}` : 'Sem data', items: [] }; groups.push(g); } g.items.push(e); });
  let n = 0;
  return (
    <div className="ap-agenda">
      {opts.length > 1 && <Tabs value={f} onChange={setF} items={[{ value: allLabel, label: allLabel, count: events.length }, ...opts.map((o) => ({ value: o, label: o, count: events.filter((e) => e[filterBy] === o).length }))]} />}
      {loading ? <div className="ap-agenda-list">{[0, 1, 2].map((i) => <Skeleton key={i} variant="row" />)}</div> : (
        <div className="ap-agenda-list" key={f}>
          {!list.length && <p className="ap-agenda-empty">{emptyText}</p>}
          {groups.map((g) => (
            <section key={g.k} className="ap-agenda-month">
              <h3 className="ap-agenda-month-title">{g.label}</h3>
              {g.items.map((e, i) => { const s = STATUS[e.status] || STATUS.aberto; const d = n++; return (
                <a key={e.id || i} href={e.href || '#'} className={cx('ap-agenda-row', (e.status === 'esgotado' || e.status === 'encerrado') && 'is-off')} style={{ '--d': Math.min(d, 6) * 70 + 'ms' }}>
                  <DateBlock start={e.start} end={e.end} size="sm" />
                  <span className="ap-agenda-main">
                    <span className="ap-agenda-title">{e.title}</span>
                    <EventMeta time={e.time} city={e.city} venue={e.venue} modality={e.modality} />
                  </span>
                  <Badge tone={s.tone}>{s.label}</Badge>
                  <ArrowRight {...ICON} className="ap-agenda-arrow" />
                </a>
              ); })}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/* Resumo da data, fixo na lateral da página do evento; no celular vira uma barra no rodapé da tela. */
export function EventSummary({ start, end, time, city, venue, modality = 'Presencial', seatsTotal, seatsTaken, price, installment, status = 'aberto', action = { label: 'Quero me inscrever', href: '#inscricao' }, secondary, bar = true }) {
  const ref = useRef(null); const seen = useInView(ref, 0.3);
  const s = STATUS[status] || STATUS.aberto; const off = status === 'esgotado' || status === 'encerrado';
  const pct = seatsTotal ? Math.min(100, Math.round((seatsTaken || 0) / seatsTotal * 100)) : null;
  const left = seatsTotal ? Math.max(0, seatsTotal - (seatsTaken || 0)) : null;
  return (
    <>
      <aside ref={ref} className="ap-summary" aria-label="Resumo da turma">
        <div className="ap-summary-top">
          <DateBlock start={start} end={end} size="lg" />
          <Badge tone={s.tone}>{s.label}</Badge>
        </div>
        <EventMeta time={time} city={city} venue={venue} modality={modality} />
        {pct != null && (
          <div className="ap-seats">
            <div className="ap-seats-row"><span>Vagas</span><strong>{left === 0 ? 'Esgotado' : `${left} de ${seatsTotal} disponíveis`}</strong></div>
            <div className="ap-seats-track" role="progressbar" aria-valuemin={0} aria-valuemax={seatsTotal} aria-valuenow={seatsTaken || 0} aria-label="Vagas preenchidas">
              <span style={{ transform: `scaleX(${seen ? pct / 100 : 0})` }} />
            </div>
          </div>
        )}
        {price && <div className="ap-price"><span className="ap-price-main">{price}</span>{installment && <span className="ap-price-sub">{installment}</span>}</div>}
        <Button full size="lg" href={action.href} arrow={!off} variant={off ? 'secondary' : 'primary'}>{off ? 'Entrar na lista de espera' : action.label}</Button>
        {secondary}
      </aside>
      {bar && (
        <div className="ap-summary-bar" data-theme="escuro">
          <span className="ap-summary-bar-info"><DateBlock start={start} end={end} size="sm" />{price && <span className="ap-price-main">{price}</span>}</span>
          <Button size="sm" href={action.href} arrow={!off}>{off ? 'Lista de espera' : 'Inscrever'}</Button>
        </div>
      )}
    </>
  );
}

/* Programação: itens em linha do tempo. A linha vertical se preenche conforme a pessoa rola. */
export function Schedule({ items = [], title }) {
  const ref = useRef(null); const p = useScrollProgress(ref);
  const still = typeof window !== 'undefined' && reducedMotion();
  return (
    <div ref={ref} className="ap-schedule" style={{ '--p': still ? 1 : p }}>
      {title && <p className="ap-eyebrow ap-schedule-title">{title}</p>}
      <ol>
        {items.map((m, i) => {
          const on = still || p >= (i + 0.35) / items.length;
          return (
            <li key={i} className={cx('ap-schedule-item', on && 'is-on')}>
              <span className="ap-schedule-dot" aria-hidden="true" />
              <span className="ap-schedule-when">{m.time || String(i + 1).padStart(2, '0')}</span>
              <div>
                <h4 className="ap-schedule-name">{m.title}</h4>
                {m.description && <p className="ap-schedule-desc">{m.description}</p>}
              </div>
              {m.duration && <span className="ap-schedule-dur"><Clock {...ICON} size={16} />{m.duration}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* Blocos de espera nas cores da marca, enquanto as datas carregam do admin. */
export function Skeleton({ variant = 'text', lines = 3, className }) {
  if (variant === 'card') return (
    <div className={cx('ap-skel-card', className)} aria-busy="true" aria-label="Carregando">
      <span className="ap-skel ap-skel-media" /><div className="ap-skel-pad"><span className="ap-skel ap-skel-line" style={{ width: '30%' }} /><span className="ap-skel ap-skel-title" /><span className="ap-skel ap-skel-line" /><span className="ap-skel ap-skel-line" style={{ width: '60%' }} /></div>
    </div>
  );
  if (variant === 'row') return (
    <div className={cx('ap-skel-row', className)} aria-busy="true" aria-label="Carregando">
      <span className="ap-skel ap-skel-date" /><div><span className="ap-skel ap-skel-title" style={{ width: '55%' }} /><span className="ap-skel ap-skel-line" style={{ width: '35%' }} /></div>
    </div>
  );
  return <div className={cx('ap-skel-text', className)} aria-busy="true" aria-label="Carregando">{Array.from({ length: lines }).map((_, i) => <span key={i} className="ap-skel ap-skel-line" style={{ width: i === lines - 1 ? '60%' : '100%' }} />)}</div>;
}

export function FAQ({ items = [], defaultOpen = 0 }) {
  const [open, setOpen] = useState(defaultOpen);
  const base = useId().replace(/:/g, '');
  return (
    <div className="ap-faq">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={i} className={cx('ap-faq-item', on && 'is-open')}>
            <h4 className="ap-faq-q">
              <button type="button" aria-expanded={on} aria-controls={`${base}-${i}`} onClick={() => setOpen(on ? -1 : i)}>
                <span>{it.q}</span><ChevronDown {...ICON} />
              </button>
            </h4>
            <div id={`${base}-${i}`} className="ap-faq-a" role="region"><div><p>{it.a}</p></div></div>
          </div>
        );
      })}
    </div>
  );
}

export function Testimonial({ quote, name, role, avatar }) {
  return (
    <figure className="ap-testi">
      <Quote {...ICON} size={28} className="ap-testi-mark" />
      <blockquote>{quote}</blockquote>
      <figcaption>
        {avatar ? <img src={avatar} alt="" /> : <span className="ap-testi-initial" aria-hidden="true">{(name || '?').trim()[0]}</span>}
        <span><strong>{name}</strong>{role && <span>{role}</span>}</span>
      </figcaption>
    </figure>
  );
}

/* Conta de 0 até o valor quando aparece. Mantém prefixo/sufixo ("+300", "15 anos") e zeros à esquerda ("00"). */
function CountUp({ value, run, duration = 1600 }) {
  const m = String(value).match(/^(\D*)(\d[\d.]*)(.*)$/);
  const [shown, setShown] = useState(m ? m[1] + m[2].replace(/\d/g, '0') + m[3] : value);
  useEffect(() => {
    if (!m) { setShown(value); return; }
    const [, pre, num, post] = m; const target = parseInt(num.replace(/\./g, ''), 10); const pad = num.replace(/\./g, '').length;
    const fmt = (n) => { const s = n >= 1000 ? n.toLocaleString('pt-BR') : String(n); return pre + (n < 1000 ? s.padStart(pad, '0') : s) + post; };
    if (!run) return;
    if (reducedMotion() || !target) { setShown(fmt(target)); return; }
    let raf, t0;
    const step = (t) => { t0 = t0 || t; const k = Math.min(1, (t - t0) / duration); const e = 1 - Math.pow(1 - k, 4); setShown(fmt(Math.round(target * e))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [run, value]);
  return <>{shown}</>;
}

export function Stats({ items = [], animated = true }) {
  const ref = useRef(null); const seen = useInView(ref, 0.4);
  return (
    <dl ref={ref} className={cx('ap-stats', seen && 'is-in')}>
      {items.map((s, i) => (
        <div key={i} className="ap-stat" style={{ '--d': i * 120 + 'ms' }}>
          <dt>{s.label}</dt>
          <dd>{animated ? <CountUp value={s.value} run={seen} /> : s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AboutDoctor({ photo, photoAlt = 'Dra. Ana Paula Fonseca', name = 'Dra. Ana Paula Fonseca', role = 'Médica Fisiatra', registry, bio, credentials = [], action }) {
  return (
    <div className="ap-about">
      <figure className="ap-about-media">
        {photo && <img src={photo} alt={photoAlt} />}
        <Logo variant="selo" className="ap-about-seal" title="" />
      </figure>
      <div className="ap-about-copy">
        <p className="ap-eyebrow">{role}</p>
        <h2 className="ap-sh-title">{name}</h2>
        {registry && <p className="ap-about-reg">{registry}</p>}
        {bio && <p className="ap-body-l">{bio}</p>}
        {credentials.length > 0 && (
          <ul className="ap-creds">
            {credentials.map((c, i) => <li key={i}><Award {...ICON} size={18} />{c}</li>)}
          </ul>
        )}
        {action && <Button variant="secondary" href={action.href} arrow>{action.label}</Button>}
      </div>
    </div>
  );
}

export function Gallery({ images = [] }) {
  return (
    <div className="ap-gallery">
      {images.map((im, i) => (
        <figure key={i} className={cx('ap-gallery-item', i === 0 && 'is-wide')}>
          <img src={im.src} alt={im.alt || ''} loading="lazy" />
          {im.caption && <figcaption>{im.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

export function CTABand({ eyebrow, title, text, action, secondary }) {
  return (
    <div className="ap-cta" data-theme="escuro">
      <PedrasFundo side="right" />
      <div className="ap-cta-inner">
        <div>
          {eyebrow && <p className="ap-eyebrow">{eyebrow}</p>}
          <h2 className="ap-sh-title">{title}</h2>
          {text && <p className="ap-lead">{text}</p>}
        </div>
        <div className="ap-cta-actions">
          {action && <Button size="lg" href={action.href} arrow>{action.label}</Button>}
          {secondary}
        </div>
      </div>
    </div>
  );
}

/* ---------- Navegação ---------- */

export function Header({ links = [], current, cta, theme, onThemeChange, sticky = true }) {
  const [open, setOpen] = useState(false); const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8); on();
    window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { const k = (e) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  return (
    <header className={cx('ap-header', sticky && 'is-sticky', scrolled && 'is-scrolled')}>
      <div className="ap-container ap-header-row">
        <a href="/" className="ap-header-logo" aria-label="Início — Dra. Ana Paula Fonseca"><Logo variant="horizontal" title="" /></a>
        <nav className="ap-nav" aria-label="Principal">
          {links.map((l) => <a key={l.href} href={l.href} aria-current={current === l.href ? 'page' : undefined}>{l.label}</a>)}
        </nav>
        <div className="ap-header-actions">
          {onThemeChange && <ThemeToggle theme={theme} onChange={onThemeChange} />}
          {cta && <Button size="sm" href={cta.href} className="ap-header-cta">{cta.label}</Button>}
          <button type="button" className="ap-icon-btn ap-menu-btn" aria-label="Abrir menu" aria-expanded={open} onClick={() => setOpen(true)}><Menu {...ICON} size={24} /></button>
        </div>
      </div>
      <div className={cx('ap-drawer', open && 'is-open')} aria-hidden={!open}>
        <div className="ap-drawer-veil" onClick={() => setOpen(false)} />
        <div className="ap-drawer-panel" role="dialog" aria-label="Menu">
          <div className="ap-drawer-top">
            <Logo variant="simbolo" width={36} title="" />
            <button type="button" className="ap-icon-btn" aria-label="Fechar menu" onClick={() => setOpen(false)}><X {...ICON} size={24} /></button>
          </div>
          <nav aria-label="Menu mobile">
            {links.map((l) => <a key={l.href} href={l.href} aria-current={current === l.href ? 'page' : undefined} onClick={() => setOpen(false)}>{l.label}</a>)}
          </nav>
          {cta && <Button full href={cta.href} arrow>{cta.label}</Button>}
        </div>
      </div>
    </header>
  );
}

export function Footer({ phone, email, address, instagram, links = [], legal }) {
  return (
    <footer className="ap-footer" data-theme="escuro">
      <div className="ap-container">
        <div className="ap-footer-grid">
          <div className="ap-footer-brand">
            <Logo variant="vertical" width={180} />
          </div>
          {links.length > 0 && (
            <nav aria-label="Rodapé" className="ap-footer-col">
              <p className="ap-eyebrow">Navegação</p>
              {links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}
            </nav>
          )}
          <div className="ap-footer-col">
            <p className="ap-eyebrow">Contato</p>
            {phone && <a href={`tel:${phone.replace(/\D/g, '')}`}><Phone {...ICON} size={18} />{phone}</a>}
            {email && <a href={`mailto:${email}`}><Mail {...ICON} size={18} />{email}</a>}
            {instagram && <a href={`https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"><Instagram {...ICON} size={18} />{instagram}</a>}
            {address && <span><MapPin {...ICON} size={18} />{address}</span>}
          </div>
        </div>
        <div className="ap-footer-legal">{legal}</div>
      </div>
    </footer>
  );
}

/* ---------- Admin ---------- */

const ADMIN_NAV = [
  { key: 'painel', label: 'Painel', icon: LayoutDashboard },
  { key: 'agenda', label: 'Agenda', icon: CalendarDays },
  { key: 'inscricoes', label: 'Inscrições', icon: UserRound },
  { key: 'config', label: 'Configurações', icon: Settings },
];
export function AdminShell({ active = 'agenda', title, actions, nav = ADMIN_NAV, children }) {
  return (
    <div className="ap-admin">
      <aside className="ap-admin-side" data-theme="escuro">
        <Logo variant="horizontal" width={150} />
        <nav aria-label="Administração">
          {nav.map((n) => { const I = n.icon || BookOpen; return (
            <a key={n.key} href={n.href || '#'} aria-current={active === n.key ? 'page' : undefined}><I {...ICON} />{n.label}</a>
          ); })}
        </nav>
      </aside>
      <div className="ap-admin-main">
        <div className="ap-admin-top">
          <h1 className="ap-admin-title">{title}</h1>
          <div className="ap-admin-actions">{actions}</div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DataTable({ columns = [], rows = [], onEdit, onView, onDelete, empty = 'Nenhum item cadastrado ainda.' }) {
  if (!rows.length) return <div className="ap-empty"><Logo variant="simbolo" width={40} title="" /><p>{empty}</p></div>;
  return (
    <div className="ap-table-wrap">
      <table className="ap-table">
        <thead><tr>{columns.map((c) => <th key={c.key} style={{ textAlign: c.align || 'left' }}>{c.label}</th>)}{(onEdit || onView || onDelete) && <th><span className="ap-sr">Ações</span></th>}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {columns.map((c) => <td key={c.key} style={{ textAlign: c.align || 'left' }}>{c.render ? c.render(r) : r[c.key]}</td>)}
              {(onEdit || onView || onDelete) && (
                <td className="ap-table-actions">
                  {onView && <button type="button" className="ap-icon-btn" aria-label="Ver" onClick={() => onView(r)}><Eye {...ICON} size={18} /></button>}
                  {onEdit && <button type="button" className="ap-icon-btn" aria-label="Editar" onClick={() => onEdit(r)}><Pencil {...ICON} size={18} /></button>}
                  {onDelete && <button type="button" className="ap-icon-btn ap-icon-danger" aria-label="Excluir" onClick={() => onDelete(r)}><Trash2 {...ICON} size={18} /></button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const Icons = { Plus, ArrowRight, Calendar, CalendarDays, Clock, MapPin, Users };
