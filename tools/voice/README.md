# Vozes do jogo (ElevenLabs)

O jogo toca falas gravadas em estúdio. Quando uma fala não foi gravada, ele usa a voz do aparelho. As falas ficam em
`src/voice/` (um MP3 por fala + `manifest.json`), e o `node build.js` embute tudo no `index.html`.

## Elenco (`chunks.js` → `CAST`)

| Quem fala | Voz | Onde aparece |
| --- | --- | --- |
| `echo` | **Lulu** (aveludada, sensual, escolhida pelo dono) | a Echo: palavras, falas, opções do Baú, letras |
| `story` | **Elder Rowan** (a mesma voz antiga das portas, mais calorosa: `[warmly]`, 1,08×) | leitura e perguntas do Baú da Memória; palavras na 1-1 antes da Echo nascer. O dono achou o Lawrence fraco e pediu um idoso de voz bonita |
| `door` | **Elder Rowan** (antiga, grave, lenta) | inscrições das portas e altares, as frases que o jogador monta, o grito da cena épica |

## Como gerar falas novas

1. `node tools/voice/lines.js`: lista todas as falas a partir dos dados do jogo (`lines.json`).
2. `node tools/voice/chunks.js --only-missing`: agrupa só as que faltam em blocos (`chunks.json`), separadas por
   `[long pause]`.
3. Para cada bloco, pelo conector ElevenLabs desta sessão (conta do dono, plano Creator):
   - `creative_generate_speech` com o `prompt` do bloco, a voz do bloco, modelo `eleven_v4` e `generations_count: 1`;
   - `creative_transcribe_audio` (custa pouco) ligado ao nó da geração: devolve o tempo de cada palavra;
   - `creative_get_flow_run_status` da transcrição traz o MP3 (`source.url`) e as palavras (`words_download_url`).
     Os dois ficam em `storage.googleapis.com`, que o `curl` daqui alcança.
4. `node tools/voice/split.js <bloco> <bloco.mp3> <bloco.words.json>`: corta nas pausas, normaliza o volume, comprime
   (MP3 mono 24 kHz 48 kbps) e registra em `src/voice/manifest.json`, com o tempo de cada palavra para o karaokê.
5. `node build.js` e a suíte de testes.

Fluxo da ElevenLabs com todas as gerações: `COwNUEJ4BcLtDt0Uju1O` ("Nexy English World · vozes").

## No jogo (`src/20_audio.js`)

- `VoiceClips.plan(quem, texto)`: a fala inteira; numa porta, palavra por palavra (a porta repete o que você montou);
  senão a mesma fala em outra voz; senão a voz do aparelho.
- A chave é `quem:texto normalizado` (minúsculas, sem pontuação), igual em `lines.js` e no jogo.
- A porta fala com o reverb da catedral; a Echo com um eco leve; o narrador seco.
- ASSIST → ECHO'S VOICE: "Lulu · studio" primeiro, depois as vozes do aparelho (fica salvo).
