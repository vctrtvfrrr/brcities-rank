import { useEffect, useRef, useState } from "react";
import type { Dataset } from "../domain/dataset";
import type { Session } from "../domain/session";
import { exportFileName, hasOwnSession, parseSession, serializeSession } from "../domain/session-file";

type Props = {
  dataset: Dataset;
  session: Session;
  onReplace: (session: Session) => void;
  onRename: (name: string) => void;
};

export function SessionPanel({ dataset, session, onReplace, onRename }: Props) {
  const [draft, setDraft] = useState(session.name);
  useEffect(() => setDraft(session.name), [session.name]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== session.name) onRename(trimmed);
    else setDraft(session.name);
  };

  return (
    <>
      <input
        type="text"
        value={draft}
        placeholder="Sessão sem nome"
        aria-label="Nome da Sessão"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
      />
      <div className="evaluator-row">
        <ExportDialog session={session} />
        <ImportDialog dataset={dataset} session={session} onReplace={onReplace} />
      </div>
    </>
  );
}

function ExportDialog({ session }: { session: Session }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = open ? serializeSession(session) : "";

  const show = () => {
    setCopied(false);
    setOpen(true);
    dialog.current?.showModal();
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName(session.name);
    link.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button type="button" onClick={show}>
        Exportar
      </button>
      <dialog
        ref={dialog}
        className="info"
        aria-label="Exportar Sessão"
        onClose={() => setOpen(false)}
        onClick={(event) => event.target === dialog.current && dialog.current.close()}
      >
        <header>
          <h2>Exportar Sessão</h2>
          <button type="button" className="ghost" aria-label="Fechar" onClick={() => dialog.current?.close()}>
            ✕
          </button>
        </header>
        <div className="info-body">
          <div className="evaluator-row">
            <button type="button" onClick={download}>
              Baixar arquivo
            </button>
            <button type="button" onClick={copy}>
              Copiar texto
            </button>
            {copied && (
              <span role="status" className="muted small">
                Copiado
              </span>
            )}
          </div>
          <textarea className="session-text" readOnly aria-label="Texto da Sessão" value={text} />
        </div>
      </dialog>
    </>
  );
}

function ImportDialog({ dataset, session, onReplace }: Omit<Props, "onRename">) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setText("");
    setError(null);
  };

  const readFile = async (file: File | undefined) => {
    if (file) setText(await file.text());
  };

  const importText = () => {
    const result = parseSession(dataset, text);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    if (
      hasOwnSession(dataset, session) &&
      !window.confirm("Importar substitui a sua Sessão inteira, sem mesclar. Deseja continuar?")
    ) {
      return;
    }
    onReplace(result.session);
    dialog.current?.close();
  };

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()}>
        Importar
      </button>
      <dialog
        ref={dialog}
        className="info"
        aria-label="Importar Sessão"
        onClose={reset}
        onClick={(event) => event.target === dialog.current && dialog.current.close()}
      >
        <header>
          <h2>Importar Sessão</h2>
          <button type="button" className="ghost" aria-label="Fechar" onClick={() => dialog.current?.close()}>
            ✕
          </button>
        </header>
        <div className="info-body">
          <label className="small">
            Arquivo da Sessão
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                setError(null);
                void readFile(event.target.files?.[0]);
              }}
            />
          </label>
          <label className="small">
            Ou cole o texto
            <textarea
              className="session-text"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setError(null);
              }}
            />
          </label>
          {error && (
            <p role="alert" className="import-error">
              {error}
            </p>
          )}
          <button type="button" disabled={text.trim() === ""} onClick={importText}>
            Importar e substituir a Sessão
          </button>
        </div>
      </dialog>
    </>
  );
}
