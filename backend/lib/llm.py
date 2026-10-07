"""Chiamate a Claude (via emergentintegrations) che restituiscono JSON."""

import json
import os
import re
import uuid

from emergentintegrations.llm.chat import ImageContent, LlmChat, StreamDone, TextDelta, UserMessage

MODEL_PROVIDER = "anthropic"
MODEL_NAME = os.environ.get("LLM_MODEL", "claude-sonnet-5-5")


def _extract_json(text: str):
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fence:
        text = fence.group(1).strip()
    start = min([i for i in (text.find("{"), text.find("[")) if i >= 0], default=0)
    return json.loads(text[start:])


async def ask_json(system: str, prompt: str, image_base64: str | None = None):
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=str(uuid.uuid4()),
        system_message=system,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)
    files = [ImageContent(image_base64=image_base64)] if image_base64 else None
    msg = UserMessage(text=prompt, file_contents=files) if files else UserMessage(text=prompt)
    out: list[str] = []
    async for ev in chat.stream_message(msg):
        if isinstance(ev, TextDelta):
            out.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    return _extract_json("".join(out))
