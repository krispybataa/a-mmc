import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    # Gunicorn (see Dockerfile CMD: 'run:create_app()') is what actually runs this
    # app in every real deployment - never run this file directly against a
    # production-configured environment, debug=True here is hardcoded regardless
    # of FLASK_ENV/config_name.
    app.run(debug=True, host="0.0.0.0", port=os.environ.get("PORT", 5000))
