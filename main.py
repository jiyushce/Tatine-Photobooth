from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import uuid
from datetime import datetime
import shutil
from pathlib import Path

app = FastAPI(title="Miffy Photobooth")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories if they don't exist
PHOTOS_DIR = Path("photos")
PHOTOS_DIR.mkdir(exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/photos", StaticFiles(directory="photos"), name="photos")

@app.get("/")
async def read_root():
    return FileResponse("static/index.html")

@app.post("/capture")
async def capture_photo(file: UploadFile = File(...)):
    try:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        filename = f"{timestamp}_{unique_id}.jpg"
        filepath = PHOTOS_DIR / filename
        
        # Save uploaded file
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return the photo URL
        photo_url = f"/photos/{filename}"
        return JSONResponse({
            "success": True,
            "photo_url": photo_url,
            "filename": filename
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/photos")
async def list_photos():
    """Get list of all photos"""
    photos = []
    for file in sorted(PHOTOS_DIR.iterdir(), reverse=True):
        if file.suffix.lower() in ['.jpg', '.jpeg', '.png']:
            photos.append({
                "filename": file.name,
                "url": f"/photos/{file.name}",
                "created": datetime.fromtimestamp(file.stat().st_ctime).isoformat()
            })
    return JSONResponse({"photos": photos})

@app.delete("/photos/{filename}")
async def delete_photo(filename: str):
    """Delete a photo"""
    filepath = PHOTOS_DIR / filename
    if filepath.exists():
        filepath.unlink()
        return JSONResponse({"success": True, "message": "Photo deleted"})
    raise HTTPException(status_code=404, detail="Photo not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)