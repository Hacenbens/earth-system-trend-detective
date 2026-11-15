'use client';

import { motion } from 'motion/react';

export function AuthEarthDiorama({ compact = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className={`relative mx-auto flex items-center justify-center select-none ${
        compact ? 'w-[220px] h-[180px]' : 'w-full max-w-[430px] h-[380px]'
      }`}
    >
      {/* Outer organic nested blob (#E6E0D2) */}
      <svg
        viewBox="0 0 420 380"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <path
          d="M68 120C44 178 48 258 98 308C148 358 242 364 304 328C366 292 396 208 370 138C344 68 272 28 198 36C124 44 92 62 68 120Z"
          fill="#E6E0D2"
        />
        {/* Inner lighter organic blob */}
        <path
          d="M92 134C74 182 80 246 122 288C164 330 238 334 288 304C338 274 360 206 340 148C320 90 260 58 198 64C136 70 110 86 92 134Z"
          fill="#FAF8F3"
        />
      </svg>

      {/* Slowly drifting translucent bubbles, teal raindrops & data particles */}
      {!compact && (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* Cream & navy soft bubbles */}
          <span className="absolute top-6 left-12 w-7 h-7 rounded-full bg-[#131D38]/8 border border-[#131D38]/10 animate-bubble-drift" />
          <span className="absolute top-16 right-10 w-5 h-5 rounded-full bg-[#E6E0D2] border border-[#131D38]/10 animate-bubble-drift-slow" />
          <span className="absolute bottom-14 left-10 w-4 h-4 rounded-full bg-[#131D38]/15 animate-bubble-drift-slow" />
          <span className="absolute bottom-8 right-16 w-8 h-8 rounded-full bg-[#f4f1ea] border border-[#E6E0D2] shadow-sm animate-bubble-drift" />

          {/* Teal raindrops */}
          <svg
            width="16"
            height="22"
            viewBox="0 0 16 22"
            className="absolute top-12 left-24 animate-bubble-drift-slow"
          >
            <path
              d="M8 1C8 1 1.5 9.2 1.5 13.8C1.5 17.4 4.4 20.3 8 20.3C11.6 20.3 14.5 17.4 14.5 13.8C14.5 9.2 8 1 8 1Z"
              fill="#4FB3A9"
              fillOpacity="0.65"
            />
          </svg>
          <svg
            width="12"
            height="17"
            viewBox="0 0 16 22"
            className="absolute bottom-20 left-20 animate-bubble-drift"
          >
            <path
              d="M8 1C8 1 1.5 9.2 1.5 13.8C1.5 17.4 4.4 20.3 8 20.3C11.6 20.3 14.5 17.4 14.5 13.8C14.5 9.2 8 1 8 1Z"
              fill="#4FB3A9"
              fillOpacity="0.55"
            />
          </svg>
          <svg
            width="14"
            height="19"
            viewBox="0 0 16 22"
            className="absolute top-28 right-8 animate-bubble-drift"
          >
            <path
              d="M8 1C8 1 1.5 9.2 1.5 13.8C1.5 17.4 4.4 20.3 8 20.3C11.6 20.3 14.5 17.4 14.5 13.8C14.5 9.2 8 1 8 1Z"
              fill="#4FB3A9"
              fillOpacity="0.5"
            />
          </svg>
        </div>
      )}

      {/* Centered 3D Earth Diorama with Africa & Glowing Amber Sahel Band */}
      <div
        className={`relative z-10 flex items-center justify-center ${
          compact ? 'w-[144px] h-[144px]' : 'w-[248px] h-[248px]'
        }`}
      >
        {/* Slowly rotating orbital rings + satellites (60s per turn) */}
        <svg
          viewBox="0 0 280 280"
          className="absolute inset-0 w-full h-full animate-earth-spin-60 pointer-events-none"
          aria-hidden="true"
        >
          {/* Orbit 1 */}
          <ellipse
            cx="140"
            cy="140"
            rx="126"
            ry="52"
            transform="rotate(-24 140 140)"
            fill="none"
            stroke="#131D38"
            strokeOpacity="0.28"
            strokeWidth="1.2"
            strokeDasharray="4 4"
          />
          {/* Satellite 1 */}
          <g transform="translate(248, 86)">
            <rect x="-5" y="-3" width="10" height="6" rx="1.5" fill="#131D38" />
            <rect x="-11" y="-1.5" width="5" height="3" rx="0.8" fill="#4FB3A9" />
            <rect x="6" y="-1.5" width="5" height="3" rx="0.8" fill="#4FB3A9" />
          </g>

          {/* Orbit 2 */}
          <ellipse
            cx="140"
            cy="140"
            rx="116"
            ry="44"
            transform="rotate(32 140 140)"
            fill="none"
            stroke="#4FB3A9"
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />
          {/* Satellite 2 */}
          <g transform="translate(46, 84)">
            <circle cx="0" cy="0" r="4" fill="#ffc20d" stroke="#131D38" strokeWidth="1.2" />
          </g>
          {/* Satellite 3 */}
          <g transform="translate(216, 210)">
            <circle cx="0" cy="0" r="3" fill="#131D38" />
            <circle
              cx="0"
              cy="0"
              r="6"
              fill="none"
              stroke="#ffc20d"
              strokeWidth="1"
              strokeOpacity="0.7"
            />
          </g>
        </svg>

        {/* Main 3D Globe Sphere */}
        <svg
          viewBox="0 0 220 220"
          className="relative z-10 w-[76%] h-[76%] drop-shadow-[0_20px_40px_rgba(19,29,56,0.22)]"
          role="img"
          aria-label="3D Earth globe facing Africa with the Sahel belt highlighted in amber"
        >
          <defs>
            <radialGradient id="authOceanSphere" cx="38%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#26396B" />
              <stop offset="55%" stopColor="#131D38" />
              <stop offset="100%" stopColor="#0B1224" />
            </radialGradient>
            <linearGradient id="sahelAmberBand" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffc20d" stopOpacity="0.15" />
              <stop offset="25%" stopColor="#ffc20d" stopOpacity="0.9" />
              <stop offset="75%" stopColor="#ffc20d" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffc20d" stopOpacity="0.2" />
            </linearGradient>
            <clipPath id="globeClip">
              <circle cx="110" cy="110" r="88" />
            </clipPath>
          </defs>

          {/* Outer atmospheric rim halo */}
          <circle
            cx="110"
            cy="110"
            r="94"
            fill="none"
            stroke="#4FB3A9"
            strokeOpacity="0.3"
            strokeWidth="3"
          />

          {/* Ocean sphere */}
          <circle cx="110" cy="110" r="88" fill="url(#authOceanSphere)" />

          <g clipPath="url(#globeClip)">
            {/* Subtle latitude / longitude meridians */}
            <ellipse
              cx="110"
              cy="110"
              rx="52"
              ry="88"
              fill="none"
              stroke="#f4f1ea"
              strokeOpacity="0.09"
              strokeWidth="1"
            />
            <ellipse
              cx="110"
              cy="110"
              rx="88"
              ry="28"
              fill="none"
              stroke="#f4f1ea"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
            <line
              x1="22"
              y1="110"
              x2="198"
              y2="110"
              stroke="#f4f1ea"
              strokeOpacity="0.08"
              strokeWidth="1"
            />

            {/* Europe / Mediterranean edge */}
            <path
              d="M72 28 L142 26 L160 46 L132 54 L104 48 L84 52 Z"
              fill="#E6E0D2"
              fillOpacity="0.45"
            />

            {/* Arabian peninsula hint */}
            <path d="M150 66 L186 68 L194 96 L164 108 L150 88 Z" fill="#E6E0D2" fillOpacity="0.5" />

            {/* Africa facing the viewer */}
            <path
              d="M72 64 L106 58 L138 64 L152 84 L164 112 L152 132 L144 162 L124 186 L108 184 L96 154 L94 128 L72 118 L58 102 L60 80 Z"
              fill="#f4f1ea"
              fillOpacity="0.92"
            />

            {/* Moisture plume from tropical Atlantic */}
            <path
              d="M28 134 C48 124, 68 118, 86 112"
              stroke="#4FB3A9"
              strokeWidth="3"
              strokeLinecap="round"
              strokeOpacity="0.7"
              fill="none"
            />

            {/* Glowing Amber Sahel Band (10°N - 20°N across Africa) */}
            <rect x="54" y="88" width="112" height="16" rx="8" fill="url(#sahelAmberBand)" />
            <rect x="60" y="91" width="100" height="10" rx="5" fill="#ffc20d" fillOpacity="0.85" />

            {/* Spherical shadow crescent on right limb */}
            <path
              d="M132 22 A88 88 0 0 1 132 198 A68 88 0 0 0 132 22 Z"
              fill="#0B1224"
              fillOpacity="0.34"
            />
          </g>
        </svg>
      </div>

      {/* Floating glass trend-line card beside the globe (desktop/tablet) */}
      {!compact && (
        <>
          <div className="absolute right-0 sm:right-2 top-14 z-20 rounded-[20px] bg-[#131D38]/90 backdrop-blur-md border border-[#f4f1ea]/15 px-3.5 py-2.5 shadow-[0_18px_36px_rgba(19,29,56,0.22)] text-[#f4f1ea] w-[148px] animate-bubble-drift">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#A9B1C6]">
              <span>Sahel JJAS</span>
              <span className="text-[#ffc20d]">↗</span>
            </div>
            <svg viewBox="0 0 116 26" className="w-full h-6 mt-1.5" aria-hidden="true">
              <path
                d="M2 20 L20 17 L38 21 L56 13 L74 15 L92 9 L114 6"
                fill="none"
                stroke="#4FB3A9"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="2"
                y1="20"
                x2="114"
                y2="8"
                stroke="#ffc20d"
                strokeWidth="1.3"
                strokeDasharray="3 2.5"
              />
            </svg>
          </div>

          {/* Floating glass data tile bottom-left */}
          <div className="absolute left-1 sm:left-3 bottom-12 z-20 rounded-[18px] bg-white/85 backdrop-blur-md border border-[#E6E0D2] px-3.5 py-2 shadow-[0_14px_30px_rgba(19,29,56,0.12)] text-[#131D38] animate-bubble-drift-slow">
            <div className="font-mono text-[9px] uppercase tracking-wider text-[#5B6478]">
              GPM IMERG
            </div>
            <div className="font-display text-[12px] font-semibold mt-0.5 tabular-nums">
              10°N–20°N
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
