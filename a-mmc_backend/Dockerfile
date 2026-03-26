FROM python:3.11-alpine

# Prevent Python from writing pyc files & enable stdout logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app:create_app

RUN apk add --no-cache \
    curl \
    gcc \
    musl-dev \
    libffi-dev \
    postgresql-dev

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# install gunicorn
RUN pip install gunicorn

COPY . .

CMD ["sh", "-c", "flask db upgrade && gunicorn -b 0.0.0.0:5000 --workers 2 --threads 1 'run:create_app()'"]