import { useEffect, useState } from "react";
import type { Bean } from "../types";
import { deleteBean, listBeans, upsertBean, uuid } from "../db";

export default function BeansScreen() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [name, setName] = useState("");
  const [roaster, setRoaster] = useState("");
  const [message, setMessage] = useState("");

  async function refresh() {
    const list = await listBeans();
    setBeans(list);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onAdd() {
    if (!name.trim()) {
      setMessage("Bitte Name setzen.");
      setTimeout(() => setMessage(""), 1200);
      return;
    }

    const now = Date.now();
    const bean: Bean = {
      id: uuid(),
      name: name.trim(),
      roaster: roaster.trim() || undefined,
      defaultMethodId: "aeropress",
      createdAt: now,
      updatedAt: now,
    };

    await upsertBean(bean);
    setName("");
    setRoaster("");
    setMessage("Bohne gespeichert.");
    setTimeout(() => setMessage(""), 1200);
    refresh();
  }

  async function onDelete(beanId: string) {
    await deleteBean(beanId);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold">Neue Bohne</div>

        <div className="mt-3">
          <div className="text-xs text-neutral-600">Name</div>
          <input
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z.B. Ethiopia Yirgacheffe"
          />
        </div>

        <div className="mt-3">
          <div className="text-xs text-neutral-600">Röster</div>
          <input
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
            value={roaster}
            onChange={(e) => setRoaster(e.target.value)}
            placeholder="optional"
          />
        </div>

        <button
          onClick={onAdd}
          className="mt-4 w-full rounded-xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white"
        >
          Hinzufügen
        </button>

        {message && <div className="mt-2 text-xs text-emerald-700">{message}</div>}
      </div>

      <div className="space-y-3">
        {beans.map((b) => (
          <div key={b.id} className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{b.name}</div>
                <div className="mt-1 text-xs text-neutral-600">{b.roaster ?? "kein Röster gesetzt"}</div>
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
