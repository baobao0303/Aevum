import type { FC, SVGProps } from 'react';

export const AevumIcon: FC<
  SVGProps<SVGSVGElement> & { size?: number; withBackground?: boolean }
> = ({
  size = 28,
  withBackground = false,
  className,
  style,
  ...props
}) => {
  if (withBackground) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={{
          display: 'inline-block',
          verticalAlign: 'middle',
          borderRadius: '22%',
          background: 'transparent',
          ...style,
        }}
        {...props}
      >
        <defs>
          <radialGradient id="aevum_bgGrad" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#1E1B4B" />
            <stop offset="60%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
          <linearGradient id="aevum_leftPillar_bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4338CA" />
          </linearGradient>
          <linearGradient id="aevum_rightPillar_bg" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
          <linearGradient id="aevum_coreGrad_bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="112" fill="url(#aevum_bgGrad)" />
        <g id="aevum-mark-bg">
          <path
            d="M 256 104 L 146 376 C 143 384 150 392 158 392 L 206 392 C 212 392 217 388 220 382 L 256 294 L 284 362 L 312 304 L 256 170 Z"
            fill="url(#aevum_leftPillar_bg)"
          />
          <path
            d="M 256 104 L 366 376 C 369 384 362 392 354 392 L 306 392 C 300 392 295 388 292 382 L 256 294 L 284 226 L 256 170 Z"
            fill="url(#aevum_rightPillar_bg)"
          />
          <polygon
            points="256,192 296,256 256,320 216,256"
            fill="url(#aevum_coreGrad_bg)"
            opacity="0.95"
          />
          <polygon
            points="256,224 274,256 256,288 238,256"
            fill="#FFFFFF"
            opacity="0.9"
          />
          <path
            d="M 184 350 L 328 350"
            stroke="url(#aevum_coreGrad_bg)"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.8"
          />
        </g>
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="100 92 312 312"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        background: 'transparent',
        ...style,
      }}
      {...props}
    >
      <defs>
        <linearGradient id="aevum_leftPillar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
        <linearGradient id="aevum_rightPillar" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="aevum_coreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <g id="aevum-mark">
        <path
          d="M 256 104 L 146 376 C 143 384 150 392 158 392 L 206 392 C 212 392 217 388 220 382 L 256 294 L 284 362 L 312 304 L 256 170 Z"
          fill="url(#aevum_leftPillar)"
        />
        <path
          d="M 256 104 L 366 376 C 369 384 362 392 354 392 L 306 392 C 300 392 295 388 292 382 L 256 294 L 284 226 L 256 170 Z"
          fill="url(#aevum_rightPillar)"
        />
        <polygon
          points="256,192 296,256 256,320 216,256"
          fill="url(#aevum_coreGrad)"
          opacity="0.95"
        />
        <polygon
          points="256,224 274,256 256,288 238,256"
          fill="#FFFFFF"
          opacity="0.9"
        />
        <path
          d="M 184 350 L 328 350"
          stroke="url(#aevum_coreGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.8"
        />
      </g>
    </svg>
  );
};
