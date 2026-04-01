export default function AmbientBackdrop({
  palette = ["#0f172a", "#1d4ed8", "#7c3aed", "#06b6d4"],
  className = "",
  opacity = 1,
}) {
  const [first, second, third, fourth] = palette;

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ opacity }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 16% 20%, ${second}33 0%, transparent 42%),
            radial-gradient(circle at 84% 18%, ${third}2d 0%, transparent 38%),
            radial-gradient(circle at 50% 78%, ${fourth}24 0%, transparent 44%),
            linear-gradient(180deg, ${first} 0%, transparent 100%)
          `,
        }}
      />
      <div
        className="absolute inset-0 blur-3xl"
        style={{
          background: `
            radial-gradient(circle at 30% 30%, ${second}1f 0%, transparent 35%),
            radial-gradient(circle at 72% 40%, ${third}1f 0%, transparent 32%)
          `,
        }}
      />
    </div>
  );
}
