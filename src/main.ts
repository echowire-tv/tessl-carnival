import './style.css';
import { applyTheme, bestScore, HATS, hatShop, ticketBalance, type CarnivalGame } from './carnival';
import { registry } from './games';
import { startMidway } from './midway/midway';
import type { BoothSlot } from './midway/world';
import { carnivalLink, REPO_URL, shareLinks } from './share';

applyTheme();

const app = document.querySelector<HTMLElement>('#app')!;
let stop: (() => void) | undefined;

function bestText(game: CarnivalGame): string {
  const best = bestScore(game.id);
  return best === undefined ? 'No scores yet' : `Best: ${best}`;
}

function ticketText(): string {
  const balance = ticketBalance();
  return `🎟 ${balance} ${balance === 1 ? 'ticket' : 'tickets'}`;
}

function renderMidway() {
  document.body.dataset.view = 'midway';
  app.innerHTML = `
    <section class="midway">
      <canvas class="midway-map" aria-label="The carnival midway. Walk up to a booth to play its game."></canvas>
      <p class="midway-help">
        <span class="midway-tickets"></span><br />
        <kbd>WASD</kbd> or <kbd>arrows</kbd> to walk, or click where you want to go.
        <kbd>E</kbd> to play, or to shop at the hat stall.
      </p>
      <p class="midway-credit">
        Built with
        <a href="https://tessl.io/?utm_source=carnival&amp;utm_medium=midway-credit&amp;utm_campaign=tessl-carnival" target="_blank" rel="noopener">Tessl</a>
        at
        <a href="https://tessl.io/devcon?utm_source=carnival&amp;utm_medium=midway-credit&amp;utm_campaign=tessl-carnival" target="_blank" rel="noopener">AI DevCon NYC</a>
        <span class="midway-links">
          <a href="${REPO_URL}" target="_blank" rel="noopener">Build your own</a>
          <span class="midway-share" hidden>
            · Share on
            <a class="share-x" target="_blank" rel="noopener">X</a>
            or
            <a class="share-linkedin" target="_blank" rel="noopener">LinkedIn</a>
          </span>
        </span>
      </p>
      <nav class="midway-guide" aria-label="Booths">
        <h2>Booths</h2>
        <ul></ul>
      </nav>
      <div class="booth-card" aria-live="polite" hidden>
        <h2></h2>
        <p class="description"></p>
        <p class="best"></p>
        <a class="play">Play</a>
      </div>
      <div class="booth-card hat-shop" aria-live="polite" hidden>
        <h2>Hat stall</h2>
        <p class="description">Spend your tickets on a hat. Walk away to close.</p>
        <p class="best hat-balance"></p>
        <ul class="hat-list"></ul>
      </div>
    </section>`;

  app.querySelector('.midway-tickets')!.textContent = ticketText();

  const link = carnivalLink(location.href);
  if (link) {
    const share = shareLinks(link);
    app.querySelector<HTMLAnchorElement>('.share-x')!.href = share.x;
    app.querySelector<HTMLAnchorElement>('.share-linkedin')!.href = share.linkedIn;
    app.querySelector<HTMLElement>('.midway-share')!.hidden = false;
  }

  const guide = app.querySelector('.midway-guide ul')!;
  for (const game of registry.all()) {
    const item = document.createElement('li');
    item.innerHTML = `<a href="#/play/${game.id}"><span class="name"></span> <span class="best"></span></a>`;
    item.querySelector('.name')!.textContent = game.name;
    item.querySelector('.best')!.textContent = bestText(game);
    guide.append(item);
  }

  const card = app.querySelector<HTMLElement>('.booth-card')!;
  const showBooth = (booth: BoothSlot | undefined) => {
    const game = booth?.gameId ? registry.get(booth.gameId) : undefined;
    card.hidden = booth === undefined;
    card.classList.toggle('closed', booth !== undefined && !game);
    card.querySelector('h2')!.textContent = game?.name ?? 'Coming soon';
    card.querySelector('.description')!.textContent =
      game?.description ?? 'This booth is waiting for a game. Build one and it opens here.';
    card.querySelector('.best')!.textContent = game ? bestText(game) : '';
    const link = card.querySelector<HTMLAnchorElement>('.play')!;
    link.hidden = !game;
    if (game) link.href = `#/play/${game.id}`;
  };

  const shop = app.querySelector<HTMLElement>('.hat-shop')!;
  const renderShop = () => {
    const balance = ticketBalance();
    shop.querySelector('.hat-balance')!.textContent = ticketText();
    app.querySelector('.midway-tickets')!.textContent = ticketText();
    const list = shop.querySelector('.hat-list')!;
    list.replaceChildren();
    const worn = hatShop.wornHat();
    for (const hat of HATS) {
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = hat.name;
      const button = document.createElement('button');
      button.type = 'button';
      if (hatShop.ownsHat(hat.id)) {
        const wearing = worn === hat.id;
        button.textContent = wearing ? 'Take off' : 'Wear';
        button.addEventListener('click', () => {
          if (wearing) hatShop.takeOffHat();
          else hatShop.wearHat(hat.id);
          renderShop();
        });
      } else {
        button.textContent = `Buy for 🎟 ${hat.price}`;
        button.disabled = hat.price > balance;
        button.addEventListener('click', () => {
          hatShop.buyHat(hat.id);
          renderShop();
        });
      }
      item.append(name, button);
      list.append(item);
    }
  };
  const openShop = () => {
    renderShop();
    shop.hidden = false;
  };

  const midway = startMidway(app.querySelector('canvas')!, {
    games: registry.all(),
    onPlay: (gameId) => (location.hash = `#/play/${gameId}`),
    onReach: showBooth,
    onShop: openShop,
    onHatCartReach: (inReach) => {
      if (!inReach) shop.hidden = true;
    },
  });
  stop = midway.stop;
}

function renderGame(game: CarnivalGame) {
  document.body.dataset.view = 'game';
  app.innerHTML = `
    <section class="game">
      <div class="game-header">
        <a href="#/">← Back to the midway</a>
        <h1></h1>
      </div>
      <canvas></canvas>
    </section>`;
  app.querySelector('h1')!.textContent = game.name;
  stop = game.start(app.querySelector('canvas')!);
}

function route() {
  stop?.();
  stop = undefined;

  const match = location.hash.match(/^#\/play\/([\w-]+)$/);
  const game = match ? registry.get(match[1]) : undefined;
  if (game) renderGame(game);
  else renderMidway();
}

window.addEventListener('hashchange', route);
route();
