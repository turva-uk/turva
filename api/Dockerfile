FROM python:3.12.14-slim

WORKDIR /app

# Install from the fully resolved lock, not the `.in` declarations, so every
# build gets an identical dependency set. Regenerate with `s/lock`.
COPY requirements.txt requirements.dev.txt ./

RUN pip install --no-cache-dir -r requirements.dev.txt

COPY . .

EXPOSE 8000

WORKDIR /app/src

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
