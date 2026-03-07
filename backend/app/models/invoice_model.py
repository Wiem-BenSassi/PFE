from pydantic import BaseModel

class Invoice(BaseModel):
    invoice_number: str
    date: str
    supplier: str
    total: float