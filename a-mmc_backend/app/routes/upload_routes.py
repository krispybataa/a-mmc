from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

upload_bp = Blueprint("upload", __name__)


@upload_bp.route("/presign", methods=["POST"])
@jwt_required()
def presign():
    """
    POST /api/uploads/presign
    Body: { "filename": "photo.jpg", "context": "profiles" }

    Returns: { "upload_url": "...", "public_url": "..." }
        upload_url  — presigned S3 PUT URL (expires in 5 min); browser PUTs file body here.
        public_url  — permanent URL to store in the DB / display in UI.

    Auth: any valid JWT (clinician, secretary, patient, admin).
    """
    data     = request.get_json(silent=True) or {}
    filename = data.get("filename", "upload")
    context  = data.get("context", "general")

    try:
        from app.services.upload_service import generate_presigned_upload
        upload_url, public_url = generate_presigned_upload(filename, context)
        return jsonify({"upload_url": upload_url, "public_url": public_url}), 200
    except RuntimeError as e:
        # Missing env vars — storage not configured on this environment
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        return jsonify({"error": f"Storage error: {str(e)}"}), 500
