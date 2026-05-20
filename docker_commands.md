# List running containers to find the EFT service container name/ID
docker ps

# View logs for a specific container
docker logs <container_name_or_id>

# View last 100 lines
docker logs --tail 100 <container_name_or_id>

# Follow logs in real-time (like tail -f)
docker logs -f <container_name_or_id>

# Show logs with timestamps
docker logs -t <container_name_or_id>

# Show logs from the last hour
docker logs --since 1h <container_name_or_id>
