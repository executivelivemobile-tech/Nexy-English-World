
/* ============================== ABERTURA, SOBRE, TERMOS E PRIVACIDADE ==============================
   Pedido do dono: abertura com o selo do estúdio, título limpo, aceite dos termos na primeira partida e as páginas
   de Sobre, Termos de Uso e Política de Privacidade dentro do jogo (também abrem direto por #sobre, #termos e
   #privacidade: é o endereço público que a loja de apps pede). Tudo fica fora do #stage, em pixels de verdade, para
   ser legível no celular. Ao mudar o texto dos termos ou da política, troque LEGAL.v: o aviso de aceite volta. */
const LEGAL = {
  v: '2026-10-19', date: '19 de outubro de 2026', version: 'v0.9 · beta',
  studio: 'Nexy Tecnologias', dev: 'Mauricio Castro', mail: 'consultoria@nexytutors.com',
};
// as páginas: blocos [tag, texto]; 'h' título de seção, 'p' parágrafo, 'li' item de lista, 'note' destaque
LEGAL.pages = {
  about: { title: 'Sobre o jogo', blocks: [
    ['lead', 'Nexy English World é um jogo de plataforma em que você aprende inglês mudando o mundo com frases. Uma porta só abre se você responder; um gigante só encolhe se você disser que ele é pequeno.'],
    ['h', 'Quem faz'],
    ['dl', [['Estúdio', LEGAL.studio], ['Criação e desenvolvimento', LEGAL.dev], ['Contato', LEGAL.mail], ['Versão', LEGAL.version]]],
    ['h', 'Como o jogo ensina'],
    ['li', 'Cada palavra chega com som, texto e imagem ao mesmo tempo.'],
    ['li', 'Você monta as frases. Produzir a frase fixa muito mais do que só reconhecê-la.'],
    ['li', 'As palavras voltam nas fases seguintes, em intervalos cada vez maiores.'],
    ['li', 'Errar no começo não custa nada: a porta mostra o que aconteceu e você tenta de novo.'],
    ['li', 'A tradução só aparece quando você pede (tecla H), para o inglês ter espaço de ser entendido sozinho.'],
    ['h', 'Créditos'],
    ['dl', [['Vozes', 'geradas com ElevenLabs (Echo: Lulu · narrador e portas: Elder Rowan)'], ['Fontes', 'Orbitron, Inter e JetBrains Mono, sob a SIL Open Font License'], ['Tecnologia', 'HTML5 e JavaScript, sem bibliotecas externas']]],
    ['p', 'Feito no Brasil. © 2026 ' + LEGAL.studio + '. Todos os direitos reservados.'],
  ] },
  terms: { title: 'Termos de Uso', blocks: [
    ['meta', 'Versão de ' + LEGAL.date],
    ['p', 'Estes termos valem para o jogo Nexy English World, desenvolvido pela ' + LEGAL.studio + '. Ao jogar, você concorda com eles e com a nossa Política de Privacidade. Se for menor de idade, jogue com o conhecimento de um responsável.'],
    ['h', '1. O que você pode fazer'],
    ['p', 'Jogar à vontade, para uso pessoal e educacional. Professores e escolas podem usar o jogo em aula, projetado ou nos aparelhos dos alunos.'],
    ['h', '2. O que não é permitido'],
    ['p', 'Copiar, modificar, revender, redistribuir ou hospedar o jogo em outro endereço, e usar personagens, arte, música, vozes ou textos fora do jogo sem autorização por escrito.'],
    ['h', '3. Propriedade intelectual'],
    ['p', 'O jogo, o nome Nexy, as personagens Nexy e Echo, a história, a arte, o código, a música e as vozes pertencem à ' + LEGAL.studio + '. As fontes são de terceiros, sob licença livre (SIL Open Font License), e as vozes foram geradas com a ElevenLabs, conforme a licença do plano contratado.'],
    ['h', '4. Um jogo em desenvolvimento'],
    ['p', 'O jogo está em fase beta e é oferecido como está. Fases e recursos podem mudar, entrar ou sair. O progresso fica guardado no seu navegador e pode se perder se os dados do site forem apagados.'],
    ['h', '5. Aprendizado'],
    ['p', 'O jogo foi pensado para ajudar você a aprender inglês, mas não substitui um curso nem garante um resultado específico.'],
    ['h', '6. Recursos pagos'],
    ['p', 'Hoje o jogo é gratuito. Se no futuro houver algo pago, o preço e as condições serão mostrados com clareza antes de qualquer cobrança, e nada será cobrado sem a sua confirmação.'],
    ['h', '7. Responsabilidade'],
    ['p', 'Fazemos o possível para o jogo funcionar bem, mas não respondemos por falhas do aparelho, do navegador ou da conexão. Nada nestes termos limita os direitos garantidos pelo Código de Defesa do Consumidor.'],
    ['h', '8. Mudanças nestes termos'],
    ['p', 'Quando os termos mudarem, a data acima muda e o jogo pede o seu aceite de novo antes da próxima partida.'],
    ['h', '9. Lei aplicável'],
    ['p', 'Valem as leis do Brasil. Eventuais disputas serão resolvidas no foro do domicílio do consumidor.'],
    ['h', 'Contato'],
    ['p', LEGAL.studio + ' · ' + LEGAL.mail],
  ] },
  privacy: { title: 'Política de Privacidade', blocks: [
    ['meta', 'Versão de ' + LEGAL.date],
    ['note', 'Resumo: o jogo não pede cadastro, não mostra anúncios e não rastreia você. O seu progresso fica no seu aparelho, não com a gente.'],
    ['h', 'O que fica no seu aparelho'],
    ['p', 'Progresso, palavras aprendidas, configurações e o registro de que você aceitou os termos (data e versão) ficam guardados no armazenamento do seu navegador. Essas informações não são enviadas para a ' + LEGAL.studio + '. Para apagar, use NOVO JOGO na tela inicial ou limpe os dados do site nas configurações do navegador.'],
    ['h', 'Microfone (opcional)'],
    ['p', 'O modo voz vem desligado e só funciona se você ligar em ASSIST e permitir o microfone. Quem transforma a sua voz em texto é o navegador: no Chrome e no Android, o áudio é enviado ao Google; no Safari, à Apple, cada um conforme a própria política de privacidade. O jogo recebe apenas o texto, usa na hora para conferir a frase e não grava nem envia nada para nós. Você pode negar ou retirar a permissão a qualquer momento no navegador.'],
    ['h', 'Hospedagem'],
    ['p', 'O site é hospedado pela Vercel. Como acontece com qualquer site, o servidor recebe dados técnicos da conexão (endereço IP, tipo de navegador, data e hora) para entregar a página e manter a segurança. Não usamos esses dados para identificar você.'],
    ['h', 'O que não fazemos'],
    ['li', 'Não usamos cookies de rastreamento, ferramentas de análise ou publicidade.'],
    ['li', 'Não vendemos nem compartilhamos dados.'],
    ['li', 'Não carregamos fontes nem scripts de outros sites: tudo vem dentro do jogo.'],
    ['h', 'Crianças e adolescentes'],
    ['p', 'O jogo é para todas as idades e não coleta dados pessoais de crianças. Quando quem joga é criança, o modo voz deve ser ligado por um responsável, que autoriza o microfone no navegador.'],
    ['h', 'Seus direitos'],
    ['p', 'A Lei Geral de Proteção de Dados (LGPD) garante a você acesso, correção e exclusão dos seus dados, entre outros direitos. Como não guardamos dados seus, você controla tudo no próprio aparelho. Para qualquer dúvida ou pedido, fale com o responsável pelo tratamento de dados, ' + LEGAL.dev + ', em ' + LEGAL.mail + '.'],
    ['h', 'Mudanças nesta política'],
    ['p', 'Se esta política mudar, a data acima muda e o jogo avisa antes da próxima partida.'],
  ] },
};

