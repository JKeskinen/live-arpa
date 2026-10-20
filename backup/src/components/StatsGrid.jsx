/**
 * StatsGrid – Tilastokortit
 */

import { MessageSquare, ShieldCheck, Users, Clock3 } from "lucide-react";
import Stat from "./Stat";
import { time, dateTime } from "../utils/format";

export default function StatsGrid({ state }) {
  return (
    <section className="stats-grid">
      <Stat
        icon={<MessageSquare size={18} />}
        label="VIDEON KOMMENTIT"
        value={state.totalComments}
        tone="cyan"
      />
      <Stat
        icon={<ShieldCheck size={18} />}
        label="HYVÄKSYTTYJÄ KOMMENTTEJA"
        value={state.acceptedEntries}
        tone="purple"
      />
      <Stat
        icon={<Users size={18} />}
        label="YKSITTÄISIÄ OSALLISTUJIA"
        value={state.uniqueCommenters}
        tone="gold"
      />
      <div className="stat-card updated">
        <div className="stat-top">
          <span className="stat-icon">
            <Clock3 size={18} />
          </span>
          <span className="stat-label">VIIMEISIN PÄIVITYS</span>
        </div>
        <div className="updated-time">{time(state.updatedAt)}</div>
        <div className="stat-foot">{dateTime(state.updatedAt)}</div>
      </div>
    </section>
  );
}
