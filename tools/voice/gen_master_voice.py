#!/usr/bin/env python3
"""거장의 집 목소리 (피드백 2026-11-26): every line Buffett says in the lessons (app/content/master/lessons.json), read by
an ElevenLabs voice and saved as public/audio/master/NN-S.mp3 (NN the book, S the step; -ok the line after trying it).
public/audio/master/manifest.json lists what is there; the app plays only what is listed (ui/Lesson.tsx).

The key is read from the environment or the project's .env.local (ELEVENLABS_API_KEY) and is never printed or saved.
Lines already made are skipped (--force makes them again); --only 01,02 makes just those books; --dry counts.

  python3 tools/voice/gen_master_voice.py            # all missing lines
  python3 tools/voice/gen_master_voice.py --only 01 --force
"""
import json, os, sys, time, urllib.request, urllib.error, pathlib, argparse

ROOT = pathlib.Path(__file__).resolve().parents[2]
LESSONS = ROOT / 'app/content/master/lessons.json'
OUT = ROOT / 'public/audio/master'
VOICE_ID = 'UUeYkdN1qaI7Ihjcb3zW'          # 백산 (ElevenLabs voice library), picked by the team 2026-11-26
MODEL = 'eleven_multilingual_v2'
SETTINGS = {'stability': 0.55, 'similarity_boost': 0.8, 'style': 0.15, 'use_speaker_boost': True}

def key():
    k = os.environ.get('ELEVENLABS_API_KEY')
    if k: return k.strip()
    env = ROOT / '.env.local'
    if env.exists():
        for line in env.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line.startswith('ELEVENLABS_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"').strip("'")
    sys.exit('ELEVENLABS_API_KEY not found (environment or .env.local)')

def lines(only):
    for l in json.loads(LESSONS.read_text(encoding='utf-8')):
        nn = f"{l['no']:02d}"
        if only and nn not in only: continue
        for i, s in enumerate(l['steps']):
            yield f'{nn}-{i+1}', s['say']
            if s.get('ok'): yield f'{nn}-{i+1}-ok', s['ok']

def speak(k, text):
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128',
        data=json.dumps({'text': text, 'model_id': MODEL, 'voice_settings': SETTINGS}).encode(),
        headers={'xi-api-key': k, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'}, method='POST')
    with urllib.request.urlopen(req, timeout=120) as r: return r.read()

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only'); ap.add_argument('--force', action='store_true'); ap.add_argument('--dry', action='store_true')
    a = ap.parse_args(); only = set(a.only.split(',')) if a.only else None
    OUT.mkdir(parents=True, exist_ok=True)
    todo = [(i, t) for i, t in lines(only) if a.force or not (OUT / f'{i}.mp3').exists()]
    print(f'{len(todo)} lines to make, {sum(len(t) for _, t in todo)} characters')
    if a.dry: return
    k = key(); made = 0
    for i, t in todo:
        for tries in range(3):
            try:
                (OUT / f'{i}.mp3').write_bytes(speak(k, t)); made += 1; print('ok', i); break
            except urllib.error.HTTPError as e:
                body = e.read()[:300].decode('utf-8', 'replace')
                print('fail', i, e.code, body)
                if e.code in (401, 403): sys.exit('the key was refused (check its Text to Speech access)')
                if e.code == 429: time.sleep(5 * (tries + 1)); continue
                break
            except Exception as e:
                print('fail', i, type(e).__name__); time.sleep(2)
        time.sleep(0.3)
    have = sorted(p.stem for p in OUT.glob('*.mp3'))
    (OUT / 'manifest.json').write_text(json.dumps(have), encoding='utf-8')
    print(f'made {made}; manifest lists {len(have)}')

if __name__ == '__main__': main()
