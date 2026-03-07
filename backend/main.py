# On importe la fonction extract_invoice_data qui utilisera éventuellement des regex pour extraire des infos.
# On importe FastAPI pour créer l'application principale.
# On importe le routeur des endpoints de factures depuis le contrôleur.
from app.services.regex_service import extract_invoice_data
from fastapi import FastAPI
from app.controllers.invoce_controller import router as invoice_router
# Création de l'application FastAPI principale.
app = FastAPI()
# Définition d'un endpoint GET à la racine "/" pour vérifier que l'API fonctionne.

app.include_router(invoice_router)

@app.get("/")
def root():
    return {"message": "API running"}