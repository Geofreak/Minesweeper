/*!
 * Minesweeper Game
 * https://github.com/mayankrajendrat/minesweeper
 *
 * Released under the MIT license
 *
 * Date: 2019-08-09 | Modified: 2024
 */

/* global alert, MouseEvent, game */
const numbers = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
const feedback = document.querySelector('.feedback');

// Gewinnnachricht vom Server abrufen
async function fetchWinMessage() {
  try {
    const res = await fetch('/api/win-message');
    if (!res.ok) throw new Error('Server nicht erreichbar');
    const data = await res.json();
    return data.message;
  } catch (e) {
    return 'Du hast gewonnen!';
  }
}

class mineSweeper {
  constructor(cols, rows, number_of_bombs) {
    // Spielfeld auf maximal 20x20 mit 75 Minen beschränken
    this.cols = Math.min(Number(cols), 20);
    this.rows = Math.min(Number(rows), 20);
    this.number_of_bombs = Math.min(Number(number_of_bombs), 75);
    this.number_of_cells = this.cols * this.rows;
    this.rate = this.number_of_bombs / this.number_of_cells;

    this.map = document.getElementById('map');
    this.usetwemoji = false; // twemoji nicht mehr verwendet

    this.init();
  }

  // Hilfsfunktion: <img>-Element mit lokalem Pfad erstellen
  createImg(src) {
    const img = document.createElement('img');
    img.className = 'emoji';
    img.setAttribute('aria-hidden', 'true');
    img.src = src;
    img.onerror = function () {
      this.replaceWith(document.createTextNode('?'));
    };
    return img;
  }

  // Emoji-Set aus lokalen Bildern aufbauen
  prepareEmoji() {
    const base = 'assets/Emojis/';
    // Reihenfolge: [leer, bombe, flagge, start/abgedeckt]
    this.emojiset = [
      this.createImg(base + 'empty.png'),   // 0 – leeres Feld (aufgedeckt, 0 Nachbarn)
      this.createImg(base + 'bomb.png'),    // 1 – Bombe
      this.createImg(base + 'flag.png'),    // 2 – Flagge
      this.createImg(base + 'player.png'),  // 3 – abgedecktes Feld
    ];

    // Zahlen 0–8 (Index 0 = leeres Feld)
    this.numbermoji = [
      this.createImg(base + 'empty.png'),
      this.createImg(base + '1.png'),
      this.createImg(base + '2.png'),
      this.createImg(base + '3.png'),
      this.createImg(base + '4.png'),
      this.createImg(base + '5.png'),
      this.createImg(base + '6.png'),
      this.createImg(base + '7.png'),
      this.createImg(base + '8.png'),
    ];
  }

  init() {
    this.prepareEmoji();

    if (this.number_of_cells > 400) { alert('Maximal 20×20 Felder erlaubt.'); return false; }
    if (this.number_of_cells <= this.number_of_bombs) { alert('Mehr Bomben als Felder – nicht erlaubt!'); return false; }

    var that = this;
    this.moveIt(true);
    this.map.innerHTML = '';
    var grid_data = this.bomb_array();

    let getIndex = (x, y) => {
      if (x > that.cols || x <= 0) return -1;
      if (y > that.rows || y <= 0) return -1;
      return that.cols * (y - 1) + x - 1;
    };

    var row = document.createElement('div');
    row.setAttribute('role', 'row');

    grid_data.forEach(function (isBomb, i) {
      var cell = document.createElement('span');
      cell.setAttribute('role', 'gridcell');
      var mine = that.mine(isBomb);
      var x = Math.floor((i + 1) % that.cols) || that.cols;
      var y = Math.ceil((i + 1) / that.cols);
      var neighbors_cords = [
        [x, y - 1], [x, y + 1],
        [x - 1, y - 1], [x - 1, y], [x - 1, y + 1],
        [x + 1, y - 1], [x + 1, y], [x + 1, y + 1]
      ];

      if (!isBomb) {
        var neighbors = neighbors_cords.map(xy => grid_data[getIndex(xy[0], xy[1])]);
        mine.mine_count = neighbors.filter(n => n).length;
      }

      mine.classList.add('x' + x, 'y' + y);
      mine.neighbors = neighbors_cords.map(xy => `.x${xy[0]}.y${xy[1]}`);

      cell.appendChild(mine);
      row.appendChild(cell);

      if (x === that.cols) {
        that.map.appendChild(row);
        row = document.createElement('div');
        row.setAttribute('role', 'row');
      }
    });

    this.resetMetadata();
    this.bindEvents();
    this.updateBombsLeft();
  }

  bindEvents() {
    var that = this;
    var cells = document.getElementsByClassName('cell');

    Array.prototype.forEach.call(cells, function (target) {
      target.addEventListener('click', function (evt) {
        if (!target.isMasked || target.isFlagged) return;

        if (document.getElementsByClassName('unmasked').length === 0) {
          that.startTimer();
          if (target.isBomb) {
            that.restart();
            var targetClasses = target.className.replace('unmasked', '');
            document.getElementsByClassName(targetClasses)[0].click();
            return;
          }
        }

        if (evt.view) that.moveIt();
        target.reveal();
        that.updateFeedback(target.getAttribute('aria-label'));

        if (target.mine_count === 0 && !target.isBomb) {
          that.revealNeighbors(target);
        }
        that.game();
      });

      target.addEventListener('contextmenu', function (evt) {
        evt.preventDefault();
        if (!target.isMasked) return;

        var emoji;
        if (target.isFlagged) {
          target.setAttribute('aria-label', 'Field');
          that.updateFeedback('Flagge entfernt');
          emoji = that.emojiset[3].cloneNode();
          target.isFlagged = false;
        } else {
          target.setAttribute('aria-label', 'Als potenzielle Bombe markiert');
          that.updateFeedback('Als potenzielle Bombe markiert');
          emoji = that.emojiset[2].cloneNode();
          target.isFlagged = true;
        }
        target.childNodes[0].remove();
        target.appendChild(emoji);
        that.updateBombsLeft();
      });
    });

    window.addEventListener('keydown', function (evt) {
      if (evt.key === 'r' || evt.key === 'R') {
        that.restart();
      }
    });
  }

