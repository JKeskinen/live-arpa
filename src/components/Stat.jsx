/**
 * Stat – Yksittäinen tilastokortti
 */

export default function Stat({ icon, label, value, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-top">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">
        {Number(value || 0).toLocaleString("fi-FI")}
      </div>
      <div className="stat-foot">
        {tone === "gold"
          ? ""
          : tone === "purple"
            ? "Yksilölliset hyväksytyt käyttäjät"
            : ""}
      </div>
    </div>
  );
}
