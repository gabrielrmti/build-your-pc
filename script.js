/* =========================================================
   TechBuild — lógica da página
   1. Acessibilidade (tema, fonte, contraste, leitura, animações)
   2. Catálogo de peças e montador com validação de compatibilidade
   3. Formulário de orçamento com validação e feedback
   ========================================================= */

"use strict";

/* ---------------------------------------------------------
   Utilitários
   --------------------------------------------------------- */
const $ = (seletor) => document.querySelector(seletor);
const $$ = (seletor) => document.querySelectorAll(seletor);

const formatarBRL = (valor) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// localStorage pode falhar (modo privado, bloqueio de cookies) — nunca quebra a página
const armazenamento = {
  ler(chave, padrao) {
    try {
      const valor = localStorage.getItem("techbuild:" + chave);
      return valor === null ? padrao : JSON.parse(valor);
    } catch {
      return padrao;
    }
  },
  salvar(chave, valor) {
    try {
      localStorage.setItem("techbuild:" + chave, JSON.stringify(valor));
    } catch {
      /* sem persistência, mas a página continua funcionando */
    }
  }
};

let temporizadorToast;
function mostrarToast(mensagem) {
  const toast = $("#toast");
  toast.textContent = mensagem;
  toast.classList.add("visivel");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => toast.classList.remove("visivel"), 2600);
}

/* =========================================================
   1. ACESSIBILIDADE
   ========================================================= */
const TAMANHOS_FONTE = [87.5, 100, 112.5, 125, 137.5, 150]; // % do tamanho base
const raiz = document.documentElement;

