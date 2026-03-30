class AppException(Exception):
    """Base application exception."""


class AuthenticationError(AppException):
    """Raised when authentication fails."""


class AuthorizationError(AppException):
    """Raised when user permissions are insufficient."""


class NotFoundError(AppException):
    """Raised when a resource is not found."""


class ValidationAppError(AppException):
    """Raised when application validation fails."""


class ProcessingError(AppException):
    """Raised when report processing fails."""
