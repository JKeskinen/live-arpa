/**
 * CommentsPanel – Kommenttivirta
 * ------------------------------
 * Näyttää viimeisimmät kommentit ja osallistumissäännöt.
 */

import { Radio, MessageSquare, ShieldCheck } from "lucide-react";
import { time } from "../utils/format";

export default function CommentsPanel({ comments, isLive, totalComments }) {
  const latest = [...comments].reverse().slice(0, 20);

  return (
    <aside className="comments-panel panel">
      <div className="comments-head">
        <div>
          <div className="section-label">
            <Radio size={14} />
            {isLive ? "LIVE-VIRTA" : "KOMMENTTIVIRTA"}
          </div>
          <h2>Viimeisimmät kommentit</h2>
        </div>
        <span className="comment-count">{totalComments}</span>
      </div>

      <div className="comment-list">
        {latest.map((comment, index) => (
          <div className="comment-item" key={`${comment.id}-${index}`}>
            <div className={`comment-avatar avatar-${index % 5}`}>
              {(comment.name || "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="comment-body">
              <div className="comment-meta">
                <strong>{comment.name}</strong>
                <time>{time(comment.publishedAt)}</time>
              </div>
              <div className="comment-text">{comment.text}</div>
            </div>
          </div>
        ))}

        {!latest.length && (
          <div className="empty-comments">
            <MessageSquare size={28} />
            <strong>Kommentteja odotetaan..</strong>
            <span>Lataa käynnissä oleva lähetys tai tavallinen video.</span>
          </div>
        )}
      </div>

      <div className="rules-card">
        <div className="rules-icon">
          <ShieldCheck size={17} />
        </div>
        <div>
          <strong>Osallistumissäännöt</strong>
          <p>
            Kommentoi osallistuaksesi arvontaan. Arvonnassa max 3 kommenttia
            yhdeltä kommentoijalta.
          </p>
        </div>
      </div>
    </aside>
  );
}
