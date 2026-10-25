# Prints the second where the sermon starts in a Sunday service MP3, or 0 if unsure.
# Used by archive-sermons.mjs to cut the singing and announcements off the MP3.
#
# The Silero voice detector (bundled with faster-whisper) hears talking but not
# singing, so each song shows up as a long gap with no speech. The sermon is the
# long talk after the last song. Checked by hand on six services (Sep-Oct 2026).
#
# Usage: python find-sermon-start.py <file.mp3>   (needs ffmpeg on PATH)
import subprocess
import sys

import numpy as np
from faster_whisper.vad import VadOptions, get_speech_timestamps

RATE = 16000
SONG_SECONDS = 90         # a gap this long with no talking is a song
MIN_SERMON_SECONDS = 25 * 60  # ignore songs this close to the end (closing hymn)
LEAD_IN_SECONDS = 2

raw = subprocess.run(
    ["ffmpeg", "-v", "quiet", "-i", sys.argv[1], "-f", "s16le", "-ac", "1", "-ar", str(RATE), "-"],
    capture_output=True, check=True,
).stdout
audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
total = len(audio) / RATE

talk = [(s["start"] / RATE, s["end"] / RATE)
        for s in get_speech_timestamps(audio, VadOptions(min_silence_duration_ms=2000))]
song_ends = [b[0] for a, b in zip(talk, talk[1:])
             if b[0] - a[1] >= SONG_SECONDS and total - b[0] >= MIN_SERMON_SECONDS]

print(max(0, int(song_ends[-1]) - LEAD_IN_SECONDS) if song_ends else 0)
