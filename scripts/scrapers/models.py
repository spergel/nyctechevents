"""
Models for the NYC Events scraper.
"""
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Union

class EventStatus(str, Enum):
    SCHEDULED = "scheduled"
    CANCELLED = "cancelled"
    POSTPONED = "postponed"
    RESCHEDULED = "rescheduled"

class EventCategory(str, Enum):
    TECH = "tech"
    BUSINESS = "business"
    ARTS = "arts"
    CULTURE = "culture"
    EDUCATION = "education"
    SCIENCE = "science"
    HEALTH = "health"
    SOCIAL = "social"
    NETWORKING = "networking"
    OTHER = "other"

@dataclass
class Price:
    amount: float
    type: str  # "free", "paid", "donation"
    details: Optional[str] = None

@dataclass
class Venue:
    name: str
    address: Optional[str] = None
    type: str = "venue"

@dataclass
class Organizer:
    name: str
    type: str = "organizer"

@dataclass
class EventMetadata:
    source_url: str
    source_name: str
    venue: Optional[Venue] = None
    organizer: Optional[Organizer] = None
    additional_info: Optional[Dict] = None
    raw_data: Optional[Dict] = None

@dataclass
class Event:
    id: str
    name: str
    type: str
    location_id: Optional[str]
    community_id: Optional[str]
    description: str
    start_date: datetime
    end_date: datetime
    category: Union[EventCategory, List[EventCategory]]
    price: Price
    status: EventStatus = EventStatus.SCHEDULED
    registration_required: bool = False
    tags: Optional[List[str]] = None
    image_url: Optional[str] = None
    metadata: Optional[EventMetadata] = None

@dataclass
class SubstackPost:
    """Model for Substack newsletter posts."""
    id: str
    title: str
    subtitle: Optional[str]
    publication: str
    url: str
    post_date: datetime
    description: str
    cover_image: Optional[str]
    excerpt: Optional[str]
    type: str = "substack"
    metadata: Optional[Dict] = None 