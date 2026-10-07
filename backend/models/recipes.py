import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from models.pantry import PantryItemOut


class RecipeIngredient(BaseModel):
    name: str
    quantity: str = ""
    pantry_item_id: str | None = None


class Recipe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    title: str
    minutes: int = 20
    servings: int = 2
    why: str = ""
    health_notes: str = ""
    ingredients: list[RecipeIngredient]
    steps: list[str]
    cooked: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CookRequest(BaseModel):
    item_ids: list[str] = []


class MorningSummary(BaseModel):
    date: str
    urgent: list[PantryItemOut]
    recipes: list[Recipe]
    message: str


class TelegramSettings(BaseModel):
    configured: bool
    enabled: bool
    chat_id: str
    token_hint: str
    send_time: str
    last_sent_date: str | None = None


class TelegramSettingsInput(BaseModel):
    bot_token: str | None = None
    chat_id: str | None = None
    enabled: bool = True
    send_time: str = Field(default="07:30", pattern=r"^\d{2}:\d{2}$")


class SendResult(BaseModel):
    ok: bool
    detail: str
