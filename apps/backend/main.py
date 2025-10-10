from fastapi import FastAPI

app = FastAPI(title="Swift Prints Backend", version="0.1.0")

sophisticated meme
@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/ping")
def ping():
    return {"message": "pong"}


