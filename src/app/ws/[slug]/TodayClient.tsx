'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import type { DashboardMember, DashboardResponse } from '@/app/api/ws/[slug]/dashboard/route'
import type { InsightsResponse, InsightBucket } from '@/app/api/ws/[slug]/insights/route'
import type { MemberStatsResponse, StatsInterval } from '@/app/api/ws/[slug]/member-stats/route'
import type { RealtimeResponse } from '@/app/api/ws/[slug]/realtime/route'
import type { MatchedBy } from '@/lib/signals'
import { fmtHours, fmtTime, durationLabel } from '@/lib/client/format-time'

interface Props {
  slug: string
  tz?: string
  planLimitBanner?: React.ReactNode
}

type SignalFilter = 'all' | MatchedBy
type SortBy = 'time' | 'name' | 'duration'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(s: string): string {
  const parts = s.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return s.slice(0, 2).toUpperCase()
}

// ─── Signal badge (from incoming branch) ─────────────────────────────────────

const SIGNAL_BADGE: Record<MatchedBy, { label: string; color: string; bg: string }> = {
  wifi:     { label: 'WiFi',     color: 'var(--teal)',       bg: 'color-mix(in srgb, var(--teal) 12%, transparent)' },
  gps:      { label: 'GPS',      color: 'var(--brand)',      bg: 'color-mix(in srgb, var(--brand) 12%, transparent)' },
  ip:       { label: 'IP',       color: 'var(--amber)',      bg: 'color-mix(in srgb, var(--amber) 12%, transparent)' },
  override: { label: 'Override', color: '#8B5CF6',           bg: 'color-mix(in srgb, #8B5CF6 12%, transparent)' },
  none:     { label: '—',        color: 'var(--text-muted)', bg: 'transparent' },
}

function SignalBadge({ matchedBy }: { matchedBy: MatchedBy }) {
  const badge = SIGNAL_BADGE[matchedBy]
  if (matchedBy === 'none') return <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>—</span>
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 7px',
      borderRadius: '4px', fontSize: '11px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600,
      color: badge.color, background: badge.bg, border: `1px solid ${badge.color}`, whiteSpace: 'nowrap',
    }}>
      {badge.label}
    </span>
  )
}

// ─── Avatar (from incoming branch) ────────────────────────────────────────────

function Avatar({ name, status }: { name: string; status: 'present' | 'visited' | 'notIn' }) {
  const theme = {
    present: { bg: 'color-mix(in srgb, var(--brand) 15%, transparent)', color: 'var(--brand)', ring: 'var(--brand)' },
    visited: { bg: 'color-mix(in srgb, var(--amber) 15%, transparent)', color: 'var(--amber)', ring: 'var(--amber)' },
    notIn:   { bg: 'var(--surface-2)', color: 'var(--text-muted)', ring: 'transparent' },
  }[status]
  return (
    <div style={{
      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
      background: theme.bg, color: theme.color,
      fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: status !== 'notIn' ? `0 0 0 2px ${theme.ring}` : 'none',
    }}>
      {getInitials(name)}
    </div>
  )
}

// ─── Status badge (HEAD: VERIFIED = green brand) ──────────────────────────────

function StatusBadge({ member }: { member: DashboardMember }) {
  const hasTrust = (member.latest_event?.trust_flags?.length ?? 0) > 0
  if (member.presence_status === 'notIn') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 9px',
        borderRadius: '5px', fontSize: '11px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
        background: 'var(--surface-2)', color: 'var(--text-muted)', letterSpacing: '0.04em',
      }}>
        ABSENT
      </span>
    )
  }
  if (hasTrust) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 9px',
        borderRadius: '5px', fontSize: '11px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
        background: 'color-mix(in srgb, var(--danger) 12%, transparent)',
        color: 'var(--danger)', letterSpacing: '0.04em',
        border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
      }}>
        SUSPICIOUS
      </span>
    )
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 9px',
      borderRadius: '5px', fontSize: '11px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
      background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
      color: 'var(--brand)', letterSpacing: '0.04em',
      border: '1px solid color-mix(in srgb, var(--brand) 30%, transparent)',
    }}>
      VERIFIED
    </span>
  )
}

// ─── Row components (from incoming branch) ────────────────────────────────────

