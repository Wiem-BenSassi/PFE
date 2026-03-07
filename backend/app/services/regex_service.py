import re

def extract_invoice_data(text):

    date = re.search(r'\d{2}/\d{2}/\d{4}', text)
    total = re.search(r'Total\s*:?[\s]*([\d.,]+)', text)
    invoice_number = re.search(r'Facture\s*N[°o]?\s*:?[\s]*(\d+)', text)

    data = {
        "date": date.group() if date else None,
        "total": total.group(1) if total else None,
        "invoice_number": invoice_number.group(1) if invoice_number else None
    }

    return data