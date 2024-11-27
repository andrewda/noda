import json
from pathlib import Path
from openai import OpenAI
client = OpenAI()

# load json file
with open('speech.json') as f:
  data = json.load(f)

voice = 'alloy'

for item in data:
  speech_file_path = Path(__file__).parent / "public" / "speech" / f"{item['file']}-{voice}.wav"

  if speech_file_path.exists():
    continue

  print(f"Generating speech for {item['file']}")

  response = client.audio.speech.create(
    model="tts-1",
    voice=voice,
    input=item['text'],
    response_format="wav",
    speed=1.0
  )

  response.stream_to_file(speech_file_path)
