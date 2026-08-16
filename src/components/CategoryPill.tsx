import { categoryColor } from "@/lib/category-colors";

export default function CategoryPill({ category }: { category: string | null | undefined }) {
  if (!category) return null;
  const c = categoryColor(category);
  return (
    <span
      className="text-xs font-body px-2 py-1 rounded-full font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      {category}
    </span>
  );
}
