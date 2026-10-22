import { useRef } from "react";
import type { Dataset } from "../domain/dataset";
import { SCORE_READING } from "../domain/explanations";

export const formatDate = (iso: string) => iso.split("-").reverse().join("/");

function InfoDialog({ trigger, title, children }: { trigger: string; title: string; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="link" onClick={() => dialog.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={dialog}
        className="info"
        aria-label={title}
        onClick={(event) => event.target === dialog.current && dialog.current.close()}
      >
        <header>
          <h2>{title}</h2>
          <button type="button" className="ghost" aria-label="Fechar" onClick={() => dialog.current?.close()}>
            ✕
          </button>
        </header>
        <div className="info-body">{children}</div>
      </dialog>
    </>
  );
}

export function ScoreReadingDialog() {
  return (
    <InfoDialog trigger="Como se lê a Pontuação" title="Como se lê a Pontuação">
      <ul>
        {SCORE_READING.map((paragraph) => (
          <li key={paragraph}>{paragraph}</li>
        ))}
      </ul>
    </InfoDialog>
  );
}

export function SourcesDialog({ dataset }: { dataset: Dataset }) {
  return (
    <InfoDialog trigger="Fontes e créditos" title="Fontes e créditos">
      <p>Os dados foram coletados em {formatDate(dataset.coleta)}, na edição vigente de cada fonte nessa data.</p>
      <ul className="sources">
        {dataset.fontes.map((source) => (
          <li key={source.chave}>
            <strong>{source.nome}</strong> ({source.ano})<span className="muted small">{source.edicao}</span>
            <span className="small">{source.credito}</span>
            <a className="small" href={source.endereco} target="_blank" rel="noreferrer">
              {source.endereco}
            </a>
          </li>
        ))}
      </ul>
    </InfoDialog>
  );
}
