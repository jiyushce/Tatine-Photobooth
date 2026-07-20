from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import base64
import os
import time

app = FastAPI()

# Automatically ensure a "photos" directory exists locally
os.makedirs("photos", exist_ok=True)

# Schema to read data sent from javascript
class PhotoData(BaseModel):
    image: str

@app.post("/save-photo")
async def save_photo(data: PhotoData):
    # Strip the header data from base64 string
    header, encoded = data.image.split(",", 1)
    file_bytes = base64.b64decode(encoded)
    
    # Save file with a unique time-based filename
    filename = f"photos/booth_{int(time.time())}.png"
    with open(filename, "wb") as f:
        f.write(file_bytes)
        
    return {"status": "success", "filename": filename}

# Serve your HTML/JS frontend files dynamically
app.mount("/static", StaticFiles(directory="static"), name="static")

# Default route redirects to your index.html page
@app.get("/")
async def read_index():
    from fastapi.responses import FileResponse
    return FileResponse("static/index.html")