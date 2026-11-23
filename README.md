# Neuron Sprint

An open-source brain training party game for two players over LAN. Play from your phones.

Inspired by the hand-held brain-training puzzle games. No affiliation with Nintendo or Dr Kawashima.

**Not medical advice.** It's a party game.

## Quickstart

### On the host PC (any machine with Node.js)

```bash
npm install
npm start
```

You'll see a LAN URL and a QR code in the terminal.

### On your phones

1. Make sure both phones are on the same WiFi as the host PC.
2. Open your phone's camera and scan the QR code, or type the LAN URL into the browser.
3. Tap "Add to Home Screen" for a fullscreen app feel.
4. Both players connect. Rename yourselves. Ready up. The host starts the match.

### Controls

| Game | Input |
|---|---|
| Calculations | Tap digits on the numpad, OK to submit. Keyboard 0-9/Enter also works. |
| Stroop Test | Tap the colour tile that matches the **ink** (not the word). |
| Number Cruncher | Count numbers by attribute, tap the count on the numpad. |
| Bird Watching | Watch birds appear, then enter the total count. |
| Connect Maze | Tap circles in sequence A-1-B-2-...-M-13. Wrong taps count as mistakes. |
| Low to High | Remember the numbers, then tap the boxes in ascending order. |

## Games

- **Calculations** — solve arithmetic problems. First correct answer wins the round.
- **Stroop Test** — name the colour of the word, not the word itself. Race to pick the right tile.
- **Number Cruncher** — count numbers that share a property (colour, movement).
- **Bird Watching** — birds appear on screen; some vanish quickly. Count them all.
- **Connect Maze** — tap the circles in alternating letter-number order. Fastest correct finisher wins.
- **Low to High** — numbers flash briefly; tap them back in ascending order.

## Modes

- **Versus** — best of 7 rounds. Same question, both players, first correct wins each round.
- **Brain Age Check** — both players complete 3 exercises solo; brain ages compared at the end.
- **Solo** — practice any exercise against your personal best.

## Firewall

If the host PC blocks the connection, allow port 3000:

```bash
netsh advfirewall firewall add rule name="Neuron Sprint" dir=in action=allow protocol=TCP localport=3000
```

## Technical

- Node.js server serves static files + WebSocket on port 3000.
- Vanilla HTML/CSS/JS client — zero build step, no framework.
- Touch-first: custom on-screen numpad, 48px+ tap targets, PWA manifest.
- All game logic is server-authoritative for fair scoring.
- ~3KB of runtime dependencies (`ws` + `qrcode`).

## Roadmap (v2)

- Word Memory, Head Count, Triangle Math, Syllable Count, Time Lapse
- Multi-room support with room codes
- Sound effects and haptic feedback
- Persistent leaderboard

## License

MIT. See LICENSE file.

## Credits

Inspired by the Brain Age series by Nintendo and Dr Ryuta Kawashima. This project contains no Nintendo assets, code, or trademarks. All artwork and code are original.