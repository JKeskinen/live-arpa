/**
 * PlatformLogo – Mistä palvelusta kommentti (voittaja) tuli
 * ---------------------------------------------------------
 * YouTube: media/youtube-logo.png
 * Twitch: virallinen Twitch-merkki (Simple Icons, CC0) SVG:nä.
 */

import youtubeLogo from "../../media/youtube-logo.png";

export function platformOf(comment) {
  return comment?.source === "twitch" ? "twitch" : "youtube";
}

export const PLATFORM_NAME = { youtube: "YouTube", twitch: "Twitch" };

function TwitchGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#9146FF"
        d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"
      />
    </svg>
  );
}

export default function PlatformLogo({ comment, size = 18, className = "" }) {
  const platform = platformOf(comment);
  const label = PLATFORM_NAME[platform];

  return (
    <span
      className={`platform-logo is-${platform} ${className}`}
      style={{ height: size }}
      title={label}
      role="img"
      aria-label={label}
    >
      {platform === "twitch" ? (
        <TwitchGlyph />
      ) : (
        <img src={youtubeLogo} alt="" draggable={false} />
      )}
    </span>
  );
}
