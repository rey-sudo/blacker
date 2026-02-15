from fastapi import FastAPI
from fastapi.responses import FileResponse
import uvicorn

app = FastAPI()

@app.get("/")
async def serve_index():
    return FileResponse("html/index.html")

if __name__ == "__main__":
    print("🌐 Frontend server running http://localhost:8007")
    uvicorn.run(app, host="0.0.0.0", port=8007)