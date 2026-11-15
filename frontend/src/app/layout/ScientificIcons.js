'use client';

export function EarthSignalLogo({ theme = 'light' }) {
  const textColor = theme === 'light' ? 'text-[#131D38]' : 'text-[#f4f1ea]';
  const orbitStroke = theme === 'light' ? '#131D38' : '#f4f1ea';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="14" cy="14" r="6.5" fill="#ffc20d" />
        <ellipse
          cx="14"
          cy="14"
          rx="12"
          ry="4.8"
          transform="rotate(-24 14 14)"
          stroke={orbitStroke}
          strokeWidth="1.5"
        />
        <circle cx="24" cy="9.5" r="2" fill={orbitStroke} />
      </svg>
      <span className={`font-display text-[17px] font-semibold tracking-tight ${textColor}`}>
        EarthSignal
      </span>
    </span>
  );
}

/* Problem Section 3D Isometric Scientific Icons */

export function ScatteredDataIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      {/* Three disconnected tilted data planes */}
      <path
        d="M12 34L28 26L44 34L28 42L12 34Z"
        fill="#E6E0D2"
        stroke="#131D38"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M10 24L25 17L39 24L24 31L10 24Z"
        fill="#4FB3A9"
        fillOpacity="0.28"
        stroke="#131D38"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M18 14L32 8L46 14L32 20L18 14Z"
        fill="#ffc20d"
        stroke="#131D38"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="14" r="2" fill="#131D38" />
    </svg>
  );
}

export function TrendVsCauseIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      {/* Isometric pedestal + trend line disconnected from wave vector */}
      <rect
        x="10"
        y="14"
        width="36"
        height="28"
        rx="8"
        fill="#f4f1ea"
        stroke="#131D38"
        strokeWidth="1.4"
      />
      <path
        d="M16 33L24 27L30 30L40 20"
        stroke="#131D38"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="20" r="3.5" fill="#ffc20d" stroke="#131D38" strokeWidth="1.4" />
      <path
        d="M16 23C20 20 25 24 29 21"
        stroke="#4FB3A9"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="2.5 2.5"
      />
    </svg>
  );
}

export function DisconnectedInsightIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      {/* Three unlinked isometric cubes */}
      <path
        d="M11 22L18 18L25 22V30L18 34L11 30V22Z"
        fill="#f4f1ea"
        stroke="#131D38"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M11 22L18 26L25 22" stroke="#131D38" strokeWidth="1.2" />
      <path
        d="M31 15L38 11L45 15V23L38 27L31 23V15Z"
        fill="#ffc20d"
        stroke="#131D38"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M31 15L38 19L45 15" stroke="#131D38" strokeWidth="1.2" />
      <path
        d="M27 33L34 29L41 33V41L34 45L27 41V33Z"
        fill="#4FB3A9"
        fillOpacity="0.35"
        stroke="#131D38"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M27 33L34 37L41 33" stroke="#131D38" strokeWidth="1.2" />
    </svg>
  );
}

/* Workflow 5-Layer 3D Icons (for Navy #1E2B52 cards) */

