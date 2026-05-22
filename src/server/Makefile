# ai-server/Makefile

# --- VARIABLES ---
DOCKER_DEV = docker compose -f docker-compose.yml -f docker-compose.override.yml
DOCKER_PROD = docker compose -f docker-compose.yml

.PHONY: dev-up dev-down dev-status dev-log dev-clean dev-db-shell dev-redis-shell \
        prod-up prod-down prod-status prod-log prod-restart

# --- DEVELOPMENT (LOCAL) ---
dev-up:
	$(DOCKER_DEV) up -d

dev-down:
	$(DOCKER_DEV) down

dev-restart:
	$(DOCKER_DEV) down
	$(DOCKER_DEV) up -d --build

dev-status:
	$(DOCKER_DEV) ps

dev-log:
	$(DOCKER_DEV) logs -f

dev-clean:
	$(DOCKER_DEV) down -v

dev-db-shell:
	docker exec -it ai_chatbot_postgres psql -U chatbot -d chat_db

dev-redis-shell:
	docker exec -it ai_chatbot_redis redis-cli

# --- PRODUCTION (VPS) ---
prod-up:
	$(DOCKER_PROD) up -d

prod-down:
	$(DOCKER_PROD) down

prod-pull:
	$(DOCKER_PROD) pull

prod-restart:
	$(DOCKER_PROD) down
	$(DOCKER_PROD) up -d

prod-status:
	$(DOCKER_PROD) ps

prod-log:
	$(DOCKER_PROD) logs -f
