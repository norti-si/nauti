# Nauti — versão inicial

Este é o ponto de partida do Nauti: um assistente local para conversas simples, amigáveis e saudáveis, com interesse especial em criatividade e design. Não precisa de chave de API nem de serviço pago.

## O que está incluído

- `index.html` — interface de conversa.
- `nauti-character.html` — personagem animado, também usado na conversa.
- `css/style.css` — aparência da interface.
- `js/config.js` — modelo, parâmetros e personalidade do Nauti.
- `js/app.js` — conexão com o Ollama, histórico curto, cronômetro, tratamento de erros, controle do personagem e limpeza da conversa.
- `referencias/prototipo-original-gemini.html` — cópia preservada do protótipo original do Gemini, sem alterações.

## Requisitos

- Ollama instalado e em execução.
- Modelo `qwen3:1.7b` instalado.
- VS Code e extensão Live Server.

## Como abrir

1. Extraia a pasta `nauti-inicial`.
2. Abra essa pasta no VS Code: **Arquivo → Abrir Pasta...**.
3. Confirme que o Ollama está rodando. Se necessário, abra um PowerShell e execute `ollama serve`. Se disser que a porta já está em uso, o serviço provavelmente já está ativo.
4. No VS Code, clique com o botão direito em `index.html` e escolha **Open with Live Server**.
5. Envie uma mensagem no navegador.

Se o modelo não estiver instalado, execute no PowerShell:

```powershell
ollama pull qwen3:1.7b
```

## Onde alterar a personalidade

Edite `systemPrompt` em `js/config.js`. O modelo está configurado como `qwen3:1.7b` no mesmo arquivo. Não é necessário procurar e substituir o nome do modelo em vários lugares.

## Observações

- A conversa fica na memória da página enquanto ela estiver aberta; ao atualizar ou iniciar uma conversa nova, o histórico da interface é reiniciado.
- O cronômetro mostra o tempo total da requisição, incluindo a geração da resposta.
- `think: false` e `/no_think` solicitam respostas sem raciocínio exposto. O comportamento depende da versão do Ollama e do modelo; a limpeza de texto é uma proteção adicional, não uma garantia universal.
- O projeto é uma página web local para prototipagem. Ainda não é um aplicativo Windows empacotado.
- A configuração de CPU usada pelo Ollama depende de como o serviço foi iniciado. Este projeto não altera configurações globais do Ollama.

## Estados do personagem

A conversa expõe `window.Nauti.setState(estado)` para controlar a animação. Os estados disponíveis são `idle`, `listening`, `thinking`, `responding`, `curious`, `happy`, `excited`, `surprised`, `sad`, `sleeping`, `error`, `playful`, `dizzy`, `love`, `shy`, `flip` e `dance`. Um estado desconhecido gera `TypeError`. Pedidos para dançar ou dar cambalhotas acionam o movimento e uma resposta curta do Nauti, sem depender do Ollama. O estado emocional reage ao conteúdo da conversa. Também é possível clicar no personagem: toques seguidos fazem Nauti pular e, no terceiro toque, dar uma cambalhota. O personagem acompanha o cursor e aceita Enter ou Espaço quando focado.

O aplicativo controla o personagem junto ao fluxo real da conversa: atenção ao enviar, pensamento durante a requisição ao Ollama, reações variadas ao apresentar a resposta e retorno suave ao repouso. Falhas exibem a expressão de erro e também retornam ao repouso.
