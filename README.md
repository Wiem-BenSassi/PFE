# Invoice OCR API

## Description
This project is a REST API built with FastAPI that extracts text from invoice images using OCR.

The API allows users to upload an invoice image and receive extracted information such as:
- invoice number
- date
- total amount

## Technologies
- Python
- FastAPI
- PaddleOCR
- Uvicorn

## Project Structure
backend/
│
├── main.py
├── services/
│   └── invoice_service.py
├── requirements.txt

## Installation

Clone the repository:

git clone https://github.com/username/.git

Go to the project folder:

cd project-name

Create virtual environment:

python -m venv venv

Activate environment (Windows):

venv\Scripts\activate

Install dependencies:

pip install -r requirements.txt

## Run the API

Start the server:

uvicorn main:app --reload

The API will run at:

http://127.0.0.1:8000

## API Documentation

Interactive documentation is available at:

http://127.0.0.1:8000/docs

## Example Endpoint

POST /upload

Upload an invoice image to extract text.

## Authors

- Wiem 
- Yasmine