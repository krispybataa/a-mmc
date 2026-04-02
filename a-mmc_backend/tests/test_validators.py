"""
test_validators.py
------------------
Unit tests for app/utils/validators.py.

require_fields() calls flask.jsonify, which is mocked here so no Flask
app context is required.
"""

from unittest.mock import MagicMock, patch

import pytest

from app.utils.validators import require_fields


class TestRequireFields:

    def test_returns_none_when_all_fields_present(self):
        result = require_fields({"name": "Ada", "age": 30}, "name", "age")
        assert result is None

    def test_returns_none_when_no_fields_required(self):
        result = require_fields({})
        assert result is None

    def test_returns_tuple_when_field_missing(self):
        with patch("app.utils.validators.jsonify") as mock_jsonify:
            mock_jsonify.return_value = MagicMock()
            result = require_fields({"name": "Ada"}, "name", "email")
        assert result is not None
        assert result[1] == 422

    def test_none_value_is_treated_as_missing(self):
        with patch("app.utils.validators.jsonify") as mock_jsonify:
            mock_jsonify.return_value = MagicMock()
            result = require_fields({"name": None}, "name")
        assert result is not None
        assert result[1] == 422

    def test_error_payload_names_missing_field(self):
        with patch("app.utils.validators.jsonify") as mock_jsonify:
            mock_jsonify.return_value = MagicMock()
            require_fields({"name": "Ada"}, "name", "email")
            payload = mock_jsonify.call_args[0][0]
        assert "email" in payload["error"]

    def test_error_payload_names_all_missing_fields(self):
        with patch("app.utils.validators.jsonify") as mock_jsonify:
            mock_jsonify.return_value = MagicMock()
            require_fields({}, "first_name", "last_name")
            payload = mock_jsonify.call_args[0][0]
        assert "first_name" in payload["error"]
        assert "last_name" in payload["error"]
