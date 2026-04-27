import { useEffect, useMemo, useRef, useState } from 'react';
import logoUrl from '../logo.png';

const JACKPOT_SYMBOL = 'LOGO';
const SYMBOLS = [JACKPOT_SYMBOL, '🍒', '💎', '🔔', '🍋', '⭐', '🪙', '🍀', '👑', '🎲', '💜', '🔥'];
const REEL_COUNT = 3;
const SYMBOLS_PER_REEL = 12;
const REPEAT_MULTIPLIER = 5;
const SPIN_DURATION = 2200;
const STOP_STAGGER = 450;
const BET_STEP = 10;
const DEFAULT_BET = 20;
const STARTING_CREDITS = 500;

function buildReels() {
  return Array.from({ length: REEL_COUNT }, (_, reelIndex) =>
    Array.from({ length: SYMBOLS_PER_REEL }, (_, symbolIndex) => {
      const symbolPosition = (symbolIndex + reelIndex * 3) % SYMBOLS.length;
      return SYMBOLS[symbolPosition];
    }),
  );
}

function createVisibleGrid(reelSets, centers) {
  return reelSets.map((reel, reelIndex) =>
    [-1, 0, 1].map((offset) => {
      const rawIndex = (centers[reelIndex] + offset + reel.length) % reel.length;
      return reel[rawIndex];
    }),
  );
}

function getLineWin(centerRow) {
  const counts = centerRow.reduce((accumulator, symbol) => {
    accumulator[symbol] = (accumulator[symbol] || 0) + 1;
    return accumulator;
  }, {});

  const winningEntry = Object.entries(counts).find(([, count]) => count >= 2);
  return winningEntry ? { symbol: winningEntry[0], matches: winningEntry[1] } : null;
}

function Reel({ symbols, centerIndex, spinning, highlighted }) {
  const fullStrip = useMemo(
    () => Array.from({ length: REPEAT_MULTIPLIER }, () => symbols).flat(),
    [symbols],
  );

  const middleCycleStart = symbols.length * 2;
  const translateIndex = middleCycleStart + centerIndex - 1;

  return (
    <div className={`reel-shell ${highlighted ? 'highlighted' : ''}`}>
      <div className="reel-window">
        <div
          className={`reel-strip ${spinning ? 'spinning' : ''}`}
          style={{
            transform: `translateY(calc(${translateIndex} * var(--symbol-offset) * -1))`,
          }}
        >
          {fullStrip.map((symbol, index) => (
            <div className="reel-symbol" key={`${symbol}-${index}`}>
              {symbol === JACKPOT_SYMBOL ? (
                <img src={logoUrl} alt="Jackpot logo" className="reel-logo" />
              ) : (
                <span>{symbol}</span>
              )}
            </div>
          ))}
        </div>
        <div className="payline-marker" aria-hidden="true" />
      </div>
    </div>
  );
}