export function WorkflowNodeIcon({ id, active }) {
  const accent = active ? '#ffc20d' : '#A9B1C6';
  const water = '#4FB3A9';

  switch (id) {
    case 'detect':
      return (
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
          <rect
            x="6"
            y="8"
            width="30"
            height="26"
            rx="7"
            fill="#131D38"
            stroke={accent}
            strokeWidth="1.4"
          />
          <path
            d="M11 26L17 21L23 23L31 14"
            stroke={water}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="31" cy="14" r="2.5" fill="#ffc20d" />
        </svg>
      );
    case 'investigate':
      return (
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
          <path
            d="M9 28L21 22L33 28L21 34L9 28Z"
            fill="#131D38"
            stroke={accent}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M9 21L21 15L33 21L21 27L9 21Z"
            fill={water}
            fillOpacity="0.25"
            stroke={water}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M9 14L21 8L33 14L21 20L9 14Z"
            fill="#ffc20d"
            fillOpacity="0.2"
            stroke="#ffc20d"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'explain':
      return (
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
          <circle cx="13" cy="14" r="4.5" fill="#131D38" stroke={water} strokeWidth="1.5" />
          <circle cx="29" cy="14" r="4.5" fill="#131D38" stroke={accent} strokeWidth="1.5" />
          <circle
            cx="21"
            cy="29"
            r="5"
            fill="#ffc20d"
            fillOpacity="0.2"
            stroke="#ffc20d"
            strokeWidth="1.5"
          />
          <path
            d="M16 17L19 25M26 17L23 25"
            stroke="#f4f1ea"
            strokeOpacity="0.6"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'project':
      return (
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
          <circle cx="10" cy="22" r="3" fill="#ffc20d" />
          <path
            d="M13 22C19 22 23 13 33 12"
            stroke={water}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M13 22C20 22 24 22 33 22"
            stroke={accent}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeDasharray="3 2.5"
          />
          <path
            d="M13 22C19 22 23 30 33 32"
            stroke="#ffc20d"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" aria-hidden="true">
          <rect x="8" y="24" width="6" height="10" rx="2" fill={water} fillOpacity="0.7" />
          <rect x="18" y="17" width="6" height="17" rx="2" fill={water} />
          <rect x="28" y="10" width="6" height="24" rx="2" fill="#ffc20d" />
        </svg>
      );
  }
}

/* Mission Emblems for Data Foundation */

export function MissionEmblem({ id }) {
  switch (id) {
    case 'gpm':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="#131D38"
            stroke="#4FB3A9"
            strokeOpacity="0.5"
            strokeWidth="1.2"
          />
          <path
            d="M20 10C20 10 13 18.2 13 22.8C13 26.7 16.1 29.8 20 29.8C23.9 29.8 27 26.7 27 22.8C27 18.2 20 10 20 10Z"
            fill="#4FB3A9"
            fillOpacity="0.25"
            stroke="#4FB3A9"
            strokeWidth="1.5"
          />
          <ellipse
            cx="20"
            cy="20"
            rx="14"
            ry="5"
            transform="rotate(-22 20 20)"
            stroke="#ffc20d"
            strokeWidth="1.2"
            strokeDasharray="3 2"
          />
        </svg>
      );
    case 'merra2':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="#131D38"
            stroke="#f4f1ea"
            strokeOpacity="0.25"
            strokeWidth="1.2"
          />
          <path
            d="M10 16H27C29 16 30.5 14.5 30.5 12.8"
            stroke="#f4f1ea"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M9 21H31" stroke="#4FB3A9" strokeWidth="1.6" strokeLinecap="round" />
          <path
            d="M12 26H25C27 26 28.5 27.5 28.5 29"
            stroke="#ffc20d"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'modis':
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="#131D38"
            stroke="#ffc20d"
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />
          <rect
            x="11"
            y="11"
            width="8"
            height="8"
            rx="1.5"
            fill="#ffc20d"
            fillOpacity="0.3"
            stroke="#ffc20d"
            strokeWidth="1.2"
          />
          <rect
            x="21"
            y="11"
            width="8"
            height="8"
            rx="1.5"
            fill="#4FB3A9"
            fillOpacity="0.25"
            stroke="#4FB3A9"
            strokeWidth="1.2"
          />
          <rect
            x="11"
            y="21"
            width="8"
            height="8"
            rx="1.5"
            fill="#4FB3A9"
            fillOpacity="0.4"
            stroke="#4FB3A9"
            strokeWidth="1.2"
          />
          <rect
            x="21"
            y="21"
            width="8"
            height="8"
            rx="1.5"
            fill="#f4f1ea"
            fillOpacity="0.15"
            stroke="#f4f1ea"
            strokeOpacity="0.6"
            strokeWidth="1.2"
          />
        </svg>
      );
    default:
      return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="#131D38"
            stroke="#f4f1ea"
            strokeOpacity="0.3"
            strokeWidth="1.2"
          />
          <path d="M20 9V31" stroke="#ffc20d" strokeWidth="1.5" strokeDasharray="2.5 2.5" />
          <path
            d="M11 19C14 15.5 26 15.5 29 19"
            stroke="#f4f1ea"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M13 24C15.5 21.5 24.5 21.5 27 24"
            stroke="#4FB3A9"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
