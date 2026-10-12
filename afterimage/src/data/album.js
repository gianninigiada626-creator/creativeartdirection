// Single source of truth for all campaign copy. EN for titles/UI, IT for fragments and credits.

export const ARTIST = 'MERCY V.';
export const TITLE = 'AFTERIMAGE';
export const LABEL = 'SAFELIGHT RECORDS';
export const CATALOG = 'DRK-001';
export const RELEASE = '12.03.2027';

export const TRACKS = [
  { n: '01', title: 'FLASH (INTRO)', time: '1:12', note: 'un solo lampo, poi niente.' },
  { n: '02', title: 'RETINA BURN', time: '3:04', note: 'chiudo gli occhi e il flash è ancora acceso.' },
  { n: '03', title: 'CHROME TEETH', time: '2:48', note: 'argento sui denti, buio nelle tasche.' },
  { n: '04', title: 'GHOST IN THE NEGATIVE', time: '3:31', note: 'nel negativo eri tu la luce.' },
  { n: '05', title: 'SILVER HALIDE', time: '2:57', note: 'la memoria è una reazione chimica.' },
  { n: '06', title: '1/60s', time: '2:19', note: 'un sessantesimo di secondo per restare.' },
  { n: '07', title: 'RED LIGHT ROOM', time: '3:46', note: 'sviluppato al buio, come tutto quello che conta.' },
  { n: '08', title: 'OVEREXPOSED', time: '2:41', note: 'troppa luce, nessun volto.' },
  { n: '09', title: 'WHAT THE CAMERA KEPT', time: '3:22', note: 'ricordo solo quello che il flash ha visto.' },
  { n: '10', title: 'AFTERIMAGE', time: '4:08', note: 'la luce se n’è andata. l’immagine resta.' },
];

export const TOTAL_TIME = '29:48';

export const FRAGMENTS = {
  opening: 'the light is gone. the image stays.',
  hero: 'chiudo gli occhi e il flash è ancora acceso.',
  object: 'l’abbiamo trovato nel bagno di sviluppo. non ha ancora deciso che forma avere.',
};

export const SECTIONS = [
  { id: 'signal', n: '02', label: 'SIGNAL' },
  { id: 'object', n: '03', label: 'OBJECT' },
  { id: 'record', n: '04', label: 'RECORD' },
  { id: 'credits', n: '05', label: 'CREDITS' },
];
