"""Warehouse Autonomy — Flask application factory."""
from __future__ import annotations

from .config import Config


def create_app(config: type = Config):
    from flask import Flask, jsonify
    from flask_cors import CORS

    from .routes.api import api

    app = Flask(__name__)
    app.config.from_object(config)
    CORS(app, resources={r"/api/*": {"origins": config.CORS_ORIGINS}})
    app.register_blueprint(api)

    @app.errorhandler(404)
    def not_found(_e):
        return jsonify({"error": {"code": "not_found", "message": "Resource not found.", "details": []}}), 404

    @app.errorhandler(405)
    def bad_method(_e):
        return jsonify({"error": {"code": "method_not_allowed", "message": "Method not allowed.", "details": []}}), 405

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify({"error": {"code": "payload_too_large", "message": "Request body too large.", "details": []}}), 413

    @app.errorhandler(Exception)
    def unexpected(_e):  # never leak stack traces
        app.logger.exception("Unhandled error")
        return jsonify({"error": {"code": "internal_error", "message": "Internal server error.", "details": []}}), 500

    return app
