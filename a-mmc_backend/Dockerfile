FROM python:3.11-alpine

# Prevent Python from writing pyc files & enable stdout logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app:create_app

RUN apk add --no-cache \
    curl \
    postgresql-client 

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# install gunicorn
RUN pip install gunicorn

# copies everything in current directory to /app in the container
COPY . .

# copy shell scripts to the container
COPY shell_scripts/wait-for-postgres.sh ./shell_scripts/wait-for-postgres.sh

#chmod +x the postgres checker script
RUN chmod +x ./shell_scripts/wait-for-postgres.sh

ENTRYPOINT ["./shell_scripts/wait-for-postgres.sh"]
CMD ["sh", "-c", "flask db upgrade && gunicorn -b 0.0.0.0:$PORT --workers 2 --threads 1 'run:create_app()'"]