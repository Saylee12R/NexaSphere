import os
import json
import redis
import logging
import time
from fastapi import APIRouter, HTTPException

router = APIRouter()
logger = logging.getLogger(__name__)

# Fallback Cache Dict
LOCAL_CACHE = {}

# Initialize Redis client
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = None
try:
    # Try to ping the server to catch connection errors instantly
    temp_redis = redis.from_url(redis_url, socket_connect_timeout=1)
    temp_redis.ping()
    redis_client = temp_redis
except redis.exceptions.ConnectionError:
    logger.warning("Redis unavailable, using local cache")
except Exception as e:
    logger.warning("Redis unavailable, using local cache")

# Define fallback recommendation suggestions matching the expected output schema
FALLBACK_RECOMMENDATIONS = [
    {
        "id": "evt_1",
        "name": "AI Hackathon",
        "tags": ["AI", "machine learning", "hackathon"],
        "final_score": 0.0,
        "content_score": 0.0,
        "collab_score": 0.0
    },
    {
        "id": "evt_2",
        "name": "Web Dev Bootcamp",
        "tags": ["web", "react", "javascript"],
        "final_score": 0.0,
        "content_score": 0.0,
        "collab_score": 0.0
    },
    {
        "id": "evt_3",
        "name": "Cybersecurity Workshop",
        "tags": ["security", "networking", "workshop"],
        "final_score": 0.0,
        "content_score": 0.0,
        "collab_score": 0.0
    },
    {
        "id": "evt_4",
        "name": "Robotics Fest",
        "tags": ["robotics", "hardware", "iot"],
        "final_score": 0.0,
        "content_score": 0.0,
        "collab_score": 0.0
    },
    {
        "id": "evt_5",
        "name": "Data Science Summit",
        "tags": ["data", "AI", "python", "analytics"],
        "final_score": 0.0,
        "content_score": 0.0,
        "collab_score": 0.0
    }
]

@router.get("/recommend/events/{user_id}", tags=["Recommendations"], summary="Get Event Recommendations", description="Get top 5 recommended events for a specific user based on hybrid content and collaborative filtering.")
async def recommend_events(user_id: str):
    cache_key = f"recs:events:{user_id}"
    
    # 1. Check Caches
    if redis_client:
        try:
            cached_result = redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
        except Exception as e:
            logger.warning(f"Error reading from Redis: {e}")
    else:
        # Check local cache
        if cache_key in LOCAL_CACHE:
            entry = LOCAL_CACHE[cache_key]
            if time.time() < entry["expires"]:
                return entry["data"]
            
    # 2. Cache Miss: Trigger the Celery background task and return fallbacks instantly
    try:
        from celery_app import precompute_recommendations
        precompute_recommendations.delay(user_id)
        logger.info(f"Asynchronously triggered recommendation pre-computation for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to trigger Celery task: {e}")
        
    return FALLBACK_RECOMMENDATIONS
