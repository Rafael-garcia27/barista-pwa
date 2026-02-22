import { useEffect, useMemo, useState } from "react";
import type { Bean, BrewLog } from "../types";
import { deleteBrew, listBeans, listBrews } from "../db";

export default function LogbookScreen() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [brews, setBrews] = useState<BrewLog[]>([]);
  const [beanFilter, setBeanFilter] = useState<string>("");

  useEffect(() => {
    (async () => {
      const b = await listBeans();
      const l = await listBrews();
      setBeans(b);
      setBrews(l);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!beanFilter) return brews;
    return brews.filter((x) => x.beanId === beanFilter);
  }, [brews, beanFilter]);

  async function onDelete(id: string) {
    await deleteBrew(id);
    const l = await listBrews();
    setBrews(l);
  }

  function beanName(beanId: string) {
    return beans.find((b) => b.id === beanId)?.name ?? "Unbekannt";
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-semibold">Filter</div>
        <div className="mt-2 text-xs text-neutral-600">Bohne</div>
        <select
          className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
          value={beanFilter}
          onChange={(e) => setBeanFilter(e.target.value)}
        >
          <option value="">Alle</option>
          {beans.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border bg-white p-4 text-sm text-neutral-700">
            Noch keine Einträge. Logge deinen ersten Brew.
          </div>
        )}

        {filtered.map((b) => (
          <div key={b.id} className="rounded-2xl border bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{beanName(b.beanId)}</div>
                <div className="mt-1 text-xs text-neutral-600">
                  {new Date(b.createdAt).toLocaleString()} . {b.coffeeGrams} g . {b.timeSeconds} s
                </div>
                <div className="mt-2 text-xs text-neutral-700">
                  Rating: <span className="font-semibold">{b.rating}</span>
                  {b.tasteTags.length > 0 ? `. Tags: ${b.tasteTags.join(", ")}` : ""}
                </div>
              </div>

              <button
                onClick={() => onDelete(b.id)}
                className="rounded-xl border px-3 py-2 text-xs text-neutral-700"
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
