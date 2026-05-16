# ai-server/Makefile

.PHONY: dev-up dev-down prod-up prod-down status logs clean db-shell redis-shell

# --- DEVELOPMENT (LOCAL) ---
dev-up:
	docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

dev-down:
	docker compose -f docker-compose.yml -f docker-compose.override.yml down

# --- PRODUCTION (VPS) ---
prod-up:
	docker compose -f docker-compose.yml up -d

prod-down:
	docker compose -f docker-compose.yml down

# --- UTILS ---
status:
	docker compose -f docker-compose.yml -f docker-compose.override.yml ps

logs:
	docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f

clean:
	docker compose -f docker-compose.yml -f docker-compose.override.yml down -v

db-shell:
	docker exec -it ai_chatbot_postgres psql -U chatbot -d chat_db

redis-shell:
	docker exec -it ai_chatbot_redis redis-cli
