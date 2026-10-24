import { useEffect, useRef, useState } from "react";
import type { Dataset } from "../domain/dataset";
import { hasOwnSession, exportFileName, parseSession, serializeSession } from "../domain/session-file";
import { renameSession, type Session } from "../domain/session";
import {
  activeSession,
  addBlankSession,
  isNameTaken,
  removeActive,
  switchSession,
  type Library,
} from "../domain/session-library";
import { encodeSessionLink } from "../domain/session-link";

type Props = {
  dataset: Dataset;
  library: Library;
  onChange: (update: (session: Session) => Session) => void;
  onReplaceLibrary: (library: Library) => void;
  onAdopt: (session: Session) => boolean;
};

const UNNAMED = "Sessão sem nome";

export function SessionPanel({ dataset, library, onChange, onReplaceLibrary, onAdopt }: Props) {
  const session = activeSession(library);
  const [draft, setDraft] = useState(session.name);
  const [nameError, setNameError] = useState<string | null>(null);
  useEffect(() => setDraft(session.name), [session.name]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === session.name) {
      setDraft(session.name);
    } else if (isNameTaken(library, trimmed)) {
      setNameError(`Já existe a Sessão "${trimmed || UNNAMED}" neste navegador; escolha outro nome.`);
      setDraft(session.name);
    } else {
      setNameError(null);
      onChange((current) => renameSession(current, trimmed));
    }
  };

  const remove = () => {
    const label = session.name || UNNAMED;
    const others = library.sessions.length - 1;
    const after = others === 0 ? "No lugar dela fica uma Sessão em branco." : "";
    if (
      !hasOwnSession(dataset, { ...session, name: "" }) ||
      window.confirm(`Apagar a Sessão "${label}" deste navegador? ${after}`)
    ) {
      onReplaceLibrary(removeActive(dataset, library));
    }
  };

  return (
    <>
      <div className="evaluator-row">
        <select
          value={session.name}
          aria-label="Sessão ativa"
          onChange={(event) => {
            setNameError(null);
            onReplaceLibrary(switchSession(library, event.target.value));
          }}
        >
          {library.sessions.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name || UNNAMED}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Criar Sessão em branco"
          title="Criar Sessão em branco"
          onClick={() => onReplaceLibrary(addBlankSession(dataset, library))}
        >
          +
        </button>
      </div>
      <div className="evaluator-row">
        <input
          type="text"
          value={draft}
          placeholder={UNNAMED}
          aria-label="Nome da Sessão"
          aria-invalid={nameError !== null}
          aria-describedby={nameError ? "session-name-error" : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        />
        <button type="button" title="Apagar a Sessão ativa deste navegador" onClick={remove}>
          Apagar
        </button>
      </div>
      {nameError && (
        <p id="session-name-error" role="alert" className="import-error small">
          {nameError}
        </p>
      )}
      <div className="evaluator-row">
        <ShareDialog session={session} />
        <ExportDialog session={session} />
        <ImportDialog dataset={dataset} onAdopt={onAdopt} />
      </div>
    </>
  );
}

function ShareDialog({ session }: { session: Session }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  const show = async () => {
    setCopied(false);
    setLink("");
    dialog.current?.showModal();
    const fragment = await encodeSessionLink(session);
    setLink(`${window.location.origin}${window.location.pathname}#${fragment}`);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button type="button" onClick={() => void show()}>
        Compartilhar
      </button>
      <dialog
        ref={dialog}
        className="info"
        aria-label="Compartilhar Sessão"
        onClick={(event) => event.target === dialog.current && dialog.current.close()}
      >
        <header>
          <h2>Compartilhar Sessão</h2>
          <button type="button" className="ghost" aria-label="Fechar" onClick={() => dialog.current?.close()}>
            ✕
          </button>
        </header>
        <div className="info-body">
          <p>
            O link leva a Sessão inteira, com o nome dela. Quem abre o link recebe uma cópia: se já tiver uma Sessão com
            o mesmo nome, o app pergunta antes de substituí-la; senão, a Sessão entra ao lado das que a pessoa já tem.
          </p>
          <div className="evaluator-row">
            <button type="button" disabled={link === ""} onClick={copy}>
              Copiar link
            </button>
            {copied && (
              <span role="status" className="muted small">
                Copiado
              </span>
            )}
          </div>
          <textarea className="session-text link-text" readOnly aria-label="Link da Sessão" value={link} />
        </div>
      </dialog>
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

function ImportDialog({ dataset, onAdopt }: Pick<Props, "dataset" | "onAdopt">) {
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
    if (onAdopt(result.session)) dialog.current?.close();
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
          <p className="muted small">
            Se já houver uma Sessão com o mesmo nome neste navegador, o app pergunta antes de substituí-la; senão, a
            importada entra ao lado das outras.
          </p>
          <button type="button" disabled={text.trim() === ""} onClick={importText}>
            Importar Sessão
          </button>
        </div>
      </dialog>
    </>
  );
}
