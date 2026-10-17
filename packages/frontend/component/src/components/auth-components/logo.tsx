import { AevumIcon } from './aevum-logo';

export const Logo = () => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        userSelect: 'none',
      }}
    >
      <AevumIcon size={36} />
      <span
        style={{
          fontSize: 24,
          fontWeight: 700,
          letterSpacing: '0.08em',
          background:
            'linear-gradient(135deg, #38BDF8 0%, #818CF8 50%, #C084FC 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        AEVUM
      </span>
    </div>
  );
};

export { AevumIcon };
