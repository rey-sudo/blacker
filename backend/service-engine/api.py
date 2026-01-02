from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from strategy.users import StrategyManager
from nautilus_trader.core import Data

# -------------------------------
# Request models
# -------------------------------
class AddUserRequest(BaseModel):
    user_id: str
    instrument_ids: List[str]
    trade_size: Optional[float] = 0.01


class SendOrderRequest(BaseModel):
    user_id: str
    action: str
    instrument_id: str       
    quantity: Optional[float] = None

# -------------------------------
# FastAPI app
# -------------------------------
def create_app(strategy_manager: StrategyManager):
    app = FastAPI(title="Prop Firm API")

    @app.post("/api/engine/create-user")
    async def add_user(request: AddUserRequest):
        try:
            strategy_manager.add_user(
                user_id=request.user_id,
                instrument_ids=request.instrument_ids,
                trade_size=request.trade_size
            )
            return {"status": "ok", "user_id": request.user_id}
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    @app.post("/api/engine/create-order")
    async def send_order(request: SendOrderRequest):
        try:
            strategy_manager.send_order(
                user_id=request.user_id,
                action=request.action,
                instrument_id= request.instrument_id,
                quantity=request.quantity
            )
            return {"status": "ok", "user_id": request.user_id, "instrument_id": request.instrument_id, "action": request.action}
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    return app