// o logo do estúdio (src/brand/logo.svg, desenhado em vetor a partir do logo enviado pelo dono)
const BRAND_LOGO = `<svg viewBox="0 0 1800 2015" aria-hidden="true"><defs>
<linearGradient id="nxW" x1="200" y1="0" x2="1795" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#df3a8f"/><stop offset=".5" stop-color="#e74a8d"/><stop offset="1" stop-color="#cf2a88"/></linearGradient>
<linearGradient id="nxH" x1="0" y1="1100" x2="680" y2="600" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#c92a8a"/><stop offset=".55" stop-color="#da1f7a"/><stop offset="1" stop-color="#e2416c"/></linearGradient>
<linearGradient id="nxT" x1="900" y1="1180" x2="560" y2="1900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#6e0d45"/><stop offset=".45" stop-color="#e2456f"/><stop offset="1" stop-color="#e5307a"/></linearGradient>
<linearGradient id="nxS" x1="780" y1="700" x2="420" y2="920" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b01e6c"/><stop offset="1" stop-color="#7e124d"/></linearGradient></defs>
<path fill="url(#nxS)" d="M325 925C400 850 590 700 780 695L520 885C470 865 400 870 325 925Z"/>
<path fill="url(#nxT)" d="M475 1238C440 1260 425 1300 455 1345C510 1430 600 1500 600 1500C610 1510 618 1495 621 1489C650 1420 680 1350 682 1300C690 1260 690 1220 690 1200L965 1180C970 1300 960 1440 905 1550C905 1470 910 1430 880 1355C885 1600 830 1780 745 1890C770 1800 770 1740 757 1705C700 1900 600 1995 558 2012C600 1890 560 1790 440 1670C400 1630 360 1580 345 1565C300 1500 270 1440 280 1380C290 1300 340 1270 475 1238Z"/>
<path fill="url(#nxH)" d="M170 590C230 615 228 735 228 735C340 630 470 585 600 580C640 578 670 583 677 588C600 592 575 615 557 632C700 635 760 680 780 695L520 885C470 865 400 870 325 925L105 1130C60 1170 50 1210 48 1235C10 1220-20 1150 25 1050C-5 960 15 890 90 810C130 750 180 730 170 590Z"/>
<path fill="url(#nxW)" d="M1735 0C1755 25 1755 80 1750 140C1740 300 1560 430 1400 520L878 812L612 968L888 826L1792 382C1780 580 1600 730 1430 795L938 968L595 1090L945 1000L1533 858C1450 1030 1250 1180 965 1180L690 1200C620 1210 560 1215 475 1238C340 1270 290 1300 280 1380C270 1440 300 1500 345 1565L310 1535C250 1500 200 1400 200 1290C200 1200 250 1090 375 990L780 695Z"/></svg>`;