  game() {
    if (this.result) return;
    var cells = document.getElementsByClassName('cell');

    var masked = Array.prototype.filter.call(cells, cell => cell.isMasked);
    var bombs  = Array.prototype.filter.call(cells, cell => cell.isBomb && !cell.isMasked);

    if (bombs.length > 0) {
      Array.prototype.forEach.call(masked, cell => cell.reveal());
      this.result = 'lost';
      this.showMessage();
    } else if (masked.length === this.number_of_bombs) {
      Array.prototype.forEach.call(masked, cell => cell.reveal(true));
      this.result = 'won';
      this.showMessage();
    }
  }

  restart() {
    clearInterval(this.timer);
    this.result = false;
    this.timer = false;
    this.init();
  }

  resetMetadata() {
    document.getElementById('timer').textContent = '0.00';
    document.querySelector('.wrapper').classList.remove('won', 'lost');
    document.querySelector('.result-emoji').textContent = '';
    // Startbild für den Reset-Button
    const defaultEmoji = document.querySelector('.default-emoji');
    const img = this.createImg('assets/Emojis/player.png');
    img.style.width  = '20px';
    img.style.height = '20px';
    defaultEmoji.innerHTML = '';
    defaultEmoji.appendChild(img);
    // Einstellungs-Icon
    document.querySelector('.js-settings').textContent = '⚙️';
  }

  startTimer() {
    if (this.timer) return;
    this.startTime = new Date();
    this.timer = setInterval(function () {
      document.getElementById('timer').textContent =
        ((new Date() - game.startTime) / 1000).toFixed(2);
    }, 100);
  }

  mine(bomb) {
    var that = this;
    var base = document.createElement('button');
    base.type = 'button';
    base.setAttribute('aria-label', 'Field');
    base.className = 'cell btn btn-light-blue';
    base.appendChild(this.emojiset[3].cloneNode());
    base.isMasked = true;
    if (bomb) base.isBomb = true;

    base.reveal = function (won) {
      var emoji = base.isBomb
        ? (won ? that.emojiset[2] : that.emojiset[1])
        : that.numbermoji[base.mine_count];
      var text = base.isBomb
        ? (won ? 'Bombe entdeckt' : 'Boom!')
        : (base.mine_count === 0 ? 'Leeres Feld' : base.mine_count + ' Bomben in der Nähe');
      this.childNodes[0].remove();
      this.setAttribute('aria-label', text);
      this.appendChild(emoji.cloneNode());
      this.isMasked = false;
      this.classList.add('unmasked');
    };
    return base;
  }

  revealNeighbors(mine) {
    var neighbors = document.querySelectorAll(mine.neighbors);
    for (var i = 0; i < neighbors.length; i++) {
      if (neighbors[i].isMasked && !neighbors[i].isFlagged) {
        neighbors[i].reveal();
        if (neighbors[i].mine_count === 0 && !neighbors[i].isBomb) {
          this.revealNeighbors(neighbors[i]);
        }
      }
    }
  }

  bomb_array() {
    var chance = Math.floor(this.rate * this.number_of_cells);
    var arr = [];
    for (var i = 0; i < chance; i++) arr.push(true);
    for (var n = 0; n < (this.number_of_cells - chance); n++) arr.push(false);
    return this.shuffle(arr);
  }

  shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }

  moveIt(zero) {
    zero ? this.moves = 0 : this.moves++;
    document.getElementById('moves').textContent = this.moves;
  }

  updateBombsLeft() {
    var flagged = Array.prototype.filter.call(
      document.getElementsByClassName('cell'),
      target => target.isFlagged
    );
    document.getElementById('bombs-left').textContent =
      `${this.number_of_bombs - flagged.length}/${this.number_of_bombs}`;
  }

  updateFeedback(text) {
    feedback.innerHTML = text;
    if (this.feedbackToggle) feedback.innerHTML += '.';
    this.feedbackToggle = !this.feedbackToggle;
  }

  async showMessage() {
    clearInterval(this.timer);
    var seconds = ((new Date() - this.startTime) / 1000).toFixed(2);
    var winner = this.result === 'won';
    var emoji = winner ? '😎' : '😵';

    var message;
    if (winner) {
      // Gewinnnachricht vom Server holen
      message = await fetchWinMessage();
    } else {
      message = 'Boom! Du hast verloren.';
    }

    this.updateFeedback(message);
    document.querySelector('.wrapper').classList.add(this.result);
    document.getElementById('timer').textContent = seconds;
    document.getElementById('result').textContent = emoji;
  }
}

console.log('Minesweeper gestartet. Spielfeld: 20×20, Minen: 75.');
