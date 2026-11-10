import { useEffect, useRef, useState } from "react";
import { Library } from "./components/Library";
import { NewCharacterWizard } from "./components/NewCharacterWizard";
import { Editor } from "./components/Editor";
import { loadLastOpen, loadLibrary, loadTheme, saveLastOpen, saveLibrary, saveTheme, type StoredCharacter, type Theme } from "./storage";

type View = { kind: "library" } | { kind: "new" } | { kind: "edit"; id: string };

export default function App() {
  const [lib, setLib] = useState<StoredCharacter[]>(loadLibrary);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [view, setView] = useState<View>(() => {
    const last = loadLastOpen();
    return last && loadLibrary().some((r) => r.id === last) ? { kind: "edit", id: last } : { kind: "library" };
  });
  const [saveOk, setSaveOk] = useState(true);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => setSaveOk(saveLibrary(lib)), 300);
    return () => clearTimeout(t);
  }, [lib]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    saveLastOpen(view.kind === "edit" ? view.id : null);
  }, [view]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "parchment" : "dark"));
  const upsert = (rec: StoredCharacter) => setLib((l) => (l.some((r) => r.id === rec.id) ? l.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...l]));

  if (view.kind === "new")
    return (
      <NewCharacterWizard
        theme={theme}
        onToggleTheme={toggleTheme}
        onCancel={() => setView({ kind: "library" })}
        onCreate={(rec) => {
          upsert(rec);
          setView({ kind: "edit", id: rec.id });
        }}
      />
    );

  const open = view.kind === "edit" ? lib.find((r) => r.id === view.id) : undefined;
  if (open)
    return (
      <Editor
        key={open.id}
        rec={open}
        theme={theme}
        saveOk={saveOk}
        onToggleTheme={toggleTheme}
        onUpdate={(patch) => upsert({ ...open, ...patch, updated: Date.now() })}
        onBack={() => setView({ kind: "library" })}
      />
    );

  return (
    <Library
      lib={lib}
      theme={theme}
      onToggleTheme={toggleTheme}
      onOpen={(id) => setView({ kind: "edit", id })}
      onNew={() => setView({ kind: "new" })}
      onImport={(rec) => upsert(rec)}
      onDelete={(id) => setLib((l) => l.filter((r) => r.id !== id))}
      onDuplicate={(rec) => upsert(rec)}
    />
  );
}
