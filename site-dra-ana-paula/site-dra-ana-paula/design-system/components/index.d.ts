import type * as React from 'react';

type Link = { label: string; href: string };

export interface LogoProps { variant?: 'horizontal' | 'vertical' | 'selo' | 'simbolo'; mono?: boolean; animated?: boolean; width?: number | string; title?: string; className?: string; style?: React.CSSProperties }
export declare function Logo(props: LogoProps): React.ReactElement;

export interface PedrasFundoProps { side?: 'full' | 'right'; animated?: boolean; intro?: boolean; parallax?: boolean; className?: string }
export declare function PedrasFundo(props: PedrasFundoProps): React.ReactElement;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'ghost' | 'link'; size?: 'sm' | 'md' | 'lg'; href?: string; arrow?: boolean; icon?: React.ReactNode; full?: boolean }
export declare function Button(props: ButtonProps): React.ReactElement;

export interface ThemeToggleProps { theme?: 'claro' | 'escuro'; onChange?: (next: 'claro' | 'escuro') => void; className?: string }
export declare function ThemeToggle(props: ThemeToggleProps): React.ReactElement;

export interface WhatsAppButtonProps { phone?: string; message?: string; label?: string; floating?: boolean; className?: string }
export declare function WhatsAppButton(props: WhatsAppButtonProps): React.ReactElement;

