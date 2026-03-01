export interface ModeCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  extra?: React.ReactNode;
  locked?: boolean;
  children: React.ReactNode;
}

export function ModeCard({ icon, title, description, accent, extra, children }: ModeCardProps) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 14,
        border: '2px solid #e0e0e0',
        boxShadow: '0 3px 0 #e0e0e0',
        padding: '12px 14px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: '#3e2723',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 10, color: '#8d6e63', fontWeight: 700, lineHeight: 1.3 }}>
            {description}
          </div>
        </div>
      </div>
      {extra}
      <div style={{ marginTop: 'auto' }}>{children}</div>
    </div>
  );
}