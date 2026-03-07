from pydantic import BaseModel

# Définition d'un modèle de données pour une facture.
# Pydantic va vérifier que les données reçues respectent les types définis.

class Invoice(BaseModel):
    invoice_number: str
    date: str
     # Nom du fournisseur
    supplier: str
    # Montant total de la facture.
    total: float