const preferencias = {
  tema: armazenamento.ler(
    "tema",
    window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"
  ),
  fonte: armazenamento.ler("fonte", 1), // índice em TAMANHOS_FONTE
  contraste: armazenamento.ler("contraste", false),
  leitura: armazenamento.ler("leitura", false),
  movimento: armazenamento.ler(
    "movimento",
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
};

function aplicarTema() {
  const claro = preferencias.tema === "light";
  raiz.dataset.theme = preferencias.tema;
  // O botão mostra para qual modo ele vai trocar
  $("#iconeTema").textContent = claro ? "🌙" : "☀️";
  $("#textoTema").textContent = claro ? "Modo escuro" : "Modo claro";
  $("#btnTema").setAttribute("aria-pressed", String(claro));
}

function aplicarFonte() {
  const indice = Math.min(Math.max(preferencias.fonte, 0), TAMANHOS_FONTE.length - 1);
  preferencias.fonte = indice;
  const tamanho = TAMANHOS_FONTE[indice];
  raiz.style.fontSize = tamanho + "%";
  $("#fonteValor").textContent = Math.round(tamanho) + "%";
  $("#fonteMenor").disabled = indice === 0;
  $("#fonteMaior").disabled = indice === TAMANHOS_FONTE.length - 1;
}

function aplicarAlternancia(chave, atributo, valorLigado, botaoId) {
  const ligado = preferencias[chave];
  if (ligado) raiz.setAttribute(atributo, valorLigado);
  else raiz.removeAttribute(atributo);
  $(botaoId).setAttribute("aria-pressed", String(ligado));
}

function aplicarPreferencias() {
  aplicarTema();
  aplicarFonte();
  aplicarAlternancia("contraste", "data-contraste", "alto", "#btnContraste");
  aplicarAlternancia("leitura", "data-leitura", "on", "#btnLeitura");
  aplicarAlternancia("movimento", "data-movimento", "reduzido", "#btnMovimento");
}

function iniciarAcessibilidade() {
  aplicarPreferencias();

  $("#btnTema").addEventListener("click", () => {
    preferencias.tema = preferencias.tema === "light" ? "dark" : "light";
    armazenamento.salvar("tema", preferencias.tema);
    aplicarTema();
    mostrarToast(preferencias.tema === "light" ? "Modo claro ativado" : "Modo escuro ativado");
  });

  const mudarFonte = (novoIndice) => {
    preferencias.fonte = novoIndice;
    aplicarFonte();
    armazenamento.salvar("fonte", preferencias.fonte);
  };
  $("#fonteMenor").addEventListener("click", () => mudarFonte(preferencias.fonte - 1));
  $("#fonteMaior").addEventListener("click", () => mudarFonte(preferencias.fonte + 1));
  $("#fonteReset").addEventListener("click", () => mudarFonte(1));

  const alternancias = [
    ["#btnContraste", "contraste", "data-contraste", "alto", "Alto contraste"],
    ["#btnLeitura", "leitura", "data-leitura", "on", "Leitura facilitada"],
    ["#btnMovimento", "movimento", "data-movimento", "reduzido", "Animações reduzidas"]
  ];
  alternancias.forEach(([botao, chave, atributo, valor, rotulo]) => {
    $(botao).addEventListener("click", () => {
      preferencias[chave] = !preferencias[chave];
      armazenamento.salvar(chave, preferencias[chave]);
      aplicarAlternancia(chave, atributo, valor, botao);
      mostrarToast(`${rotulo}: ${preferencias[chave] ? "ativado" : "desativado"}`);
    });
  });

  // Atalhos de teclado: Alt + "+" / Alt + "-" / Alt + 0 para o texto, Alt + T para o tema
  document.addEventListener("keydown", (e) => {
    if (!e.altKey) return;
    if (e.key === "+" || e.key === "=") { e.preventDefault(); $("#fonteMaior").click(); }
    else if (e.key === "-") { e.preventDefault(); $("#fonteMenor").click(); }
    else if (e.key === "0") { e.preventDefault(); $("#fonteReset").click(); }
    else if (e.key.toLowerCase() === "t") { e.preventDefault(); $("#btnTema").click(); }
  });
}

/* =========================================================
   2. CATÁLOGO E MONTADOR
   ========================================================= */

// Margem somada ao TDP de CPU + GPU (placa-mãe, memória, SSD, fans e picos de consumo)
const MARGEM_FONTE_W = 150;

// Links de busca das lojas pelo nome do produto (troque pela URL exata do anúncio, se quiser)
const LOJAS = {
  Kabum: (t) => `https://www.kabum.com.br/busca/${encodeURIComponent(t.trim().replace(/\s+/g, "-"))}`,
  Pichau: (t) => `https://www.pichau.com.br/search?q=${encodeURIComponent(t)}`,
  Terabyte: (t) => `https://www.terabyteshop.com.br/busca?str=${encodeURIComponent(t)}`
};

function criarPeca(id, nome, preco, loja, atributos = {}, busca = nome) {
  return { id, nome, preco, loja, linkCompra: LOJAS[loja](busca), ...atributos };
}

const catalogo = {
  processador: [
    criarPeca("cpu-r5-5600", "AMD Ryzen 5 5600", 650, "Kabum", { soquete: "AM4", tipoRam: "DDR4", tdpWatts: 65 }),
    criarPeca("cpu-i5-12400f", "Intel Core i5 12400F", 780, "Terabyte", { soquete: "LGA1700", tipoRam: "DDR4/DDR5", tdpWatts: 65 }),
    criarPeca("cpu-i5-14600k", "Intel Core i5 14600K", 1450, "Pichau", { soquete: "LGA1700", tipoRam: "DDR4/DDR5", tdpWatts: 125 }),
    criarPeca("cpu-r7-7800x3d", "AMD Ryzen 7 7800X3D", 2300, "Kabum", { soquete: "AM5", tipoRam: "DDR5", tdpWatts: 120 }),
    criarPeca("cpu-r9-7950x", "AMD Ryzen 9 7950X", 3200, "Terabyte", { soquete: "AM5", tipoRam: "DDR5", tdpWatts: 170 })
  ],
  placaMae: [
    criarPeca("mb-b550m", "Placa-mãe B550M", 620, "Pichau", { soquete: "AM4", tipoRam: "DDR4" }, "placa mae B550M"),
    criarPeca("mb-b660m", "Placa-mãe B660M DDR4", 700, "Kabum", { soquete: "LGA1700", tipoRam: "DDR4" }, "placa mae B660M DDR4"),
    criarPeca("mb-b760", "Placa-mãe B760 DDR5", 900, "Terabyte", { soquete: "LGA1700", tipoRam: "DDR5" }, "placa mae B760 DDR5"),
    criarPeca("mb-b650m", "Placa-mãe B650M", 1050, "Pichau", { soquete: "AM5", tipoRam: "DDR5" }, "placa mae B650M")
  ],
  ram: [
    criarPeca("ram-16-ddr4", "16 GB DDR4 3200 MHz", 260, "Kabum", { tipoRam: "DDR4" }, "memoria 16GB DDR4 3200"),
    criarPeca("ram-32-ddr4", "32 GB DDR4 3200 MHz", 480, "Pichau", { tipoRam: "DDR4" }, "memoria 32GB DDR4 3200"),
    criarPeca("ram-16-ddr5", "16 GB DDR5 5600 MHz", 380, "Terabyte", { tipoRam: "DDR5" }, "memoria 16GB DDR5 5600"),
    criarPeca("ram-32-ddr5", "32 GB DDR5 6000 MHz", 650, "Kabum", { tipoRam: "DDR5" }, "memoria 32GB DDR5 6000")
  ],
  gpu: [
    criarPeca("gpu-rx7600", "AMD Radeon RX 7600", 1700, "Pichau", { tdpWatts: 165 }, "RX 7600"),
    criarPeca("gpu-4060", "NVIDIA GeForce RTX 4060", 1950, "Kabum", { tdpWatts: 115 }, "RTX 4060"),
    criarPeca("gpu-4070s", "NVIDIA GeForce RTX 4070 Super", 3900, "Terabyte", { tdpWatts: 220 }, "RTX 4070 Super"),
    criarPeca("gpu-7900xtx", "AMD Radeon RX 7900 XTX", 6500, "Pichau", { tdpWatts: 355 }, "RX 7900 XTX")
  ],
  ssd: [
    criarPeca("ssd-500", "SSD 500 GB NVMe", 230, "Terabyte", {}, "SSD 500GB NVMe"),
    criarPeca("ssd-1tb", "SSD 1 TB NVMe", 380, "Kabum", {}, "SSD 1TB NVMe"),
    criarPeca("ssd-2tb", "SSD 2 TB NVMe", 750, "Pichau", {}, "SSD 2TB NVMe")
  ],
  fonte: [
    criarPeca("psu-500", "Fonte 500W 80 Plus Bronze", 300, "Pichau", { potenciaWatts: 500 }, "fonte 500W 80 plus bronze"),
    criarPeca("psu-650", "Fonte 650W 80 Plus Bronze", 400, "Kabum", { potenciaWatts: 650 }, "fonte 650W 80 plus bronze"),
    criarPeca("psu-750", "Fonte 750W 80 Plus Gold", 600, "Terabyte", { potenciaWatts: 750 }, "fonte 750W 80 plus gold"),
    criarPeca("psu-850", "Fonte 850W 80 Plus Gold", 780, "Pichau", { potenciaWatts: 850 }, "fonte 850W 80 plus gold")
  ]
};

const CATEGORIAS = {
  processador: "Processador",
  placaMae: "Placa-mãe",
  ram: "Memória RAM",
  gpu: "Placa de vídeo",
  ssd: "Armazenamento",
  fonte: "Fonte"
};

const PRESETS = {
  entrada: {
    nome: "Entrada",
    pecas: { processador: "cpu-r5-5600", placaMae: "mb-b550m", ram: "ram-16-ddr4", gpu: "gpu-4060", ssd: "ssd-500", fonte: "psu-500" }
  },
  equilibrada: {
    nome: "Equilibrada",
    pecas: { processador: "cpu-i5-14600k", placaMae: "mb-b760", ram: "ram-32-ddr5", gpu: "gpu-4070s", ssd: "ssd-1tb", fonte: "psu-650" }
  },
  entusiasta: {
    nome: "Entusiasta",
    pecas: { processador: "cpu-r7-7800x3d", placaMae: "mb-b650m", ram: "ram-32-ddr5", gpu: "gpu-7900xtx", ssd: "ssd-2tb", fonte: "psu-850" }
  }
};

function buscarPeca(categoria, id) {
  return catalogo[categoria].find((p) => p.id === id) || null;
}

function textoOpcao(item) {
  const detalhes = [item.soquete, item.tdpWatts && `${item.tdpWatts}W`].filter(Boolean);
  const sufixo = detalhes.length ? ` (${detalhes.join(", ")})` : "";
  return `${item.nome}${sufixo} — ${formatarBRL(item.preco)}`;
}

function popularSelects() {
  Object.keys(CATEGORIAS).forEach((categoria) => {
    const select = document.getElementById(categoria);
    catalogo[categoria].forEach((item) => {
      const opcao = document.createElement("option");
      opcao.value = item.id;
      opcao.textContent = textoOpcao(item);
      select.appendChild(opcao);
    });
  });
}

function obterBuild() {
  const build = {};
  Object.keys(CATEGORIAS).forEach((cat) => {
    const id = document.getElementById(cat).value;
    build[cat] = id ? buscarPeca(cat, id) : null;
  });
  return build;
}

function consumo(build) {
  const tdp = (build.processador?.tdpWatts || 0) + (build.gpu?.tdpWatts || 0);
  return { tdp, recomendado: tdp + MARGEM_FONTE_W };
}

/**
 * Retorna a lista de conflitos. Cada conflito informa a mensagem
 * e quais campos devem ser marcados como inválidos.
 */
function validarCompatibilidade(build) {
  const conflitos = [];
  const { processador: cpu, placaMae: placa, ram, fonte } = build;

  if (cpu && placa && cpu.soquete !== placa.soquete) {
    conflitos.push({
      campos: ["processador", "placaMae"],
      mensagem: `Soquete incompatível: o ${cpu.nome} usa ${cpu.soquete}, mas a ${placa.nome} é ${placa.soquete}.`
    });
  }

  if (ram && placa && ram.tipoRam !== placa.tipoRam) {
    conflitos.push({
      campos: ["ram", "placaMae"],
      mensagem: `Memória incompatível: a ${placa.nome} aceita apenas ${placa.tipoRam}, e a memória escolhida é ${ram.tipoRam}.`
    });
  } else if (ram && cpu && !placa && !cpu.tipoRam.includes(ram.tipoRam)) {
    conflitos.push({
      campos: ["ram", "processador"],
      mensagem: `Memória incompatível: o ${cpu.nome} trabalha com ${cpu.tipoRam}, e a memória escolhida é ${ram.tipoRam}.`
    });
  }

  if (fonte && (cpu || build.gpu)) {
    const { tdp, recomendado } = consumo(build);
    if (fonte.potenciaWatts < recomendado) {
      conflitos.push({
        campos: ["fonte"],
        mensagem: `Fonte insuficiente: CPU + GPU somam ${tdp}W; com ${MARGEM_FONTE_W}W de margem, o recomendado é ${recomendado}W ou mais, e a fonte tem ${fonte.potenciaWatts}W.`
      });
    }
  }

  return conflitos;
}

function atualizarCampos(build, conflitos) {
  Object.keys(CATEGORIAS).forEach((cat) => {
    const select = document.getElementById(cat);
    const msg = document.getElementById("msg-" + cat);
    const conflito = conflitos.find((c) => c.campos.includes(cat));
    const item = build[cat];

    select.closest(".campo").classList.toggle("campo-ok", Boolean(item) && !conflito);

    if (conflito) {
      select.setAttribute("aria-invalid", "true");
      msg.className = "campo-msg erro";
      msg.textContent = "⚠ " + conflito.mensagem.split(":")[0];
    } else {
      select.removeAttribute("aria-invalid");
      msg.className = "campo-msg info";
      msg.textContent = item ? detalheCampo(cat, item) : "";
    }
  });
}

function detalheCampo(categoria, item) {
  if (categoria === "processador") return `Soquete ${item.soquete} · memória ${item.tipoRam} · ${item.tdpWatts}W`;
  if (categoria === "placaMae") return `Soquete ${item.soquete} · memória ${item.tipoRam}`;
  if (categoria === "ram") return `Tipo ${item.tipoRam}`;
  if (categoria === "gpu") return `Consumo ~${item.tdpWatts}W`;
  if (categoria === "fonte") return `Potência ${item.potenciaWatts}W`;
  return `Vendido por ${item.loja}`;
}

function renderizarStatus(selecionadas, conflitos) {
  const status = $("#statusCompat");
  const faltando = Object.keys(CATEGORIAS).filter((c) => !selecionadas.includes(c));

  if (!selecionadas.length) {
    status.className = "status status-neutro";
    status.textContent = "Escolha os componentes para começar.";
  } else if (conflitos.length) {
    status.className = "status status-erro";
    status.innerHTML = `
      <strong>⚠ ${conflitos.length === 1 ? "1 problema de compatibilidade" : conflitos.length + " problemas de compatibilidade"}</strong>
      <ul>${conflitos.map((c) => `<li>${c.mensagem}</li>`).join("")}</ul>`;
  } else if (faltando.length) {
    status.className = "status status-aviso";
    status.innerHTML = `<strong>Quase lá!</strong> Até agora tudo é compatível. Falta escolher: ${faltando
      .map((c) => CATEGORIAS[c])
      .join(", ")}.`;
  } else {
    status.className = "status status-ok";
    status.textContent = "✓ Configuração completa e compatível!";
  }
}

function renderizarLista(build, selecionadas) {
  const lista = $("#listaResumo");
  lista.innerHTML = "";

  selecionadas.forEach((cat) => {
    const item = build[cat];
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="item-info">
        <span class="item-cat">${CATEGORIAS[cat]}</span>
        <span class="item-nome">${item.nome}</span>
        <a class="link-loja" href="${item.linkCompra}" target="_blank" rel="noopener noreferrer">
          Comprar na ${item.loja} ↗<span class="sr-only"> (abre em nova aba)</span>
        </a>
      </div>
      <span class="item-preco">${formatarBRL(item.preco)}</span>`;
    lista.appendChild(li);
  });
}

function renderizarConsumo(build) {
  const caixa = $("#consumo");
  const { tdp, recomendado } = consumo(build);

  if (!tdp) {
    caixa.hidden = true;
    return;
  }
  caixa.hidden = false;

  const barra = $("#medidorBarra");
  const medidor = $("#medidor");

  if (build.fonte) {
    const uso = Math.round((recomendado / build.fonte.potenciaWatts) * 100);
    $("#consumoTexto").textContent = `${recomendado}W de ${build.fonte.potenciaWatts}W (${uso}%)`;
    barra.style.width = Math.min(uso, 100) + "%";
    barra.className = "medidor-barra" + (uso > 100 ? " excedido" : uso > 85 ? " alto" : "");
    medidor.setAttribute("aria-valuenow", String(Math.min(uso, 100)));
    medidor.setAttribute("aria-valuetext", `${uso}% da fonte`);
  } else {
    $("#consumoTexto").textContent = `${recomendado}W recomendados`;
    barra.style.width = "0";
    barra.className = "medidor-barra";
    medidor.setAttribute("aria-valuenow", "0");
    medidor.setAttribute("aria-valuetext", "Fonte não selecionada");
  }
}

function atualizarMontador() {
  const build = obterBuild();
  const selecionadas = Object.keys(CATEGORIAS).filter((c) => build[c]);
  const conflitos = validarCompatibilidade(build);
  const total = selecionadas.reduce((soma, c) => soma + build[c].preco, 0);

  atualizarCampos(build, conflitos);
  renderizarStatus(selecionadas, conflitos);
  renderizarLista(build, selecionadas);
  renderizarConsumo(build);
  $("#total").textContent = formatarBRL(total);

  return { build, selecionadas, conflitos, total };
}

function limparMontador() {
  Object.keys(CATEGORIAS).forEach((cat) => (document.getElementById(cat).selectedIndex = 0));
  atualizarMontador();
  mostrarToast("Montagem limpa");
  $("#processador").focus();
}

function aplicarPreset(chave) {
  const preset = PRESETS[chave];
  if (!preset) return;
  Object.entries(preset.pecas).forEach(([cat, id]) => (document.getElementById(cat).value = id));
  atualizarMontador();
  mostrarToast(`Build "${preset.nome}" carregada`);
}

function iniciarMontador() {
  popularSelects();

  // Interação 1: resumo e validação em tempo real a cada mudança
  $("#formBuild").addEventListener("change", (e) => {
    if (e.target.matches("select[data-categoria]")) atualizarMontador();
  });

  // Interação 2: builds prontas
  $$("[data-preset]").forEach((botao) =>
    botao.addEventListener("click", () => aplicarPreset(botao.dataset.preset))
  );

  $("#btnLimpar").addEventListener("click", limparMontador);

  $("#btnIrOrcamento").addEventListener("click", () => {
    // Leva o foco ao primeiro campo do formulário depois da rolagem
    setTimeout(() => $("#nome").focus({ preventScroll: true }), 400);
  });

  atualizarMontador();
}

/* =========================================================
   3. FORMULÁRIO DE ORÇAMENTO
   ========================================================= */
const REGRAS = {
  nome(valor) {
    if (!valor.trim()) return "Informe seu nome.";
    if (valor.trim().length < 3) return "O nome precisa ter pelo menos 3 letras.";
    if (!/^[A-Za-zÀ-ÿ\s'.-]+$/.test(valor.trim())) return "Use apenas letras no nome.";
    return "";
  },
  email(valor) {
    if (!valor.trim()) return "Informe seu e-mail.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor.trim())) return "Digite um e-mail válido, como nome@exemplo.com.";
    return "";
  }
};

function validarCampo(id) {
  const campo = document.getElementById(id);
  const msg = document.getElementById("erro-" + id);
  const erro = REGRAS[id](campo.value);

  if (erro) {
    campo.setAttribute("aria-invalid", "true");
    msg.className = "campo-msg erro";
    msg.textContent = erro;
  } else {
    campo.removeAttribute("aria-invalid");
    msg.className = "campo-msg";
    msg.textContent = "";
  }
  return !erro;
}

function mostrarFeedback(tipo, html) {
  const caixa = $("#feedbackOrcamento");
  caixa.hidden = false;
  caixa.className = `status status-${tipo} campo-largo`;
  caixa.innerHTML = html;
}

function iniciarOrcamento() {
  const form = $("#formOrcamento");
  const mensagem = $("#mensagem");
  const contador = $("#contador");

  // Valida ao sair do campo e, depois do primeiro erro, enquanto digita
  Object.keys(REGRAS).forEach((id) => {
    const campo = document.getElementById(id);
    campo.addEventListener("blur", () => campo.value && validarCampo(id));
    campo.addEventListener("input", () => campo.hasAttribute("aria-invalid") && validarCampo(id));
  });

  mensagem.addEventListener("input", () => {
    const tamanho = mensagem.value.length;
    contador.textContent = `${tamanho} / ${mensagem.maxLength} caracteres`;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const validos = Object.keys(REGRAS).map(validarCampo);
    if (validos.includes(false)) {
      mostrarFeedback("erro", "<strong>Revise os campos destacados.</strong> Corrija as informações e envie de novo.");
      form.querySelector('[aria-invalid="true"]').focus();
      return;
    }

    const { selecionadas, conflitos, total } = atualizarMontador();
    const incluirBuild = $("#incluirBuild").checked;

    if (incluirBuild && !selecionadas.length) {
      mostrarFeedback("aviso", '<strong>Sua build está vazia.</strong> Escolha as peças no <a href="#montador">montador</a> ou desmarque a opção de incluir a build.');
      return;
    }

    const nome = $("#nome").value.trim().split(" ")[0];
    let detalhes = "";
    if (incluirBuild) {
      detalhes = ` Sua build com ${selecionadas.length} peça(s), no total de <strong>${formatarBRL(total)}</strong>, foi anexada.`;
      if (conflitos.length) detalhes += " Notamos problemas de compatibilidade — vamos sugerir peças alternativas.";
    }

    mostrarFeedback(
      "ok",
      `✓ Pedido enviado, ${nome}! Você vai receber o orçamento em <strong>${$("#email").value.trim()}</strong>.${detalhes}`
    );
    mostrarToast("Pedido de orçamento enviado");

    form.reset();
    contador.textContent = `0 / ${mensagem.maxLength} caracteres`;
  });
}

/* ---------------------------------------------------------
   Inicialização
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  iniciarAcessibilidade();
  iniciarMontador();
  iniciarOrcamento();
});