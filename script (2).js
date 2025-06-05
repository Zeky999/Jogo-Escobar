$(function () {
  const gridSize = 12;
  const cellSize = 50;

  
  const caminho = [
    [0, 5], [1, 5], [2, 5], [3, 5],
    [3, 4], [3, 3], [4, 3], [5, 3],
    [5, 4], [5, 5], [6, 5], [7, 5],
    [7, 6], [7, 7], [8, 7], [9, 7],
    [10, 7], [11, 7]
  ];

  
  let vida = 5;
  let pontos = 0;
  let dinheiro = 100;
  let ondaAtual = 1;
  let inimigos = [];
  let torres = [];
  let jogoAtivo = true;
  let intervaloTiros = [];
  let intervaloInimigos;

  const $game = $('#game-area');
  const $vida = $('#vida');
  const $pontos = $('#pontos');
  const $dinheiro = $('#dinheiro');
  const $onda = $('#onda');
  const $mensagem = $('#mensagem');

  let torreSelecionada = null;

  
  const tiposTorres = {
    1: { nome: 'Laser', custo: 30, alcance: 3, dano: 10, cor: '#00f' },
    2: { nome: 'Plasma', custo: 50, alcance: 4, dano: 15, cor: '#0f0' },
    3: { nome: 'Ion', custo: 80, alcance: 5, dano: 25, cor: '#0ff' },
  };

  function criarGrid() {
    $game.empty();
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const celula = $('<div class="cell"></div>');
        celula.attr('data-x', x);
        celula.attr('data-y', y);
        $game.append(celula);
      }
    }
    caminho.forEach(([y, x]) => {
      getCell(x, y).addClass('path').off('click'); 
    });
  }

  function getCell(x, y) {
    return $(`.cell[data-x=${x}][data-y=${y}]`);
  }

  function atualizarHUD() {
    $vida.text(vida);
    $pontos.text(pontos);
    $dinheiro.text(dinheiro);
    $onda.text(ondaAtual);
  }

  function gameOver() {
    jogoAtivo = false;
    $mensagem.text("SISTEMA INVADIDO!");
    clearInterval(intervaloInimigos);
    intervaloTiros.forEach(clearInterval);
    intervaloTiros = [];
  }

  
  class Inimigo {
    constructor() {
      this.pos = 0;
      this.$element = $('<div class="enemy"></div>');
      this.morto = false;
      this.move();
    }

    move() {
      if (!jogoAtivo || this.morto) {
        this.$element.remove();
        return;
      }

      if (this.pos >= caminho.length) {
        this.$element.remove();
        vida = Math.max(0, vida - 1);
        atualizarHUD();
        if (vida <= 0) gameOver();
        inimigos = inimigos.filter(e => e !== this);
        return;
      }

      const [y, x] = caminho[this.pos];
      const cell = getCell(x, y);
      
      const left = x * cellSize + 15;
      const top = y * cellSize + 15;

      this.$element.css({ left: left + 'px', top: top + 'px', position: 'absolute' });
      if (!this.$element.parent().is($game)) {
        $game.append(this.$element);
      }

      this.pos++;
      setTimeout(() => this.move(), 400 - (ondaAtual * 20));
    }

    receberDano(dano) {
      this.morto = true;
      this.$element.remove();
      pontos += dano;
      dinheiro += dano;
      atualizarHUD();
      inimigos = inimigos.filter(e => e !== this);
    }
  }

  function criarInimigo() {
    if (!jogoAtivo) return;
    const inimigo = new Inimigo();
    inimigos.push(inimigo);
  }

  function criarOnda(num) {
    let cont = 0;
    intervaloInimigos = setInterval(() => {
      if (!jogoAtivo) {
        clearInterval(intervaloInimigos);
        return;
      }
      if (cont >= num) {
        clearInterval(intervaloInimigos);
        ondaAtual++;
        atualizarHUD();
        setTimeout(() => criarOnda(num + 2), 3000);
        return;
      }
      criarInimigo();
      cont++;
    }, 800 - ondaAtual * 30);
  }

  
  function atirar(torreObj) {
    if (!jogoAtivo) return;
    const { torre, x, y, tipo } = torreObj;
    const alcance = tiposTorres[tipo].alcance;

    
    torre.addClass('shooting');
    setTimeout(() => torre.removeClass('shooting'), 200);

    
    for (const inimigo of inimigos) {
      if (inimigo.morto) continue;
      const posInimigo = inimigo.pos < caminho.length ? caminho[inimigo.pos] : null;
      if (!posInimigo) continue;
      const [iy, ix] = posInimigo;
      const dist = Math.abs(ix - x) + Math.abs(iy - y);
      if (dist <= alcance) {
        inimigo.receberDano(tiposTorres[tipo].dano);
        criarBullet(torre, inimigo);
        break; 
      }
    }
  }

  function criarBullet(torre, inimigo) {
    const bullet = $('<div class="bullet"></div>');
    const torreOffset = torre.offset();
    const inimigoOffset = inimigo.$element.offset();

    bullet.css({
      left: torreOffset.left + 15,
      top: torreOffset.top + 15,
      position: 'absolute',
    });

    $('body').append(bullet);

    bullet.animate({
      left: inimigoOffset.left + 10,
      top: inimigoOffset.top + 10,
    }, 200, () => {
      bullet.remove();
    });
  }

  function colocarTorre(x, y) {
    if (!jogoAtivo) return;
    if (!torreSelecionada) {
      $mensagem.text('Selecione um tipo de torre primeiro!');
      return;
    }

    const $celula = getCell(x, y);
    if ($celula.hasClass('path') || $celula.find('.tower').length > 0) {
      $mensagem.text('Não pode construir aqui!');
      return;
    }

    const custo = tiposTorres[torreSelecionada].custo;
    if (dinheiro < custo) {
      $mensagem.text('Dinheiro insuficiente!');
      return;
    }

    dinheiro -= custo;
    atualizarHUD();

    const torre = $('<div class="tower"></div>');
    torre.css('background-color', tiposTorres[torreSelecionada].cor);
    $celula.append(torre);

    const torreObj = { torre, x, y, tipo: torreSelecionada };
    torres.push(torreObj);

    
    const intervalo = setInterval(() => atirar(torreObj), 1500);
    intervaloTiros.push(intervalo);

    $mensagem.text('');
  }

  
  $game.on('mouseenter', '.cell', function () {
    if (!torreSelecionada) return;
    const x = +$(this).data('x');
    const y = +$(this).data('y');
    if ($(this).hasClass('path') || $(this).find('.tower').length > 0) return;

    const alcance = tiposTorres[torreSelecionada].alcance;

    
    if ($('#range-highlight').length === 0) {
      $game.append('<div id="range-highlight" class="range-highlight"></div>');
    }
    const range = $('#range-highlight');
    range.css({
      width: alcance * cellSize * 2 + cellSize,
      height: alcance * cellSize * 2 + cellSize,
      left: (x - alcance) * cellSize,
      top: (y - alcance) * cellSize,
      display: 'block',
    });
  });

  $game.on('mouseleave', '.cell', function () {
    $('#range-highlight').hide();
  });

  
  $game.on('click', '.cell', function () {
    const x = +$(this).data('x');
    const y = +$(this).data('y');
    colocarTorre(x, y);
  });

  
  $('#tipos-torre button').click(function () {
    torreSelecionada = +$(this).data('tipo');
    $mensagem.text(`Torre ${tiposTorres[torreSelecionada].nome} selecionada para construção.`);
  });

  
  criarGrid();
  atualizarHUD();
  criarOnda(5);
});
