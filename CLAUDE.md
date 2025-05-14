# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js web crawler that monitors the Sachsen-Anhalt fishing exam website for new appointment dates and sends notifications via Discord. The bot checks for new appointments daily at 8:00 AM, compares them with previously known appointments, and sends alerts when new ones are found.

## Commands

```bash
# Install dependencies
npm install

# Start the application
npm start

# Run the application in Docker (background)
docker-compose up -d

# Stop Docker container
docker-compose down
```

## Architecture

The application is structured in a modular way:

1. **Main Application (`main.js`)**: Orchestrates the workflow, scheduling regular checks for new fishing exam appointments.

2. **Module Structure**:
   - `modules/api/`: Handles API interactions with the exam website
   - `modules/data/`: Manages appointment data storage and comparison
   - `modules/discord/`: Sends notifications to Discord
   - `modules/logger/`: Provides logging functionality

3. **Core Flow**:
   - Fetch exam data from API (`apiClient.js`)
   - Filter for fishing exams
   - Compare with known appointments (`appointmentStorage.js`)
   - Send Discord notifications for new appointments (`discordNotifier.js`)
   - Save updated appointment list
   - Log all operations (`logger.js`)

4. **Data Storage**: 
   - Appointments are stored in a NeDB database (`appointments.db`) for persistence without requiring a separate database server.
   - NeDB provides a MongoDB-like API with a lightweight file-based storage system.

## Environment Configuration

The application requires the following environment variables in a `.env` file:

```
DISCORD_WEBHOOK_URL=your_discord_webhook_url_here
API_URL=https://fischerpruefung.sachsen-anhalt.de/api/exam/examination?future=true
LOG_FILE_PATH=./crawler.log
LINK_URL=base_url_for_appointment_links
DATA_DIR=./data    # Optional: custom directory for NeDB storage
```

## Docker Support

The application can be containerized using Docker, with persistent volume storage for the data files.

The Docker setup includes:
- A single Docker container for the application
- Volume for persisting appointment data in the NeDB database file
- Simple configuration with Docker Compose
- Automatic database maintenance and optimization

These Docker configurations ensure that appointment data persists between container restarts or updates.