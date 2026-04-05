"""
upload_service.py
-----------------
Generates presigned S3 PUT URLs for direct browser-to-bucket uploads.
Reads all config from environment variables — no credentials in code.

Required env vars (set in Railway backend service Variables):
    AWS_ENDPOINT_URL    https://t3.storageapi.dev
    AWS_REGION          auto
    AWS_BUCKET_NAME     a-mmcbucket-ytqemjyosgjea
    AWS_ACCESS_KEY_ID   tid_...
    AWS_SECRET_ACCESS_KEY  <secret>
    AWS_PUBLIC_BASE_URL https://t3.storageapi.dev/a-mmcbucket-ytqemjyosgjea
                        (path-style public read URL base — verify against Railway bucket settings)
"""

import os
import uuid
import boto3
from botocore.config import Config


def _get_client():
    return boto3.client(
        "s3",
        endpoint_url=os.environ.get("AWS_ENDPOINT_URL"),
        region_name=os.environ.get("AWS_REGION", "auto"),
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
        config=Config(signature_version="s3v4"),
    )


def generate_presigned_upload(filename: str, context: str = "general", expires_in: int = 300):
    """
    Generate a presigned PUT URL for direct browser → S3 upload.

    Args:
        filename:   Original filename from the browser (used for extension only).
        context:    Logical folder hint, e.g. "profiles", "pwd_front", "pwd_back".
        expires_in: URL lifetime in seconds (default 5 minutes).

    Returns:
        (upload_url, public_url)
        upload_url  — presigned PUT URL; browser PUTs the file body here directly.
        public_url  — permanent public URL to store in the DB.

    Raises:
        Exception if AWS env vars are missing or boto3 call fails.
    """
    bucket = os.environ.get("AWS_BUCKET_NAME")
    public_base = os.environ.get("AWS_PUBLIC_BASE_URL", "").rstrip("/")

    if not bucket:
        raise RuntimeError("AWS_BUCKET_NAME environment variable is not set.")
    if not public_base:
        raise RuntimeError("AWS_PUBLIC_BASE_URL environment variable is not set.")

    # Unique object key: context/uuid.ext
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    key = f"{context}/{uuid.uuid4().hex}.{ext}"

    client = _get_client()
    upload_url = client.generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_in,
    )

    public_url = f"{public_base}/{key}"
    return upload_url, public_url
