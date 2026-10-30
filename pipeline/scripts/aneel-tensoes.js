(async () => {
  const origin = "https://www2.aneel.gov.br";
  const base = "/aplicacoes/srd/";
  const storageKey = "brcities-rank:aneel-tensoes:v2";
  const states = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
  const delayMs = 1500;
  const maxAttempts = 3;
  const maxConsecutiveFailures = 3;
  const header = ["codigo_ibge", "uf", "distribuidora", "tensao", "status", "consultado_em", "erro"];

  if (location.origin !== origin || !location.pathname.startsWith(base)) {
    throw new Error("Abra a consulta de tensões da ANEEL antes de colar o script.");
  }
  if (window.aneelVoltages) {
    console.info("O coletor já está carregado. Use aneelVoltages.resume() ou aneelVoltages.retryFailures().");
    return;
  }

  const checkpoint = JSON.parse(localStorage.getItem(storageKey) || "null") || {
    municipalities: {},
    rows: {},
    failedStates: {},
  };
  let running = false;
  let stopped = false;
  let consecutiveFailures = 0;

  class CollectionPaused extends Error {}
  class CollectionStopped extends Error {}
  const save = () => localStorage.setItem(storageKey, JSON.stringify(checkpoint));
  const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

  async function request(endpoint, municipality, waitMs) {
    await pause(waitMs);
    if (stopped) throw new CollectionStopped();
    const url = new URL(base + endpoint, origin);
    url.searchParams.set("municipio", municipality);
    url.searchParams.set("sid", String(Math.random()));
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      signal: AbortSignal.timeout(30000),
    });
    if (response.status === 403 || response.status === 429) {
      throw new CollectionPaused(`HTTP ${response.status}: reabra a consulta antes de retomar.`);
    }
    const bytes = await response.arrayBuffer();
    const declaredCharset = response.headers.get("content-type")?.match(/charset=["']?([^;\s"']+)/i)?.[1];
    const metaCharset = new TextDecoder().decode(bytes.slice(0, 2048)).match(/charset=["']?([a-z0-9-]+)/i)?.[1];
    const html = new TextDecoder(declaredCharset || metaCharset || "utf-8").decode(bytes);
    if (/<title>\s*Just a moment|id=["'](?:challenge-form|cf-challenge-running)["']/i.test(html)) {
      throw new CollectionPaused("A ANEEL solicitou verificação no navegador. Reabra a consulta antes de repetir as falhas.");
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return new DOMParser().parseFromString(html, "text/html");
  }

  async function query(endpoint, municipality, parse) {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return parse(await request(endpoint, municipality, delayMs * 2 ** (attempt - 1)));
      } catch (error) {
        if (stopped) throw new CollectionStopped();
        if (error instanceof CollectionPaused || attempt === maxAttempts) throw error;
        console.warn(`${municipality}: tentativa ${attempt}/${maxAttempts} falhou; vou tentar novamente.`, error);
      }
    }
  }

  function municipalitiesOf(document) {
    const options = [...document.querySelectorAll('select[name="frmMunicipio"] option')];
    const municipalities = options
      .filter((option) => /^[0-9]{7}$/.test(option.value.trim()))
      .map((option) => ({ code: option.value.trim(), name: option.textContent.trim() }));
    if (!municipalities.length) throw new Error("Lista de municípios fora do formato esperado.");
    return municipalities;
  }

  function voltageRows(document, code, uf) {
    const entries = [...document.querySelectorAll('[id="distribuidora"], [id="resultado"]')];
    const rows = [];
    let distributor = "";
    for (const entry of entries) {
      if (entry.id === "distribuidora") {
        distributor = entry.textContent.trim();
        if (!distributor) throw new Error("Nome da distribuidora ausente na resposta.");
        continue;
      }
      const label = entry.querySelector("label")?.textContent.trim();
      const value = entry.querySelector("span")?.textContent.trim();
      const pair = value?.match(/^([1-9][0-9]*(?:[.,][0-9]+)?)\s*\/\s*([1-9][0-9]*(?:[.,][0-9]+)?)\s*(?:volts|V)$/i);
      if (!distributor || !/^Tensão Nominal\s+[0-9]+$/i.test(label || "") || !pair) {
        throw new Error("Tensão nominal fora do formato esperado.");
      }
      rows.push({ codigo_ibge: code, uf, distribuidora: distributor, tensao: `${pair[1]}/${pair[2]}`, status: "ok" });
    }
    if (rows.length) return rows;
    if (entries.length && distributor) {
      return [{ codigo_ibge: code, uf, status: "sem_tensao" }];
    }
    throw new Error("Resposta da ANEEL fora do formato esperado; não foi considerada ausência de tensão.");
  }

  function queryDate() {
    const queried = new Date();
    return [queried.getFullYear(), String(queried.getMonth() + 1).padStart(2, "0"), String(queried.getDate()).padStart(2, "0")].join("-");
  }

  function download() {
    const escape = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = Object.entries(checkpoint.municipalities).flatMap(([uf, municipalities]) =>
      municipalities.flatMap(({ code }) => checkpoint.rows[code] || [{
        codigo_ibge: code, uf, status: "falha", erro: "Consulta pendente: coleta interrompida antes deste município.",
      }]),
    ).sort((a, b) => a.codigo_ibge.localeCompare(b.codigo_ibge));
    const csv = [header, ...rows.map((row) => header.map((key) => row[key] || ""))]
      .map((row) => row.map(escape).join(",")).join("\r\n") + "\r\n";
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "tensoes.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function status() {
    const codes = Object.keys(checkpoint.rows);
    const failures = codes.filter((code) => checkpoint.rows[code][0].status === "falha");
    return { running, municipalities: codes.length, failures, failedStates: { ...checkpoint.failedStates } };
  }

  function recordFailure(error) {
    consecutiveFailures += 1;
    if (error instanceof CollectionPaused || consecutiveFailures >= maxConsecutiveFailures) {
      stopped = true;
      console.warn("Coleta pausada. Confira a página e os erros antes de usar aneelVoltages.resume().", error);
    }
  }

  async function collect() {
    if (running) throw new Error("Uma coleta já está em andamento.");
    running = true;
    stopped = false;
    consecutiveFailures = 0;
    try {
      for (const uf of states) {
        if (stopped) break;
        if (!checkpoint.municipalities[uf]) {
          try {
            checkpoint.municipalities[uf] = await query("dspMunicipios.cfm", uf, municipalitiesOf);
            delete checkpoint.failedStates[uf];
            consecutiveFailures = 0;
          } catch (error) {
            if (error instanceof CollectionStopped) break;
            checkpoint.failedStates[uf] = String(error.message || error);
            console.error(`Falha na lista de ${uf}:`, error);
            recordFailure(error);
          }
          save();
        }
        const municipalities = checkpoint.municipalities[uf] || [];
        for (const { code, name } of municipalities) {
          if (stopped) break;
          if (checkpoint.rows[code] && checkpoint.rows[code][0].status !== "falha") continue;
          try {
            const rows = await query("dspConcessionaria.cfm", code, (document) => voltageRows(document, code, uf));
            const queriedOn = queryDate();
            checkpoint.rows[code] = rows.map((row) => ({ ...row, consultado_em: queriedOn }));
            consecutiveFailures = 0;
          } catch (error) {
            if (error instanceof CollectionStopped) break;
            checkpoint.rows[code] = [{ codigo_ibge: code, uf, status: "falha", consultado_em: queryDate(), erro: String(error.message || error) }];
            console.error(`${uf} ${code} ${name}:`, error);
            recordFailure(error);
          }
          save();
          console.info(`${uf} ${code} ${name}: ${checkpoint.rows[code][0].status}`, status());
        }
      }
    } finally {
      running = false;
      console.info(stopped ? "Coleta interrompida; progresso salvo." : "Coleta concluída.", status());
      if (Object.keys(checkpoint.failedStates).length) {
        console.warn("Há UFs sem lista de municípios; o CSV está incompleto. Use aneelVoltages.retryFailures().");
      }
      download();
    }
  }

  window.aneelVoltages = {
    resume: collect,
    retryFailures: collect,
    downloadCSV: download,
    stop: () => { stopped = true; },
    status: status,
  };
  await collect();
})();