/* ---------- o selo de abertura: 2,8 s, pula com qualquer toque ou tecla (e esse toque já libera o som) ---------- */
const Splash = {
  active: false, t: null,
  skipped() {
    if (window.NEXY_SKIP_SPLASH || /^#(sobre|termos|privacidade)$/.test(location.hash)) return true;
    try { if (sessionStorage.getItem('nexy.splash')) { sessionStorage.removeItem('nexy.splash'); return true; } } catch (e) { /* sem armazenamento */ }
    return false;
  },
  start() {
    const el = $('splash');
    el.querySelector('.sp-logo').innerHTML = BRAND_LOGO;
    if (this.skipped()) { el.remove(); return; }
    this.active = true; el.classList.add('on');
    const go = e => { if (e) e.preventDefault(); AudioSys.init(); this.end(true); };
    el.addEventListener('pointerdown', go);
    this.t = setTimeout(() => this.end(false), 2800);
  },
  key() { AudioSys.init(); this.end(true); },
  end(fast) {
    if (!this.active) return;
    this.active = false; clearTimeout(this.t);
    const el = $('splash'); el.classList.add(fast ? 'out-fast' : 'out');
    setTimeout(() => el.remove(), fast ? 260 : 700);
  },
};

/* ---------- Sobre, Termos e Privacidade (abre do título, da pausa e pelos endereços #sobre/#termos/#privacidade) ---------- */
const Legal = {
  from: null, tab: 'about',
  TABS: { about: 'sobre', terms: 'termos', privacy: 'privacidade' },
  accepted() { return !!(Save.data.legal && Save.data.legal.v === LEGAL.v); },
  accept() { if (!this.accepted()) { Save.data.legal = { v: LEGAL.v, at: new Date().toISOString() }; Save.write(); } },
  init() {
    const el = $('legal');
    el.querySelector('.lg-mark').innerHTML = BRAND_LOGO;
    el.querySelectorAll('[data-lg]').forEach(b => b.addEventListener('click', () => this.show(b.dataset.lg)));
    $('lgclose').addEventListener('click', () => this.close());
    // links para as páginas em qualquer lugar (título, aviso do microfone)
    document.querySelectorAll('[data-open-legal]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); this.open(a.dataset.openLegal); }));
    const h = { '#sobre': 'about', '#termos': 'terms', '#privacidade': 'privacy' }[location.hash];
    if (h) this.open(h);
  },
  open(tab) {
    if (Game.state !== 'legal') { this.from = Game.state; Game.state = 'legal'; }
    $('legal').classList.add('on'); this.show(tab || 'about');
    SFX.ui();
  },
  show(tab) {
    this.tab = tab; const pg = LEGAL.pages[tab], body = $('lgbody');
    $('legal').querySelectorAll('[data-lg]').forEach(b => { const on = b.dataset.lg === tab; b.classList.toggle('cur', on); b.setAttribute('aria-selected', String(on)); });
    const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const mail = s => esc(s).replace(LEGAL.mail, `<a href="mailto:${LEGAL.mail}">${LEGAL.mail}</a>`);
    let html = `<h1>${pg.title}</h1>`, list = false;
    for (const [tag, v] of pg.blocks) {
      if (tag !== 'li' && list) { html += '</ul>'; list = false; }
      if (tag === 'li') { if (!list) { html += '<ul>'; list = true; } html += `<li>${mail(v)}</li>`; }
      else if (tag === 'h') html += `<h2>${esc(v)}</h2>`;
      else if (tag === 'dl') html += '<dl>' + v.map(([k, d]) => `<dt>${esc(k)}</dt><dd>${mail(d)}</dd>`).join('') + '</dl>';
      else html += `<p class="${tag}">${mail(v)}</p>`;
    }
    if (list) html += '</ul>';
    body.innerHTML = html; body.scrollTop = 0;
    $('lgbody').focus({ preventScroll: true });
    try { history.replaceState(null, '', '#' + this.TABS[tab]); } catch (e) { /* file:// */ }
  },
  close() {
    if (Game.state !== 'legal') return;
    $('legal').classList.remove('on'); SFX.ui();
    Game.state = this.from || 'title'; this.from = null;
    if (Game.state === 'pause') UI.show('pause');
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* file:// */ }
  },
};

/* ---------- antes de o navegador pedir o microfone pela 1ª vez: o que vai acontecer com a voz ---------- */
const MicNote = {
  pending: null, from: null,
  needed() { return !Save.data.met.mic; },
  ask(ok, no) {
    this.pending = { ok, no }; this.from = Game.state;
    if (Game.state === 'play') Game.state = 'micnote';
    $('micnote').classList.add('on'); $('mnok').focus();
  },
  done(yes) {
    const p = this.pending; this.pending = null;
    $('micnote').classList.remove('on');
    if (Game.state === 'micnote') Game.state = this.from || 'play';
    if (yes) { Save.data.met.mic = true; Save.write(); }
    if (p) (yes ? p.ok : p.no)();
  },
  init() {
    $('mnok').addEventListener('click', () => this.done(true));
    $('mnno').addEventListener('click', () => this.done(false));
  },
};