function TrustBadge() {
  return (
    <span title="Suspicious trust signals detected" style={{
      display: 'inline-flex', alignItems: 'center', height: '18px', padding: '0 5px',
      borderRadius: '4px', fontSize: '11px', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600,
      color: 'var(--amber)', background: 'color-mix(in srgb, var(--amber) 12%, transparent)',
      border: '1px solid color-mix(in srgb, var(--amber) 40%, transparent)',
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      ⚠
    </span>
  )
}

function PersonRow({ member, slug }: { member: DashboardMember; tz?: string; slug: string }) {
  const ev = member.latest_event
  const displayName = member.full_name ?? member.email
  const hasTrustIssue = (ev?.trust_flags?.length ?? 0) > 0
  const isActive = member.presence_status === 'present'
  const checkinTime = ev?.checkin_at ? fmtTime(ev.checkin_at) : null
  const checkoutTime = ev?.checkout_at ? fmtTime(ev.checkout_at) : null
  const dur = ev ? durationLabel(ev.checkin_at, ev.checkout_at ?? null) : null
  const borderColor = member.presence_status === 'present' ? 'var(--brand)' : 'var(--amber)'

  return (
    <Link href={`/ws/${slug}/members/${member.user_id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 14px',
          background: 'var(--surface-0)', border: '1px solid var(--border)',
          borderLeft: `3px solid ${borderColor}`,
          borderRadius: 'var(--radius-md)', marginBottom: '6px',
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-0)' }}
      >
        <Avatar name={displayName} status={member.presence_status} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600, fontSize: '13px',
              color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayName}
            </span>
            {member.event_count > 1 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Plus Jakarta Sans, sans-serif', flexShrink: 0 }}>
                ×{member.event_count}
              </span>
            )}
            {hasTrustIssue && <TrustBadge />}
            {ev && <SignalBadge matchedBy={ev.matched_by} />}
          </div>
          {member.full_name && (
            <div style={{
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', color: 'var(--text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {member.email}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {checkinTime && (
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {checkinTime}{checkoutTime ? ` → ${checkoutTime}` : isActive ? ' →' : ''}
            </div>
          )}
          {dur !== null ? (
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--brand)', fontWeight: 600, marginTop: '2px' }}>
              {dur}
            </div>
          ) : isActive ? (
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>…</div>
          ) : null}
        </div>
      </div>
    </Link>
  )
}

function NotInRow({ member, slug }: { member: DashboardMember; slug: string }) {
  const displayName = member.full_name ?? member.email
  return (
    <Link
      href={`/ws/${slug}/members/${member.user_id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px',
        background: 'var(--surface-0)', border: '1px solid var(--border)',
        borderLeft: '3px solid var(--border)',
        borderRadius: 'var(--radius-md)', marginBottom: '6px', opacity: 0.65,
        textDecoration: 'none',
      }}
    >
      <Avatar name={displayName} status="notIn" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', fontWeight: 500,
          color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {displayName}
        </div>
        {member.full_name && (
          <div style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', color: 'var(--text-muted)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {member.email}
          </div>
        )}
      </div>
    </Link>
  )
}

// ─── Section label (from incoming branch) ─────────────────────────────────────

function SectionLabel({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', marginTop: '22px' }}>
      <div style={{ width: '3px', height: '14px', borderRadius: '2px', background: color ?? 'var(--border)', flexShrink: 0 }} />
      <span style={{
        fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', fontWeight: 700,
        color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        {children}
      </span>
    </div>
  )
}

// ─── Filter bar components (from incoming branch) ─────────────────────────────

function TabPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{
      height: '34px', padding: '0 14px',
      border: active ? '1px solid var(--brand)' : '1px solid var(--border)',
      borderRadius: '20px',
      background: active ? 'var(--brand)' : 'transparent',
      color: active ? '#fff' : 'var(--text-secondary)',
      boxShadow: active ? '0 2px 8px color-mix(in srgb, var(--brand) 35%, transparent)' : 'none',
      fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', fontWeight: active ? 600 : 400,
      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
    }}>
      {children}
    </button>
  )
}

function SignalPill({ value, active, onClick }: { value: SignalFilter; active: boolean; onClick: () => void }) {
  const colors: Record<SignalFilter, string> = {
    all: 'var(--text-secondary)', wifi: 'var(--teal)', gps: 'var(--brand)',
    ip: 'var(--amber)', override: '#8B5CF6', none: 'var(--text-muted)',
  }
  const color = colors[value]
  const bg = active ? `color-mix(in srgb, ${color} 12%, transparent)` : 'transparent'
  return (
    <button type="button" onClick={onClick} style={{
      height: '28px', padding: '0 10px',
      border: active ? `1px solid ${color}` : '1px solid var(--border)',
      borderRadius: '4px', background: bg, color,
      fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px', fontWeight: active ? 600 : 400,
      cursor: 'pointer', whiteSpace: 'nowrap',
    }}>
      {value === 'all' ? 'All signals' : value.toUpperCase()}
    </button>
  )
}

// ─── Stat Card (HEAD: full version with title/sub/accent/critical/onClick) ────

function StatCard({
  title, value, sub, accent, icon, critical, onClick,
}: {
  title: string
  value: React.ReactNode
  sub?: React.ReactNode
  accent?: boolean
  critical?: boolean
  icon: React.ReactNode
  onClick?: () => void
}) {
  const borderColor = critical ? 'var(--danger)' : accent ? 'var(--brand)' : 'var(--border)'
  const iconBg = critical
    ? 'color-mix(in srgb, var(--danger) 12%, transparent)'
    : accent
    ? 'color-mix(in srgb, var(--brand) 12%, transparent)'
    : 'var(--surface-2)'
  const iconColor = critical ? 'var(--danger)' : accent ? 'var(--brand)' : 'var(--text-muted)'

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface-0)',
        border: '1px solid var(--border)',
        borderTop: `3px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        flex: '1 1 0',
        minWidth: '140px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={onClick ? (e) => { e.currentTarget.style.boxShadow = '0 4px 16px color-mix(in srgb, var(--brand) 15%, transparent)' } : undefined}
      onMouseLeave={onClick ? (e) => { e.currentTarget.style.boxShadow = '' } : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', fontWeight: 700,
          color: critical ? 'var(--danger)' : 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          {title}
        </span>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: iconBg, color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
      <div>
        <div style={{
          fontFamily: 'Playfair Display, serif', fontSize: '28px', fontWeight: 700, lineHeight: 1,
          color: critical ? 'var(--danger)' : accent ? 'var(--brand)' : 'var(--navy)',
        }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Members Modal (HEAD) ─────────────────────────────────────────────────────

function MembersModal({
  title, members, slug, onClose,
}: {
  title: string
  members: DashboardMember[]
  slug: string
  onClose: () => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-0)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          width: '100%', maxWidth: '480px',
          maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <h2 style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '15px', fontWeight: 700,
            color: 'var(--text-primary)', margin: 0,
          }}>
            {title}
            <span style={{
              marginLeft: '8px', fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)',
            }}>
              {members.length} {members.length === 1 ? 'person' : 'people'}
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '28px', height: '28px', borderRadius: '6px',
              border: '1px solid var(--border)', background: 'var(--surface-1)',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {members.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                No people to show
              </p>
            </div>
          ) : (
            members.map((m) => {
              const name = m.full_name ?? m.email
              const isPresent = m.presence_status === 'present'
              const isVisited = m.presence_status === 'visited'
              const avatarBg = isPresent
                ? 'color-mix(in srgb, var(--brand) 15%, transparent)'
                : isVisited
                ? 'color-mix(in srgb, var(--amber) 15%, transparent)'
                : 'var(--surface-2)'
              const avatarColor = isPresent ? 'var(--brand)' : isVisited ? 'var(--amber)' : 'var(--text-muted)'
              return (
                <Link key={m.member_id} href={`/ws/${slug}/members/${m.user_id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 20px', borderBottom: '1px solid var(--border)',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
                  >
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: avatarBg, color: avatarColor,
                      fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: m.presence_status !== 'notIn'
                        ? `0 0 0 2px ${isPresent ? 'var(--brand)' : 'var(--amber)'}` : 'none',
                    }}>
                      {getInitials(name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                        color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {name}
                      </div>
                      {m.full_name && (
                        <div style={{
                          fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', color: 'var(--text-muted)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {m.email}
                        </div>
                      )}
                    </div>
                    <StatusBadge member={m} />
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Stat Bar (HEAD) ──────────────────────────────────────────────────────────

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', background: 'var(--surface-2)', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: 'var(--text-secondary)', minWidth: '18px', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  )
}

// ─── Member Stats Table (HEAD) ────────────────────────────────────────────────

const STATS_INTERVALS: { key: StatsInterval; label: string }[] = [
  { key: 'week',   label: 'Week' },
  { key: 'month',  label: 'Month' },
  { key: '3month', label: '3 Months' },
]

function MemberStatsTable({ slug, statsData, loading, interval, onIntervalChange }: {
  slug: string
  statsData: MemberStatsResponse | null
  loading: boolean
  interval: StatsInterval
  onIntervalChange: (iv: StatsInterval) => void
}) {
  const th: React.CSSProperties = {
    fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', fontWeight: 700,
    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em',
  }
  const sk: React.CSSProperties = {
    background: 'linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%)',
    backgroundSize: '600px 100%', animation: 'shimmer 1.4s ease-in-out infinite', borderRadius: '5px',
  }

  const members = statsData?.members ?? []
  const totalDays = statsData?.total_working_days ?? 1

  return (
    <div style={{
      background: 'var(--surface-0)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap',
      }}>
        <h2 style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '15px', fontWeight: 700,
          color: 'var(--text-primary)', margin: 0, flex: 1,
        }}>
          Employee{' '}
          <em style={{ fontFamily: 'Playfair Display, serif', fontStyle: 'italic', fontWeight: 700, color: 'var(--brand)' }}>
            Attendance
          </em>
        </h2>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {STATS_INTERVALS.map((iv) => (
            <button
              key={iv.key}
              type="button"
              onClick={() => onIntervalChange(iv.key)}
              style={{
                height: '30px', padding: '0 12px',
                background: interval === iv.key ? 'var(--brand)' : 'var(--surface-0)',
                color: interval === iv.key ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${interval === iv.key ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                fontSize: '12px', fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: interval === iv.key ? 600 : 400,
                cursor: 'pointer', transition: 'background 0.15s',
              }}
            >
              {iv.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.4fr 1.4fr 1.4fr 100px 100px',
        gap: '12px', padding: '10px 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--surface-1)',
      }}>
        <span style={th}>Member</span>
        <span style={th}>Office</span>
        <span style={th}>Remote</span>
        <span style={th}>Absent</span>
        <span style={{ ...th, textAlign: 'right' }}>Total Hrs</span>
        <span style={{ ...th, textAlign: 'right' }}>Avg/Day</span>
      </div>

      {loading ? (
        [1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.4fr 1.4fr 1.4fr 100px 100px',
            gap: '12px', alignItems: 'center', padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ ...sk, width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0 }} />
              <div>
                <div style={{ ...sk, height: '12px', width: '90px', marginBottom: '5px' }} />
                <div style={{ ...sk, height: '10px', width: '120px' }} />
              </div>
            </div>
            <div style={{ ...sk, height: '8px', width: '100%' }} />
            <div style={{ ...sk, height: '8px', width: '100%' }} />
            <div style={{ ...sk, height: '8px', width: '100%' }} />
            <div style={{ ...sk, height: '12px', width: '60px', marginLeft: 'auto' }} />
            <div style={{ ...sk, height: '12px', width: '60px', marginLeft: 'auto' }} />
          </div>
        ))
      ) : members.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            No attendance data for this period.
          </p>
        </div>
      ) : (
        members.map((m) => {
          const name = m.full_name ?? m.email
          return (
            <Link key={m.member_id} href={`/ws/${slug}/members/${m.user_id}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.4fr 1.4fr 1.4fr 100px 100px',
                  gap: '12px', alignItems: 'center',
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                    background: 'color-mix(in srgb, var(--brand) 12%, transparent)',
                    color: 'var(--brand)',
                    fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {getInitials(name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                      color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {name}
                    </div>
                    <div style={{
                      fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', color: 'var(--text-muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {m.full_name ? m.email : m.role}
                    </div>
                  </div>
                </div>
                <div>
                  <StatBar value={m.office_days} max={totalDays} color="var(--teal)" />
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>office</div>
                </div>
                <div>
                  <StatBar value={m.remote_days} max={totalDays} color="var(--amber)" />
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>remote</div>
                </div>
                <div>
                  <StatBar value={m.absent_days} max={totalDays} color="var(--danger)" />
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>absent</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {fmtHours(m.total_hours)}
                  </div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>total</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {fmtHours(m.avg_hours_per_day)}
                  </div>
                  <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>avg/day</div>
                  {m.multi_loc_days > 0 && (
                    <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '10px', color: 'var(--amber)', marginTop: '2px' }}>
                      {m.multi_loc_days} multi-loc
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })
      )}

      {members.length > 0 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            Multi-loc: days where checkout was recorded more than 1km from check-in location (field force / site visits).
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Realtime Widget (HEAD) ───────────────────────────────────────────────────

function RealtimeWidget({ data, loading, activeCount, locationCounts }: {
  data: RealtimeResponse | null
  loading: boolean
  activeCount?: number
  locationCounts?: { label: string; count: number }[]
}) {
  const sk: React.CSSProperties = {
    background: 'linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%)',
    backgroundSize: '400px 100%', animation: 'shimmer 1.4s ease-in-out infinite', borderRadius: '3px',
  }

  return (
    <div style={{
      background: 'var(--surface-0)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: '16px',
    }}>
      <div>
        <div style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '10px', fontWeight: 700,
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: '6px',
        }}>
          Current Active Members
        </div>
        {loading ? (
          <div style={{ ...sk, height: '32px', width: '48px' }} />
        ) : (
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 700, lineHeight: 1, color: 'var(--navy)' }}>
            {activeCount ?? data?.active_count ?? 0}
          </div>
        )}
      </div>

      <div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)', paddingBottom: '4px', marginBottom: '6px',
        }}>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Location</span>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Members</span>
        </div>
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ ...sk, height: '11px', width: '100px' }} />
              <div style={{ ...sk, height: '11px', width: '16px' }} />
            </div>
          ))
        ) : (locationCounts ?? data?.locations ?? []).length === 0 ? (
          <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
            No activity
          </div>
        ) : (
          (locationCounts ?? data?.locations ?? []).map((loc, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 0',
              borderBottom: i < (locationCounts ?? data?.locations ?? []).length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <span style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '12px',
                color: 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: '75%',
              }}>
                {loc.label}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 600, color: 'var(--brand)' }}>
                {loc.count}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Office Presence Graph (HEAD: smooth bezier + hover tooltip) ──────────────

function OfficePresenceGraph({ buckets, loading }: { buckets: InsightBucket[]; loading: boolean }) {
  const [hovered, setHovered] = useState<{ x: number; y: number; label: string; count: number } | null>(null)

  const hourBuckets = [...buckets].sort((a, b) => parseInt(a.key) - parseInt(b.key))
  const rawMax = Math.max(...hourBuckets.map((b) => b.unique_users), 0)
  const yMax = Math.max(rawMax, 4)
  const tickStep = Math.max(1, Math.ceil(yMax / 4))

  const W = 600, H = 190, padL = 36, padR = 16, padT = 16, padB = 40
  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const pts = hourBuckets.map((b, i) => {
    const x = padL + (i / Math.max(hourBuckets.length - 1, 1)) * chartW
    const y = padT + chartH - (b.unique_users / yMax) * chartH
    const h = parseInt(b.key, 10)
    const ampm = h < 12 ? 'AM' : 'PM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return { x, y, label: `${h12}${ampm}`, count: b.unique_users, showLabel: h % 2 === 0 }
  })

  const smoothLinePath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return ''
    const d: string[] = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`]
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(i + 2, points.length - 1)]
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      d.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`)
    }
    return d.join(' ')
  }
  const pathD = smoothLinePath(pts)
  const areaD = pts.length > 0
    ? `${pathD} L ${pts[pts.length - 1].x.toFixed(1)} ${(padT + chartH).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padT + chartH).toFixed(1)} Z`
    : ''
  const yTicks = Array.from({ length: Math.floor(yMax / tickStep) + 1 }, (_, i) => ({
    val: i * tickStep,
    y: padT + chartH - ((i * tickStep) / yMax) * chartH,
  }))

  return (
    <div style={{
      background: 'var(--surface-0)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '18px 20px', height: '100%', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px',
          background: 'color-mix(in srgb, var(--brand) 12%, transparent)', color: 'var(--brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Office Presence
          </span>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
            people in office by hour · today
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>Loading…</span>
        </div>
      ) : (
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ overflow: 'visible', display: 'block', cursor: 'crosshair' }}
          aria-label="Office presence by hour"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const svgX = ((e.clientX - rect.left) / rect.width) * W
            if (pts.length === 0) return
            const nearest = pts.reduce((a, b) => Math.abs(b.x - svgX) < Math.abs(a.x - svgX) ? b : a)
            setHovered(nearest)
          }}
          onMouseLeave={() => setHovered(null)}
        >
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={padL} y1={t.y.toFixed(1)} x2={W - padR} y2={t.y.toFixed(1)} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 3" />
              <text x={padL - 6} y={(t.y + 4).toFixed(1)} textAnchor="end" fontSize="10" fill="var(--text-muted)" fontFamily="JetBrains Mono, monospace">{t.val}</text>
            </g>
          ))}
          {areaD && <path d={areaD} fill="color-mix(in srgb, var(--brand) 10%, transparent)" />}
          {pathD && <path d={pathD} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
          {hovered && (
            <g>
              <line x1={hovered.x.toFixed(1)} y1={padT.toFixed(1)} x2={hovered.x.toFixed(1)} y2={(padT + chartH).toFixed(1)} stroke="var(--brand)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              <circle cx={hovered.x.toFixed(1)} cy={hovered.y.toFixed(1)} r="5" fill="var(--brand)" stroke="var(--surface-0)" strokeWidth="2" />
              <rect x={(hovered.x - 28).toFixed(1)} y={(hovered.y - 34).toFixed(1)} width="56" height="22" rx="5" fill="var(--navy)" opacity="0.9" />
              <text x={hovered.x.toFixed(1)} y={(hovered.y - 18).toFixed(1)} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff" fontFamily="Plus Jakarta Sans, sans-serif">
                {hovered.count} {hovered.count === 1 ? 'person' : 'people'}
              </text>
            </g>
          )}
          {pts.map((p, i) => (
            p.showLabel && (
              <text key={i} x={p.x.toFixed(1)} y={(padT + chartH + 18).toFixed(1)} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="Plus Jakarta Sans, sans-serif">
                {p.label}
              </text>
            )
          ))}
          <line x1={padL} y1={padT} x2={padL} y2={(padT + chartH)} stroke="var(--border)" strokeWidth="1" />
          <line x1={padL} y1={(padT + chartH)} x2={W - padR} y2={(padT + chartH)} stroke="var(--border)" strokeWidth="1" />
        </svg>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TodayClient({ slug, tz, planLimitBanner }: Props) {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [dashLoading, setDashLoading] = useState(true)
  const [modal, setModal] = useState<{ title: string; members: DashboardMember[] } | null>(null)

  const [todayHourlyData, setTodayHourlyData] = useState<InsightsResponse | null>(null)
  const [todayHourlyLoading, setTodayHourlyLoading] = useState(true)

  const [realtimeData, setRealtimeData] = useState<RealtimeResponse | null>(null)
  const [realtimeLoading, setRealtimeLoading] = useState(true)

  const [statsInterval, setStatsInterval] = useState<StatsInterval>('month')
  const [statsData, setStatsData] = useState<MemberStatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  // Filter state from incoming branch
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'visited' | 'notIn'>('all')
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('time')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

  const fetchDash = useCallback(async () => {
    setDashLoading(true)
    try {
      const res = await fetch(`/api/ws/${slug}/dashboard?status=all&signal=all&sortBy=name&sortDir=asc&page=1&limit=500`)
      if (res.ok) setData(await res.json())
    } finally {
      setDashLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchDash() }, [fetchDash])

  useEffect(() => {
    async function fetchTodayHourly() {
      setTodayHourlyLoading(true)
      try {
        const res = await fetch(`/api/ws/${slug}/insights?interval=today`)
        if (res.ok) setTodayHourlyData(await res.json())
      } finally {
        setTodayHourlyLoading(false)
      }
    }
    fetchTodayHourly()
  }, [slug])

  const fetchStats = useCallback(async (iv: StatsInterval) => {
    setStatsLoading(true)
    try {
      const res = await fetch(`/api/ws/${slug}/member-stats?interval=${iv}`)
      if (res.ok) setStatsData(await res.json())
    } finally {
      setStatsLoading(false)
    }
  }, [slug])

  useEffect(() => { fetchStats(statsInterval) }, [fetchStats, statsInterval])

  useEffect(() => {
    async function fetchRealtime() {
      setRealtimeLoading(true)
      try {
        const res = await fetch(`/api/ws/${slug}/realtime`)
        if (res.ok) setRealtimeData(await res.json())
      } finally {
        setRealtimeLoading(false)
      }
    }
    fetchRealtime()
    const id = setInterval(fetchRealtime, 60000)
    return () => clearInterval(id)
  }, [slug])

  const counts = data?.counts ?? { present: 0, visited: 0, notIn: 0, total: 0, office: 0, remote: 0 }

  // Client-side filtering of all_members (no extra API calls)
  const filtered = useMemo(() => {
    let list = data?.all_members ?? []
    if (statusFilter !== 'all') list = list.filter(m => m.presence_status === statusFilter)
    if (signalFilter !== 'all') list = list.filter(m => m.latest_event?.matched_by === signalFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(m => (m.full_name ?? '').toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') {
        cmp = (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email)
      } else if (sortBy === 'time') {
        cmp = (a.latest_event?.checkin_at ?? '').localeCompare(b.latest_event?.checkin_at ?? '')
      } else {
        const durA = a.latest_event ? new Date(a.latest_event.checkout_at ?? Date.now()).getTime() - new Date(a.latest_event.checkin_at).getTime() : 0
        const durB = b.latest_event ? new Date(b.latest_event.checkout_at ?? Date.now()).getTime() - new Date(b.latest_event.checkin_at).getTime() : 0
        cmp = durA - durB
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data?.all_members, statusFilter, signalFilter, search, sortBy, sortDir])

  const totalFiltered = filtered.length
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const presentMembers = paged.filter(m => m.presence_status === 'present')
  const visitedMembers = paged.filter(m => m.presence_status === 'visited')
  const notInMembers = paged.filter(m => m.presence_status === 'notIn')
  const isFiltering = search.trim() !== '' || statusFilter !== 'all' || signalFilter !== 'all'

  const resetFilters = () => { setSearch(''); setStatusFilter('all'); setSignalFilter('all'); setPage(1) }

  return (
    <div style={{ padding: '24px', minHeight: '100%' }}>
      {/* Export button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={async () => {
            const now = new Date()
            const y = now.getFullYear()
            const m = String(now.getMonth() + 1).padStart(2, '0')
            const start = `${y}-${m}-01`
            const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
            const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`
            const res = await fetch(`/api/ws/${slug}/export?start=${start}&end=${end}`)
            if (!res.ok) { alert((await res.json().catch(() => ({}))).error ?? 'Export failed'); return }
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `report-${slug}-${y}-${m}.csv`
            document.body.appendChild(a); a.click(); document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }}
          style={{
            height: '40px', padding: '0 20px',
            background: 'var(--brand)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)',
            fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px color-mix(in srgb, var(--brand) 35%, transparent)',
          }}
        >
          Export Report
        </button>
      </div>

      {planLimitBanner}

      {/* ── Stat cards ── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <StatCard
          title="Total Employees"
          value={counts.total}
          sub="Active personnel count"
          onClick={() => setModal({ title: 'Total Employees', members: data?.all_members ?? [] })}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <StatCard
          title="In Office"
          value={counts.office}
          sub="via Wi-Fi or GPS"
          onClick={() => setModal({ title: 'In Office', members: (data?.all_members ?? []).filter(m => m.presence_status !== 'notIn' && (m.latest_event?.matched_by === 'wifi' || m.latest_event?.matched_by === 'gps')) })}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          }
        />
        <StatCard
          title="Remote"
          value={counts.remote}
          sub="working remotely"
          onClick={() => setModal({ title: 'Remote', members: (data?.all_members ?? []).filter(m => m.presence_status !== 'notIn' && m.latest_event?.matched_by !== 'wifi' && m.latest_event?.matched_by !== 'gps') })}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          }
        />
      </div>

      {/* ── Graphs row ── */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: '300px' }}>
          <OfficePresenceGraph buckets={todayHourlyData?.buckets ?? []} loading={todayHourlyLoading} />
        </div>
        <div style={{ flex: 1, minWidth: '220px' }}>
          <RealtimeWidget data={realtimeData} loading={realtimeLoading} activeCount={counts.present} locationCounts={data?.location_counts} />
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background: 'var(--surface-0)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '160px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name or email…"
              style={{
                width: '100%', height: '36px', padding: '0 10px 0 32px',
                border: '1px solid var(--border)', borderRadius: '8px',
                fontSize: '13px', fontFamily: 'Plus Jakarta Sans, sans-serif',
                background: 'var(--surface-1)', color: 'var(--text-primary)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as SortBy); setPage(1) }} style={{
              height: '36px', padding: '0 8px', border: '1px solid var(--border)',
              borderRadius: '8px', fontSize: '12px', fontFamily: 'Plus Jakarta Sans, sans-serif',
              background: 'var(--surface-1)', color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none',
            }}>
              <option value="time">Sort: Time in</option>
              <option value="name">Sort: Name</option>
              <option value="duration">Sort: Duration</option>
            </select>
            <button type="button" onClick={() => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1) }}
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              style={{
                width: '36px', height: '36px', border: '1px solid var(--border)',
                borderRadius: '8px', background: 'var(--surface-1)',
                color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
            <button type="button" onClick={() => setShowAdvanced(v => !v)} style={{
              height: '36px', padding: '0 10px',
              border: showAdvanced ? '1px solid color-mix(in srgb, var(--brand) 40%, transparent)' : '1px solid var(--border)',
              borderRadius: '8px',
              background: showAdvanced ? 'color-mix(in srgb, var(--brand) 10%, transparent)' : 'var(--surface-1)',
              color: showAdvanced ? 'var(--brand)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: '12px', fontFamily: 'Plus Jakarta Sans, sans-serif', whiteSpace: 'nowrap',
            }}>
              Filters {showAdvanced ? '▲' : '▼'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <TabPill active={statusFilter === 'all'}     onClick={() => { setStatusFilter('all'); setPage(1) }}>All</TabPill>
          <TabPill active={statusFilter === 'present'} onClick={() => { setStatusFilter('present'); setPage(1) }}>In office ({counts.present})</TabPill>
          <TabPill active={statusFilter === 'visited'} onClick={() => { setStatusFilter('visited'); setPage(1) }}>Visited ({counts.visited})</TabPill>
          <TabPill active={statusFilter === 'notIn'}   onClick={() => { setStatusFilter('notIn'); setPage(1) }}>Not in ({counts.notIn})</TabPill>
        </div>
        {showAdvanced && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontFamily: 'Plus Jakarta Sans, sans-serif', color: 'var(--text-muted)' }}>Signal:</span>
            {(['all', 'wifi', 'gps', 'ip', 'override'] as SignalFilter[]).map((v) => (
              <SignalPill key={v} value={v} active={signalFilter === v} onClick={() => { setSignalFilter(v); setPage(1) }} />
            ))}
            {isFiltering && (
              <button type="button" onClick={resetFilters} style={{
                marginLeft: 'auto', height: '28px', padding: '0 10px',
                border: '1px solid var(--border)', borderRadius: '6px',
                background: 'var(--surface-0)', color: 'var(--text-muted)',
                fontSize: '11px', fontFamily: 'Plus Jakarta Sans, sans-serif', cursor: 'pointer',
              }}>
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Member rows ── */}
      {dashLoading ? (
        [1, 2, 3].map((i) => {
          const sk: React.CSSProperties = {
            background: 'linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%)',
            backgroundSize: '600px 100%', animation: 'shimmer 1.4s ease-in-out infinite', borderRadius: '6px',
          }
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
              background: 'var(--surface-0)', border: '1px solid var(--border)',
              borderLeft: '3px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '6px',
            }}>
              <div style={{ ...sk, width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ ...sk, height: '13px', width: '120px', marginBottom: '6px' }} />
                <div style={{ ...sk, height: '11px', width: '160px' }} />
              </div>
              <div>
                <div style={{ ...sk, height: '11px', width: '70px', marginBottom: '4px' }} />
                <div style={{ ...sk, height: '12px', width: '45px' }} />
              </div>
            </div>
          )
        })
      ) : (
        <>
          {(statusFilter === 'all' || statusFilter === 'present') && presentMembers.length > 0 && (
            <>
              {statusFilter === 'all' && <SectionLabel color="var(--brand)">In office now ({counts.present})</SectionLabel>}
              {presentMembers.map((m) => <PersonRow key={m.member_id} member={m} tz={tz} slug={slug} />)}
            </>
          )}
          {(statusFilter === 'all' || statusFilter === 'visited') && visitedMembers.length > 0 && (
            <>
              {statusFilter === 'all' && <SectionLabel color="var(--amber)">Visited today ({counts.visited})</SectionLabel>}
              {visitedMembers.map((m) => <PersonRow key={m.member_id} member={m} tz={tz} slug={slug} />)}
            </>
          )}
          {(statusFilter === 'all' || statusFilter === 'notIn') && notInMembers.length > 0 && (
            <>
              {statusFilter === 'all' && <SectionLabel>Not in today ({counts.notIn})</SectionLabel>}
              {notInMembers.map((m) => <NotInRow key={m.member_id} member={m} slug={slug} />)}
            </>
          )}
          {filtered.length === 0 && isFiltering && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '14px', color: 'var(--text-muted)' }}>
                No members match the current filters.
              </p>
              <button type="button" onClick={resetFilters} style={{
                marginTop: '10px', background: 'none', border: 'none',
                fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', color: 'var(--brand)', cursor: 'pointer', padding: 0,
              }}>
                Reset filters
              </button>
            </div>
          )}
          {counts.total === 0 && !isFiltering && !dashLoading && (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '15px', color: 'var(--text-secondary)' }}>No members yet.</p>
              <p style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Invite people from the People tab to get started.
              </p>
            </div>
          )}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', margin: '16px 0' }}>
              <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{
                height: '32px', padding: '0 14px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', background: 'var(--surface-0)',
                color: page <= 1 ? 'var(--text-muted)' : 'var(--text-secondary)',
                fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', cursor: page <= 1 ? 'default' : 'pointer',
              }}>← Prev</button>
              <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', color: 'var(--text-muted)' }}>
                {page} / {totalPages} · {totalFiltered} members
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{
                height: '32px', padding: '0 14px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', background: 'var(--surface-0)',
                color: page >= totalPages ? 'var(--text-muted)' : 'var(--text-secondary)',
                fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13px', cursor: page >= totalPages ? 'default' : 'pointer',
              }}>Next →</button>
            </div>
          )}
        </>
      )}

      {/* ── Attendance stats table ── */}
      <div style={{ marginTop: '32px' }}>
        <MemberStatsTable
          slug={slug}
          statsData={statsData}
          loading={statsLoading}
          interval={statsInterval}
          onIntervalChange={setStatsInterval}
        />
      </div>

      {/* ── Members modal ── */}
      {modal && (
        <MembersModal
          title={modal.title}
          members={modal.members}
          slug={slug}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
