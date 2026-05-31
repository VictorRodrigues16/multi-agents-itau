#!/usr/bin/env node
/**
 * gerar-relatorio-pdf.js
 *
 * Recebe um JSON com os dados de uma execucao de tarefa e gera um PDF
 * com identidade visual do Itau.
 *
 * Uso:
 *   node gerar-relatorio-pdf.js --dados <path-json> --saida <path-pdf>
 *
 * Dependencias:
 *   - puppeteer (instalado via scripts/init.sh)
 *
 * O HTML intermediario fica em relatorios/.tmp/{TASK-XXX}.html para debug.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--dados') args.dados = argv[++i];
    else if (argv[i] === '--saida') args.saida = argv[++i];
    else if (argv[i] === '--html-only') args.htmlOnly = true;
  }
  if (!args.dados || !args.saida) {
    console.error('Uso: node gerar-relatorio-pdf.js --dados <json> --saida <pdf>');
    process.exit(1);
  }
  return args;
}

function lerDados(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function badge(texto, tipo) {
  const cores = {
    pass: { bg: '#E8F5EE', fg: '#1B6F4E', border: '#2D9D78' },
    warn: { bg: '#FEF5E5', fg: '#8A5A0F', border: '#F5A623' },
    fail: { bg: '#FBEAEA', fg: '#8C1F1F', border: '#D32F2F' },
    info: { bg: '#FFF4EC', fg: '#8C4400', border: '#EC7000' },
    neutro: { bg: '#F5F5F5', fg: '#404040', border: '#D4D4D4' }
  };
  const c = cores[tipo] || cores.neutro;
  return `<span class="badge" style="background:${c.bg};color:${c.fg};border-color:${c.border}">${escapeHtml(texto)}</span>`;
}

function veredictoTipo(v) {
  if (!v) return 'neutro';
  const u = v.toUpperCase();
  if (u.includes('PASS') || u.includes('APROVADO') || u === 'OK') return 'pass';
  if (u.includes('WARN') || u.includes('NOTA') || u.includes('SUGESTOES')) return 'warn';
  if (u.includes('FAIL') || u.includes('BLOQUEANTE') || u.includes('DEVOLVER') || u.includes('REPROVADO')) return 'fail';
  return 'info';
}

function lerLogoComoImg(opts = {}) {
  // A logo canonica fica em brand/logo.png
  // O PDF gera HTML standalone, entao convertemos pra data URI base64
  const logoPath = path.join(__dirname, '..', 'brand', 'logo.png');
  const { className = '', alt = 'Itau' } = opts;
  try {
    if (!fs.existsSync(logoPath)) return '';
    const buffer = fs.readFileSync(logoPath);
    const base64 = buffer.toString('base64');
    return `<img src="data:image/png;base64,${base64}" alt="${alt}" class="${className}"/>`;
  } catch (err) {
    return '';
  }
}

function lerLogo() {
  return lerLogoComoImg({ className: 'logo-img', alt: 'Itau' });
}

function lerLogoBranco() {
  // Mesma logo no rodape (em fundo claro)
  return lerLogoComoImg({ className: 'logo-img-rodape', alt: 'Itau' });
}

function renderCapa(dados, logoSvg) {
  return `
  <section class="capa">
    <div class="capa-logo">${logoSvg}</div>
    <div class="capa-marca">itau</div>
    <h1 class="capa-titulo">Relatorio de Execucao</h1>
    <div class="capa-subtitulo">agent-itau &middot; squad virtual de engenharia</div>
    <div class="capa-tarefa">
      <div class="capa-tarefa-id">${escapeHtml(dados.task_id || 'TASK-?')}</div>
      <div class="capa-tarefa-titulo">${escapeHtml(dados.titulo_curto || 'Sem titulo')}</div>
    </div>
    <div class="capa-meta">
      <div><span class="capa-meta-label">Autor</span>${escapeHtml(dados.autor || 'Time Itau')}</div>
      <div><span class="capa-meta-label">Data</span>${escapeHtml(dados.data_geracao || new Date().toISOString().slice(0, 10))}</div>
    </div>
    <div class="capa-tags">
      ${badge(dados.tipo || '—', 'info')}
      ${badge('Complexidade ' + (dados.complexidade || '—'), 'neutro')}
      ${badge('Risco ' + (dados.risco || '—'), 'neutro')}
    </div>
  </section>
  <div class="page-break"></div>`;
}

function renderSumarioExecutivo(dados) {
  const t = dados.testes || {};
  return `
  <section class="secao">
    <div class="secao-numero">01</div>
    <h2 class="secao-titulo">Sumario executivo</h2>
    <p class="secao-paragrafo">${escapeHtml(dados.sumario_executivo || 'Sem sumario disponivel.')}</p>
    <table class="tabela tabela-mini">
      <tr>
        <td class="label">Veredicto</td>
        <td>${badge(t.veredicto || 'N/A', veredictoTipo(t.veredicto))}</td>
        <td class="label">Nota global</td>
        <td class="valor-destaque">${t.nota_global != null ? t.nota_global + '/100' : '—'}</td>
      </tr>
      <tr>
        <td class="label">Tipo</td>
        <td>${escapeHtml(dados.tipo || '—')}</td>
        <td class="label">Complexidade</td>
        <td>${escapeHtml(dados.complexidade || '—')}</td>
      </tr>
      <tr>
        <td class="label">Devs envolvidos</td>
        <td>${(dados.devs || []).length}</td>
        <td class="label">Subtarefas</td>
        <td>${(dados.devs || []).length}</td>
      </tr>
      <tr>
        <td class="label">Reviews realizados</td>
        <td>${(dados.reviews || []).length}</td>
        <td class="label">Risco</td>
        <td>${escapeHtml(dados.risco || '—')}</td>
      </tr>
    </table>
  </section>`;
}

function renderTarefaOriginal(dados) {
  return `
  <section class="secao">
    <div class="secao-numero">02</div>
    <h2 class="secao-titulo">A tarefa recebida</h2>
    <blockquote class="tarefa-original">${escapeHtml(dados.tarefa_original || 'Sem descricao.').replace(/\n/g, '<br/>')}</blockquote>
  </section>`;
}

function renderOrquestrador(dados) {
  const orq = dados.orquestrador || {};
  const riscos = (orq.riscos || []).map(r => `<li>${escapeHtml(r)}</li>`).join('') || '<li class="vazio">Nenhum risco registrado</li>';
  return `
  <section class="secao">
    <div class="secao-numero">03</div>
    <h2 class="secao-titulo">Decisoes do Orquestrador</h2>
    <h3>Plano apresentado</h3>
    <div class="bloco-texto">${escapeHtml(orq.plano || 'Sem plano registrado.').replace(/\n/g, '<br/>')}</div>
    <h3>Estrategia de execucao</h3>
    <div class="bloco-texto">${escapeHtml(orq.estrategia || '—').replace(/\n/g, '<br/>')}</div>
    <h3>Riscos identificados</h3>
    <ul class="lista">${riscos}</ul>
  </section>`;
}

function renderDevs(dados) {
  const devs = dados.devs || [];
  if (devs.length === 0) {
    return `<section class="secao"><div class="secao-numero">04</div><h2 class="secao-titulo">Desenvolvimento</h2><p class="vazio">Nenhum dev acionado.</p></section>`;
  }

  const cards = devs.map(d => {
    const arquivosCriados = (d.arquivos_criados || []).map(a => `<li>${escapeHtml(a)}</li>`).join('') || '<li class="vazio">—</li>';
    const arquivosModif = (d.arquivos_modificados || []).map(a => `<li>${escapeHtml(a)}</li>`).join('') || '<li class="vazio">—</li>';
    const decisoes = (d.decisoes || []).map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li class="vazio">—</li>';
    const codigo = d.codigo_destaque
      ? `<div class="codigo-wrapper">
          <div class="codigo-header">${escapeHtml(d.codigo_destaque.arquivo)} <span class="codigo-lang">${escapeHtml(d.codigo_destaque.linguagem || '')}</span></div>
          <pre class="codigo"><code>${escapeHtml(d.codigo_destaque.trecho)}</code></pre>
        </div>`
      : '';
    const testes = d.testes
      ? `<div class="testes-dev"><strong>Testes:</strong> ${escapeHtml(d.testes.total || '—')} testes, cenarios: ${escapeHtml((d.testes.cenarios || []).join(', '))}</div>`
      : '';

    return `
      <div class="card-dev">
        <div class="card-dev-header">
          <span class="dev-id">${escapeHtml(d.id || 'dev-?')}</span>
          <span class="dev-subtarefa">${escapeHtml(d.subtarefa || 'ST-?')}</span>
          ${d.commit_hash ? `<span class="dev-commit">${escapeHtml(d.commit_hash.slice(0,8))}</span>` : ''}
        </div>
        <p class="dev-descricao">${escapeHtml(d.descricao || '')}</p>
        <div class="dev-grid">
          <div>
            <h4>Arquivos criados</h4>
            <ul class="lista">${arquivosCriados}</ul>
          </div>
          <div>
            <h4>Arquivos modificados</h4>
            <ul class="lista">${arquivosModif}</ul>
          </div>
        </div>
        <h4>Decisoes tomadas</h4>
        <ul class="lista">${decisoes}</ul>
        ${codigo}
        ${testes}
      </div>`;
  }).join('');

  return `
  <section class="secao">
    <div class="secao-numero">04</div>
    <h2 class="secao-titulo">Desenvolvimento</h2>
    <p class="secao-paragrafo">${devs.length} desenvolvedor(es) trabalhando em paralelo em worktrees isolados.</p>
    ${cards}
  </section>`;
}

function renderReviews(dados) {
  const reviews = dados.reviews || [];
  if (reviews.length === 0) {
    return `<section class="secao"><div class="secao-numero">05</div><h2 class="secao-titulo">Review cruzado</h2><p class="vazio">Sem reviews registrados.</p></section>`;
  }

  // Mapa de quem revisou quem
  const mapa = {};
  reviews.forEach(r => {
    if (!mapa[r.revisado]) mapa[r.revisado] = [];
    mapa[r.revisado].push(r.revisor);
  });

  const linhasMapa = Object.entries(mapa).map(([revisado, revisores]) =>
    `<tr><td><strong>${escapeHtml(revisado)}</strong></td><td>${revisores.map(r => escapeHtml(r)).join(', ')}</td></tr>`
  ).join('');

  const cards = reviews.map(r => {
    const positivos = (r.pontos_positivos || []).map(p => `<li>${escapeHtml(p)}</li>`).join('') || '<li class="vazio">—</li>';
    const issuesRows = (r.issues || []).map(i =>
      `<tr>
        <td>${escapeHtml(i.arquivo || '')}${i.linha ? ':' + i.linha : ''}</td>
        <td>${badge(i.severidade || 'sugestao', i.severidade === 'bloqueante' ? 'fail' : i.severidade === 'importante' ? 'warn' : 'neutro')}</td>
        <td>${escapeHtml(i.descricao || '')}</td>
        <td>${escapeHtml(i.correcao || '—')}</td>
      </tr>`
    ).join('');
    const issuesTable = (r.issues || []).length > 0
      ? `<table class="tabela">
          <thead><tr><th>Arquivo</th><th>Severidade</th><th>Descricao</th><th>Correcao</th></tr></thead>
          <tbody>${issuesRows}</tbody>
        </table>`
      : '<p class="vazio">Nenhuma issue.</p>';

    return `
      <div class="card-review">
        <div class="card-review-header">
          <strong>${escapeHtml(r.revisor)}</strong> revisando <strong>${escapeHtml(r.revisado)}</strong>
          <span class="review-veredicto">${badge(r.veredicto || '—', veredictoTipo(r.veredicto))}</span>
        </div>
        <h4>Pontos positivos</h4>
        <ul class="lista">${positivos}</ul>
        <h4>Issues</h4>
        ${issuesTable}
      </div>`;
  }).join('');

  return `
  <section class="secao">
    <div class="secao-numero">05</div>
    <h2 class="secao-titulo">Review cruzado por sorteio</h2>
    <p class="secao-paragrafo">Para cada desenvolvedor, foram sorteados 2 colegas para revisar o trabalho.</p>
    <h3>Mapeamento do sorteio</h3>
    <table class="tabela">
      <thead><tr><th>Revisado</th><th>Revisores sorteados</th></tr></thead>
      <tbody>${linhasMapa}</tbody>
    </table>
    <h3>Reviews realizados</h3>
    ${cards}
  </section>`;
}

function renderEsteiraTestes(dados) {
  const t = dados.testes || {};
  function renderFrente(nome, dadosFrente, ordem) {
    if (!dadosFrente || dadosFrente.executado === false) {
      return `
        <div class="card-teste">
          <div class="card-teste-header">
            <span class="card-teste-numero">${ordem}</span>
            <h3>${escapeHtml(nome)}</h3>
            <span>${badge('N/A', 'neutro')}</span>
          </div>
          <p class="vazio">Frente nao executada nesta tarefa.</p>
        </div>`;
    }
    const bloqueantes = (dadosFrente.bloqueantes || []).map(b => `<li>${escapeHtml(b)}</li>`).join('');
    const importantes = (dadosFrente.importantes || []).map(b => `<li>${escapeHtml(b)}</li>`).join('');
    const sugestoes = (dadosFrente.sugestoes || []).map(b => `<li>${escapeHtml(b)}</li>`).join('');
    return `
      <div class="card-teste">
        <div class="card-teste-header">
          <span class="card-teste-numero">${ordem}</span>
          <h3>${escapeHtml(nome)}</h3>
          <span>${badge(dadosFrente.veredicto || '—', veredictoTipo(dadosFrente.veredicto))}</span>
          <span class="score-grande">${dadosFrente.score != null ? dadosFrente.score + '/100' : '—'}</span>
        </div>
        ${dadosFrente.resumo ? `<p>${escapeHtml(dadosFrente.resumo)}</p>` : ''}
        ${bloqueantes ? `<h4 class="header-bloq">Bloqueios</h4><ul class="lista">${bloqueantes}</ul>` : ''}
        ${importantes ? `<h4 class="header-imp">Importantes</h4><ul class="lista">${importantes}</ul>` : ''}
        ${sugestoes ? `<h4 class="header-sug">Sugestoes</h4><ul class="lista">${sugestoes}</ul>` : ''}
      </div>`;
  }

  // Testes gerados (trechos)
  const testesGerados = (t.testes_gerados || []).map(tg =>
    `<div class="codigo-wrapper">
      <div class="codigo-header">${escapeHtml(tg.arquivo)} <span class="codigo-lang">${escapeHtml(tg.tipo || 'unitario')}</span></div>
      <pre class="codigo"><code>${escapeHtml(tg.trecho || '')}</code></pre>
    </div>`
  ).join('');

  return `
  <section class="secao">
    <div class="secao-numero">06</div>
    <h2 class="secao-titulo">Esteira de testes</h2>
    <div class="esteira-summary">
      <div class="esteira-nota">
        <div class="esteira-nota-numero">${t.nota_global != null ? t.nota_global : '—'}</div>
        <div class="esteira-nota-label">Nota global Itau</div>
      </div>
      <div class="esteira-veredicto">${badge(t.veredicto || '—', veredictoTipo(t.veredicto))}</div>
    </div>
    ${renderFrente('Quality Gate', t.quality_gate, '6.1')}
    ${renderFrente('Cobertura de testes', t.cobertura, '6.2')}
    ${renderFrente('Seguranca', t.seguranca, '6.3')}
    ${renderFrente('Performance', t.performance, '6.4')}
    ${testesGerados ? `<h3>Trechos dos testes gerados</h3>${testesGerados}` : ''}
  </section>`;
}

function renderTimeline(dados) {
  const eventos = dados.timeline || [];
  if (eventos.length === 0) return '';

  const linhas = eventos.map(e => `
    <div class="timeline-item">
      <div class="timeline-hora">${escapeHtml(e.hora || '')}</div>
      <div class="timeline-marker"></div>
      <div class="timeline-evento">${escapeHtml(e.evento || '')}</div>
    </div>`).join('');

  return `
  <section class="secao">
    <div class="secao-numero">07</div>
    <h2 class="secao-titulo">Linha do tempo</h2>
    <div class="timeline">${linhas}</div>
  </section>`;
}

function renderAnexos(dados) {
  const a = dados.anexos || {};
  const arquivos = (a.arquivos_modificados || []).map(x => `<li><code>${escapeHtml(x)}</code></li>`).join('') || '<li class="vazio">—</li>';
  const integracoes = (a.integracoes_usadas || []).map(x => `<li>${escapeHtml(x)}</li>`).join('') || '<li class="vazio">Nenhuma integracao ativa</li>';
  return `
  <section class="secao">
    <div class="secao-numero">08</div>
    <h2 class="secao-titulo">Anexos</h2>
    <h3>Arquivos modificados (consolidado)</h3>
    <ul class="lista">${arquivos}</ul>
    <h3>Integracoes utilizadas</h3>
    <ul class="lista">${integracoes}</ul>
  </section>`;
}

function renderRodape(logoBranco) {
  return `
  <footer class="rodape">
    <div class="rodape-logo">${logoBranco}</div>
    <div class="rodape-texto">
      <div>Relatorio gerado por <strong>agent-itau</strong></div>
      <div class="rodape-meta">Squad virtual de engenharia automatizado</div>
    </div>
  </footer>`;
}

function montarHtml(dados) {
  const logoSvg = lerLogo();
  const logoBranco = lerLogoBranco();

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Relatorio ${escapeHtml(dados.task_id || '')}</title>
  <style>
    :root {
      /* Laranja Itau */
      --itau-orange: #EC7000;
      --itau-orange-dark: #C75300;
      --itau-orange-vibrant: #FF8410;
      --itau-orange-soft: #FFB068;
      --itau-orange-light: #FFE8D2;
      --itau-orange-50: #FFF6EC;
      /* Azul institucional Itau */
      --itau-blue: #003C8F;
      --itau-blue-dark: #002A66;
      --itau-blue-light: #1E5BB8;
      --itau-blue-soft: #E5EEFA;
      /* Amarelo Itau */
      --itau-yellow: #F8C300;
      --itau-yellow-soft: #FFF4C2;
      /* Vermelho Itau */
      --itau-red: #DA3127;
      --itau-red-soft: #FBE3E1;
      /* Neutros quentes (bege institucional) */
      --bg-paper: #FBF6EE;
      --bg-warm: #F4ECE3;
      --bg-warm-deep: #E8DCC9;
      --itau-black: #1A1A1A;
      --itau-white: #FFFFFF;
      --gray-50: #F7F4EE;
      --gray-100: #EDE7DD;
      --gray-200: #D9CFC1;
      --gray-300: #B0A89A;
      --gray-500: #6E665A;
      --gray-700: #3D3830;
      /* Funcionais */
      --success: #2D9D78;
      --success-bg: #DCEDE3;
      --warning: #F8C300;
      --warning-bg: #FFF4C2;
      --error: #DA3127;
      --error-bg: #FBE3E1;
    }
    @page {
      size: A4;
      margin: 18mm 16mm 22mm 16mm;
      background: var(--bg-paper);
      @bottom-center {
        content: "agent-itau  |  pagina " counter(page) " de " counter(pages);
        font-family: 'Inter', sans-serif;
        font-size: 9pt;
        color: var(--gray-500);
      }
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: var(--itau-black);
      background: var(--bg-paper);
      font-size: 11pt;
      line-height: 1.55;
      margin: 0;
      padding: 0;
    }
    .page-break { page-break-after: always; }
    h1, h2, h3, h4 { color: var(--itau-black); margin-top: 0; }

    /* Capa — bloco solido laranja com texto branco */
    .capa {
      min-height: 240mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: left;
      padding: 32mm 24mm;
      background:
        radial-gradient(circle at 90% 10%, rgba(255, 132, 16, 0.45) 0%, transparent 50%),
        radial-gradient(circle at 10% 90%, rgba(0, 60, 143, 0.30) 0%, transparent 50%),
        linear-gradient(135deg, var(--itau-orange) 0%, var(--itau-orange-dark) 100%);
      color: var(--itau-white);
      position: relative;
      overflow: hidden;
    }
    .capa::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 12mm;
      background: var(--itau-black);
    }
    .capa-logo {
      background: var(--itau-white);
      width: 28mm;
      height: 28mm;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4mm;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
    }
    .capa-logo .logo-img { width: 100%; height: 100%; object-fit: contain; }
    .capa-marca {
      font-size: 12pt;
      color: rgba(255, 255, 255, 0.85);
      font-weight: 700;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      margin: 8mm 0 18mm 0;
    }
    .capa-titulo {
      font-size: 42pt;
      font-weight: 800;
      line-height: 1.05;
      margin: 0 0 4mm 0;
      color: var(--itau-white);
      letter-spacing: -0.02em;
    }
    .capa-subtitulo {
      font-size: 13pt;
      color: rgba(255, 255, 255, 0.80);
      margin-bottom: 18mm;
      font-weight: 500;
    }
    .capa-tarefa {
      background: rgba(255, 255, 255, 0.95);
      border-left: 6px solid var(--itau-yellow);
      border-radius: 6px;
      padding: 6mm 9mm;
      margin-bottom: 14mm;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    }
    .capa-tarefa-id {
      font-family: 'JetBrains Mono', monospace;
      color: var(--itau-orange-dark);
      font-size: 13pt;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .capa-tarefa-titulo {
      font-size: 18pt;
      font-weight: 700;
      margin-top: 2mm;
      color: var(--itau-black);
    }
    .capa-meta {
      display: flex;
      gap: 14mm;
      margin-bottom: 8mm;
      font-size: 11pt;
      color: var(--itau-white);
    }
    .capa-meta-label {
      display: block;
      font-size: 9pt;
      color: rgba(255, 255, 255, 0.65);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-bottom: 1.5mm;
      font-weight: 600;
    }
    .capa-tags { display: flex; gap: 4mm; flex-wrap: wrap; }
    .capa .badge {
      background: rgba(255, 255, 255, 0.20);
      color: var(--itau-white);
      border-color: rgba(255, 255, 255, 0.40);
      backdrop-filter: blur(8px);
    }

    /* Secoes — cada uma com identidade visual forte */
    .secao {
      padding: 10mm 0 6mm 0;
      position: relative;
      page-break-inside: avoid;
    }
    .secao + .secao { margin-top: 6mm; }
    .secao-numero {
      position: absolute;
      top: 6mm;
      right: 0;
      font-family: 'JetBrains Mono', monospace;
      color: var(--itau-orange);
      font-size: 42pt;
      font-weight: 800;
      opacity: 0.18;
      line-height: 1;
      letter-spacing: -0.03em;
    }
    .secao-titulo {
      font-size: 22pt;
      font-weight: 800;
      padding: 3mm 6mm 3mm 6mm;
      background: var(--itau-orange);
      color: var(--itau-white);
      display: inline-block;
      margin-bottom: 8mm;
      border-radius: 0 8px 8px 0;
      margin-left: -16mm;
      padding-left: 16mm;
      box-shadow: 0 4px 12px rgba(236, 112, 0, 0.30);
      letter-spacing: -0.01em;
    }
    .secao-paragrafo {
      color: var(--gray-700);
      margin-bottom: 5mm;
      font-size: 11pt;
    }
    .secao h3 {
      color: var(--itau-orange-dark);
      font-size: 13pt;
      margin: 6mm 0 2mm 0;
      font-weight: 700;
      padding-left: 4mm;
      border-left: 4px solid var(--itau-orange);
    }
    .secao h4 {
      color: var(--itau-blue);
      font-size: 11pt;
      margin: 4mm 0 1mm 0;
      font-weight: 600;
    }
    .vazio { color: var(--gray-500); font-style: italic; }

    /* Tabelas — header laranja vibrante */
    .tabela {
      width: 100%;
      border-collapse: collapse;
      margin: 3mm 0;
      font-size: 10pt;
      background: var(--itau-white);
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(26, 26, 26, 0.06);
    }
    .tabela th {
      background: var(--itau-orange);
      color: var(--itau-white);
      text-align: left;
      padding: 2.5mm 3.5mm;
      font-weight: 700;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .tabela td {
      padding: 2.5mm 3.5mm;
      border-bottom: 1px solid var(--bg-warm);
      vertical-align: top;
    }
    .tabela tr:nth-child(even) td { background: var(--bg-warm); }
    .tabela-mini td.label {
      font-weight: 600;
      color: var(--gray-500);
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      width: 25%;
    }
    .valor-destaque {
      font-size: 16pt;
      font-weight: 800;
      color: var(--itau-orange-dark);
    }

    /* Tabela mini (sumario executivo) — fundo azul Itau */
    .tabela-mini {
      background: var(--itau-blue);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 6px 16px rgba(0, 60, 143, 0.25);
    }
    .tabela-mini td {
      background: transparent !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.10) !important;
      color: var(--itau-white);
      padding: 3mm 4mm;
    }
    .tabela-mini td.label {
      color: rgba(255, 255, 255, 0.65) !important;
    }
    .tabela-mini .valor-destaque { color: var(--itau-yellow); }
    .tabela-mini .badge {
      background: rgba(255, 255, 255, 0.18) !important;
      color: var(--itau-white) !important;
      border-color: rgba(255, 255, 255, 0.40) !important;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 1.5mm 3.5mm;
      border-radius: 999px;
      font-size: 9pt;
      font-weight: 700;
      border: 1px solid;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* Blockquote (tarefa original) — bege quente */
    .tarefa-original {
      background: var(--bg-warm);
      border-left: 6px solid var(--itau-orange);
      padding: 6mm 8mm;
      margin: 4mm 0;
      color: var(--gray-700);
      font-size: 11pt;
      line-height: 1.65;
      border-radius: 0 8px 8px 0;
      box-shadow: 0 2px 8px rgba(26, 26, 26, 0.06);
    }

    .bloco-texto {
      background: var(--bg-warm);
      padding: 5mm 6mm;
      border-radius: 6px;
      margin: 2mm 0 4mm 0;
      font-size: 11pt;
      color: var(--gray-700);
      border-left: 3px solid var(--itau-orange-soft);
    }

    /* Listas */
    .lista {
      padding-left: 5mm;
      margin: 1mm 0 3mm 0;
    }
    .lista li { margin-bottom: 1.5mm; font-size: 10.5pt; }
    .lista li::marker { color: var(--itau-orange); }

    /* Cards de dev — header laranja em gradient, body branco */
    .card-dev {
      border-radius: 10px;
      margin: 5mm 0;
      page-break-inside: avoid;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(26, 26, 26, 0.10);
      background: var(--itau-white);
    }
    .card-dev-header {
      display: flex;
      gap: 4mm;
      align-items: center;
      padding: 4mm 6mm;
      background: linear-gradient(90deg, var(--itau-orange) 0%, var(--itau-orange-vibrant) 100%);
      color: var(--itau-white);
      margin-bottom: 0;
    }
    .card-dev > *:not(.card-dev-header) {
      padding-left: 6mm;
      padding-right: 6mm;
    }
    .card-dev > .dev-descricao { padding-top: 4mm; }
    .card-dev > .codigo-wrapper { margin-left: 6mm; margin-right: 6mm; padding-left: 0; padding-right: 0; }
    .card-dev > .testes-dev { margin: 0 6mm 4mm 6mm; padding-left: 5mm; padding-right: 5mm; }
    .card-dev > h4:first-of-type { padding-top: 3mm; }
    .card-dev > ul:last-of-type { padding-bottom: 4mm; }
    .dev-id {
      background: rgba(255, 255, 255, 0.25);
      color: var(--itau-white);
      font-family: 'JetBrains Mono', monospace;
      padding: 1.5mm 4mm;
      border-radius: 4px;
      font-size: 11pt;
      font-weight: 700;
      border: 1px solid rgba(255, 255, 255, 0.35);
    }
    .dev-subtarefa {
      font-family: 'JetBrains Mono', monospace;
      color: var(--itau-white);
      font-size: 10pt;
      background: rgba(0, 0, 0, 0.20);
      padding: 1.5mm 4mm;
      border-radius: 4px;
      font-weight: 600;
    }
    .dev-commit {
      font-family: 'JetBrains Mono', monospace;
      color: rgba(255, 255, 255, 0.90);
      font-size: 9pt;
      margin-left: auto;
      background: rgba(0, 0, 0, 0.25);
      padding: 1mm 3mm;
      border-radius: 3px;
    }
    .dev-descricao {
      font-size: 11.5pt;
      margin: 0 0 3mm 0;
      color: var(--gray-700);
      font-weight: 500;
    }
    .dev-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5mm;
      margin: 2mm 0;
    }
    .testes-dev {
      background: var(--itau-yellow-soft);
      padding: 3mm 5mm;
      border-radius: 6px;
      margin-top: 3mm;
      font-size: 10.5pt;
      border-left: 3px solid var(--itau-yellow);
      color: var(--gray-700);
    }

    /* Codigo */
    .codigo-wrapper {
      margin: 3mm 0;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid var(--gray-200);
    }
    .codigo-header {
      background: var(--itau-black);
      color: var(--itau-white);
      padding: 2mm 4mm;
      font-family: 'JetBrains Mono', monospace;
      font-size: 9.5pt;
      display: flex;
      align-items: center;
    }
    .codigo-lang {
      margin-left: auto;
      background: var(--itau-orange);
      padding: 0.5mm 2mm;
      border-radius: 3px;
      font-size: 8.5pt;
      text-transform: uppercase;
    }
    pre.codigo {
      background: #1F1F1F;
      color: #E5E5E5;
      padding: 4mm 5mm;
      margin: 0;
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      font-size: 8.5pt;
      line-height: 1.55;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Reviews — cards bege com borda colorida */
    .card-review {
      border-left: 4px solid var(--itau-blue-light);
      border-radius: 0 8px 8px 0;
      padding: 5mm 6mm;
      margin: 4mm 0;
      page-break-inside: avoid;
      background: var(--bg-warm);
      box-shadow: 0 2px 6px rgba(26, 26, 26, 0.06);
    }
    .card-review-header {
      display: flex;
      align-items: center;
      gap: 4mm;
      margin-bottom: 3mm;
      font-size: 11pt;
      color: var(--gray-700);
    }
    .card-review-header strong { color: var(--itau-blue); font-weight: 700; }
    .review-veredicto { margin-left: auto; }

    /* Esteira de testes — destaque dramatico com gradient */
    .esteira-summary {
      display: flex;
      gap: 10mm;
      align-items: center;
      background: linear-gradient(135deg, var(--itau-orange-dark) 0%, var(--itau-orange) 100%);
      padding: 8mm 10mm;
      border-radius: 12px;
      margin: 3mm 0 8mm 0;
      box-shadow: 0 8px 24px rgba(236, 112, 0, 0.30);
      color: var(--itau-white);
    }
    .esteira-nota {
      background: rgba(0, 0, 0, 0.20);
      border-radius: 10px;
      padding: 6mm 10mm;
      min-width: 50mm;
      text-align: center;
    }
    .esteira-nota-numero {
      font-size: 48pt;
      font-weight: 800;
      color: var(--itau-yellow);
      line-height: 1;
      letter-spacing: -0.03em;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.30);
    }
    .esteira-nota-label {
      font-size: 10pt;
      color: rgba(255, 255, 255, 0.90);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 2mm;
      font-weight: 600;
    }
    .esteira-veredicto .badge {
      background: rgba(255, 255, 255, 0.25) !important;
      color: var(--itau-white) !important;
      border-color: rgba(255, 255, 255, 0.50) !important;
      font-size: 11pt !important;
      padding: 2mm 5mm !important;
    }

    .card-teste {
      border-radius: 10px;
      padding: 5mm 6mm;
      margin: 4mm 0;
      page-break-inside: avoid;
      background: var(--itau-white);
      box-shadow: 0 2px 8px rgba(26, 26, 26, 0.08);
      border-top: 4px solid var(--itau-blue-light);
    }
    .card-teste-header {
      display: flex;
      align-items: center;
      gap: 4mm;
      margin-bottom: 4mm;
      flex-wrap: wrap;
      padding-bottom: 3mm;
      border-bottom: 1px solid var(--bg-warm-deep);
    }
    .card-teste-numero {
      font-family: 'JetBrains Mono', monospace;
      color: var(--itau-white);
      background: var(--itau-blue);
      padding: 1.5mm 3mm;
      border-radius: 4px;
      font-weight: 700;
      font-size: 10pt;
    }
    .card-teste h3 {
      margin: 0 !important;
      flex: 1;
      font-size: 14pt !important;
      padding-left: 0 !important;
      border-left: none !important;
      color: var(--itau-black) !important;
    }
    .score-grande {
      margin-left: auto;
      font-size: 18pt;
      font-weight: 800;
      color: var(--itau-orange-dark);
      font-family: 'JetBrains Mono', monospace;
      background: var(--itau-orange-light);
      padding: 1.5mm 4mm;
      border-radius: 6px;
    }
    .header-bloq {
      color: var(--itau-white) !important;
      background: var(--itau-red);
      padding: 1.5mm 4mm;
      border-radius: 4px;
      display: inline-block !important;
      margin-top: 3mm !important;
      font-size: 10pt !important;
      letter-spacing: 0.04em;
    }
    .header-imp {
      color: var(--itau-black) !important;
      background: var(--itau-yellow);
      padding: 1.5mm 4mm;
      border-radius: 4px;
      display: inline-block !important;
      margin-top: 3mm !important;
      font-size: 10pt !important;
      letter-spacing: 0.04em;
    }
    .header-sug {
      color: var(--itau-white) !important;
      background: var(--gray-500);
      padding: 1.5mm 4mm;
      border-radius: 4px;
      display: inline-block !important;
      margin-top: 3mm !important;
      font-size: 10pt !important;
      letter-spacing: 0.04em;
    }

    /* Timeline — linha vibrante laranja com marcadores destacados */
    .timeline {
      position: relative;
      padding-left: 30mm;
      margin: 4mm 0;
      background: var(--bg-warm);
      padding-top: 5mm;
      padding-bottom: 5mm;
      padding-right: 5mm;
      border-radius: 8px;
    }
    .timeline::before {
      content: '';
      position: absolute;
      left: 22mm;
      top: 6mm;
      bottom: 6mm;
      width: 3px;
      background: linear-gradient(180deg, var(--itau-orange) 0%, var(--itau-orange-dark) 100%);
      border-radius: 2px;
    }
    .timeline-item {
      position: relative;
      margin-bottom: 4mm;
      page-break-inside: avoid;
    }
    .timeline-hora {
      position: absolute;
      left: -28mm;
      width: 18mm;
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      color: var(--itau-orange-dark);
      font-weight: 700;
      font-size: 10pt;
      background: var(--itau-white);
      padding: 0.5mm 2mm;
      border-radius: 3px;
    }
    .timeline-marker {
      position: absolute;
      left: -9mm;
      top: 1.5mm;
      width: 5mm;
      height: 5mm;
      border-radius: 50%;
      background: var(--itau-orange);
      border: 3px solid var(--bg-warm);
      box-shadow: 0 0 0 2px var(--itau-orange-dark);
    }
    .timeline-evento {
      font-size: 11pt;
      color: var(--gray-700);
      background: var(--itau-white);
      padding: 2mm 4mm;
      border-radius: 6px;
      border-left: 3px solid var(--itau-orange-soft);
      margin-left: 2mm;
    }

    /* Rodape — faixa laranja */
    .rodape {
      margin-top: 14mm;
      padding: 6mm 8mm;
      background: linear-gradient(90deg, var(--itau-orange) 0%, var(--itau-orange-dark) 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 5mm;
      color: var(--itau-white);
      font-size: 10pt;
      box-shadow: 0 4px 12px rgba(236, 112, 0, 0.25);
    }
    .rodape-logo {
      background: var(--itau-white);
      width: 14mm;
      height: 14mm;
      border-radius: 6px;
      padding: 2mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .rodape-logo .logo-img-rodape { width: 100%; height: 100%; object-fit: contain; }
    .rodape-logo svg { width: 30px; height: 30px; }
    .rodape-meta { color: rgba(255, 255, 255, 0.80); font-size: 9pt; margin-top: 1mm; }
    .rodape-texto strong { color: var(--itau-yellow); }

    code {
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      font-size: 9.5pt;
      background: var(--itau-orange-light);
      padding: 0.5mm 2mm;
      border-radius: 3px;
      color: var(--itau-orange-dark);
      font-weight: 600;
    }
  </style>
</head>
<body>
  ${renderCapa(dados, logoSvg)}
  ${renderSumarioExecutivo(dados)}
  ${renderTarefaOriginal(dados)}
  ${renderOrquestrador(dados)}
  ${renderDevs(dados)}
  ${renderReviews(dados)}
  ${renderEsteiraTestes(dados)}
  ${renderTimeline(dados)}
  ${renderAnexos(dados)}
  ${renderRodape(logoBranco)}
</body>
</html>`;
}

async function gerarPDF(htmlPath, pdfPath) {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.error('\n[erro] puppeteer nao instalado.');
    console.error('Rode: bash scripts/init.sh\n');
    process.exit(2);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
    displayHeaderFooter: false
  });
  await browser.close();
}

async function main() {
  const args = parseArgs(process.argv);
  const dados = lerDados(args.dados);
  const html = montarHtml(dados);

  // Salva HTML intermediario para debug
  const saidaDir = path.dirname(path.resolve(args.saida));
  const tmpDir = path.join(saidaDir, '.tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const htmlPath = path.join(tmpDir, path.basename(args.saida, '.pdf') + '.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  if (args.htmlOnly) {
    console.log('HTML gerado em: ' + htmlPath);
    return;
  }

  if (!fs.existsSync(saidaDir)) fs.mkdirSync(saidaDir, { recursive: true });
  await gerarPDF(htmlPath, path.resolve(args.saida));

  const stat = fs.statSync(args.saida);
  console.log('PDF gerado: ' + args.saida);
  console.log('Tamanho: ' + (stat.size / 1024).toFixed(1) + ' KB');
  console.log('HTML intermediario: ' + htmlPath);
}

main().catch(err => {
  console.error('[erro]', err.message);
  process.exit(1);
});
