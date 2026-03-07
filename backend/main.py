from app.services.regex_service import extract_invoice_data
from fastapi import FastAPI
from app.controllers.invoce_controller import router as invoice_router

app = FastAPI()

app.include_router(invoice_router)

@app.get("/")
def root():
    return {"message": "API running"}