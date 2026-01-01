# api.py
from fastapi import FastAPI
import threading
import uvicorn

def start_server(strategy_manager):
    app = FastAPI()


    @app.post("/api/engine")
    def create_user(req: CreateUserRequest):
        strategy_manager.add_user(
            user_id=req.user_id,
            instruments=req.instruments,
        )
        return {"status": "created"}    



    def run():
        uvicorn.run(app, host="0.0.0.0", port=8011)

    thread = threading.Thread(target=run, daemon=True)
    thread.start()
