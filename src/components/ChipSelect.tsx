"use client";
export default function ChipSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`text-xs px-3 py-2 rounded-full border font-medium ${
              active ? "bg-coral border-coral text-white" : "bg-white border-line text-ink"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
