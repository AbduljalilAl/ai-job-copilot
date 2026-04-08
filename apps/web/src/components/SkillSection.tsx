export function SkillSection({
  title,
  skills,
  emptyLabel,
  tone
}: {
  title: string;
  skills: string[];
  emptyLabel: string;
  tone: "ok" | "warn";
}) {
  return (
    <article className="panel">
      <h3>{title}</h3>
      <div className="chips">
        {skills.length > 0
          ? skills.map((skill) => <span key={skill} className={`chip ${tone}`}>{skill}</span>)
          : <span className="chip neutral">{emptyLabel}</span>}
      </div>
    </article>
  );
}