export default function App() {
  const reels = useMemo(buildReels, []);
  const timersRef = useRef([]);
  const [centerIndices, setCenterIndices] = useState([1, 5, 9]);
  const [finalIndices, setFinalIndices] = useState([1, 5, 9]);
  const [spinning, setSpinning] = useState(false);
  const [settledReels, setSettledReels] = useState([true, true, true]);
  const [credits, setCredits] = useState(STARTING_CREDITS);
  const [bet, setBet] = useState(DEFAULT_BET);
  const [message, setMessage] = useState('Hit spin and chase the center payline.');
  const [lastWin, setLastWin] = useState(null);
  const [spinCount, setSpinCount] = useState(0);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(({ type, id }) => {
        if (type === 'frame') {
          window.cancelAnimationFrame(id);
          return;
        }

        window.clearTimeout(id);
      });
    };
  }, []);

  const visibleGrid = useMemo(
    () => createVisibleGrid(reels, centerIndices),
    [centerIndices, reels],
  );
  const centerRow = visibleGrid.map((reel) => reel[1]);

  const canSpin = !spinning && credits >= bet;

  function clearTimers() {
    timersRef.current.forEach(({ type, id }) => {
      if (type === 'frame') {
        window.cancelAnimationFrame(id);
        return;
      }

      window.clearTimeout(id);
    });
    timersRef.current = [];
  }

  function scheduleSpinAnimation(targetIndices) {
    const startedAt = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startedAt;

      if (elapsed >= SPIN_DURATION) {
        setCenterIndices(targetIndices);
        return;
      }

      setCenterIndices((current) =>
        current.map((index, reelIndex) => {
          const burst = Math.floor(elapsed / (70 + reelIndex * 12));
          return (index + burst + reelIndex + 1) % SYMBOLS_PER_REEL;
        }),
      );

      const frameId = window.requestAnimationFrame(animate);
      timersRef.current.push({ type: 'frame', id: frameId });
    };

    animate();
  }

  function finishSpin(targetIndices) {
    const win = getLineWin(targetIndices.map((index, reelIndex) => reels[reelIndex][index]));
    const isJackpot = win && win.matches === 3 && win.symbol === JACKPOT_SYMBOL;
    const payout = win ? bet * (isJackpot ? 20 : win.matches === 3 ? 5 : 2) : 0;

    setFinalIndices(targetIndices);
    setCenterIndices(targetIndices);
    setSettledReels([true, true, true]);
    setSpinning(false);
    setSpinCount((count) => count + 1);

    if (win) {
      setCredits((current) => current + payout);
      setLastWin({ ...win, payout });
      const label = win.symbol === JACKPOT_SYMBOL ? 'LOGO' : win.symbol;
      setMessage(
        isJackpot
          ? `MEGA JACKPOT! 3x ${label} pays ${payout} credits!`
          : win.matches === 3
            ? `Jackpot line! ${label} x3 pays ${payout} credits.`
            : `You win! ${label} matched twice for ${payout} credits.`,
      );
    } else {
      setLastWin(null);
      setMessage('No match on the center line. Spin again.');
    }
  }

  function handleSpin() {
    if (!canSpin) {
      setMessage(credits < bet ? 'Not enough credits for that bet.' : 'Reels are already spinning.');
      return;
    }

    clearTimers();

    const targetIndices = reels.map((reel) => Math.floor(Math.random() * reel.length));

    setCredits((current) => current - bet);
    setFinalIndices(targetIndices);
    setSpinning(true);
    setLastWin(null);
    setSettledReels([false, false, false]);
    scheduleSpinAnimation(targetIndices);

    targetIndices.forEach((_, reelIndex) => {
      const timeoutId = window.setTimeout(() => {
        setSettledReels((current) => current.map((value, index) => (index === reelIndex ? true : value)));
      }, SPIN_DURATION + reelIndex * STOP_STAGGER);
      timersRef.current.push({ type: 'timeout', id: timeoutId });
    });

    const finishId = window.setTimeout(
      () => finishSpin(targetIndices),
      SPIN_DURATION + (REEL_COUNT - 1) * STOP_STAGGER,
    );
    timersRef.current.push({ type: 'timeout', id: finishId });
  }

  function handleBetChange(nextBet) {
    setBet(Math.max(BET_STEP, Math.min(credits || BET_STEP, nextBet)));
  }

  function handleMaxBet() {
    setBet(Math.max(BET_STEP, Math.min(credits, 100)));
  }

  const highlightedReels = finalIndices.map(
    (index, reelIndex) => !!lastWin && reels[reelIndex][index] === lastWin.symbol,
  );

  return (
    <main className={`app-shell ${lastWin ? 'win-state' : ''}`}>
      <div className="background-glow background-glow-left" />
      <div className="background-glow background-glow-right" />

      <section className="machine">
        <header className="hero-panel">
          <div className="hero-copy">
            <div>
              <h1>Lexicon Casino</h1>
            </div>
            <div className={`jackpot-panel ${lastWin ? 'active' : ''}`}>
              <span>Last payout</span>
              <strong>{lastWin ? `${lastWin.payout} credits` : 'Waiting'}</strong>
            </div>
          </div>
        </header>

        <section className="status-deck" aria-label="Game status">
          <article>
            <span>Credits</span>
            <strong>{credits}</strong>
          </article>
          <article>
            <span>Bet</span>
            <strong>{bet}</strong>
          </article>
          <article>
            <span>Spins</span>
            <strong>{spinCount}</strong>
          </article>
        </section>

        <section className="cabinet">

          <div className="reel-grid" role="img" aria-label={`Center row shows ${centerRow.join(', ')}`}>
            {reels.map((reel, reelIndex) => (
              <Reel
                key={`reel-${reelIndex}`}
                symbols={reel}
                centerIndex={centerIndices[reelIndex]}
                spinning={!settledReels[reelIndex]}
                highlighted={highlightedReels[reelIndex]}
              />
            ))}
          </div>
        </section>

        <section className="controls">
          <div className="bet-controls">
            <button type="button" onClick={() => handleBetChange(bet - BET_STEP)} disabled={spinning || bet <= BET_STEP}>
              Bet -
            </button>
            <button type="button" onClick={() => handleBetChange(bet + BET_STEP)} disabled={spinning || bet >= Math.min(credits, 100)}>
              Bet +
            </button>
            <button type="button" onClick={handleMaxBet} disabled={spinning || credits < BET_STEP}>
              Max Bet
            </button>
          </div>

          <button className="spin-button" type="button" onClick={handleSpin} disabled={!canSpin}>
            {spinning ? 'Spinning...' : 'Spin'}
          </button>
        </section>
      </section>
    </main>
  );
}
