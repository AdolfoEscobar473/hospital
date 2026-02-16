export default function KpiCard({ title, value, helper, icon, tone = "default" }) {
  return (
    <article className={`kpi-card tone-${tone}`}>
      <div className="kpi-main">
        <p>{title}</p>
        <strong>{value}</strong>
        {helper ? <small>{helper}</small> : null}
      </div>
      {icon ? <div className="kpi-icon">{icon}</div> : null}
    </article>
  );
}
