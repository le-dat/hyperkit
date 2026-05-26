"""Session ownership dependency — verifies Redis session belongs to the calling user."""

from fastapi import Depends, HTTPException, Request

from auth.clerk import get_current_user_dep
from state import get_session


async def get_verified_session(
    request: Request,
    user: str = Depends(get_current_user_dep),
) -> dict:
    """Fetch and verify Redis session ownership for a given turn_id.

    The turn_id is extracted from the request path, so this dependency
    must be used on a route that has a {turn_id} path parameter.

    Raises:
        404: Session not found.
        403: Authenticated user does not own this session.

    Returns:
        The session hash dict from Redis.
    """
    turn_id = request.path_params.get("turn_id")
    if not turn_id:
        raise HTTPException(422, "turn_id path parameter is required")

    redis = request.app.state.redis
    session = await get_session(redis, turn_id)

    if not session:
        raise HTTPException(404, "Turn not found")

    if session.get("user_id") != user:
        raise HTTPException(403, "Forbidden")

    return session