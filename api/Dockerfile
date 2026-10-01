FROM python:3.14.6-slim

WORKDIR /app

# git is a runtime dependency, not a build tool: the safety file storage layer
# shells out to it for every read and write. python:*-slim does not include it.
RUN apt-get update \
	&& apt-get install --no-install-recommends --yes git \
	&& rm -rf /var/lib/apt/lists/*

# Install from the fully resolved lock, not the `.in` declarations, so every
# build gets an identical dependency set. Regenerate with `s/lock`.
COPY requirements.txt requirements.dev.txt ./

RUN pip install --no-cache-dir -r requirements.dev.txt

COPY . .

EXPOSE 8000

WORKDIR /app/src

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
