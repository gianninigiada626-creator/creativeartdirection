"""
The script for the voices, from the shot list: one file per line, when it starts in the film and how long it
has before the next line or the end of its shot.

    python3 copione.py        → ../VOCI.md
"""
import os

from shots import ACTS, SHOTS

HERE = os.path.dirname(os.path.abspath(__file__))

CAST = """- **VO**: Bebo da adulto, sui quarant'anni. Voce bassa e vicina al microfono, ironica e asciutta, come uno che
  racconta al bar. Mai sentimentale: la malinconia è nelle pause, non nella voce.
- **BEBO**: Bebo a quattordici e a diciassette anni, in scena. Svogliato quando perde, sicuro quando rappa.
- **SAIMON**: a quattordici anni urla di gioia; da adulto la voce è più grossa, la stessa allegria.
- **ROCCO**: diciannove anni, voce roca, calma, da fratello maggiore.
- **VICINA**: una signora dietro la porta, esasperata.
- **MADRE**: dal balcone, a squarciagola, le vocali lunghe.
- **GALLERISTA**: uomo colto, compiaciuto, a voce bassa."""


def tc(s):
    return f'{int(s // 60)}:{s % 60:04.1f}'


def main():
    starts, t = {}, 0.0
    for s in SHOTS:
        starts[s['id']] = t
        t += s['dur']
    runtime = t
    out = ['# BASSA FEDELTÀ: copione per le voci', '',
           f'Durata del film {int(runtime // 60)}:{int(runtime % 60):02d}. Ogni battuta ha un **file**, il **minutaggio** a cui parte '
           "nell'animatic e i **secondi a disposizione** prima della battuta successiva o della fine dell'inquadratura.",
           'Esporta ogni battuta come file a sé (wav o mp3), con il nome indicato, senza musica né effetti: mixo io.', '',
           '## Cast', '', CAST, '',
           'Consiglio per ElevenLabs: la voce narrante con la stessa voce e le stesse impostazioni per tutto il film. '
           'Lo stesso per Saimon e Bebo da ragazzi e Saimon da adulto (una voce più grave).', '']
    for key, num, name, *_ in ACTS:
        out += [f'## {num} · {name}', '', '| File | Parte a | Secondi | Chi | Battuta |', '|---|---|---|---|---|']
        shots = [s for s in SHOTS if s['act'] == key]
        for s in shots:
            lines = s['lines']
            counts = {}
            for i, line in enumerate(lines):
                who, it = line[0], line[1]
                at = line[3] if len(line) > 3 else 0.7
                nxt = lines[i + 1][3] if i + 1 < len(lines) and len(lines[i + 1]) > 3 else s['dur']
                counts[who] = counts.get(who, 0) + 1
                name_ = f'{s["id"]}_{who.lower()}_{counts[who]:02d}'
                out.append(f'| `{name_}` | {tc(starts[s["id"]] + at)} | {nxt - at:.1f} | {who} | {it} |')
        out.append('')
    with open(os.path.join(HERE, '..', 'VOCI.md'), 'w') as fh:
        fh.write('\n'.join(out))


if __name__ == '__main__':
    main()
