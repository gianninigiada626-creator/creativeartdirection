// All copy and timing for the film. Tracklist and credits are PROVISIONAL until the artist sends the real ones.

export const ARTIST = 'MERCY V.';
export const ALBUM = 'MUERTO';
export const LABEL = 'CAMPOSANTO REC.';
export const LABEL_MARK = 'CSR';
export const CONSOLE = 'OSSARIO 2';

export const TRACKS = [
  'RESPAWN',
  'CORNER BAR',
  '4AM CIGARETTE',
  'THE RIDE',
  'NPC feat. LUPO NERO',
  'NO LIVING ALLOWED',
  'SANTA MUERTE',
  'STREET PEOPLE',
  'THE USUAL',
  'MISSION PASSED',
  'WASTED',
  'MUERTO',
];

export const PRODUCERS =
  'I Ossobuco & Mercy V. II Lupo Nero III Camposanto IV Ossobuco V Lupo Nero & Dj Requiem ' +
  'VI Mercy V. VII Dj Requiem VIII Camposanto & Ossobuco IX Lupo Nero X Mercy V. XI Dj Requiem XII Mercy V. & Camposanto';

export const CREDITS = 'Mixed by Ossobuco † Mastered by Dj Requiem † Artwork by Mercy V. † Written by Mercy V.';

/**
 * The song, analysed: ~95.7 BPM, first beat at 0.165 s, the beat drops at 10.18 s.
 * Section starts (song seconds) sit on the bar grid counted from the drop (1 bar = 2.508 s).
 */
export const SONG = {
  src: 'assets/muerto.mp3',
  duration: 117.57,
  bpm: 95.7,
  firstBeat: 0.165,
  drop: 10.18,
  scenes: {
    spawn: 10.18,
    barber: 17.7,
    street: 30.24,
    bar: 37.77,
    smoke: 50.31,
    ride: 62.85,
    strange: 87.92,
    ending: 101.7,
    off: 109.0,
  },
};

export const FPS = 24;

export const beat = (k) => SONG.firstBeat + (k * 60) / SONG.bpm;

export function schedule() {
  const disc = 0;
  const player = 13;
  const songStart = 25; // the display reads "01 00:00"; the quiet intro plays while the camera dives in
  const game = songStart + SONG.drop; // the game switches on with the drop
  const back = songStart + SONG.scenes.off + 0.8;
  const end = back + 18;
  return { disc, player, songStart, game, back, end };
}
