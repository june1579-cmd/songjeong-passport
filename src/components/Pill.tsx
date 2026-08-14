export default function Pill({
  children,
  tone = "sand",
}: {
  children: React.ReactNode;
  tone?: "sand" | "seafoam" | "coral" | "amber" | "navy";
}) {
  const tones = {
    sand: "bg-sand text-navy",
    seafoam: "bg-seafoamLight text-seafoam",
    coral: "bg-[#FBE4D8] text-coralDark",
    amber: "bg-amberLight text-amber",
    navy: "bg-navy text-white",
  } as const;
  return <span className={`text-xs font-body px-2 py-1 rounded-full font-medium ${tones[tone]}`}>{children}</span>;
}