export interface BadgeProps { tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger'; icon?: boolean; children?: React.ReactNode; className?: string }
export declare function Badge(props: BadgeProps): React.ReactElement;

export interface AlertProps { tone?: 'info' | 'success' | 'warning' | 'danger'; title?: React.ReactNode; children?: React.ReactNode; className?: string }
export declare function Alert(props: AlertProps): React.ReactElement;

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> { label?: string; hint?: string; error?: string; multiline?: boolean; rows?: number; floating?: boolean }
export declare function TextField(props: TextFieldProps): React.ReactElement;

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { label?: string; hint?: string; error?: string; placeholder?: string; options?: Array<string | { value: string; label: string }> }
export declare function Select(props: SelectProps): React.ReactElement;

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> { label: React.ReactNode; hint?: string }
export declare function Checkbox(props: CheckboxProps): React.ReactElement;

export interface SectionProps { theme?: 'claro' | 'escuro'; background?: 'surface' | 'sunken' | 'raised'; pedras?: boolean; narrow?: boolean; id?: string; className?: string; children?: React.ReactNode }
export declare function Section(props: SectionProps): React.ReactElement;

export interface RevealProps { delay?: number; as?: keyof JSX.IntrinsicElements; className?: string; children?: React.ReactNode }
export declare function Reveal(props: RevealProps): React.ReactElement;

export interface SectionHeadingProps { number?: string; eyebrow?: string; title: React.ReactNode; lead?: React.ReactNode; align?: 'left' | 'center'; as?: 'h1' | 'h2' | 'h3'; className?: string }
export declare function SectionHeading(props: SectionHeadingProps): React.ReactElement;

export interface HeroProps { eyebrow?: string; title: React.ReactNode; lead?: React.ReactNode; primary?: Link; secondary?: Link; image?: string; imageAlt?: string; theme?: 'claro' | 'escuro'; intro?: boolean; transitionName?: string }
export declare function Hero(props: HeroProps): React.ReactElement;

type EventStatus = 'aberto' | 'ultimas' | 'esgotado' | 'em-breve' | 'encerrado';
export interface AgendaEvent { id?: string | number; title: string; start: string; end?: string; time?: string; city?: string; venue?: string; modality?: string; status?: EventStatus; href?: string; [k: string]: any }

export interface AgendaListProps { events: AgendaEvent[]; filterBy?: string; allLabel?: string; emptyText?: string; loading?: boolean }
export declare function AgendaList(props: AgendaListProps): React.ReactElement;

export interface TabsProps { items: Array<string | { value: string; label: string; count?: number }>; value: string; onChange?: (value: string) => void; label?: string; className?: string }
export declare function Tabs(props: TabsProps): React.ReactElement;

export interface EventCardProps { title?: string; href?: string; start?: string; end?: string; image?: string; imageAlt?: string; summary?: string; modality?: string; time?: string; city?: string; venue?: string; seats?: string; price?: string; status?: EventStatus; cta?: string; transitionName?: string; loading?: boolean }
export declare function EventCard(props: EventCardProps): React.ReactElement;

export interface DateBlockProps { start: string; end?: string; size?: 'sm' | 'md' | 'lg'; className?: string }
export declare function DateBlock(props: DateBlockProps): React.ReactElement;

export interface EventSummaryProps { start: string; end?: string; time?: string; city?: string; venue?: string; modality?: string; seatsTotal?: number; seatsTaken?: number; price?: string; installment?: string; status?: EventStatus; action?: Link; secondary?: React.ReactNode; bar?: boolean }
export declare function EventSummary(props: EventSummaryProps): React.ReactElement;

export interface ScheduleProps { items: Array<{ time?: string; title: string; description?: string; duration?: string }>; title?: string }
export declare function Schedule(props: ScheduleProps): React.ReactElement;

export interface SkeletonProps { variant?: 'text' | 'card' | 'row'; lines?: number; className?: string }
export declare function Skeleton(props: SkeletonProps): React.ReactElement;

export interface FAQProps { items: Array<{ q: string; a: React.ReactNode }>; defaultOpen?: number }
export declare function FAQ(props: FAQProps): React.ReactElement;

export interface TestimonialProps { quote: React.ReactNode; name: string; role?: string; avatar?: string }
export declare function Testimonial(props: TestimonialProps): React.ReactElement;

export interface StatsProps { items: Array<{ value: string; label: string }>; animated?: boolean }
export declare function Stats(props: StatsProps): React.ReactElement;

export interface AboutDoctorProps { photo?: string; photoAlt?: string; name?: string; role?: string; registry?: string; bio?: React.ReactNode; credentials?: string[]; action?: Link }
export declare function AboutDoctor(props: AboutDoctorProps): React.ReactElement;

export interface GalleryProps { images: Array<{ src: string; alt: string; caption?: string }> }
export declare function Gallery(props: GalleryProps): React.ReactElement;

export interface CTABandProps { eyebrow?: string; title: React.ReactNode; text?: React.ReactNode; action?: Link; secondary?: React.ReactNode }
export declare function CTABand(props: CTABandProps): React.ReactElement;

export interface HeaderProps { links?: Link[]; current?: string; cta?: Link; theme?: 'claro' | 'escuro'; onThemeChange?: (next: 'claro' | 'escuro') => void; sticky?: boolean }
export declare function Header(props: HeaderProps): React.ReactElement;

export interface FooterProps { phone?: string; email?: string; address?: string; instagram?: string; links?: Link[]; legal?: React.ReactNode }
export declare function Footer(props: FooterProps): React.ReactElement;

export interface AdminShellProps { active?: string; title: React.ReactNode; actions?: React.ReactNode; nav?: Array<{ key: string; label: string; href?: string; icon?: React.ComponentType<any> }>; children?: React.ReactNode }
export declare function AdminShell(props: AdminShellProps): React.ReactElement;

export interface DataTableProps<T = any> { columns: Array<{ key: string; label: string; align?: 'left' | 'right' | 'center'; render?: (row: T) => React.ReactNode }>; rows: T[]; onView?: (row: T) => void; onEdit?: (row: T) => void; onDelete?: (row: T) => void; empty?: string }
export declare function DataTable(props: DataTableProps): React.ReactElement;

declare global { interface Window { ApFonseca: { Logo: typeof Logo; PedrasFundo: typeof PedrasFundo; Button: typeof Button; ThemeToggle: typeof ThemeToggle; WhatsAppButton: typeof WhatsAppButton; Badge: typeof Badge; Alert: typeof Alert; TextField: typeof TextField; Select: typeof Select; Checkbox: typeof Checkbox; Section: typeof Section; Reveal: typeof Reveal; SectionHeading: typeof SectionHeading; Hero: typeof Hero; AgendaList: typeof AgendaList; Tabs: typeof Tabs; EventCard: typeof EventCard; DateBlock: typeof DateBlock; EventSummary: typeof EventSummary; Schedule: typeof Schedule; Skeleton: typeof Skeleton; FAQ: typeof FAQ; Testimonial: typeof Testimonial; Stats: typeof Stats; AboutDoctor: typeof AboutDoctor; Gallery: typeof Gallery; CTABand: typeof CTABand; Header: typeof Header; Footer: typeof Footer; AdminShell: typeof AdminShell; DataTable: typeof DataTable } } }
