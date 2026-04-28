import smtplib
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv

load_dotenv()

try:
    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(
        os.getenv("SMTP_USER"),
        os.getenv("SMTP_PASSWORD")
    )
    
    msg = MIMEText("Test email ✅")
    msg["Subject"] = "Test Vernicolor"
    msg["From"] = os.getenv("SMTP_USER")
    msg["To"] = os.getenv("ADMIN_EMAIL")
    
    server.sendmail(os.getenv("SMTP_USER"), os.getenv("ADMIN_EMAIL"), msg.as_string())
    server.quit()
    print("✅ Email envoyé avec succès !")
    
except Exception as e:
    print(f"❌ Erreur : {e}")