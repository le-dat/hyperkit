# ai-server/core/exceptions.py

class RedisConnectionError(Exception):
    """Raised when the connection to Redis fails during startup or operation."""
    pass


class DBConnectionError(Exception):
    """Raised when the connection to the Database fails during startup or operation."""
    pass
