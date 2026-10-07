# TechBuild | Monte seu PC

### Escolha as peças, confira a compatibilidade e veja quanto vai custar

**Versão:** v1.0.0

O **TechBuild** é um simulador de montagem de computadores inspirado em sites como Pichau, Kabum e MEUPC.NET. Com uma interface responsiva feita em HTML, CSS e JavaScript, o projeto permite escolher cada componente, verificar em tempo real se as peças são compatíveis entre si e consultar o valor total da build, com links para as lojas.

> **Projeto educacional:** o site é fictício. Preços e links são apenas demonstrativos, e o formulário de orçamento não envia nem armazena dados.

---

## O que você encontra

- **Página inicial** com apresentação do projeto, destaques e a seção "Como funciona".
- **Montador de PC** com processador, placa-mãe, memória RAM, placa de vídeo, SSD e fonte.
- **Verificação de compatibilidade** de soquete, tipo de memória (DDR4/DDR5) e potência da fonte, com o motivo exato de cada erro.
- **Resumo em tempo real** com preço de cada peça, total em reais, consumo estimado e link de compra na loja.
- **Builds prontas** (Entrada, Equilibrada e Entusiasta) que preenchem tudo com um clique.
- **Formulário de orçamento** com validação de nome e e-mail e mensagens de retorno ao usuário.
- **Opções de acessibilidade**: modo claro e escuro, aumentar e diminuir o texto, alto contraste, leitura facilitada e redução de animações.
- **Layout responsivo**, adaptado a computadores, tablets e celulares.

## Tecnologias

- HTML5 semântico
- CSS3 com Flexbox, Grid e variáveis
- JavaScript, sem bibliotecas nem dependências

## Organização das pastas

```text
.
├── index.html    # Estrutura da página
├── style.css     # Temas, layout e responsividade
├── script.js     # Acessibilidade, montador e formulário
└── README.md     # Documentação do projeto
```

## Como visualizar

O projeto não precisa de instalação de dependências nem de etapa de compilação.

1. Clone ou baixe este repositório.
2. Abra o arquivo `index.html` no navegador.
3. Escolha as peças no montador ou use uma das builds prontas.

> Se preferir, execute o projeto com um servidor local, como a extensão **Live Server** no Visual Studio Code.

## Acessibilidade

| Recurso | Como usar |
|---|---|
| Modo claro / escuro | Botão na barra superior ou `Alt + T` |
| Tamanho do texto | Botões A−, A e A+ ou `Alt + +`, `Alt + -` e `Alt + 0` |
| Alto contraste | Botão "Alto contraste" |
| Leitura facilitada | Aumenta o espaçamento entre letras, palavras e linhas |
| Reduzir animações | Desliga as transições (também segue a configuração do sistema) |

As preferências ficam salvas no navegador e são mantidas na próxima visita. O site também tem link para pular direto ao conteúdo, foco visível na navegação por teclado e avisos lidos por leitores de tela.

## Como personalizar

- Altere cores e estilos em `style.css`. As cores de cada tema ficam nas variáveis do início do arquivo.
- Para adicionar uma peça, inclua um novo item na categoria correspondente do objeto `catalogo`, em `script.js`. Ela aparece automaticamente na lista de opções:

```js
criarPeca("gpu-4070", "NVIDIA GeForce RTX 4070", 3300, "Kabum", { tdpWatts: 200 }, "RTX 4070")
```

- Para criar uma nova build pronta, adicione um item no objeto `PRESETS` e um botão com `data-preset` no `index.html`.

## Créditos

Projeto acadêmico de Desenvolvimento Web, orientado pelo professor **Nome do Professor**.

### Participantes

- **Gabriel Ramalho** — [GitHub](https://github.com/gabrielrmti)

---

**TechBuild — o PC certo começa pela peça certa.**
