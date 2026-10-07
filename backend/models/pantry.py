import uuid
from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field

Storage = Literal["frigo", "dispensa", "freezer"]
Status = Literal["attivo", "consumato", "buttato"]


class CategoryInfo(BaseModel):
    key: str
    label: str
    days_frigo: int | None
    days_dispensa: int | None
    days_freezer: int | None
    days_after_opening: int
    default_storage: Storage


class ParseRequest(BaseModel):
    image_base64: str | None = None
    text: str | None = None


class ParsedLine(BaseModel):
    raw_text: str
    name: str
    category: str
    storage: Storage
    quantity: str = ""
    price: float | None = None
    is_food: bool = True
    confidence: Literal["alta", "media", "bassa"] = "media"
    from_memory: bool = False


class ParsedReceipt(BaseModel):
    store: str | None = None
    purchase_date: str
    lines: list[ParsedLine]


class ItemInput(BaseModel):
    name: str = Field(min_length=1)
    raw_text: str = ""
    category: str
    storage: Storage
    quantity: str = ""
    price: float | None = None
    purchase_date: str | None = None
    expiry_date: str | None = None
    opened: bool = False


class ConfirmRequest(BaseModel):
    items: list[ItemInput]
    remember: bool = True


class ItemUpdate(BaseModel):
    status: Status | None = None
    opened: bool | None = None
    storage: Storage | None = None
    expiry_date: str | None = None
    clear_expiry: bool = False


class PantryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    raw_text: str = ""
    category: str
    storage: Storage
    quantity: str = ""
    price: float | None = None
    purchase_date: str
    expiry_date: str | None = None
    opened: bool = False
    opened_at: str | None = None
    status: Status = "attivo"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PantryItemOut(PantryItem):
    category_label: str
    use_by: str
    days_left: int
    urgency: Literal["rosso", "giallo", "verde"]
    source: Literal["etichetta", "stima", "stima_apertura"]


class Alias(BaseModel):
    key: str
    raw_text: str
    name: str
    category: str
    storage: Storage


class ResetResult(BaseModel):
    removed: int
    aliases_kept: int


class Stats(BaseModel):
    active: int
    consumed: int
    thrown: int
    urgent: int
