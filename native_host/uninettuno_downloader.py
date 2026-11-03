#!/usr/bin/env python3
"""
Uninettuno Native Messaging Host
Riceve l'URL HLS (.m3u8) + cookies dal browser e scarica il video con FFmpeg.
"""

import sys
import json
import struct
import subprocess
import os
import re


# ---------------------------------------------------------------------------
# Native Messaging protocol (4-byte little-endian length prefix + JSON)
# ---------------------------------------------------------------------------

def read_message():
    raw_len = sys.stdin.buffer.read(4)
    if not raw_len or len(raw_len) < 4:
        return None
    length = struct.unpack('<I', raw_len)[0]
    data = sys.stdin.buffer.read(length)
    return json.loads(data.decode('utf-8'))


def send_message(msg):
    encoded = json.dumps(msg, ensure_ascii=False).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('<I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


# ---------------------------------------------------------------------------
# FFmpeg helpers
# ---------------------------------------------------------------------------

def find_ffmpeg():
    """Try common FFmpeg locations on macOS (Homebrew Intel + Apple Silicon)."""
    candidates = [
        '/usr/local/bin/ffmpeg',       # Homebrew Intel
        '/opt/homebrew/bin/ffmpeg',    # Homebrew Apple Silicon
        '/usr/bin/ffmpeg',             # system
        'ffmpeg',                      # PATH fallback
    ]
    for path in candidates:
        try:
            result = subprocess.run(
                [path, '-version'],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                return path
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
    return None


def sanitise_filename(name):
    """Remove characters illegal on macOS/Windows file systems."""
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', name)
    name = re.sub(r'\s{2,}', ' ', name).strip()
    return name or 'video.mp4'


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    msg = read_message()
    if not msg:
        send_message({'status': 'error', 'error': 'Nessun messaggio ricevuto'})
        return

    url      = msg.get('url', '')
    filename = sanitise_filename(msg.get('filename', 'video.mp4'))
    cookies  = msg.get('cookies', '')   # "Name=Value; Name2=Value2" string

    if not url:
        send_message({'status': 'error', 'error': 'URL mancante'})
        return

    # Ensure output goes to ~/Downloads/
    output_path = os.path.join(os.path.expanduser('~/Downloads'), filename)

    # Find FFmpeg
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        send_message({
            'status': 'error',
            'error': 'FFmpeg non trovato. Installa con: brew install ffmpeg'
        })
        return

    # Build FFmpeg command
    cmd = [ffmpeg, '-y']

    headers = ""
    if cookies:
        headers += 'Cookie: ' + cookies + '\r\n'
    headers += 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\n'
    headers += 'Referer: https://www.uninettunouniversity.net/\r\n'

    cmd += ['-headers', headers]

    cmd += [
        '-i', url,
        '-c', 'copy',          # no re-encoding, just remux
        '-bsf:a', 'aac_adtstoasc',  # fix AAC in MP4 container
        output_path
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=1800  # 30 min max
        )
        if result.returncode == 0:
            send_message({
                'status': 'done',
                'filename': filename,
                'path': output_path
            })
        else:
            # Return last 800 chars of stderr for diagnostics
            send_message({
                'status': 'error',
                'error': (result.stderr or result.stdout)[-800:].strip()
            })
    except subprocess.TimeoutExpired:
        send_message({'status': 'error', 'error': 'Timeout (30 minuti superati)'})
    except Exception as e:
        send_message({'status': 'error', 'error': str(e)})


if __name__ == '__main__':
    main()
