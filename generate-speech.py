import json
from pathlib import Path
from openai import OpenAI
client = OpenAI()

config_file_path = Path(__file__).parent / "src" / "pages" / "experimenter" / "configs.json"

voice_map = {
  'KSE': 'echo',
  'SKW 1222': 'alloy',
  'UAL 650': 'onyx',
  'UAL 244': 'onyx',
  'UAL 377': 'onyx',
  'DL 2282': 'alloy',
}

# load json file
with open(config_file_path) as f:
  data = json.load(f)

script_items = [{**script_item, "voice": (voice_map[script_item['speaker']] if 'speaker' in script_item else 'echo')} for group in data['groups'] for script_item in (group['background_script'] if 'background_script' in group else [])]

for item in script_items:
  if 'file' not in item:
    print(f"Skipping item without file: {item}")
    continue

  voice = item['voice']
  speech_file_path = Path(__file__).parent / "public" / "speech" / f"{item['file']}"

  if speech_file_path.exists():
    continue

  print(f"Generating speech for {item['file']}")

  response = client.audio.speech.create(
    model="gpt-4o-mini-tts",
    voice=voice,
    input=item['dialog'],
    response_format="wav",
    instructions="You are an air traffic controller. Speak in a calm and clear tone, with a slightly fast pace.",
    speed=1.0
  )

  response.stream_to_file(speech_file_path)
