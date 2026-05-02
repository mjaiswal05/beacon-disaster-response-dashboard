export function BeaconIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer glow rings */}
      <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.1" />
      <circle cx="50" cy="50" r="35" fill="currentColor" opacity="0.15" />

      {/* Light beams */}
      <path
        d="M 50 20 L 35 5 L 40 5 L 50 15 L 60 5 L 65 5 Z"
        fill="currentColor"
        opacity="0.6"
      />
      <path
        d="M 50 20 L 65 5 L 70 10 L 55 25 Z"
        fill="currentColor"
        opacity="0.4"
      />
      <path
        d="M 50 20 L 35 5 L 30 10 L 45 25 Z"
        fill="currentColor"
        opacity="0.4"
      />

      {/* Central beacon tower */}
      <rect x="42" y="35" width="16" height="45" rx="2" fill="currentColor" />
      <rect x="40" y="30" width="20" height="8" rx="2" fill="currentColor" />

      {/* Beacon light (top) */}
      <circle cx="50" cy="25" r="8" fill="currentColor" />
      <circle cx="50" cy="25" r="5" fill="white" opacity="0.9" />

      {/* Base platform */}
      <rect x="35" y="75" width="30" height="5" rx="2" fill="currentColor" />
      <path
        d="M 32 80 L 68 80 L 70 85 L 30 85 Z"
        fill="currentColor"
        opacity="0.8"
      />

      {/* Light rays animation effect */}
      <path
        d="M 50 25 L 20 10 L 22 8 L 50 22 Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M 50 25 L 80 10 L 78 8 L 50 22 Z"
        fill="currentColor"
        opacity="0.2"
      />
    </svg>
  );
}

export function BeaconIconAnimated({
  className = "w-8 h-8",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Animated outer glow rings */}
      <circle cx="50" cy="50" r="45" fill="currentColor" opacity="0.1">
        <animate
          attributeName="r"
          values="45;48;45"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.1;0.05;0.1"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      <circle cx="50" cy="50" r="35" fill="currentColor" opacity="0.15">
        <animate
          attributeName="r"
          values="35;38;35"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Light beams with animation */}
      <g opacity="0.6">
        <path
          d="M 50 20 L 35 5 L 40 5 L 50 15 L 60 5 L 65 5 Z"
          fill="currentColor"
        >
          <animate
            attributeName="opacity"
            values="0.6;0.3;0.6"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </path>
      </g>
      <g opacity="0.4">
        <path d="M 50 20 L 65 5 L 70 10 L 55 25 Z" fill="currentColor">
          <animate
            attributeName="opacity"
            values="0.4;0.2;0.4"
            dur="1.5s"
            begin="0.3s"
            repeatCount="indefinite"
          />
        </path>
      </g>
      <g opacity="0.4">
        <path d="M 50 20 L 35 5 L 30 10 L 45 25 Z" fill="currentColor">
          <animate
            attributeName="opacity"
            values="0.4;0.2;0.4"
            dur="1.5s"
            begin="0.3s"
            repeatCount="indefinite"
          />
        </path>
      </g>

      {/* Central beacon tower */}
      <rect x="42" y="35" width="16" height="45" rx="2" fill="currentColor" />
      <rect x="40" y="30" width="20" height="8" rx="2" fill="currentColor" />

      {/* Beacon light (top) with pulse */}
      <circle cx="50" cy="25" r="8" fill="currentColor" />
      <circle cx="50" cy="25" r="5" fill="white" opacity="0.9">
        <animate
          attributeName="opacity"
          values="0.9;0.5;0.9"
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Base platform */}
      <rect x="35" y="75" width="30" height="5" rx="2" fill="currentColor" />
      <path
        d="M 32 80 L 68 80 L 70 85 L 30 85 Z"
        fill="currentColor"
        opacity="0.8"
      />

      {/* Light rays animation effect */}
      <path
        d="M 50 25 L 20 10 L 22 8 L 50 22 Z"
        fill="currentColor"
        opacity="0.2"
      >
        <animate
          attributeName="opacity"
          values="0.2;0.4;0.2"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>
      <path
        d="M 50 25 L 80 10 L 78 8 L 50 22 Z"
        fill="currentColor"
        opacity="0.2"
      >
        <animate
          attributeName="opacity"
          values="0.2;0.4;0.2"
          dur="2s"
          begin="0.5s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}
