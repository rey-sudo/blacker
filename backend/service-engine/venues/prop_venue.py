from nautilus_trader.model.identifiers import VenueId
from nautilus_trader.model.enums import VenueType
from nautilus_trader.model.venue import Venue


def create_prop_cfd_venue() -> Venue:
    venue = Venue(
        venue_id=VenueId("PROP_CFD"),
        venue_type=VenueType.OTC,   # CFDs son OTC
        description="Institutional Prop Firm CFD Venue",
        base_currency="USD",
    )
    return venue
